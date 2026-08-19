import type { NodeId } from "../ids.js"
import { isInteractiveWith, type InteractiveTypes, type InteractiveWhen } from "../interactivity.js"
import type { PrimitiveType } from "../primitive-type.js"
import { childrenOf, type ElementNode, type LoomNode } from "../tree/node.js"

/**
 * Where a tree puts one target inside another.
 *
 * Nothing built so far can catch this.
 * [0008](../../decisions/0008-the-renderer-is-a-total-pure-projection.md)
 * forbids the renderer from enforcing parentage, `auditRegistry` probes a
 * primitive in isolation, and a props schema sees one node and never its
 * descendants. The constraint is real, cheap to check, and until now
 * expressible nowhere (0064).
 */

/** Whether this element renders a target — its type and its own props, never its position. */
export type InteractivePredicate = (node: ElementNode) => boolean

/** What a host that declares no interactive vocabulary gets, which is today's behaviour. */
export const NOTHING_INTERACTIVE: InteractivePredicate = () => false

export const interactivePredicateFor = (types: InteractiveTypes): InteractivePredicate => {
  /**
   * A `Map` rather than an index, for the reason `staticPrimitiveResolver`
   * gives: `constructor` and `toString` are valid primitive types, and an
   * ordinary object would answer for them out of `Object.prototype`.
   */
  const byType = new Map<string, InteractiveWhen>(
    Object.entries(types).flatMap(([type, when]) => (when ? [[type, when] as const] : []))
  )

  return (node) => {
    const when = byType.get(node.type)

    return when !== undefined && isInteractiveWith(when, node.props)
  }
}

/** One target sitting inside another, named by the node a browser will drop. */
export type NestedTarget = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** The nearest target above it, which is the one that swallows it. */
  readonly ancestorId: NodeId
  readonly ancestorType: PrimitiveType
}

type Enclosing = { readonly id: NodeId; readonly type: PrimitiveType } | null

const collect = (
  node: LoomNode,
  enclosing: Enclosing,
  isInteractive: InteractivePredicate,
  found: NestedTarget[]
): void => {
  const target = node.kind === "element" && isInteractive(node) ? node : null

  if (target && enclosing) {
    found.push({
      nodeId: target.id,
      type: target.type,
      ancestorId: enclosing.id,
      ancestorType: enclosing.type,
    })
  }

  /**
   * The *nearest* enclosing target, not the outermost. Three deep is two faults
   * rather than one, and a reviewer told about each pair that touches can read
   * the chain off the tree; told only about the ends, they cannot.
   *
   * Slot nodes are descended without being targets themselves — a region
   * projected into a linked card sits inside it exactly as a child does.
   */
  const below: Enclosing = target ? { id: target.id, type: target.type } : enclosing

  for (const child of childrenOf(node)) collect(child, below, isInteractive, found)
}

/** Every target this tree puts inside another, in document order. */
export const nestedTargetsIn = (
  root: LoomNode,
  isInteractive: InteractivePredicate
): readonly NestedTarget[] => {
  const found: NestedTarget[] = []
  collect(root, null, isInteractive, found)

  return found
}

export const describeNestedTarget = (nested: NestedTarget): string =>
  `${nested.type} ${nested.nodeId} inside ${nested.ancestorType} ${nested.ancestorId}`
