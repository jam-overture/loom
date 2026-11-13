/**
 * The live pages a customer's server holds, and the one question a render asks
 * of them.
 *
 * Loom is not in the render path (0262), so a page that an accepted change has
 * moved cannot be fetched while a reader waits for it. What the server does
 * instead is keep the project's live pages in its own process and draw from
 * what it holds — and this is that holding, as a value rather than as a mutable
 * cache. Every pull produces a new one; nothing here is edited in place, so a
 * render that has already read a page cannot have it changed underneath.
 *
 * **A page this does not hold is not an error.** `livePageOf` answers
 * `undefined`, and the caller renders the page as it was built. That is the
 * whole of the fallback a host has to write, and it is the same answer for a
 * server that has never pulled, a pull that failed, and a page the answer did
 * not name.
 */

import type { AudienceId } from "../audience/audience.js"
import {
  composeTreeForContext,
  type AudienceForm,
  type AudienceOverlay,
  type ComposeError,
} from "../audience/compose.js"
import { ruleMatches, type AudienceRule } from "../audience/rule.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import type { LoomTree } from "../tree/tree.js"

/**
 * What a pull leaves behind: the pages, the rules that sort their readers, the
 * tag that names both, and enough of the last outcome to say whether the site
 * is current.
 *
 * The tag, the pages and the rules travel together by construction. A pull that
 * cannot be read moves none of them, so the tag always names what is held beside
 * it — which is what makes it safe to send back as `If-None-Match` — and a site
 * never sorts readers by one pull's rules on another pull's pages (0371 clause
 * 4).
 */
export type LivePages = {
  /** The live pages, by the id of the page each one is. */
  readonly pages: ReadonlyMap<TreeId, LoomTree>
  /**
   * Each live page's segment rules, in the order the portal set. A page with
   * none is absent, and every reader of it is in no segment (0371).
   */
  readonly rules: ReadonlyMap<TreeId, readonly AudienceRule[]>
  /**
   * Each live page's segment forms: the delta one segment's readers are served
   * over the base (0263, 0371). A page with none is absent,
   * and so is a segment that is only a name — which is what every segment was
   * before the door answered forms.
   */
  readonly forms: ReadonlyMap<TreeId, readonly AudienceForm[]>
  /** The entity tag the door gave for exactly these pages, if it gave one. */
  readonly tag: string | undefined
  /** When the door last answered, whether it answered pages or `304`. */
  readonly pulledAt: number | undefined
  /** When these pages arrived, which is older than `pulledAt` after a `304`. */
  readonly freshAt: number | undefined
  /** Failed pulls since the last one the door answered. Zero while current. */
  readonly failures: number
}

/**
 * A server that has not pulled yet, which is every server at the moment it
 * starts.
 *
 * It renders every page as built, so a deployment whose pull is misconfigured
 * serves its site rather than an error — the property the pull exists to keep
 * (0358 clause 4) is true before the first pull as well as after a failed one.
 */
export const NO_LIVE_PAGES: LivePages = {
  pages: new Map(),
  rules: new Map(),
  forms: new Map(),
  tag: undefined,
  pulledAt: undefined,
  freshAt: undefined,
  failures: 0,
}

/**
 * The live page for this page id, or `undefined` to render the page as built.
 *
 * This is the only call a render path makes. Selection for an audience (0263)
 * happens after it, in the customer's process, against the tree this answers —
 * the pull carries no audience and the door refuses a request that names one.
 */
export const livePageOf = (held: LivePages, page: TreeId): LoomTree | undefined =>
  held.pages.get(page)

/**
 * The segment this reader of this page is in, or `undefined` for none — which
 * is `aud_everyone`, and is what a page with no rules answers for every reader.
 *
 * **Decided here, in the site's process, and never sent anywhere** (0262,
 * 0371 clause 2). The context is whatever the host's server knows while it
 * draws the page — `device`, `source`, `returning`, the keys its rules were
 * written against — and none of it leaves this function: what comes out is a
 * segment's name, which the host stamps on the page it renders so the page's
 * signals are filed under it (0284).
 *
 * **One segment, the last rule that matches** (0385). A batch names one
 * audience, so a reader two rules match is counted in one segment rather than
 * in both, which would count one page view twice wherever segments are added
 * up. The last rule is the one the portal orders general to specific, and the
 * one that wins a contested part of the page (0359 clause 3), so it is the form
 * the reader will be served once a segment has a form of its own.
 *
 * **This answers the name a signal is filed under, not the page that is
 * served.** Which deltas a reader gets is `pageForReader`, and it is not the
 * same question: a reader two rules match is in one segment for counting and
 * is served both of their forms, in the deployment's order (0359 clause 3).
 */
