/**
 * The half of going live that runs in the customer's server.
 *
 * A change accepted in the portal is live as soon as the site next pulls
 * (0358): there is no pull request, no merge and no deploy between somebody
 * accepting a change and a reader seeing it. What makes that true is this —
 * a loop that fetches the project's live pages from Loom on a short interval,
 * keeps them in the process, and hands one to the render path by page id.
 *
 * Three properties hold by construction rather than by care, and each has a
 * test that would fail if it stopped:
 *
 * - **Loom is in the render path once per server, and only until it answers**
 *   (0262, 0364). The first reader on a new server waits for the first pull,
 *   so they get the live page rather than one that changes on their next
 *   request; a failed pull ends the wait at once and a silent Loom ends it after
 *   `DEFAULT_FIRST_WAIT_MS`. Every pull after that runs beside requests, on a
 *   timer, and no reader waits on it.
 * - **Loom never learns who a reader is.** The request carries the project's
 *   key and the tag of what is held, and nothing else. The door answers every
 *   page's segment rules and segment forms beside the pages (0371), and both
 *   sorting a reader into a segment and composing the page they get happen
 *   afterwards, here, against rules and deltas already held: `pageForReader`
 *   reads the context the host's server built and answers a tree and a
 *   segment's name, and nothing about the reader leaves the process.
 * - **A failed pull costs freshness, never the page** (0358 clause 4). Every
 *   way a pull can fail leaves the last pages whole, and a server with none
 *   renders every page as it was built.
 *
 * ```ts
 * const live = startPullingLivePages({
 *   deployment: process.env.LOOM_URL ?? "",
 *   key: process.env.LOOM_PROJECT_KEY ?? "",
 *   onOutcome: (outcome) => {
 *     if (outcome.kind === "failed") log.warn(describeSitePullFailure(outcome.failure))
 *   },
 * })
 *
 * // wherever a page is rendered, with the tree the site was built with, and
 * // what this server knows about the request in the keys the rules read
 * const held = await live.ready()
 * const pin = pinIn(request.headers.get("cookie"))
 * const served = pageForReader(held, builtTree, { device: "phone", returning: true }, pin)
 * const keep = pinCookieFor(held, pin)
 *
 * if (served.refusal !== undefined) log.warn(describeComposeError(served.refusal))
 * if (keep !== undefined) response.headers.set("set-cookie", keep)
 *
 * renderLoomTree(served.tree, { resolver, addressed: true, audience: served.audience })
 * ```
 *
 * The last two of those are what a project with a reader window costs a host
 * (0383): a reader keeps the pages they first saw for as long as the project
 * set, and a project with no window — which is every project until somebody
 * chooses one — needs neither line. Both are pure, both read only what the last
 * pull brought, and nothing about the reader leaves the process.
 *
 * The page's signals are filed under the segment it was rendered for (0284):
 * the root carries it, and the broadcaster reads it from there.
 */

/**
 * The refusal a composition hands back, and the sentence for it, re-exported
 * here because the place a host meets one is the render path. A site's server
 * imports `/live` and `/react`; making it import the control plane's door to
 * say why a page was served as the base would be the wrong dependency for the
 * one line of logging this costs.
 */
export { describeComposeError, type AudienceForm, type ComposeError } from "../audience/compose.js"
export {
  isPulling,
  livePageOf,
  livePagesHeld,
  NO_LIVE_PAGES,
  pageForReader,
  segmentOf,
  type LivePages,
  type ServedPage,
} from "./pages.js"
export {
  PIN_COOKIE,
  pinCookieFor,
  pinIn,
  WINDOW_OFF,
  type HeldVersion,
  type LiveWindow,
} from "./window.js"
export {
  describeSitePullFailure,
  DEFAULT_PULL_CEILING_MS,
  LIVE_PAGES_PATH,
  livePagesUrlOf,
  pullLivePages,
  withPullOutcome,
  type LivePageForms,
  type LivePageRules,
  type PullFetch,
  type PullLivePagesOptions,
  type SitePullFailure,
  type SitePullOutcome,
} from "./pull.js"
export {
  DEFAULT_FIRST_WAIT_MS,
  DEFAULT_PULL_INTERVAL_MS,
  startPullingLivePages,
  type LivePullLoop,
  type PullSchedule,
  type StartPullingOptions,
} from "./pulling.js"
