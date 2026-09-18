import type { LoomTree } from "@loom/runtime"
import { renderLoomTree, type RenderOutput } from "@loom/runtime/react"

import { askById, type Ask } from "./adapt/asks"
import { runHistory, type ChangeHistory } from "./adapt/history"
import { paperTrailFor, type PaperTrail } from "./adapt/paper-trail"
import type { ChangeRecord } from "./adapt/record"
import { weighEachAsker, type WeighedRequest } from "./adapt/askers"
import { roundTripsOn, type RoundTrip } from "./adapt/round-trip"
import { runAsk, type AskRun } from "./adapt/run"
import { runUndo } from "./adapt/undo"
import { siteFrameOrigins } from "./frames"
import { piecesIn } from "./measure"
import { homePageTree } from "./pages/home"
import { howItWorksPageTree, type MechanismContext } from "./pages/how-it-works"
import { puttingItBackPageTree, type BackContext } from "./pages/putting-it-back"
import { theRecordPageTree, type RecordContext } from "./pages/the-record"
import { theRulesPageTree } from "./pages/the-rules"
import { whatReadersDoPageTree } from "./pages/what-readers-do"
import { whatYouRunPageTree } from "./pages/what-you-run"
import {
  DEMONSTRATED_ASK,
  whenItGoesWrongPageTree,
  type RefusalContext,
  type RefusedRun,
} from "./pages/when-it-goes-wrong"
import { whoCanAskPageTree, type AskersContext } from "./pages/who-can-ask"
import { yourComponentsPageTree } from "./pages/your-components"
import { readersCountedHere } from "./readers/counting"
import { siteRegistry, siteThemes } from "./registry"
import {
  HOME,
  HOW_IT_WORKS,
  PUTTING_IT_BACK,
  THE_RECORD,
  THE_RULES,
  WHAT_READERS_DO,
  WHAT_YOU_RUN,
  WHEN_IT_GOES_WRONG,
  WHO_CAN_ASK,
  YOUR_COMPONENTS,
  siteOrigin,
  type SiteRoute,
} from "./site"

/**
 * Route → tree → rendered page, in one place.
 *
 * Every route resolves through here, so the two things a page needs to be
 * correct — the registry that validates its props, and the theme registry that
 * resolves what its root is wearing — cannot be passed on one route and
 * forgotten on the next.
 */

/**
 * Everything a page of this site can be handed.
 *
 * One type rather than one per page, because the map below is keyed by path and
 * a builder is looked up rather than called by name. Every field past the origin
 * and the palette is optional and belongs to one page — what the visitor asked
 * the front door for, and the run of changes the record page is reporting on —
 * so a page that does not read a field cannot be broken by one arriving.
 */
export type SitePageContext = RecordContext &
  MechanismContext &
  RefusalContext &
  AskersContext &
  BackContext

export type PageBuilder = (context: SitePageContext) => LoomTree

export const SITE_PAGES: ReadonlyMap<string, PageBuilder> = new Map<string, PageBuilder>([
  [HOME.path, homePageTree],
  [HOW_IT_WORKS.path, howItWorksPageTree],
  [THE_RULES.path, theRulesPageTree],
  [THE_RECORD.path, theRecordPageTree],
  [WHEN_IT_GOES_WRONG.path, whenItGoesWrongPageTree],
  [WHAT_YOU_RUN.path, whatYouRunPageTree],
  [WHO_CAN_ASK.path, whoCanAskPageTree],
  [PUTTING_IT_BACK.path, puttingItBackPageTree],
  [YOUR_COMPONENTS.path, yourComponentsPageTree],
  [WHAT_READERS_DO.path, whatReadersDoPageTree],
])

/** The page as it is written, before anything the visitor asked for. */
export const treeFor = (route: SiteRoute, context: SitePageContext): LoomTree => {
  const build = SITE_PAGES.get(route.path)

  if (build === undefined) {
    throw new Error(`loom: no page is built for ${route.path}`)
  }

  return build(context)
}

/** One request, and the undo of it when the visitor asked for that too. */
export type FrontDoorRun = AskRun & {
  /** What the rules said about putting it back, once the visitor has asked to. */
  readonly undone?: ChangeRecord
}

/**
 * The change, and then — if the visitor pressed the button — the undo of it.
 *
 * The undo runs against the page the change left rather than against the
 * published one, which is the only honest way round: an inverse is written for
 * one arrangement of a page, and putting it back means putting *this* back.
 *
 * It is skipped when the change did not land. There is nothing to reverse, and
 * `runAsk` returns no inverse to reverse it with — a refusal and a hold both
 * leave the page exactly as it was, and the panel says so in the fifth rung.
 */
const walk = async (page: LoomTree, ask: Ask, context: SitePageContext): Promise<FrontDoorRun> => {
  const run = await runAsk(page, ask, context.approve === true)

  if (context.back !== true || run.undo === undefined) return run

  const back = await runUndo(run.page, ask, run.undo, context.backApprove === true)

  return { ...run, page: back.page, undone: back.record }
}

