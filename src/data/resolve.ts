import { ceilingOf, describeCeiling, withCeiling } from "../deadline.js"
import type { JsonObject, JsonValue } from "../json.js"
import { describeRegistered } from "../registered.js"
import { err, type Result } from "../result.js"
import type { LoomTree } from "../tree/tree.js"

import type { DataRegistry, DataUnavailable } from "./adapter.js"
import { planTreeData, planIsEmpty, type DataPlan, type RequestKey } from "./plan.js"
import {
  buildDataResolution,
  EMPTY_DATA_RESOLUTION,
  type DataAnswers,
  type DataResolution,
} from "./resolution.js"
import type { SourceId } from "./source.js"

/**
 * The one step in serving a page that does IO.
 *
 * Every question in the plan is asked at once. They are independent by
 * construction — a plan is a set of source-and-params pairs with no ordering
 * between them — so asking them in sequence would make a page's latency the sum
 * of its integrations rather than the slowest of them. Nothing here rejects:
 * each entry's failure is captured against its own key, so one integration
 * having a bad afternoon costs one region of the page rather than the page.
 *
 * That last sentence was not true until 13 September, and it is the reason for
 * the ceiling (0140). `Promise.all` over a set of independent questions makes the
 * page's latency the slowest of them — including the one that is never going to
 * answer, which is not a latency at all. An adapter that hangs held the whole
 * page, not its own region, and no diagnostic was ever produced for it because
 * nothing had decided it had waited long enough.
 */

export type ResolveDataOptions = {
  readonly registry: DataRegistry
  /** Passed through to every adapter — the render request's host context. */
  readonly context?: JsonObject
  /**
   * How long any one source is given, each independently of the others. Defaults
   * to `DEFAULT_SOURCE_CEILING_MS`; there is no way to wait forever (0140).
   */
  readonly ceilingMs?: number
}

/**
 * Ten seconds per source, which is already several times longer than a reader
 * will wait for a page and generous for a query somebody has indexed.
 *
 * It is per-source rather than per-page because the questions are independent:
 * a page holding one slow integration and five quick ones should show five
 * regions and a diagnostic, not lose a region to whichever source was measured
 * against a budget the others had already spent.
 */
export const DEFAULT_SOURCE_CEILING_MS = 10_000

const askOne = async (
  source: SourceId,
  params: JsonObject,
  options: ResolveDataOptions
): Promise<Result<JsonValue, DataUnavailable>> => {
  const registered = options.registry.source(source)

  if (!registered) {
    return err({
      reason: "no-such-source",
      detail: `registered: ${describeRegistered(
        source,
        options.registry.sources.map((entry) => entry.id)
      )}`,
    })
  }

  const ceiling = ceilingOf(options.ceilingMs, DEFAULT_SOURCE_CEILING_MS)

  return withCeiling(
    ceiling,
    (): Result<JsonValue, DataUnavailable> =>
      err({ reason: "unavailable", detail: `no answer in ${describeCeiling(ceiling)}` }),
    (signal) => registered.answer(params, options.context, signal)
  )
}

/**
 * A resolution, and the answers it was built from.
 *
 * It *is* a `DataResolution`, so a caller that only renders reads nothing new
 * and changes nothing. The extra field is for the host that fetches in one
 * place and renders in another — the arrangement every React framework pushes a
 * host towards, and the one this package could not serve: a resolution is two
 * closures, and a closure cannot cross from a server component to a client one.
 * The answers can, so the far side rebuilds from them:
 *
 * ```ts
 * // where the fetching happens
 * const { answers } = await resolveTreeData(tree, { registry })
 * // wherever the walk happens, given the same tree
 * const data = buildDataResolution(planTreeData(tree), new Map(answers))
 * ```
 *
 * Re-planning rather than carrying the resolution is what keeps the one thing a
 * caller must not get wrong inside the package: *which requests were asked*.
 * Read off the plan it is a guess, and the obvious guess is wrong — a node whose
 * declaration could not be read at all appears in `plan.problems` and never in
 * `plan.bindings`, so a carrier built from the bindings drops exactly the nodes
 * whose diagnostics matter most (0281).
 */
export interface ResolvedData extends DataResolution {
  readonly answers: DataAnswers
}

const NO_ANSWERS: DataAnswers = Object.freeze([])

/** The resolution of a plan that asks nothing, which asked nothing. */
const EMPTY_RESOLVED_DATA: ResolvedData = Object.freeze({
  ...EMPTY_DATA_RESOLUTION,
  answers: NO_ANSWERS,
})

export const resolveDataPlan = async (
  plan: DataPlan,
  options: ResolveDataOptions
): Promise<ResolvedData> => {
  if (planIsEmpty(plan)) return EMPTY_RESOLVED_DATA

  const answered = await Promise.all(
    plan.requests.map(
      async (request): Promise<readonly [RequestKey, Result<JsonValue, DataUnavailable>]> => [
        request.key,
        await askOne(request.source, request.params, options),
      ]
    )
  )

  const answers: DataAnswers = Object.freeze(answered)

  return { ...buildDataResolution(plan, new Map(answers)), answers }
}

/** Plan and resolve in one step, for the ordinary caller that does both. */
export const resolveTreeData = async (
  tree: LoomTree,
  options: ResolveDataOptions
): Promise<ResolvedData> => resolveDataPlan(planTreeData(tree), options)
