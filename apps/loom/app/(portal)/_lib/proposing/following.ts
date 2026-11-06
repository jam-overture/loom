import {
  applyDelta,
  compareTrees,
  err,
  ok,
  type IdFactory,
  type LoomTree,
  type Result,
  type TreeError,
  type TreeId,
} from "@jam-overture/loom"
import type { StoreError, TreeStore } from "@jam-overture/loom/store"
import type { HeldProposal, HoldStore } from "@jam-overture/loom/write"

import {
  copiesOfPage,
  currentCopyOf,
  pageOfCopy,
  type PageCopy,
  type PageCopyStore,
} from "./copies"

/**
 * Keeping a page's copy on the version its site serves (0340).
 *
 * A copy that no accepted change has moved starts again from the site's newer
 * version, and every change waiting on the old copy is checked against the new
 * one: a change whose operations still apply waits on, marked as proposed for
 * an older version; a change whose operations no longer apply stays on the old
 * copy, marked as conflicting, and can only be turned down.
 *
 * A copy an accepted change has moved is left where it is until the site
 * serves what it reached, since starting again would lose the change. Unit 8
 * replaces this: the site pulls the copy itself and a newer snapshot replays
 * the accepted changes onto it (0356).
 */

/** Where a page's copy stands against what its site serves. */
export type Followed =
  /** The copy is the page the site serves. */
  | { readonly kind: "serving"; readonly copy: LoomTree }
  /** The copy carries accepted changes the site does not serve yet. */
  | { readonly kind: "unshipped"; readonly copy: LoomTree }
  /** The site sent a different page, and this deployment serves the copy instead (0259). */
  | { readonly kind: "apart"; readonly copy: LoomTree }
  /** The copy started again from the site's version; waiting changes were carried or left conflicting. */
  | {
      readonly kind: "followed"
      readonly copy: LoomTree
      readonly carried: number
      readonly conflicting: number
    }

export type FollowError = { readonly code: "store"; readonly detail: string }

export type Following = {
  readonly trees: Pick<TreeStore, "head" | "create" | "revisions">
  readonly holds: Pick<HoldStore, "forTree" | "hold" | "release">
  readonly copies: PageCopyStore
  readonly ids: Pick<IdFactory, "treeId" | "proposalId" | "deltaId">
  readonly now: () => number
  /** False for this deployment's own site, whose pages are served from the copy itself (0259). */
  readonly follows: boolean
}

/** Whether a change still waiting is for the version the site serves (0340 clause 3). */
export type HoldStanding = "current" | "stale" | "conflicts"

const storeFailure = (detail: string): FollowError => ({ code: "store", detail })

/**
 * A copy of a page under the given id, made from the published tree the first
 * time it is asked for (0329 clause 2).
 *
 * The published tree goes in as the site sent it, revision and all, so the
 * record starts at what the site said it serves. Two runs at once both create;
 * the store refuses the second, and the second reads what the first made.
 */
export const governedCopyOf = async (
  trees: Pick<TreeStore, "head" | "create">,
  published: LoomTree,
  copyId: TreeId
): Promise<Result<LoomTree, StoreError>> => {
  const held = await trees.head(copyId)

  if (held.ok || held.error.code !== "not-found") return held

  const made = await trees.create({ ...published, treeId: copyId })

  return made.ok || made.error.code !== "already-exists" ? made : trees.head(copyId)
}

/** Whether two trees are the same page, part for part; ids and revisions aside. Pure. */
export const samePage = (left: LoomTree, right: LoomTree): boolean =>
  compareTrees(left, right).length === 0

/**
 * A waiting change, carried onto another copy of its page, or why it cannot be.
 *
 * Its operations are kept exactly and only re-addressed, so the person who
 * answers it is answering what was proposed. The intent keeps its id and when
 * it was observed, which is how the change reads as proposed for an older
 * version. The Gate's verdict is kept for the queue to show and is not
 * trusted: accepting it runs the Gate again against the copy as it then stands.
 */
