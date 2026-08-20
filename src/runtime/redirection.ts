import type { NodeId } from "../ids.js"
import { planSubmissionsIn } from "../submit/plan.js"
import type { EndpointId } from "../submit/endpoint.js"
import type { LoomNode } from "../tree/node.js"

/**
 * Where a change moves a form's destination.
 *
 * [0065](../../decisions/0065-a-submission-names-a-destination-and-never-carries-one.md)
 * keeps the address out of the tree, so a proposal cannot invent somewhere to
 * post: `loom:submit` names a registered endpoint and nothing else leaves the
 * deployment. That seam holds whatever a delta does to it, and it is not the
 * whole question. A `configure` that moves `loom:submit` from
 * `newsletter.subscribe` to `contact.enquiry` names two endpoints the host
 * registered on purpose, authors no address, and still sends the next visitor's
 * message to a different place than the one the page was built to send it.
 *
 * The analysis reports that today as a configured prop key like any other. It is
 * the one prop whose meaning is *where a stranger's data goes*, and this module
 * is what lets the Gate see it as that rather than as a string that changed.
 */

/** One form's destination, moved from one registered endpoint to another. */
export type RedirectedSubmission = {
  readonly nodeId: NodeId
  readonly from: EndpointId
  readonly to: EndpointId
}

export const describeRedirectedSubmission = (redirected: RedirectedSubmission): string =>
  `${redirected.nodeId} from ${redirected.from} to ${redirected.to}`

const destinationsIn = (root: LoomNode): ReadonlyMap<NodeId, EndpointId> =>
  new Map(planSubmissionsIn(root).submissions.map(({ nodeId, to }) => [nodeId, to]))

/**
 * Every destination this change moves: a node that posted somewhere before and
 * posts somewhere else after.
 *
 * Measured between the two trees rather than off the operations, for the reason
 * `introducedNestedTargets` gives — but with the opposite conclusion about what
 * counts. Nesting is a fact about a position, so any operation can produce it.
 * A redirection is a fact about one node's identity persisting across the
 * change, which is what makes it a redirection rather than a new form:
 *
 * - **A node that gains a declaration it did not have is not redirected.** An
 *   `insert` of a form pointing at `contact.enquiry`, or a `configure` that
 *   gives an unposted node a destination, is a form that did not exist before.
 *   Nobody's expectation about where their message goes is being moved.
 * - **A node that loses one is not redirected either.** That form stops posting,
 *   which is breakage the shape factors already measure and is not this fact.
 * - **A declaration that stops parsing reads as a loss**, because that is what
 *   the page does with it: `planSubmissionsIn` reports it as a problem and the
 *   node renders with no target. A redirection has to be somewhere a visitor's
 *   data will actually arrive.
 *
 * Host-independent, and so needs no vocabulary: `loom:submit` is the runtime's
 * own key (0050), and whether a destination moved does not depend on which
 * primitives a deployment protects.
 */
export const redirectedSubmissionsBetween = (
  before: LoomNode,
  after: LoomNode
): readonly RedirectedSubmission[] => {
  const previous = destinationsIn(before)
  if (previous.size === 0) return []

  return Array.from(destinationsIn(after)).flatMap(([nodeId, to]) => {
    const from = previous.get(nodeId)

    return from !== undefined && from !== to ? [{ nodeId, from, to }] : []
  })
}
