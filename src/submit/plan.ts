import type { NodeId } from "../ids.js"
import { SUBMIT_PROP_KEY } from "../reserved-props.js"
import { walkTree } from "../tree/navigation.js"
import type { LoomNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

import { parseSubmission, type SubmissionError } from "./declaration.js"
import type { EndpointId } from "./endpoint.js"

/**
 * Which endpoints a tree points at, worked out before any of them is asked.
 *
 * Planning is a pure function of the tree, for the reason `data/plan.ts` gives:
 * `renderLoomTree` is synchronous and does no IO, and minting a token is IO. So
 * the tree is read once, in a pass that only reads, and the asking happens
 * outside the renderer entirely.
 */

export type PlannedSubmission = {
  readonly nodeId: NodeId
  readonly to: EndpointId
}

/** A node whose `loom:submit` could not be read at all. */
export type SubmissionProblem = {
  readonly nodeId: NodeId
  readonly error: SubmissionError
}

export type SubmissionPlan = {
  /** Deduplicated endpoint ids, in first-encountered order. */
  readonly endpoints: readonly EndpointId[]
  readonly submissions: readonly PlannedSubmission[]
  readonly problems: readonly SubmissionProblem[]
}

export const submissionPlanIsEmpty = (plan: SubmissionPlan): boolean =>
  plan.endpoints.length === 0 && plan.problems.length === 0

/**
 * Two forms naming one endpoint are resolved once and share a target. That is
 * 0058's "identical questions are asked once" applied to a question that has no
 * params to differ by, and it is also the behaviour a reader would expect: two
 * newsletter forms on one page post to the same place, and a per-form nonce
 * would break the second one every time somebody used the first.
 */
export const planTreeSubmissions = (tree: LoomTree): SubmissionPlan =>
  planSubmissionsIn(tree.root)

/**
 * The same plan, for a root that is not a stored tree.
 *
 * The runtime needs one for a tree that exists only as the result of applying a
 * delta — nothing has minted an id for it and nothing ever will, so it is a node
 * and not a `LoomTree`. Reading the destinations twice would be two walks that
 * had to agree about which declarations are readable, and the second one would
 * drift.
 */
export const planSubmissionsIn = (root: LoomNode): SubmissionPlan => {
  const endpoints: EndpointId[] = []
  const submissions: PlannedSubmission[] = []
  const problems: SubmissionProblem[] = []
  const seen = new Set<EndpointId>()

  for (const node of walkTree(root)) {
    if (node.kind !== "element") continue

    const declared = node.props[SUBMIT_PROP_KEY]
    if (declared === undefined) continue

    const parsed = parseSubmission(declared)
    if (!parsed.ok) {
      problems.push({ nodeId: node.id, error: parsed.error })
      continue
    }

    if (!seen.has(parsed.value.to)) {
      seen.add(parsed.value.to)
      endpoints.push(parsed.value.to)
    }

    submissions.push({ nodeId: node.id, to: parsed.value.to })
  }

  return { endpoints, submissions, problems }
}