export const carriedOnto = (
  held: HeldProposal,
  copy: LoomTree,
  ids: Pick<IdFactory, "proposalId" | "deltaId">
): Result<HeldProposal, TreeError> => {
  const delta = {
    ...held.proposal.delta,
    deltaId: ids.deltaId(),
    treeId: copy.treeId,
    baseRevision: copy.revision,
  }
  const applies = applyDelta(copy, delta)

  if (!applies.ok) return applies

  const proposalId = ids.proposalId()

  return ok({
    ...held,
    proposalId,
    treeId: copy.treeId,
    baseRevision: copy.revision,
    intent: { ...held.intent, treeId: copy.treeId, baseRevision: copy.revision },
    proposal: { ...held.proposal, proposalId, delta },
  })
}

/**
 * Where a waiting change stands against the copy proposals are now made
 * against. Pure.
 *
 * A change on an older copy is one that could not be carried; a change on the
 * current copy observed before that copy started was proposed for an older
 * version and carried.
 */
export const holdStandingOf = (held: HeldProposal, copies: readonly PageCopy[]): HoldStanding => {
  const current = currentCopyOf(copies, pageOfCopy(copies, held.treeId))

  if (current.copyId !== held.treeId) return "conflicts"

  return Date.parse(held.intent.observedAt) < current.startedAt ? "stale" : "current"
}

/** Every change waiting on any copy of a page, oldest copy first. */
export const waitingOnPage = async (
  holds: Pick<HoldStore, "forTree">,
  copies: readonly PageCopy[],
  pageId: TreeId
): Promise<Result<readonly HeldProposal[], FollowError>> => {
  const listings = await Promise.all(
    copiesOfPage(copies, pageId).map((copy) => holds.forTree(copy.copyId))
  )
  const failed = listings.find((listing) => !listing.ok)

  if (failed !== undefined && !failed.ok) return err(storeFailure(failed.error.code))

  return ok(listings.flatMap((listing) => (listing.ok ? listing.value.held : [])))
}

/**
 * Start a new copy from the site's version and carry the old copy's waiting
 * changes onto it.
 *
 * Each carried change is held on the new copy before it is released from the
 * old one, so a run cut off between the two leaves the change twice rather
 * than not at all; the old one then reads as conflicting and is turned down.
 */
const startAgain = async (
  given: Following,
  published: LoomTree,
  from: PageCopy
): Promise<Result<Followed, FollowError>> => {
  const copyId = given.ids.treeId()
  const copy = await governedCopyOf(given.trees, published, copyId)

  if (!copy.ok) return err(storeFailure(copy.error.code))

  const started = await given.copies.start({
    pageId: published.treeId,
    copyId,
    startedAt: given.now(),
  })

  if (!started.ok) return err(storeFailure(started.error.detail))

  const waiting = await given.holds.forTree(from.copyId)

  if (!waiting.ok) return err(storeFailure(waiting.error.code))

  const outcomes = await Promise.all(
    waiting.value.held.map(async (held) => {
      const carried = carriedOnto(held, copy.value, given.ids)

      if (!carried.ok) return false

      const kept = await given.holds.hold(carried.value)

      if (kept.ok) await given.holds.release(held.proposalId)

      return kept.ok
    })
  )
  const carried = outcomes.filter(Boolean).length

  return ok({
    kind: "followed",
    copy: copy.value,
    carried,
    conflicting: outcomes.length - carried,
  })
}

/** Bring a page's copy to the version its site serves, as far as it can be (0340). */
export const followPublished = async (
  given: Following,
  published: LoomTree
): Promise<Result<Followed, FollowError>> => {
  const copies = await given.copies.list()

  if (!copies.ok) return err(storeFailure(copies.error.detail))

  const current = currentCopyOf(copies.value, published.treeId)
  const copy = await governedCopyOf(given.trees, published, current.copyId)

  if (!copy.ok) return err(storeFailure(copy.error.code))

  const same = samePage(copy.value, published)

  if (!given.follows) return ok({ kind: same ? "serving" : "apart", copy: copy.value })

  const accepted = await given.trees.revisions(current.copyId, { direction: "older", limit: 1 })

  if (!accepted.ok) return err(storeFailure(accepted.error.code))

  const moved = accepted.value.revisions.length > 0

  if (same && !moved) return ok({ kind: "serving", copy: copy.value })
  if (!same && moved) return ok({ kind: "unshipped", copy: copy.value })

  /**
   * Either the site published a page the copy has not seen, or it now serves
   * what accepted changes took the copy to. Both are the site's version, and
   * the copy starts again from it.
   */
  return startAgain(given, published, current)
}
