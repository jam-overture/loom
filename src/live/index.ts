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
 * - **Loom is never in the render path** (0262). The pull runs beside requests,
 *   on a timer, and no reader's request waits on it.
 * - **Loom never learns who a reader is.** The request carries the project's
 *   key and the tag of what is held, and nothing else; selection for an
 *   audience (0263) happens afterwards, here, against pages already held.
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
 * // wherever a page is rendered, with the tree the site was built with
 * const tree = livePageOf(live.held(), builtTree.treeId) ?? builtTree
 * ```
 */

export {
  isPulling,
  livePageOf,
  livePagesHeld,
  NO_LIVE_PAGES,
  type LivePages,
} from "./pages.js"
export {
  describeSitePullFailure,
  DEFAULT_PULL_CEILING_MS,
  LIVE_PAGES_PATH,
  livePagesUrlOf,
  pullLivePages,
  withPullOutcome,
  type PullFetch,
  type PullLivePagesOptions,
  type SitePullFailure,
  type SitePullOutcome,
} from "./pull.js"
export {
  DEFAULT_PULL_INTERVAL_MS,
  startPullingLivePages,
  type LivePullLoop,
  type PullSchedule,
  type StartPullingOptions,
} from "./pulling.js"
