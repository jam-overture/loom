import {
  nodeDataOf,
  NO_DATA,
  planTreeData,
  resolveDataPlan,
  type DataOutcome,
  type DataPlan,
  type DataRegistry,
  type DataResolution,
  type LoomTree,
  type NodeDataProblem,
  type NodeId,
} from "@jam-overture/loom"

/**
 * A resolution, as something that can be posted through a letterbox.
 *
 * **The plain version.** The answers to a tree's questions are fetched on a
 * server, and the examples on this site render in a browser — because every one
 * of them has a working propose-a-change box beside it, and a changed tree has
 * to be drawn wherever the change happened. So the answers have to travel. A
 * `DataResolution` is two *functions*, and a function cannot be sent from a
 * server component to a client one. This turns one into a list, and turns the
 * list back into one on the other side.
 *
 * It carries the real answers. Nothing here invents an outcome, chooses a
 * reason or decides what a node was told: the only thing that resolves anything
 * is `resolveDataPlan`, through a registered source, exactly as a host's own
 * loader would. What this module does is read the resolution out through its own
 * two accessors and put the readings back behind two of the same shape.
 *
 * **It is a workaround and is filed as one.** `resolveDataPlan` returns a
 * resolution and there is no exported way to ask for the answers it was built
 * from; `buildDataResolution` is public and takes a map nothing public
 * produces. A host that fetches on a server and renders in a browser — which is
 * the arrangement every React framework pushes you towards — has to write this
 * file. Five lines of it are a guess about which nodes to ask about, and that
 * guess is the part a published seam should not be leaving to a caller.
 */
export type CarriedAnswers = {
  /** One entry per node the plan named, holding that node's answers by name. */
  readonly answers: readonly (readonly [NodeId, readonly (readonly [string, DataOutcome])[]])[]
  /** Only the nodes that had something to report, in the seam's own words. */
  readonly problems: readonly (readonly [NodeId, readonly NodeDataProblem[]])[]
}

const NO_PROBLEMS: readonly NodeDataProblem[] = Object.freeze([])

/**
 * Every node this plan has something to say about, in plan order and once each.
 *
 * Both lists, because they answer different questions: a node is in `bindings`
 * when it asked something, and in `problems` when its declaration could not be
 * read at all — and the second kind never reaches the first. Missing either one
 * would carry a resolution that is quietly thinner than the one that was built.
 */
const askedAbout = (plan: DataPlan): readonly NodeId[] => {
  const ordered: NodeId[] = []
  const seen = new Set<string>()

  for (const nodeId of [
    ...plan.bindings.map((binding) => binding.nodeId),
    ...plan.problems.map((problem) => problem.nodeId),
  ]) {
    if (seen.has(nodeId)) continue

    seen.add(nodeId)
    ordered.push(nodeId)
  }

  return ordered
}

/** Reads a resolution out through its own accessors, as plain data. */
export const carryAnswers = (plan: DataPlan, resolution: DataResolution): CarriedAnswers => {
  const nodes = askedAbout(plan)

  return {
    answers: nodes.map((nodeId) => [nodeId, Object.entries(resolution.lookup(nodeId))] as const),
    problems: nodes
      .map((nodeId) => [nodeId, resolution.problemsFor(nodeId)] as const)
      .filter(([, problems]) => problems.length > 0),
  }
}

/**
 * The same resolution, on the other side of the boundary.
 *
 * `NO_DATA` for a node nobody carried an answer for, which is the runtime's own
 * answer to *this node asked for nothing* — and a node that did ask and is not
 * in the list earns a `data-unresolved` diagnostic from the walk rather than
 * silently drawing empty. That is the behaviour this has to preserve to be worth
 * anything, and it preserves it by using the same constant the runtime does.
 */
export const uncarryAnswers = (carried: CarriedAnswers): DataResolution => {
  const answers = new Map(
    carried.answers.map(([nodeId, named]) => [nodeId, nodeDataOf(Object.fromEntries(named))] as const)
  )
  const problems = new Map(carried.problems)

  return {
    lookup: (nodeId) => answers.get(nodeId) ?? NO_DATA,
    problemsFor: (nodeId) => problems.get(nodeId) ?? NO_PROBLEMS,
  }
}

/**
 * Plan a tree's questions, ask a deployment all of them, and hand back
 * something that can be sent to a browser.
 *
 * The two lines on the page — plan and resolve — plus the one this arrangement
 * costs. A caller on a server does this; the example in the browser does
 * nothing but `uncarryAnswers`.
 */
export const answersFor = async (tree: LoomTree, registry: DataRegistry): Promise<CarriedAnswers> => {
  const plan = planTreeData(tree)

  return carryAnswers(plan, await resolveDataPlan(plan, { registry }))
}
