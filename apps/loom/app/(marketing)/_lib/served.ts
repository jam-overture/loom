import type { LoomTree } from "@jam-overture/loom"

import { ASKS } from "./adapt/asks"
import { pageTreeFor, type SitePageContext } from "./render"
import { askPath, DEFAULT_THEME, isAskedRoute, SITE_ROUTES, sitePath, type SiteRoute } from "./site"

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
 * **The deployment is no longer a dimension of this sweep, as of 21 October.**
 *
 * It was `[false, true]` — whether the deployment counts its readers — and the
 * reason given here was that *"the footer carries a sentence about it and
 * `/what-you-run` carries a second one, so a sweep over one value of this is a
 * sweep over half the site's copy in two places."* **Neither sentence has
 * existed since 12 October**, when the maintainer had the message taken off
 * the site whether it is counting or not, and `readers/counting.test.ts` has
 * asserted the absence of both ever since.
 *
 * So the dimension doubled every sweep over a tree that could not differ, and
 * it was measured rather than argued before it came out: 150 states built in
 * 518ms, and **150 of the 150 had a byte-identical twin in the other
 * deployment.** `servedPages()` is awaited eight times across six test files,
 * so that was roughly 600 page builds per suite run producing a tree the same
 * run already held, and the mechanism page's share of them ran the whole
 * request sequence twice each.
 *
 * Whether readers are counted is a render option now and decides what the
 * markup carries, never what the page says, so there is nothing here for a
 * sweep over copy to find. `stored.test.ts` is what holds that: no page
 * builder and no chrome module may read the setting at all. Palettes are
 * deliberately still not crossed, for the reason this dimension turned out to
 * share — what a theme changes is colour and type, and neither is a word.
 */

/** A page of this site, and the state it was served in. */
export type ServedPage = {
  readonly route: SiteRoute
  /** The state, as a short string for a failure message: `calmer/yes/put back`. */
  readonly state: string
  /**
   * The address a visitor reading this tree is at.
   *
   * It is here rather than worked out by whoever needs it, because working it
   * out means knowing which of this site's three pages is a function of a
   * request — and a sweep that got that wrong would compare a page against an
   * address nobody is ever at and find nothing, which is the shape of silent
   * pass this module already has two paragraphs against.
   *
   * On the mechanism page it is the request, spelled by the same function the
   * site's own controls are spelled by, so a rule about where a link goes is
   * comparing two strings written by one writer. On the other two it is the
   * path: they read the whole address and serve the same page either way, which
   * `addressed.test.ts` measures rather than assumes, so there is no state of
   * them a visitor arrives at under a query of their own.
   */
  readonly address: string
  readonly tree: LoomTree
}

const addressOf = (route: SiteRoute, ask: AskState): string =>
  isAskedRoute(route) && ask.ask !== undefined
    ? askPath({
        ask: ask.ask,
        ...(ask.approve === true ? { approve: true } : {}),
        ...(ask.back === true ? { back: true } : {}),
        ...(ask.backApprove === true ? { backApprove: true } : {}),
      })
    : sitePath(route.path)

const describe = (ask: AskState): string =>
  [
    ask.ask ?? "no request",
    ...(ask.ask === undefined ? [] : [ask.approve === true ? "yes" : "no"]),
    ...(ask.back === true ? ["put back"] : []),
  ].join("/")

/**
 * The origin a link read off one of these trees is resolved against.
 *
 * Exported as of 16 October because a second sweep wanted it. `docs-pages.test.ts`
 * reads the links off these same trees, and `pathsLinkedFrom` needs an origin to
 * tell this site's own addresses from anybody else's — so a second literal there
 * would be a sweep that silently found nothing the day this one changed.
 *
 * **It is no longer the origin these pages are built for**, as of today, because
 * no page of this site is built for one: a builder is handed a palette and
 * whatever the address asked for, and every href it writes is a path. So this is
 * the base a relative href is parsed against and nothing else, and
 * `routes.test.ts` is what holds the trees to carrying no host of their own.
 */
export const ORIGIN_FOR_TESTS = "https://loom.example"

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
    for (const ask of ASK_STATES) {
      pages.push({
        route,
        state: describe(ask),
        address: addressOf(route, ask),
        tree: await pageTreeFor(route, { theme: DEFAULT_THEME, ...ask }),
      })
    }
  }

  return pages
}

/** How many states the sweep above covers, stated so a caller can check it. */
export const SERVED_STATE_COUNT = SITE_ROUTES.length * ASK_STATES.length

/** What a sweep came back with, in the two shapes a caller has its own expectation for. */
export type SweepCover = {
  /** How many states it came back with, against which `SERVED_STATE_COUNT` is the arithmetic. */
  readonly states: number
  /** The pages it reached, sorted, so it compares against `SITE_PATHS` as written. */
  readonly routes: readonly string[]
}