/**
 * The page as the visitor's ask leaves it, with the record of what happened
 * standing on it.
 *
 * **Twice, and the second time is the one you see.** A change is worked out
 * against the page it is handed, and the panel that reports the change is part
 * of that page — so the first pass runs against a page whose panel is still
 * empty, purely to find out what happens. The second runs against the page with
 * that answer already written into it, and returns *its* result. What the
 * visitor reads is therefore the record of the change that produced the exact
 * page it is sitting on, rather than a record of a slightly different page that
 * nobody ever saw.
 *
 * The two passes agree because nothing the rules weigh is a function of how big
 * the page is: breadth, removal size and depth are all counted absolutely. That
 * is a property of today's rules rather than a law, so `adapt.test.ts` holds the
 * two records against each other for every choice, and `undo.test.ts` does the
 * same for the undo — which matters more here, because a second card in the
 * panel is a bigger page for the undo to be judged against than the page the
 * first pass judged. A stake factor that started measuring a *fraction* of the
 * page would break this, and the tests are where it would be found rather than
 * on the landing page.
 */
export const askRunFor = async (context: SitePageContext): Promise<FrontDoorRun | undefined> => {
  const ask = askById(context.ask)
  if (ask === undefined) return undefined

  const probe = await walk(treeFor(HOME, context), ask, context)
  const staged = treeFor(HOME, {
    ...context,
    record: probe.record,
    ...(probe.undone === undefined ? {} : { undone: probe.undone }),
  })

  return walk(staged, ask, context)
}

/**
 * The run of changes the record page is reporting on, replayed from the front
 * door as it is published.
 *
 * The record page is *about* the front door, so the sequence starts from the
 * page this site publishes rather than from anything the record page contains.
 * Nothing is kept between requests: a history is a list in the address, run
 * again from scratch every time it is read (0081), which is what lets one be
 * sent to somebody else.
 */
export const historyFor = async (context: SitePageContext): Promise<ChangeHistory | undefined> => {
  const tokens = context.changes ?? []

  if (tokens.length === 0) return undefined

  return runHistory(treeFor(HOME, { origin: context.origin, theme: context.theme }), tokens)
}

/**
 * The run the mechanism page prints, against the front door as it is published.
 *
 * Here rather than in the builder because a page builder is synchronous and a
 * request through the whole sequence is not — the same seam, and for the same
 * reason, as the ask the front door runs and the history the record page
 * replays. The front door is built fresh for it: the mechanism page's claim is
 * about *this site*, so a record of a fixture kept beside it would be a record
 * of nothing a reader can go and check.
 *
 * **The front door it runs against carries no ask**, and that is the whole of
 * the arrangement rather than an oversight. The request is made here, so the
 * page it is made against has to be the one this site publishes at `/` — not
 * that page with the answer already standing on it. What the visitor's `ask`
 * decides is *which request to run*, never which page to run it against.
 */
export const trailFor = async (context: SitePageContext): Promise<PaperTrail> =>
  paperTrailFor(
    treeFor(HOME, { origin: context.origin, theme: context.theme }),
    context.ask,
    context.approve === true
  )

/**
 * The refusal the *when it goes wrong* page prints, run while the page is built.
 *
 * The same seam as the three above and the same reason — a page builder is
 * synchronous and a request through the whole sequence is not — with one
 * difference worth naming: the request is **fixed here rather than read off the
 * address**. That page is an argument about what always happens rather than a
 * place to try things, so every reader of it sees the same refusal, and the one
 * they see is the one the front door's fifth button runs.
 *
 * The counts are taken off the page the request was handed and the page the
 * sequence gave back. They are the band's whole claim, so they are measured
 * rather than asserted: `runAsk` returns the page it was given when nothing is
 * applied, and two equal numbers are that fact printed instead of promised.
 */
export const refusalFor = async (context: SitePageContext): Promise<RefusedRun | undefined> => {
  const ask = askById(DEMONSTRATED_ASK)
  if (ask === undefined) return undefined

  const page = treeFor(HOME, { origin: context.origin, theme: context.theme })
  const run = await runAsk(page, ask)

  return {
    record: run.record,
    piecesBefore: piecesIn(page.root),
    piecesAfter: piecesIn(run.page.root),
  }
}

/**
 * The sixteen runs `/who-can-ask` prints, made while the page is built.
 *
 * The same seam as the three above and the same reason — a page builder is
 * synchronous and a request through the whole sequence is not. Like the refusal
 * band, the requests are **fixed here rather than read off the address**: the
 * page is an argument about what always happens rather than a place to try
 * things, so every reader of it is looking at the same sixteen answers.
 *
 * The front door is built once and all sixteen are judged against it.
 * `composeChange` returns a new page rather than touching the one it was given,
 * so nothing drifts under the later runs — and the comparison is a comparison
 * of askers rather than of sixteen slightly different pages.
 */
