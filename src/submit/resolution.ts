import type { NodeId } from "../ids.js"
import type { Result } from "../result.js"

import type { SubmissionError } from "./declaration.js"
import type { EndpointId, SubmissionTarget, SubmissionUnavailable } from "./endpoint.js"
import type { SubmissionPlan } from "./plan.js"

/**
 * The targets, indexed the way a render walk needs them.
 *
 * Nothing here knows about React. The seam is asking a host where its own forms
 * post, which is not a rendering concern, so a cache warmer or a static export
 * can plan and resolve without loading the renderer.
 */

/**
 * A node that declared a submission either has a target or has a named reason it
 * does not. There is no third state here, and in particular no way to express
 * "no target, and that is fine": a form primitive shows something different for
 * "we cannot take this right now" than for a form that works, and a shape that
 * cannot tell them apart guarantees it eventually shows a submit button that
 * quietly goes nowhere.
 */
export type SubmissionOutcome =
  | { readonly status: "ready"; readonly target: SubmissionTarget }
  | { readonly status: "unavailable"; readonly unavailable: SubmissionUnavailable }

/** What a node's submission could not do, in the seam's own vocabulary. */
export type NodeSubmissionProblem =
  | { readonly kind: "misdeclared"; readonly error: SubmissionError }
  | {
      readonly kind: "unavailable"
      readonly to: EndpointId
      readonly unavailable: SubmissionUnavailable
    }

export interface SubmissionResolution {
  /** `undefined` for the overwhelming majority of nodes, which declare none. */
  readonly lookup: (nodeId: NodeId) => SubmissionOutcome | undefined
  readonly problemsFor: (nodeId: NodeId) => readonly NodeSubmissionProblem[]
}

const NO_PROBLEMS: readonly NodeSubmissionProblem[] = Object.freeze([])

export const EMPTY_SUBMISSION_RESOLUTION: SubmissionResolution = {
  lookup: () => undefined,
  problemsFor: () => NO_PROBLEMS,
}

/**
 * Folds a plan and its answers into the two lookups the walk uses. Separated
 * from resolution because it is pure: given the same answers it builds the same
 * result, which is what makes every failure path testable without a fake
 * endpoint for each one.
 */
export const buildSubmissionResolution = (
  plan: SubmissionPlan,
  answers: ReadonlyMap<EndpointId, Result<SubmissionTarget, SubmissionUnavailable>>
): SubmissionResolution => {
  const outcomes = new Map<NodeId, SubmissionOutcome>()
  const problems = new Map<NodeId, NodeSubmissionProblem[]>()

  const problemsOn = (nodeId: NodeId): NodeSubmissionProblem[] => {
    const existing = problems.get(nodeId)
    if (existing) return existing

    const created: NodeSubmissionProblem[] = []
    problems.set(nodeId, created)

    return created
  }

  for (const problem of plan.problems) {
    problemsOn(problem.nodeId).push({ kind: "misdeclared", error: problem.error })
  }

  for (const submission of plan.submissions) {
    const answer = answers.get(submission.to)

    /**
     * A planned submission with no answer is a caller that resolved a different
     * plan than the one it is rendering. Reported as unavailable rather than
     * ignored: a form whose target silently went missing is the failure this
     * module is arranged to prevent.
     */
    const outcome: SubmissionOutcome = !answer
      ? {
          status: "unavailable",
          unavailable: {
            reason: "no-such-endpoint",
            detail: "this submission was never resolved",
          },
        }
      : answer.ok
        ? { status: "ready", target: answer.value }
        : { status: "unavailable", unavailable: answer.error }

    outcomes.set(submission.nodeId, outcome)

    if (outcome.status === "unavailable") {
      problemsOn(submission.nodeId).push({
        kind: "unavailable",
        to: submission.to,
        unavailable: outcome.unavailable,
      })
    }
  }

  return {
    lookup: (nodeId) => outcomes.get(nodeId),
    problemsFor: (nodeId) => problems.get(nodeId) ?? NO_PROBLEMS,
  }
}
