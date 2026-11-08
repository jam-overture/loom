import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"
import { copyIn, type CopyDeclarations, type NodeCopy } from "../sdk/copy.js"
import type { ElementNode, LoomNode } from "../tree/node.js"

/**
 * The two rules both joins of a window to a tree have to get the same answer
 * to, spelled once.
 *
 * [`parts.ts`](parts.ts) joins the tallies and [`inside.ts`](inside.ts) joins
 * the hourly counter, and both have to say what part a primitive plays (0114)
 * and what words a part says itself (0122). Two spellings of either would be
 * two chances for one of them to be wrong, and the second rule carries a
 * sentence that a caller relies on: *the words of a page are partitioned across
 * its parts exactly once*, which is what lets two rows be added together
 * without a headline being read twice.
 *
 * **Not a published door.** These are the private middle of two readings rather
 * than anything a host asks for, and `@jam-overture/loom/signals` is wide
 * enough already — so this module is deliberately absent from the barrel, as
 * `counters.ts` and `words.ts` are.
 */

/**
 * Which types declared each role, as a registry answers it.
 *
 * The same shape as `CopyDeclarations` and for the same reason (0122): a
 * registry built by the SDK satisfies it, and so does a two-line double in a
 * test. The inverse — a type's role — is what both joins need and is not what
 * 0114 exposes, because a role is a question asked of the vocabulary rather than
 * of a component. The vocabulary is closed and exported, so the inversion is a
 * walk of `PRIMITIVE_ROLES` rather than a method on the registry.
 *
 * Published, by way of `parts.ts` — a deployment hands one of these in.
 */
export type RoleDeclarations = {
  readonly typesWithRole: (role: PrimitiveRole) => readonly PrimitiveType[]
}

/**
 * A type's role, inverted from the vocabulary once per reading.
 *
 * Linear in the vocabulary rather than per part: the alternative is asking
 * `typesWithRole` for every part, which is a registry call and a list scan per
 * node on a page that may have thousands.
 */
export const rolesByType = (
  declarations: RoleDeclarations
): ReadonlyMap<PrimitiveType, PrimitiveRole> => {
  const byType = new Map<PrimitiveType, PrimitiveRole>()

  for (const role of PRIMITIVE_ROLES) {
    for (const type of declarations.typesWithRole(role)) {
      /**
       * First declaration wins, and it cannot legitimately happen twice: a
       * definition carries one `role`. A registry that answered the same type
       * for two roles is wrong about something this reading cannot fix, and
       * picking the earlier keeps the answer stable rather than dependent on
       * the vocabulary's order.
       */
      if (!byType.has(type)) byType.set(type, role)
    }
  }

  return byType
}

/**
 * The children that are not parts in their own right, which is what a node
 * contributes itself.
 *
 * Text is kept and an element is dropped, because every element is a part of
 * this reading and would otherwise be counted at two depths. **A slot is kept
 * and pruned the same way**, because a slot is not an element and so is never a
 * part: text handed into one belongs to the nearest element above it, and a slot
 * treated as an element would lose those words to a node this reading never
 * reports. The words of a page are partitioned across its parts exactly once,
 * and that sentence is only true with this clause in it.
 */
const ownChildren = (children: readonly LoomNode[]): readonly LoomNode[] =>
  children.flatMap<LoomNode>((child) => {
    switch (child.kind) {
      case "element":
        return []
      case "text":
        return [child]
      case "slot":
        return [{ ...child, children: ownChildren(child.children) }]
    }
  })

/**
 * What a part says on its own, read with `copyIn` against a node stripped of
 * everything that is a part in its own right.
 *
 * `copyIn` walks a subtree, which is right for its callers and wrong here — a
 * root would carry every word on the page and so would every band on the way
 * down. Rather than reimplement its rules about blank strings, non-string values
 * and what counts as declared, this hands it the node with only the children
 * that are nobody else's, which is exactly the part's own contribution.
 */
export const ownCopy = (node: ElementNode, declarations: CopyDeclarations): NodeCopy =>
  copyIn({ ...node, children: ownChildren(node.children) }, declarations)