export const segmentOf = (
  held: LivePages,
  page: TreeId,
  context: JsonObject | undefined
): AudienceId | undefined =>
  context === undefined
    ? undefined
    : (held.rules.get(page) ?? []).filter((rule) => ruleMatches(rule, context)).at(-1)?.audienceId

/**
 * A page as one reader gets it: what to render, and what to call them while
 * they read it.
 */
export type ServedPage = {
  /** The tree to render — the live page with this reader's forms applied. */
  readonly tree: LoomTree
  /**
   * The segment to file this page view under (0284), or `undefined` for
   * `aud_everyone`. Absent after a refusal, because the reader got the base.
   */
  readonly audience: AudienceId | undefined
  /**
   * Why the forms were not applied, for the host's log. `undefined` on every
   * request a deployment intends, including every request of a page with no
   * segments at all.
   */
  readonly refusal: ComposeError | undefined
}

/**
 * The page and the rules a request composes from, with the rules narrowed to
 * the segments that have a form.
 *
 * **A rule whose segment has no form is left out rather than refused.** A
 * composition assembled by one writer treats a missing delta as a lost write,
 * which is what `no-form` is for; a live pull assembles its overlay from two
 * lists the door answers independently, and a segment that has rules and no
 * form yet is the ordinary state of every segment made before anybody wrote
 * one for it. Readers are still sorted into it (`segmentOf` reads every rule),
 * and they are served the base — which is what they were served on the day the
 * segment was named, and what pieces 1 to 3 of 0371 shipped.
 */
const overlayFor = (
  rules: readonly AudienceRule[],
  forms: readonly AudienceForm[]
): AudienceOverlay => ({
  rules: rules.filter((rule) => forms.some((form) => form.audienceId === rule.audienceId)),
  forms,
})

/**
 * What to render for this reader, and what to file their signals under.
 *
 * The one call a render path makes once a deployment has segments: it answers
 * the live page composed with the forms this reader's segments earn, the
 * segment's name for the page's signals, and — where the forms could not be
 * applied — why.
 *
 * **A form that cannot be applied costs the reader their segment, not their
 * page.** The two properties either side of this are both worth keeping and
 * they pull apart exactly here. A pull that fails costs freshness and never the
 * page (0358 clause 4), so there is always something to render. A composition
 * refuses rather than falling back to the base (0263 clause 4), because a
 * reader served the base whose page views are filed under `aud_eu` makes the
 * comparison between two segments a comparison between one segment's form and
 * another segment's *name over the base*.
 *
 * Dropping the audience keeps both: the reader gets the base page, their
 * signals say what they were actually shown, and the deployment's figures stay
 * a comparison of forms readers were served. The refusal is handed back rather
 * than swallowed because a segment whose form has gone stale is a thing
 * somebody must be told about — it is silent otherwise, and silently serving
 * the base is the state 0263 clause 4 refuses.
 *
 * A deployment with no segments, a reader the rules do not match, and a server
 * that has never pulled all answer the same way: the page, and no segment.
 */
export const pageForReader = (
  held: LivePages,
  built: LoomTree,
  context: JsonObject | undefined
): ServedPage => {
  const base = held.pages.get(built.treeId) ?? built
  const audience = segmentOf(held, built.treeId, context)
  const forms = held.forms.get(built.treeId) ?? []

  if (forms.length === 0) return { tree: base, audience, refusal: undefined }

  const composed = composeTreeForContext(
    base,
    overlayFor(held.rules.get(built.treeId) ?? [], forms),
    context
  )

  return composed.ok
    ? { tree: composed.value.tree, audience, refusal: undefined }
    : { tree: base, audience: undefined, refusal: composed.error }
}

/** Every live page held, in the order the door answered them. */
export const livePagesHeld = (held: LivePages): readonly LoomTree[] => [...held.pages.values()]

/**
 * Whether the server is drawing on pages the door confirmed, rather than on
 * nothing.
 *
 * A site holding pages after ten failed pulls is still serving Loom's pages,
 * which is the behaviour clause 4 asks for and not a state worth hiding. What
 * `failures` is for is saying so out loud in a log; what this is for is the
 * simpler question of whether the door has ever been reached.
 */
export const isPulling = (held: LivePages): boolean => held.pulledAt !== undefined
