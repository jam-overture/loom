import type { LoomTree } from "@jam-overture/loom"

import { ASKS } from "./adapt/asks"
import { pageTreeFor, type SitePageContext } from "./render"
import { DEFAULT_THEME, SITE_ROUTES, type SiteRoute } from "./site"

/**
 * Every state this site can be served in, built once and shared.
 *
 * **The rules that read this site's copy read the page as it is written, and the
 * page a visitor gets is not that page.** `treeFor` returns a route's tree
 * before anything the request supplies; `pageTreeFor` returns the tree a
 * visitor is actually served, which on the mechanism page carries the record of
 * whatever they asked for. Measured the day this module was written, on a
 * sweep of all three routes:
 *
 * | | the page as written | the page as served |
 * | --- | --- | --- |
 * | strings a reader reads | 194 | **253** |
 * | words on `/how-it-works` | 862 | **1,318** |
 * | words on the site | 2,516 | **2,972** |
 * | widest band | 259 | **638** |
 *
 * So 59 strings and 456 words of this site had never been read by the register
 * check, the plain-language rules or the copy budget. That is a third of the
 * largest page, and it is the band whose whole job is to be read closely. Not
 * because anybody decided it was out of scope: because each of those rules was
 * written against the function that was in front of whoever wrote it.
 *
 * `voice.test.ts` learned this once already and only for itself. Its register
 * check moved off `treeFor` on 24 August, with a note saying *"a register test
 * that cannot see the machinery is a register test that passes for the wrong
 * reason"* — and the two rules added to the same file on 1 October were written
 * against `treeFor` anyway, as was the budget on the 1st. A fix applied to one
 * assertion is not a fix; this module is the same fix applied once, where the
 * next rule will find it.
 */

/**
 * What the visitor can have asked for, which is the only part of a request that
 * changes what a page says.
 *
 * Three fields rather than the whole context: the choice, whether they said yes
 * to a change the rules held, and whether they then asked for it back. Every
 * other field of `SitePageContext` is either the origin, the palette — neither
 * of which is a word — or something the site supplies to itself.
 */
type AskState = Pick<SitePageContext, "ask" | "approve" | "back" | "backApprove">

/**
 * No request, then every request crossed with both answers a visitor can give.
 *
 * `back` and `backApprove` move together because the undo is weighed by the
 * same rules as anything else and a visitor who asks for a change back is asked
 * the same question about it. Asking for it back without answering is a state of
 * the page, and it is the `back: true` half of that pair rather than a third
 * value.
 *
 * It is a cross product rather than a hand-written list for the reason the
 * register sweep is written over `SITE_ROUTES` rather than page by page: a sixth
 * choice added to `asks.ts` is swept the moment it exists, and a list somebody
 * has to remember to extend is a list that eventually describes the site of a
 * fortnight ago.
 */
export const ASK_STATES: readonly AskState[] = [
  {},
  ...ASKS.flatMap((ask) =>
    [false, true].flatMap((approve) =>
      [false, true].map((back) => ({ ask: ask.id, approve, back, backApprove: back }))
    )
  ),
]

/**
 * Both deployments, because a deployment that counts its readers says so.
 *
 * The footer carries a sentence about it and `/what-you-run` carries a second
 * one, so a sweep over one value of this is a sweep over half the site's copy
 * in two places. Palettes are deliberately not crossed: what a theme changes is
 * colour and type, and neither is a word.
 */
export const DEPLOYMENTS: readonly boolean[] = [false, true]

/** A page of this site, and the state it was served in. */
export type ServedPage = {
  readonly route: SiteRoute
  /** The state, as a short string for a failure message: `calmer/yes/put back/counting`. */
  readonly state: string
  /** Which deployment this is, kept as the value rather than read back out of `state`. */
  readonly counting: boolean
  readonly tree: LoomTree
}

const describe = (ask: AskState, counting: boolean): string =>
  [
    ask.ask ?? "no request",
    ...(ask.ask === undefined ? [] : [ask.approve === true ? "yes" : "no"]),
    ...(ask.back === true ? ["put back"] : []),
    counting ? "counting" : "not counting",
  ].join("/")

const ORIGIN = "https://loom.example"

/**
 * Every page, in every state, in document order of the routes.
 *
 * Awaited rather than computed at module scope: the mechanism page's tree is
 * the result of a real request through the whole sequence, so there is no
 * synchronous version of this and there should not be one. A caller builds it
 * in `beforeAll` and asserts against the list.
 *
 * **It is this lane's own belt and braces that the count is asserted by its
 * callers.** A sweep over a list that came back empty passes, which this lane
 * filed on 27 September as a test whose expected value came from the code under
 * test, so `servedPages` is useless on its own: what makes it a check is a
 * caller saying how many states it expected to look at.
 */
export const servedPages = async (): Promise<readonly ServedPage[]> => {
  const pages: ServedPage[] = []

  for (const route of SITE_ROUTES) {
    for (const counting of DEPLOYMENTS) {
      for (const ask of ASK_STATES) {
        pages.push({
          route,
          counting,
          state: describe(ask, counting),
          tree: await pageTreeFor(route, {
            origin: ORIGIN,
            theme: DEFAULT_THEME,
            counting,
            ...ask,
          }),
        })
      }
    }
  }

  return pages
}

/** How many states the sweep above covers, stated so a caller can check it. */
export const SERVED_STATE_COUNT = SITE_ROUTES.length * DEPLOYMENTS.length * ASK_STATES.length
