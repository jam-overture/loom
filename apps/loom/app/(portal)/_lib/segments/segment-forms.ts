import {
  err,
  ok,
  type DeltaId,
  type LoomTree,
  type ProposalId,
  type Result,
} from "@jam-overture/loom"
import type { AudienceId, AudienceOverlayStore } from "@jam-overture/loom/store"
import type { HeldProposal, HoldStore } from "@jam-overture/loom/write"

import { liveTreeOf, type LiveReading } from "../proposing/live"
import { segmentFormsOn } from "./segment-form"
import {
  SEGMENT_CHANGES_PER_PAGE,
  standingChanges,
  type SegmentChange,
  type SegmentChangeStore,
} from "./segment-changes"

/**
 * Writing each segment's form of a page from the changes accepted for it
 * (0386 clauses 5 and 6), through 0376's store, which is where the read door
 * finds it (0392).
 *
 * Two entry points. {@link acceptForSegment} is *Accept for <segment> only*:
 * the change is checked against the segment's form as it stands, taken out of
 * the queue, kept, and the segment's form written with it. {@link
 * rebuildSegmentForms} runs after anything that moves the page a form stands
 * on, so a form is never left behind its page.
 */
export type SegmentFormsGiven = {
  readonly live: LiveReading
  readonly changes: SegmentChangeStore
  readonly forms: Pick<AudienceOverlayStore, "forms" | "setForm">
  readonly deltaId: () => DeltaId
  readonly now: () => number
}

export type SegmentFormsError =
  /** The page already keeps as many changes for segments as one read answers. */
  | { readonly code: "full" }
  /** The change does not apply on top of the segment's form of the page as it is live. */
  | { readonly code: "does-not-fit" }
  /** Somebody answered the change first. */
  | { readonly code: "answered" }
  | { readonly code: "store"; readonly detail: string }

const storeFailure = (detail: string): SegmentFormsError => ({ code: "store", detail })

const writeForms = async (
  given: SegmentFormsGiven,
  pageId: LoomTree["treeId"],
  forms: ReturnType<typeof segmentFormsOn>["forms"],
  actor: string
): Promise<Result<void, SegmentFormsError>> => {
  const authoredAt = new Date(given.now()).toISOString()

  for (const form of forms) {
    const written = await given.forms.setForm(pageId, { ...form, actor, authoredAt })

    if (!written.ok) return err(storeFailure(written.error.code))
  }

  return ok(undefined)
}

const markDropped = async (
  given: SegmentFormsGiven,
  pageId: LoomTree["treeId"],
  dropped: readonly ProposalId[]
): Promise<Result<void, SegmentFormsError>> => {
  const marked = await given.changes.drop(pageId, dropped, given.now())

  return marked.ok ? ok(undefined) : err(storeFailure(marked.error.detail))
}

/** The page as its site is served it now, which every form is a delta against. */
const liveOf = async (
  given: SegmentFormsGiven,
  published: LoomTree
): Promise<Result<LoomTree, SegmentFormsError>> => {
  const live = await liveTreeOf(given.live, published)

  return live.ok ? live : err(storeFailure(live.error.detail))
}

/**
 * Builds again every segment's form of one page that stands behind it.
 *
 * A form already on the live revision with no change of its own dropped is
 * left as it is, so its row keeps who wrote it. A page nothing was accepted on
 * for a segment costs one read.
 */
export const rebuildSegmentForms = async (
  given: SegmentFormsGiven,
  published: LoomTree
): Promise<Result<void, SegmentFormsError>> => {
  const read = await given.changes.forPage(published.treeId)

  if (!read.ok) return err(storeFailure(read.error.detail))

  const standing = standingChanges(read.value)

  if (standing.length === 0) return ok(undefined)

  const live = await liveOf(given, published)

  if (!live.ok) return live

  const listed = await given.forms.forms(published.treeId)

  if (!listed.ok) return err(storeFailure(listed.error.code))

  const built = segmentFormsOn(live.value, standing, given.deltaId)
  const droppedFrom = new Set(
    standing
      .filter((change) => built.dropped.includes(change.proposalId))
      .map((change) => change.audienceId)
  )
  const behind = built.forms.filter(
    (form) =>
      droppedFrom.has(form.audienceId) ||
      listed.value.find((each) => each.audienceId === form.audienceId)?.baseRevision !==
        live.value.revision
  )
  const written = await writeForms(given, published.treeId, behind, "Loom")

  return written.ok ? markDropped(given, published.treeId, built.dropped) : written
}

export type SegmentAcceptance = {
  readonly held: HeldProposal
  /** The page as its site published it, which the change's copy is of. */
  readonly published: LoomTree
  readonly audienceId: AudienceId
  readonly actor: string
}

/**
 * *Accept for <segment> only* (0386 clauses 2 and 5): a change the Gate
 * already judged, narrowed to one segment by a person.
 *
 * The change must apply on top of the changes already accepted for that
 * segment, to the page as it is live; the Gate's verdict for everyone stands
 * for the narrower audience, so it is not run again. The hold is taken before
 * anything is written, which is what makes an answer happen once, as
 * `confirmHeld` does. The change is then kept and the segment's form written
 * with it; a change that could not be kept after its hold was taken is said
 * so, and is no longer waiting.
 */
export const acceptForSegment = async (
  given: SegmentFormsGiven & { readonly holds: Pick<HoldStore, "release"> },
  acceptance: SegmentAcceptance
): Promise<Result<SegmentChange, SegmentFormsError>> => {
  const { held, published, audienceId, actor } = acceptance
  const read = await given.changes.forPage(published.treeId)

  if (!read.ok) return err(storeFailure(read.error.detail))
  if (read.value.length >= SEGMENT_CHANGES_PER_PAGE) return err({ code: "full" })

  const live = await liveOf(given, published)

  if (!live.ok) return live

  const change: SegmentChange = {
    proposalId: held.proposalId,
    pageId: published.treeId,
    audienceId,
    operations: held.proposal.delta.operations,
    acceptedBy: actor,
    acceptedAt: given.now(),
  }
  const ofSegment = standingChanges(read.value).filter((each) => each.audienceId === audienceId)
  /** Only this segment's form is written: another segment's is the rebuild's to bring up to date. */
  const built = segmentFormsOn(live.value, [...ofSegment, change], given.deltaId)

  if (built.dropped.includes(change.proposalId)) return err({ code: "does-not-fit" })

  const taken = await given.holds.release(held.proposalId)

  if (!taken.ok) return err({ code: "answered" })

  const kept = await given.changes.record(change)

  if (!kept.ok) return err(storeFailure(kept.error.detail))

  const written = await writeForms(given, published.treeId, built.forms, actor)

  if (!written.ok) return written

  const marked = await markDropped(given, published.treeId, built.dropped)

  return marked.ok ? ok(change) : marked
}
