import type { NodeId } from "../ids.js"
import { assertNever } from "../result.js"

import type { LoomNode } from "./node.js"
import { outlineTree } from "./outline.js"
import type { LoomTree } from "./tree.js"

/**
 * Why two trees are not the same tree.
 *
 * This is a *description*, never a recipe. A `TreeDifference` cannot be applied
 * and deliberately does not resemble a `TreeDelta`: a delta is authored against
 * a known base revision and is the only thing that may change a tree (0001), so
 * a second shape that also described change would eventually be applied by
 * somebody, and the log would gain entries nobody proposed.
 *
 * It exists for the case 0016 created: the log is the truth and the snapshot is
 * a view of it, and `auditSnapshot` can prove the two disagree without being
 * able to say *how*. "Diverged" is a fact an operator cannot act on. "The fold
 * produced a card the snapshot does not have, at `node-7`" is.
 *
 * Node ids are the join key, which is what makes this comparison meaningful
 * rather than a structural guess: ids are minted once by the runtime (0003) and
 * an accepted delta never re-mints them, so the same id on both sides is the
 * same node in two states, and an id on one side only is a node one side lost
 * or invented.
 */

/** What differs about a node both trees have. Ordered as listed. */
export type NodeFacet = "kind" | "type" | "props" | "text" | "parent" | "position"

export type TreeDifference =
  /** Present in the base tree, absent from the compared one. */
  | { readonly code: "missing"; readonly nodeId: NodeId; readonly label: string }
  /** Present in the compared tree, absent from the base one. */
  | { readonly code: "extra"; readonly nodeId: NodeId; readonly label: string }
  | {
      readonly code: "changed"
      readonly nodeId: NodeId
      readonly label: string
      /** Never empty — an unchanged node produces no difference at all. */
      readonly facets: readonly NodeFacet[]
    }

/**
 * A node's own name, which is the only thing a reader can recognise it by. Ids
 * are minted and carry no meaning; a difference that named only ids would be
 * true and unreadable.
 */
const labelOf = (node: LoomNode): string => {
  switch (node.kind) {
    case "element":
      return node.type
    case "slot":
      return node.name
    case "text":
      return "text"
    default:
      return assertNever(node, "labelOf")
  }
}

/**
 * Props are compared by their serialisation rather than key by key.
 *
 * Every prop is JSON by construction, and `JSON.stringify` is order-sensitive on
 * object keys — which is correct here and not a false positive waiting to
 * happen: a delta rewrites a props bag wholesale (0009), so two bags that differ
 * only in key order came from two different writes, and an audit that called
 * them equal would be hiding one of them.
 */
const sameJson = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

const facetsOf = (base: LoomNode, compared: LoomNode): readonly NodeFacet[] => {
  if (base.kind !== compared.kind) return ["kind"]

  if (base.kind === "element" && compared.kind === "element") {
    return [
      ...(base.type === compared.type ? [] : (["type"] as const)),
      ...(sameJson(base.props, compared.props) ? [] : (["props"] as const)),
    ]
  }

  if (base.kind === "slot" && compared.kind === "slot") {
    return base.name === compared.name ? [] : ["type"]
  }

  if (base.kind === "text" && compared.kind === "text") {
    return base.value === compared.value ? [] : ["text"]
  }

  return []
}

type Placed = {
  readonly node: LoomNode
  readonly parentId: NodeId | null
  readonly index: number
}

const placedById = (tree: LoomTree): ReadonlyMap<NodeId, Placed> =>
  new Map(
    outlineTree(tree.root).map((entry) => [
      entry.node.id,
      { node: entry.node, parentId: entry.parentId, index: entry.index },
    ])
  )

const differenceFor = (base: Placed, compared: Placed): TreeDifference | undefined => {
  const facets: readonly NodeFacet[] = [
    ...facetsOf(base.node, compared.node),
    ...(base.parentId === compared.parentId ? [] : (["parent"] as const)),
    ...(base.index === compared.index ? [] : (["position"] as const)),
  ]

  return facets.length === 0
    ? undefined
    : { code: "changed", nodeId: base.node.id, label: labelOf(base.node), facets }
}

/**
 * Every way `compared` differs from `base`, one entry per node.
 *
 * In document order of whichever tree holds the node, base first: a reader is
 * looking at a tree, and a list ordered by id would scatter one broken subtree
 * across the whole report.
 *
 * A moved node produces one `changed` with a `parent` or `position` facet, not a
 * `missing` and an `extra`. The id is what makes that possible, and it is the
 * reason this is worth having over a structural diff — a structural diff of a
 * moved card reports the entire subtree twice.
 */
export const compareTrees = (base: LoomTree, compared: LoomTree): readonly TreeDifference[] => {
  const left = placedById(base)
  const right = placedById(compared)

  const fromBase = Array.from(left.entries()).flatMap<TreeDifference>(([nodeId, placed]) => {
    const other = right.get(nodeId)
    if (other === undefined) return [{ code: "missing", nodeId, label: labelOf(placed.node) }]

    const difference = differenceFor(placed, other)

    return difference === undefined ? [] : [difference]
  })

  const onlyCompared = Array.from(right.entries())
    .filter(([nodeId]) => !left.has(nodeId))
    .map<TreeDifference>(([nodeId, placed]) => ({
      code: "extra",
      nodeId,
      label: labelOf(placed.node),
    }))

  return [...fromBase, ...onlyCompared]
}
