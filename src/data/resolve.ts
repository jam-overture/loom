import { ceilingOf, describeCeiling, withCeiling } from "../deadline.js"
import type { JsonObject, JsonValue } from "../json.js"
import { err, type Result } from "../result.js"
import type { LoomTree } from "../tree/tree.js"

import type { DataRegistry, DataUnavailable } from "./adapter.js"
import { planTreeData, planIsEmpty, type DataPlan, type RequestKey } from "./plan.js"
import {
  buildDataResolution,
  EMPTY_DATA_RESOLUTION,
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
      detail: `registered: ${options.registry.sources.map((entry) => entry.id).join(", ") || "none"}`,
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

export const resolveDataPlan = async (
  plan: DataPlan,
  options: ResolveDataOptions
): Promise<DataResolution> => {
  if (planIsEmpty(plan)) return EMPTY_DATA_RESOLUTION

  const answered = await Promise.all(
    plan.requests.map(
      async (request): Promise<readonly [RequestKey, Result<JsonValue, DataUnavailable>]> => [
        request.key,
        await askOne(request.source, request.params, options),
      ]
    )
  )

  return buildDataResolution(plan, new Map(answered))
}

/** Plan and resolve in one step, for the ordinary caller that does both. */
export const resolveTreeData = async (
  tree: LoomTree,
  options: ResolveDataOptions
): Promise<DataResolution> => resolveDataPlan(planTreeData(tree), options)
