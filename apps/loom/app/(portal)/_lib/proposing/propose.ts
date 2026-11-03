import {
  err,
  ok,
  type EditIntent,
  type IdFactory,
  type LoomTree,
  type ModelClient,
  type Result,
} from "@jam-overture/loom"
import type { PartDeclarations, ReaderWindowSources } from "@jam-overture/loom/signals"
import { commitIntent, type WriteOutcome, type WritePath } from "@jam-overture/loom/write"

import { briefFor, type BriefError } from "./brief"
import type { PageCopyStore } from "./copies"
import { readEvidence, type EvidenceSilence } from "./evidence"
import { followPublished, waitingOnPage } from "./following"
import { REMEMBERED_PER_PAGE, type TurnedDownStore } from "./turned-down"

/**
 * The AI proposing a change to one published page (0329): read what readers
 * did, decide what to change, and hand that to the write path as a request
 * nobody typed.
 *
 * It proposes against the project's governed copy of the page, never the
 * published table (clause 2), and only while that copy is the page the site
 * serves: the readings are about that page. So the copy is first brought to
 * the site's newest version where it can be (0340), and a page whose copy
 * carries accepted changes the site does not serve yet is left alone. A page
 * with a change still waiting, on any copy of it, is left alone too, so the
 * queue holds one question per page rather than a pile of them.
 *
 * The model is shown what was turned down on the page before, and weighs a
 * change against it (0341).
 */

/** Who an AI proposal is from, as the record names it. */
export const PROPOSER = "Loom"

/** Why a page had nothing proposed for it, each of which a person can be told. */
export type Passed =
  | { readonly kind: "waiting" }
  | { readonly kind: "unshipped"; readonly copy: number }
  | { readonly kind: "apart" }
  | { readonly kind: "silent"; readonly silence: EvidenceSilence }
  | { readonly kind: "nothing"; readonly reason: string }

export type Proposed =
  | { readonly kind: "proposed"; readonly request: string; readonly outcome: WriteOutcome }
  | { readonly kind: "passed"; readonly passed: Passed }

export type ProposeError =
  | { readonly code: "store"; readonly detail: string }
  | { readonly code: "model"; readonly detail: string }

/** The intent the write path composes from: the AI's request, against this version of the page. */
export const intentFor = ({
  ids,
  page,
  request,
  at,
}: {
  readonly ids: Pick<IdFactory, "intentId">
  readonly page: LoomTree
  readonly request: string
  readonly at: Date
}): EditIntent => ({
  intentId: ids.intentId(),
  treeId: page.treeId,
  baseRevision: page.revision,
  origin: "system-signal",
  actor: PROPOSER,
  utterance: request,
  observedAt: at.toISOString(),
})

export type ProposeFor = {
  readonly path: WritePath
  readonly copies: PageCopyStore
  readonly turnedDown: Pick<TurnedDownStore, "forPage">
  /** False for this deployment's own site, which serves the copy itself (0259). */
  readonly follows: boolean
  /** What decides the request; the path's interpreter then turns it into a change. */
  readonly client: ModelClient
  readonly sources: ReaderWindowSources
  readonly declarations: PartDeclarations
  readonly ids: Pick<IdFactory, "intentId" | "treeId" | "proposalId" | "deltaId">
  readonly published: LoomTree
  readonly name: string
  readonly at: Date
}

const passed = (reason: Passed): Result<Proposed, ProposeError> =>
  ok({ kind: "passed", passed: reason })

const fromBrief = (error: BriefError): ProposeError => ({ code: "model", detail: error.detail })

export const proposeFor = async (given: ProposeFor): Promise<Result<Proposed, ProposeError>> => {
  const { path, published } = given
  const followed = await followPublished(
    {
      trees: path.store,
      holds: path.holds,
      copies: given.copies,
      ids: given.ids,
      now: () => given.at.getTime(),
      follows: given.follows,
    },
    published
  )

  if (!followed.ok) return err(followed.error)
  if (followed.value.kind === "unshipped") {
    return passed({ kind: "unshipped", copy: followed.value.copy.revision })
  }
  if (followed.value.kind === "apart") return passed({ kind: "apart" })

  const copies = await given.copies.list()

  if (!copies.ok) return err({ code: "store", detail: copies.error.detail })

  const waiting = await waitingOnPage(path.holds, copies.value, published.treeId)

  if (!waiting.ok) return err(waiting.error)
  if (waiting.value.length > 0) return passed({ kind: "waiting" })

  const evidence = await readEvidence(given.sources, given.declarations, published)

  if (!evidence.ok) {
    return evidence.error.kind === "unavailable"
      ? err({ code: "store", detail: evidence.error.detail })
      : passed({ kind: "silent", silence: evidence.error })
  }

  const turnedDown = await given.turnedDown.forPage(published.treeId, REMEMBERED_PER_PAGE)

  if (!turnedDown.ok) return err({ code: "store", detail: turnedDown.error.detail })

  const brief = await briefFor(given.client, given.name, evidence.value, turnedDown.value)

  if (!brief.ok) return err(fromBrief(brief.error))
  if (brief.value.kind === "nothing") return passed({ kind: "nothing", reason: brief.value.reason })

  const outcome = await commitIntent(
    path,
    intentFor({
      ids: given.ids,
      page: followed.value.copy,
      request: brief.value.request,
      at: given.at,
    })
  )

  return ok({ kind: "proposed", request: brief.value.request, outcome })
}
