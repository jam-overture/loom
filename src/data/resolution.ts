import type { NodeId } from "../ids.js"
import type { JsonValue } from "../json.js"
import type { Result } from "../result.js"

import type { BindingError } from "./binding.js"
import type { DataUnavailable } from "./adapter.js"
import type { DataPlan, RequestKey } from "./plan.js"
import type { BindingName, SourceId } from "./source.js"

/**
 * The answers, indexed the way a render walk needs them.
 *
 * Nothing here knows about React, and that is deliberate: the seam is asking a
 * host questions about its own data, which is not a rendering concern. The
 * renderer depends on this module; this module depends on nothing above it, so a
 * host can plan and resolve a tree's data without loading the renderer at all.
 */

/**
 * A binding either has an answer or has a named reason it does not. There is no
 * third state, and in particular there is no way to express "empty" as a failure
 * — a source that legitimately answers with nothing answers `ready` with an
 * empty list. Collapsing the two is the mistake the portal spent a run undoing:
 * a reader who takes "we could not reach your services" for "you have no
 * services" concludes their data is gone.
 */
export type DataOutcome =
  | { readonly status: "ready"; readonly value: JsonValue }
  | { readonly status: "unavailable"; readonly unavailable: DataUnavailable }

/**
 * One node's answers, by binding name. Null-prototype for the reason
 * `staticPrimitiveResolver` gives: binding names are identifiers and
 * `constructor` and `valueOf` are valid ones, so a plain object would answer
 * `loom.data.constructor` with a function off `Object.prototype`.
 */
export type NodeData = Readonly<Record<string, DataOutcome>>

export const NO_DATA: NodeData = Object.freeze(Object.create(null) as Record<string, DataOutcome>)

/** What a node's data could not do, in the seam's own vocabulary. */
export type NodeDataProblem =
  | { readonly kind: "misdeclared"; readonly error: BindingError }
  | {
      readonly kind: "unavailable"
      readonly name: BindingName
      readonly source: SourceId
      readonly unavailable: DataUnavailable
    }

export interface DataResolution {
  /** Always answers; a node with no bindings gets `NO_DATA`. */
  readonly lookup: (nodeId: NodeId) => NodeData
  readonly problemsFor: (nodeId: NodeId) => readonly NodeDataProblem[]
}

const NO_PROBLEMS: readonly NodeDataProblem[] = Object.freeze([])

export const EMPTY_DATA_RESOLUTION: DataResolution = {
  lookup: () => NO_DATA,
  problemsFor: () => NO_PROBLEMS,
}

/**
 * Folds a plan and its answers into the two lookups the walk uses. Separated
 * from `resolveDataPlan` because it is pure: given the same answers it builds
 * the same resolution, which is what makes the failure paths testable without a
 * fake adapter for each one.
 */
export const buildDataResolution = (
  plan: DataPlan,
  answers: ReadonlyMap<RequestKey, Result<JsonValue, DataUnavailable>>
): DataResolution => {
  const data = new Map<NodeId, Record<string, DataOutcome>>()
  const problems = new Map<NodeId, NodeDataProblem[]>()

  const problemsOn = (nodeId: NodeId): NodeDataProblem[] => {
    const existing = problems.get(nodeId)
    if (existing) return existing

    const created: NodeDataProblem[] = []
    problems.set(nodeId, created)

    return created
  }

  for (const problem of plan.problems) {
    problemsOn(problem.nodeId).push({ kind: "misdeclared", error: problem.error })
  }

  const sourceOf = new Map(plan.requests.map((request) => [request.key, request.source]))

  for (const binding of plan.bindings) {
    const answer = answers.get(binding.key)

    /**
     * A planned binding with no answer is a caller that resolved a different
     * plan than the one it is rendering. Reported as unavailable rather than
     * ignored: a page silently missing the data it asked for is the failure
     * mode this whole module is arranged to prevent.
     */
    const outcome: DataOutcome = !answer
      ? {
          status: "unavailable",
          unavailable: { reason: "no-such-source", detail: "this binding was never resolved" },
        }
      : answer.ok
        ? { status: "ready", value: answer.value }
        : { status: "unavailable", unavailable: answer.error }

    const existing = data.get(binding.nodeId)
    const bag = existing ?? (Object.create(null) as Record<string, DataOutcome>)
    if (!existing) data.set(binding.nodeId, bag)

    bag[binding.name] = outcome

    if (outcome.status === "unavailable") {
      problemsOn(binding.nodeId).push({
        kind: "unavailable",
        name: binding.name,
        source: sourceOf.get(binding.key) ?? (binding.key as SourceId),
        unavailable: outcome.unavailable,
      })
    }
  }

  for (const bag of data.values()) Object.freeze(bag)

  return {
    lookup: (nodeId) => data.get(nodeId) ?? NO_DATA,
    problemsFor: (nodeId) => problems.get(nodeId) ?? NO_PROBLEMS,
  }
}
