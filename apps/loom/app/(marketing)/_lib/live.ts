import type { LoomTree } from "@jam-overture/loom"
import {
  describeSitePullFailure,
  livePageOf,
  startPullingLivePages,
  type LivePullLoop,
  type SitePullOutcome,
  type StartPullingOptions,
} from "@jam-overture/loom/live"

import { siteKey } from "./readers/key"
import { isPublicDeployment, type Environment } from "./site"

/**
 * A change accepted in the portal, on loomjs.org (0370).
 *
 * This site is a project like any customer's (0298 clause 4), so it takes its
 * accepted changes the way a customer's site does: its server pulls the
 * project's live pages from Loom with the project's public key (0361), waits
 * for the first pull before it serves (0364), and serves each page as Loom has
 * it, or as it was built when Loom has nothing for it.
 *
 * The Loom it pulls from is the deployment on its own pinned domain, which is
 * where the build publishes its pages (0369). A preview does neither: it is
 * not the site, and it serves what its code builds.
 */

/** Where this deployment pulls its live pages from, or nothing when it does not pull. */
export const pullDeploymentOf = (env: Environment): string | undefined => {
  const origin = env["LOOM_SITE_ORIGIN"]

  return isPublicDeployment(env) && origin !== undefined && URL.canParse(origin)
    ? origin
    : undefined
}

/**
 * One pull per process, for the key the site holds now.
 *
 * A key replaced on *Connect your site* ends the old one at the door, so a
 * loop still pulling with it would only collect refusals: a new key stops the
 * running loop and starts another. Same key, same loop.
 */
export const pullsByKey = (
  start: (options: StartPullingOptions) => LivePullLoop
): ((deployment: string, key: string) => LivePullLoop) => {
  let running:
    | { readonly deployment: string; readonly key: string; readonly loop: LivePullLoop }
    | undefined

  return (deployment, key) => {
    if (running?.deployment === deployment && running.key === key) return running.loop

    running?.loop.stop()

    const loop = start({ deployment, key, onOutcome: reportFailure })

    running = { deployment, key, loop }

    return loop
  }
}

/** The one place a failed pull is said, in the deployment's log. */
const reportFailure = (outcome: SitePullOutcome): void => {
  if (outcome.kind === "failed") {
    const why = describeSitePullFailure(outcome.failure)

    console.warn(`loom: the site's live pages were not pulled: ${why}`)
  }
}

export type SiteLive = {
  readonly env: Environment
  readonly keyOf: () => Promise<string | null>
  readonly pullFor: (deployment: string, key: string) => LivePullLoop
}

/**
 * Kept on a global carrier for `pages/store.ts`'s reason: a module evaluated
 * twice, as Next does across its server layers, would otherwise start a second
 * loop beside the first.
 */
const CARRIER_KEY = Symbol.for("loom.marketing.live")

type Carrier = { [CARRIER_KEY]?: SiteLive["pullFor"] }

const sitePulls = ((globalThis as unknown as Carrier)[CARRIER_KEY] ??=
  pullsByKey(startPullingLivePages))

const siteLive: SiteLive = {
  env: process.env,
  keyOf: () => siteKey(),
  pullFor: sitePulls,
}

/**
 * The page a reader is served: Loom's live version of the built page, or the
 * built page.
 *
 * The `??` is the whole fallback (0361 clause 2): a deployment that does not
 * pull, a site with no key, a Loom that refused or stayed silent, and a page
 * Loom has no version of all serve `built`.
 */
export const liveTreeOf = async (
  built: LoomTree,
  live: SiteLive = siteLive
): Promise<LoomTree> => {
  const deployment = pullDeploymentOf(live.env)

  if (deployment === undefined) return built

  const key = await live.keyOf()

  if (key === null) return built

  return livePageOf(await live.pullFor(deployment, key).ready(), built.treeId) ?? built
}
