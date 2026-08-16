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
 */

export type ResolveDataOptions = {
  readonly registry: DataRegistry
  /** Passed through to every adapter — the render request's host context. */
  readonly context?: JsonObject
}

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

  return registered.answer(params, options.context)
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
