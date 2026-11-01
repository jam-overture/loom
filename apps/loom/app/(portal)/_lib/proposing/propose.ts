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
import type { StoreError, TreeStore } from "@jam-overture/loom/store"
import { commitIntent, type WriteOutcome, type WritePath } from "@jam-overture/loom/write"

import { briefFor, type BriefError } from "./brief"
import { readEvidence, type EvidenceSilence } from "./evidence"

/**
 * The AI proposing a change to one published page (0329): read what readers
 * did, decide what to change, and hand that to the write path as a request
 * nobody typed.
 *
 * It proposes against the project's governed copy of the page, never the
 * published table (clause 2), and only while that copy is the version the site
 * serves: the readings are about that version, and a change proposed from them
 * onto a copy that already moved on would be argued from evidence about a page
 * that no longer exists. A page with a change still waiting is left alone, so
 * the queue holds one question per page rather than a pile of them.
 */

/** Who an AI proposal is from, as the record names it. */
export const PROPOSER = "Loom"

/** Why a page had nothing proposed for it, each of which a person can be told. */
export type Passed =
  | { readonly kind: "waiting" }
  | { readonly kind: "unshipped"; readonly copy: number }
  | { readonly kind: "behind"; readonly copy: number }
  | { readonly kind: "silent"; readonly silence: EvidenceSilence }
  | { readonly kind: "nothing"; readonly reason: string }

export type Proposed =
  | { readonly kind: "proposed"; readonly request: string; readonly outcome: WriteOutcome }
  | { readonly kind: "passed"; readonly passed: Passed }

export type ProposeError =
  | { readonly code: "store"; readonly detail: string }
  | { readonly code: "model"; readonly detail: string }

/**
 * The project's governed copy of a page, started from its published tree the
 * first time anything is proposed for it (clause 2).
 *
 * The published tree goes in exactly as the site sent it, revision and all,
 * so the record starts at what the site said it serves. Two proposals at once
 * both create; the store refuses the second, and the second reads what the
 * first made.
 */
export const governedCopyOf = async (
  trees: Pick<TreeStore, "head" | "create">,
  published: LoomTree
): Promise<Result<LoomTree, StoreError>> => {
  const held = await trees.head(published.treeId)

  if (held.ok || held.error.code !== "not-found") return held

  const made = await trees.create(published)

  return made.ok || made.error.code !== "already-exists" ? made : trees.head(published.treeId)
}

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
  /** What decides the request; the path's interpreter then turns it into a change. */
  readonly client: ModelClient
  readonly sources: ReaderWindowSources
  readonly declarations: PartDeclarations
  readonly ids: Pick<IdFactory, "intentId">
  readonly published: LoomTree
  readonly name: string
  readonly at: Date
}

const passed = (reason: Passed): Result<Proposed, ProposeError> =>
  ok({ kind: "passed", passed: reason })

const fromBrief = (error: BriefError): ProposeError => ({ code: "model", detail: error.detail })

export const proposeFor = async (given: ProposeFor): Promise<Result<Proposed, ProposeError>> => {
  const { path, published } = given
  const copy = await governedCopyOf(path.store, published)

  if (!copy.ok) return err({ code: "store", detail: copy.error.code })
  if (copy.value.revision > published.revision) {
    return passed({ kind: "unshipped", copy: copy.value.revision })
  }
  if (copy.value.revision < published.revision) {
    return passed({ kind: "behind", copy: copy.value.revision })
  }

  const waiting = await path.holds.forTree(published.treeId)

  if (!waiting.ok) return err({ code: "store", detail: waiting.error.code })
  if (waiting.value.held.length > 0) return passed({ kind: "waiting" })

  const evidence = await readEvidence(given.sources, given.declarations, published)

  if (!evidence.ok) {
    return evidence.error.kind === "unavailable"
      ? err({ code: "store", detail: evidence.error.detail })
      : passed({ kind: "silent", silence: evidence.error })
  }

  const brief = await briefFor(given.client, given.name, evidence.value)

  if (!brief.ok) return err(fromBrief(brief.error))
  if (brief.value.kind === "nothing") return passed({ kind: "nothing", reason: brief.value.reason })

  const outcome = await commitIntent(
    path,
    intentFor({ ids: given.ids, page: copy.value, request: brief.value.request, at: given.at })
  )

  return ok({ kind: "proposed", request: brief.value.request, outcome })
}
