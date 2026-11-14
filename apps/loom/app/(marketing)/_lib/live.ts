import type { JsonObject, LoomTree } from "@jam-overture/loom"
import {
  describeComposeError,
  describeSitePullFailure,
  pageForReader,
  startPullingLivePages,
  type ComposeError,
  type LivePullLoop,
  type ServedPage,
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

/**
 * The one place a refused composition is said, in the deployment's log.
 *
 * `reportFailure` above is the same line for the other half: a pull that did
 * not happen costs freshness, and a form that cannot be applied costs the
 * reader their segment. Both are states a deployment has to be told about and
 * neither costs anybody a page, so both are a warning and nothing more.
 *
 * **It is said out loud because the alternative is silence.** `pageForReader`
 * hands the refusal back rather than swallowing it precisely so that a host
 * cannot serve the base under a segment's name without anybody knowing — a
 * form gone stale against a republished page is invisible otherwise, and
 * `src/live/pages.ts` records that silently serving the base is the state 0263
 * clause 4 refuses. A page is still served; what is lost is the segment.
 */
const reportRefusal = (refusal: ComposeError | undefined): void => {
  if (refusal !== undefined) {
    console.warn(`loom: a reader's segment was dropped: ${describeComposeError(refusal)}`)
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
 * A page as one reader of this site gets it.
 *
 * `ServedPage` from the framework without its `refusal`, which is logged here
 * rather than passed on: the refusal is a thing the deployment must be told and
 * is not a thing a render path can act on, and the one caller would otherwise
 * have to remember to say it. What a render path needs is the two fields below.
 */
export type ServedSitePage = {
  /** The tree to render. */
  readonly tree: LoomTree
  /**
   * The segment to file this page view under (0284), or nothing for everyone.
   *
   * **The framework's own field type rather than `AudienceId`**, which is not
   * on this surface's entry points. `src/live/index.ts` says why in as many
   * words: a site's server imports `@jam-overture/loom/live` and
   * `@jam-overture/loom/react`, and reaching into the control plane's door for
   * a type name would be *"the wrong dependency for the one line of logging
   * this costs"*. Read off `ServedPage`, this field is
   * the one the framework answers, by construction rather than by a name that
   * happens to match.
   */
  readonly audience: ServedPage["audience"]
}

/** The page as built, under no segment: what every reader got before today. */
const asBuilt = (built: LoomTree): ServedSitePage => ({ tree: built, audience: undefined })

/**
 * The page a reader is served, and the segment to file their reading under.
 *
 * **This site serves a segment's form as of today**, which is the whole of this
 * function's change. It layered Loom's live version of a page over the built
 * one and stopped there — every reader of loomjs.org was served the base,
 * because nothing composed. `pageForReader` composes, so a reader the project's
 * rules sort into a segment with a form of its own is served that form, and the
 * page they read says which segment it was drawn for.
 *
 * The three states that serve the built page are unchanged and are still the
 * whole fallback (0361 clause 2): a deployment that does not pull, a site with
 * no key, and — inside `pageForReader` — a Loom that refused or stayed silent,
 * or a page Loom has no version of. **A fourth state joins them and is the one
 * worth knowing about**: a form that cannot be applied costs the reader their
 * segment and not their page, so a refusal serves the live base under no
 * segment at all rather than under a name the page does not match.
 *
 * `context` is what this server knows about the reader, and
 * `readers/context.ts` is the whole of which keys that is and why.
 */
export const servedPageOf = async (
  built: LoomTree,
  context: JsonObject,
  live: SiteLive = siteLive
): Promise<ServedSitePage> => {
  const deployment = pullDeploymentOf(live.env)

  if (deployment === undefined) return asBuilt(built)

  const key = await live.keyOf()

  if (key === null) return asBuilt(built)

  const served = pageForReader(await live.pullFor(deployment, key).ready(), built, context)

  reportRefusal(served.refusal)

  return { tree: served.tree, audience: served.audience }
}
