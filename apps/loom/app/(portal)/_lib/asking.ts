import {
  err,
  ok,
  type EditIntent,
  type IdFactory,
  type LoomTree,
  type Result,
} from "@jam-overture/loom"
import {
  DEFAULT_APPLICATION_ID,
  type ApplicationId,
  type StoreError,
  type TreeStore,
} from "@jam-overture/loom/store"

import { ceilingOf, type Role } from "./auth/roles"
import type { WriteReport } from "./outcome"
import type { OutcomeTone } from "./vocabulary"

/**
 * A person asking for a change to one of their site's pages (0329), as the
 * three things it is made of before the write path takes over: who may ask,
 * what they asked, and the governed copy it is asked against.
 */

/** Anybody who could accept a change may ask for one; a viewer accepts nothing (clause 1). */
export const mayAsk = (role: Role): boolean => ceilingOf(role) !== null

/** Long enough for a paragraph of instructions, short enough to be one request. */
export const MAX_REQUEST_LENGTH = 500

/** What a person typed, as a request, or the sentence that says why it is not one. */
export const requestOf = (typed: unknown): Result<string, string> => {
  const request = typeof typed === "string" ? typed.trim() : ""

  if (request.length === 0) return err("Say what you would like changed.")
  if (request.length > MAX_REQUEST_LENGTH) {
    return err(`Keep it to ${MAX_REQUEST_LENGTH} characters, so it is one change.`)
  }

  return ok(request)
}

/**
 * The project's governed copy of a page, started from its published tree the
 * first time anybody asks (clause 2).
 *
 * The published tree goes in exactly as the site sent it, revision and all,
 * so the record starts at what the site said it serves. Two people asking at
 * once both create; the store refuses the second, and the second reads what
 * the first made.
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

/** The intent the write path composes from: this request, against this version of the page. */
export const intentFor = ({
  ids,
  page,
  request,
  actor,
  at,
}: {
  readonly ids: Pick<IdFactory, "intentId">
  readonly page: LoomTree
  readonly request: string
  readonly actor: string
  readonly at: Date
}): EditIntent => ({
  intentId: ids.intentId(),
  treeId: page.treeId,
  baseRevision: page.revision,
  origin: "user-instruction",
  actor,
  utterance: request,
  observedAt: at.toISOString(),
})

/**
 * What a change asked for here means for the site, in place of the portal's
 * general sentence, which speaks of screens this portal no longer has.
 *
 * Only this deployment's own application serves its copy: its governed pages
 * are the ones its marketing site renders (0259). Every other project's site
 * keeps serving what it published (clause 6).
 */
const askedMeaning = (tone: OutcomeTone, servesCopy: boolean): string | undefined => {
  switch (tone) {
    case "applied":
      return servesCopy
        ? "Loom's copy of this page has the change, and this deployment's own site serves that copy, so it is live."
        : "Loom's copy of this page has the change. Your site keeps serving what it published."
    case "awaiting":
      return "It is under Waiting until an approver or owner who may accept it says yes or no."
    default:
      return undefined
  }
}

/** A write's report, saying what it means for this project's site. */
export const askedReport = (report: WriteReport, application: ApplicationId): WriteReport => ({
  ...report,
  meaning: askedMeaning(report.tone, application === DEFAULT_APPLICATION_ID) ?? report.meaning,
})