/**
 * What a sweep reached, read off the sweep and compared against nothing.
 *
 * **Every rule in this route group that sweeps `servedPages` is of the form
 * *nothing on this site is X*, and a sweep that came back with nothing
 * satisfies all of them.** The guard against that was one line, in each of the
 * files that had one:
 *
 * ```ts
 * expect(pages).toHaveLength(SERVED_STATE_COUNT)
 * ```
 *
 * `SERVED_STATE_COUNT` is computed by this module out of `SITE_ROUTES` and
 * `ASK_STATES`, so when either goes empty the sweep returns nothing, the
 * constant is zero, and the line passes. It is this lane's 27 September filing
 * — *a test whose expected value came from the code under test* — sitting in
 * the one assertion written to prevent it.
 *
 * **Measured on 23 October rather than argued**, with `SITE_ROUTES` emptied and
 * the seven sweep files run against a site with no pages:
 *
 * | | |
 * | --- | --- |
 * | tests named for holding the sweep that were **green** | **2 of the 6 that existed** — `budget.test.ts` and `routes.test.ts`; the four that went red are the four given a hand-written floor on 22 October |
 * | rules of the form *nothing on this site is X* that were **green** | **6**, four of them `budget.test.ts`' ceilings and one `routes.test.ts`' whole point |
 * | `docs-pages.test.ts` on a sweep that lost **a third of the site** | **29 of 29 green** — it had no guard at all |
 *
 * The seven files did go red, which is the thing that made this look held: they
 * went red on `voice.test.ts`' maintainer's-line assertions, on `naming.test.ts`'
 * `PAGE_NAMES` list, on `docs-pages.test.ts`' deep-link floor. **Not one of
 * those failures says the sweep came back with nothing** — they say this site
 * stopped carrying the maintainer's own line and stopped linking into the
 * documentation, which sends the next run reading copy and bands. The reason is
 * the thing a guard buys, and `docs-pages.test.ts`' own docblock is where that
 * argument was already written down.
 *
 * ## It hands back a reading and never an expectation
 *
 * That is the line that keeps this out of the trap above. Both fields are
 * counted off the array it was given. The values they are compared against are
 * `SERVED_STATE_COUNT` for the arithmetic, `SITE_PATHS` from the module that
 * *declares* the site, and `PAGES_AT_LEAST`, which is hand-written and the only
 * number in the pair that nothing computes — so on a site with no pages the
 * first comparison still passes and the floor is what fails. A caller states
 * all three, because what makes this a check is a caller saying what it
 * expected to look at: the position the head of this module takes, unchanged.
 *
 * ## What it does not do
 *
 * **It does not refuse a thin sweep.** `servedPages` throwing on one is the
 * shape that would make the guard unforgettable, and `docs-pages.test.ts` is
 * the measured proof that a caller-stated guard is a guard a caller can forget.
 * It is not taken here because it would make the floor below unreachable in
 * every caller, and a dead assertion is worse than an absent one. It is filed
 * with the measurement that argues for it.
 */
export const sweepCover = (pages: readonly ServedPage[]): SweepCover => ({
  states: pages.length,
  routes: [...new Set(pages.map((page) => page.route.path))].sort(),
})

/** What a sweep over the states above found, counted per state rather than in total. */
export type SweepShare = {
  /**
   * The states that contributed nothing, named the way a failure message wants
   * them: `/how-it-works (shorter/yes)`.
   */
  readonly quiet: readonly string[]
  /** Everything the sweep found, which is what a total floor used to be written against. */
  readonly found: number
  /** What one state contributed on average. Zero when the sweep had no states to read. */
  readonly each: number
}

/**
 * A sweep's size, expressed so that a floor under it does not move when the
 * sweep changes shape.
 *
 * **A floor exists to catch a sweep that silently stopped finding things**, and
 * a floor written as a total cannot do that job for long, because a total is
 * the product of what the sweep reads and how many states it reads it in. On
 * 21 October the deployment stopped being a dimension of `servedPages` — both
 * of its halves had been the same tree since the 12th, so the sweep had been
 * reading every word on this site twice — and two floors in two files went red
 * for a change that touched no copy at all:
 *
 * ```
 * voice.test.ts    expected 75 to be greater than or equal to 126    // 3 * 2 * 21
 * naming.test.ts   expected 550 to be greater than or equal to 600
 * ```
 *
 * Neither failure was about the change, and `naming.test.ts` carried a second
 * floor that would have been the next one. Both were re-measured by hand that
 * day, which is the fix that lasts until the next time the sweep's shape moves.
 *
 * **Deriving the floor from `SERVED_STATE_COUNT` is the wrong way out**, and
 * this lane filed why on 27 September: an expected value taken from the code
 * under test means a sweep that returned nothing expects nothing and passes.
 * So this divides by the states the sweep **actually came back with**, and a
 * caller still has to say separately that it got states at all — the two
 * assertions are independent, and it takes both to fail an empty sweep.
 *
 * `quiet` is the stronger half and is what an average cannot say: a sweep that
 * stopped reading one page of three keeps two thirds of its average and is
 * still broken. It is only worth asserting on a reading every state really does
 * have — mentions and copy, not the sparse ones — so it is reported rather than
 * enforced here.
 */
export const sweepShare = (
  pages: readonly ServedPage[],
  counted: (page: ServedPage) => number
): SweepShare => {
  const counts = pages.map((page) => ({ page, count: counted(page) }))
  const found = counts.reduce((sum, { count }) => sum + count, 0)

  return {
    quiet: counts
      .filter(({ count }) => count === 0)
      .map(({ page }) => `${page.route.path} (${page.state})`),
    found,
    each: pages.length === 0 ? 0 : found / pages.length,
  }
}