export const askersFor = async (
  context: SitePageContext
): Promise<readonly WeighedRequest[]> =>
  weighEachAsker(treeFor(HOME, { origin: context.origin, theme: context.theme }))

/**
 * The round trips `/putting-it-back` prints, made while the page is built.
 *
 * The same seam as the four above and the same reason — a page builder is
 * synchronous and a request through the whole sequence is not. Like the refusal
 * band and the comparison, the requests are **fixed here rather than read off
 * the address**: the page is an argument about what always happens rather than a
 * place to try things, so every reader of it is looking at the same trips.
 *
 * The front door is built once and every trip starts from it, so *the page came
 * back as it was* is a comparison against the page this site publishes rather
 * than against whatever the previous trip left behind.
 */
export const roundTripsFor = async (
  context: SitePageContext
): Promise<readonly RoundTrip[]> =>
  roundTripsOn(treeFor(HOME, { origin: context.origin, theme: context.theme }))

export const pageTreeFor = async (
  route: SiteRoute,
  context: SitePageContext
): Promise<LoomTree> => {
  if (route.path === WHEN_IT_GOES_WRONG.path) {
    const refusal = await refusalFor(context)

    return treeFor(route, refusal === undefined ? context : { ...context, refusal })
  }

  if (route.path === HOW_IT_WORKS.path) {
    return treeFor(route, { ...context, trail: await trailFor(context) })
  }

  if (route.path === HOME.path) {
    const run = await askRunFor(context)

    return run === undefined ? treeFor(route, context) : run.page
  }

  if (route.path === WHO_CAN_ASK.path) {
    return treeFor(route, { ...context, weighed: await askersFor(context) })
  }

  if (route.path === PUTTING_IT_BACK.path) {
    return treeFor(route, { ...context, trips: await roundTripsFor(context) })
  }

  if (route.path === THE_RECORD.path) {
    const history = await historyFor(context)

    return history === undefined ? treeFor(route, context) : treeFor(route, { ...context, history })
  }

  return treeFor(route, context)
}

/**
 * A page, rendered.
 *
 * Separate from the route lookup so that the two pages whose shape depends on
 * what the visitor asked for do not make every other page's rendering
 * asynchronous. The registry that validates the props and the theme registry
 * that resolves the root are passed here and only here, so a page cannot be
 * rendered without both.
 *
 * **`addressed` writes each node's id and type onto the markup**, and the root's
 * tree id and revision, which are the addresses a reader signal carries (0136).
 * It is off unless this deployment is collecting, for two reasons that point the
 * same way: the attributes are bytes in every response and nothing would read
 * them, and a page carrying the addresses while nothing broadcasts is a page
 * that looks instrumented and is not. Off, the markup is byte-identical to what
 * this site served yesterday.
 *
 * It is a parameter with a default rather than a lookup inside, so a test can
 * render both pages — the one that is counting and the one that is not — and a
 * caller cannot get a page whose markup and whose words disagree.
 */
export type SiteRenderOptions = {
  /** Whether the markup carries the addresses a reader signal names. */
  readonly addressed?: boolean
  /**
   * The origin this page is being served from, which is the one origin it
   * frames.
   *
   * It is here rather than read from the environment inside, because the tree
   * already carries absolute URLs built from the origin its *builder* was given
   * — so a render that consulted `siteOrigin()` for the allowlist while the tree
   * was built for somewhere else would refuse the site's own frame and say the
   * content cannot be shown. Two readings of one fact is one reading too many;
   * the caller has it, so the caller passes it.
   */
  readonly origin?: string
}

export const renderTree = (page: LoomTree, options: SiteRenderOptions = {}): RenderOutput => {
  const origins = siteFrameOrigins(options.origin ?? siteOrigin())

  return renderLoomTree(page, {
    resolver: siteRegistry,
    validator: siteRegistry,
    themes: siteThemes,
    addressed: options.addressed ?? readersCountedHere(),
    /**
     * Omitted rather than passed as `undefined` when the origin could not be
     * registered, so a render with no allowlist is the same object shape the
     * seam has always been handed by a deployment that frames nothing.
     */
    ...(origins === undefined ? {} : { origins }),
  })
}

/**
 * The page, with the one fact about the deployment that the page is allowed to
 * mention, read once.
 *
 * Read here rather than in each builder so that the words and the markup cannot
 * come apart: the same boolean says *this page is counting you* in the footer
 * and puts the addresses on the bands that would be counted. `counting` in the
 * context wins when a caller supplies it, which is how the tests render both
 * halves without an environment variable.
 */
export const renderSitePage = async (
  route: SiteRoute,
  context: SitePageContext
): Promise<RenderOutput> => {
  const counting = context.counting ?? readersCountedHere()

  return renderTree(await pageTreeFor(route, { ...context, counting }), {
    addressed: counting,
    origin: context.origin,
  })
}
