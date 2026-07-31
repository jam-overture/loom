import { assertNever, outlineTree, type LoomNode, type LoomTree, type NodeKind } from "@loom/runtime"
import { addressNode, type Addressing, type DecorationLookup } from "@loom/runtime/react"

/**
 * The outline pane's view model: one flat, serialisable row per node.
 *
 * It is built on the server because addressability depends on the registry, and
 * it is flat because it crosses into a Client Component — a row holding its own
 * subtree would send every node down the wire once per ancestor.
 */

export type OutlineRow = {
  readonly nodeId: string
  readonly depth: number
  readonly kind: NodeKind
  readonly label: string
  /** Where a click meant for this node would actually land. */
  readonly addressing: Addressing
}

const LABEL_LIMIT = 42

/** A text node's own text is its only useful name, so it is the label. */
const summarise = (value: string): string => {
  const collapsed = value.replace(/\s+/gu, " ").trim()

  return collapsed.length > LABEL_LIMIT ? `${collapsed.slice(0, LABEL_LIMIT)}…` : collapsed
}

const labelOf = (node: LoomNode): string => {
  switch (node.kind) {
    case "element":
      return node.type
    case "slot":
      return node.name
    case "text":
      return summarise(node.value)
    default:
      return assertNever(node, "labelOf")
  }
}

/**
 * `addressNode` walks to the root for every row, which is one traversal per node
 * rather than one for the whole tree. That is deliberate: the alternative is a
 * second implementation of the delegation rule that happens to fold over the
 * outline, and two copies of that rule would be a worse bug than a quadratic over
 * a page-sized tree.
 */
export const outlineRows = (
  tree: LoomTree,
  decorates: DecorationLookup
): readonly OutlineRow[] =>
  outlineTree(tree.root).map((entry) => ({
    nodeId: entry.node.id,
    depth: entry.depth,
    kind: entry.node.kind,
    label: labelOf(entry.node),
    addressing: addressNode(tree.root, entry.node.id, decorates),
  }))
