import type { DiscardedWork, JsonValue, LoomNode, LoomTree, TreeId, TreeOperation } from "@loom/runtime"
import { childrenOf, nodeLabel } from "@loom/runtime"
import {
  planRevert,
  type RevertPlan,
  type TreeReader,
  type UnrevertablePlan,
} from "@loom/runtime/store"

/**
 * What a revision replaced, and what undoing it would cost — before anyone
 * clicks undo.
 *
 * The forward delta on a revision records only what it *did*: a `configure`
 * carries the value it set and not the one it wrote over; a `remove` carries the
 * id of what it deleted and not the subtree that went with it; a `move` carries
 * the destination and not the origin. The "before" side of each of those is gone
 * from the tree as it stands now, and the only record of it is the log — read
 * backwards and inverted. That is the fact this module surfaces, and it is the
 * one a diff in `git log` gives away for free and Loom's delta model, by design,
 * does not store (0016).
 *
 * The inverse is not recomputed here. `planRevert` already reads the log forward
 * from a seed, inverts the target against the tree it observed, and reports what
 * later revisions would be written over — so this consumes that plan rather than
 * repeating its walk (0018). The undo *button* applies the same plan; this is
 * the reading of it that lets a reviewer decide before they act.
 */

/** One inverse operation, phrased as what undoing the change restores. */
export type Restoration = {
  /** "restores", "removes", "moves back" — the reader's verb, not the delta's. */
  readonly verb: string
  /** The node undoing touches — the one to look for in the tree. */
  readonly subject: string
  /** What comes back, in full: the prior prop value, the destroyed subtree, the origin. */
  readonly detail: string
}

export type Reversal =
  | {
      readonly kind: "revertable"
      readonly restores: readonly Restoration[]
      /**
       * Revisions after this one that changed nodes the undo touches, so applying
       * it writes over what they did (0035). Empty for a clean undo. Carried
       * because the delta cannot show it — a revision looks identically undoable
       * whether or not anything was built on it.
       */
      readonly discards: readonly DiscardedWork[]
    }
  /** No undo can be computed here, with the reason a reader can act on. */
  | { readonly kind: "blocked"; readonly reason: string }

/**
 * A value a change wrote over, short enough to sit on a line. A prior
 * configuration value is arbitrary JSON, and the reader wants to recognise it,
 * not to read it in full — a string in quotes, a container by its size.
 */
const valuePreview = (value: JsonValue): string => {
  if (typeof value === "string") return `“${value}”`
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value === null) return "null"
  if (Array.isArray(value)) return `a list of ${value.length}`
  return "an object"
}

/** How much a restored subtree brings back with it — everything below the node. */
const countUnder = (node: LoomNode): number =>
  childrenOf(node).reduce((total, child) => total + 1 + countUnder(child), 0)

/**
 * One inverse operation, read as a restoration.
 *
 * The operation is already the inverse of what the revision did, so the mapping
 * is by the *inverse* op's kind: an inverse `insert` undoes a removal and brings
 * the deleted subtree back; an inverse `configure` undoes a reconfigure and
 * restores the values it wrote over. Each phrasing pulls the displaced content
 * onto the line, which is the whole reason to show the inverse rather than the
 * delta the reviewer can already see above it.
 */
export const describeRestoration = (operation: TreeOperation): Restoration => {
  switch (operation.op) {
    case "insert": {
      const under = countUnder(operation.node)
      const carried = under === 0 ? "" : `, with the ${under} node${under === 1 ? "" : "s"} it held`

      return {
        verb: "restores",
        subject: operation.node.id,
        detail: `${nodeLabel(operation.node)}${carried}, back into ${operation.parentId}`,
      }
    }
    case "remove":
      return {
        verb: "removes",
        subject: operation.nodeId,
        detail: "what this change added, and anything under it",
      }
    case "move":
      return {
        verb: "moves back",
        subject: operation.nodeId,
        detail: `into ${operation.parentId} at ${operation.index}`,
      }
    case "configure": {
      const restored = Object.entries(operation.set).map(
        ([key, value]) => `${key} to ${valuePreview(value)}`
      )
      const cleared = operation.unset.map((key) => `${key} (removes it)`)
      const named = [...restored, ...cleared]

      return {
        verb: "restores",
        subject: operation.nodeId,
        detail: named.length === 0 ? "no props" : named.join(", "),
      }
    }
  }
}

/**
 * Why undoing cannot be shown, said so a reader can tell the three apart. They
 * fail for different reasons — a seed this host cannot reach back to, a log that
 * no longer replays, a delta that will not invert — and collapsing them would
 * turn an answer into a shrug.
 */
const blockedReason = (plan: UnrevertablePlan): string => {
  switch (plan.outcome) {
    case "out-of-range":
      return `This host cannot replay the log back to revision ${plan.revision} — it reaches revision ${plan.earliest} at the earliest — so what undoing it would restore cannot be shown here.`
    case "unreplayable":
      return "The log no longer replays cleanly up to this change, so what undoing it would restore cannot be computed."
    case "uninvertible":
      return `This change cannot be inverted (${plan.error.code}), so it cannot be undone.`
  }
}

export const reversalOf = (plan: RevertPlan): Reversal =>
  plan.outcome === "revertable"
    ? { kind: "revertable", restores: plan.operations.map(describeRestoration), discards: plan.discards }
    : { kind: "blocked", reason: blockedReason(plan) }

/**
 * The reversal of one revision, read from the log.
 *
 * `undefined` when the log itself could not be read (a `StoreError`, not a
 * verdict about the revert) or when this host has no seed to replay from — both
 * of which leave the row to fall back to offering undo and reporting the outcome
 * on the click, which is what it did before this preview existed. A verdict
 * *about* the revert — clean, contested, or impossible — is a `Reversal`, never
 * an absence.
 */
export const previewReversal = async (
  reader: TreeReader,
  treeId: TreeId,
  seed: LoomTree,
  revision: number
): Promise<Reversal | undefined> => {
  const planned = await planRevert(reader, { treeId, revision, seed })

  return planned.ok ? reversalOf(planned.value) : undefined
}
