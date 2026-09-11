import type {
  DiscardedWork,
  JsonValue,
  LoomNode,
  LoomTree,
  TreeDelta,
  TreeId,
  TreeOperation,
} from "@loom/runtime"
import { childrenOf } from "@loom/runtime"
import {
  planRevert,
  type RevertPlan,
  type TreeReader,
  type UnrevertablePlan,
} from "@loom/runtime/store"

import {
  firstNamed,
  namesInOperations,
  partNameOf,
  subjectFor,
  type PartName,
} from "./part-name"
import { namedList, type PlainLine } from "./vocabulary"

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

/**
 * One inverse operation, phrased as what undoing the change would put back.
 *
 * A `PlainLine` rather than a verb/subject/detail triple, because a reader meets
 * one sentence with a node's name in the middle of it and the three-part shape
 * left the grammar to whoever set the pieces side by side. `restores n_head
 * title to “Welcome”` was both halves being right and the sentence being wrong.
 */
export type Restoration = PlainLine

export type Reversal =
  | {
      readonly kind: "revertable"
      readonly restores: readonly Restoration[]
      /**
       * The inverse operations themselves, unread. The sentences above are the
       * portal's reading of them; a reviewer checking that reading against the
       * delta model needs the operations, and nothing else on the screen carries
       * them (0018 — this is the runtime's own plan, consumed, not restated).
       */
      readonly inverse: TreeDelta["operations"]
      /**
       * Revisions after this one that changed nodes the undo touches, so applying
       * it writes over what they did (0035). Empty for a clean undo. Carried
       * because the delta cannot show it — a revision looks identically undoable
       * whether or not anything was built on it.
       */
      readonly discards: readonly DiscardedWork[]
    }
  /** No undo can be computed here, with the reason a reader can act on. */
  | {
      readonly kind: "blocked"
      /** Why, in words a reader who has read no decision record can act on. */
      readonly reason: string
      /** The runtime's own account of the same thing, kept for the record. */
      readonly technical: string
    }

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
export const describeRestoration = (
  operation: TreeOperation,
  names: ReadonlyMap<string, PartName> = new Map()
): Restoration => {
  switch (operation.op) {
    /*
     * The one sentence in the portal that can name something that no longer
     * exists. This inverse `insert` undoes a removal, so the node it carries is
     * the subtree the revision destroyed — gone from the tree, absent from the
     * forward delta, and present nowhere else at all. Naming it from the
     * operation is not a convenience here; it is the only opportunity.
     */
    case "insert": {
      const under = countUnder(operation.node)
      const carried =
        under === 0 ? "" : `, with the ${under} thing${under === 1 ? "" : "s"} that were inside it`

      return {
        before: "Puts ",
        subject: partNameOf(operation.node),
        after: `${carried}, back inside ${operation.parentId}.`,
      }
    }
    case "remove":
      return {
        before: "Takes ",
        subject: subjectFor(names, operation.nodeId),
        after: " back out again, along with anything now inside it.",
      }
    case "move":
      return {
        before: "Moves ",
        subject: subjectFor(names, operation.nodeId),
        after: ` back inside ${operation.parentId}, where it was.`,
      }
    case "configure": {
      const restored = Object.entries(operation.set).map(
        ([key, value]) => `${key} back to ${valuePreview(value)}`
      )
      const cleared = operation.unset.map((key) => `${key} back to nothing at all`)
      const named = [...restored, ...cleared]

      return {
        before: "Puts ",
        subject: subjectFor(names, operation.nodeId),
        after:
          named.length === 0
            ? " back as it was, though it had no settings to restore."
            : `'s ${namedList(named)}.`,
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
const blockedReason = (plan: UnrevertablePlan): { reason: string; technical: string } => {
  switch (plan.outcome) {
    case "out-of-range":
      return {
        reason: `This deployment’s copy of the record only goes back as far as revision ${plan.earliest}, so it can’t work out what undoing revision ${plan.revision} would put back.`,
        technical: `out-of-range: revision ${plan.revision}, earliest ${plan.earliest}`,
      }
    case "unreplayable":
      return {
        reason:
          "Loom couldn’t rebuild this page up to this change, so it can’t say what undoing it would put back. Nothing is wrong with the page as it stands.",
        technical: "unreplayable: the log does not replay cleanly to this revision",
      }
    case "uninvertible":
      return {
        reason:
          "This one can’t be undone. Loom has no way to work out what the page looked like before it.",
        technical: `uninvertible: ${plan.error.code}`,
      }
  }
}

/**
 * The plan, read.
 *
 * `known` is what the caller could find out about parts the inverse only names
 * by id — in practice the tree as it stands now, which covers a move or a
 * reconfigure, since those touch something that is still there. It is merged
 * *under* what the inverse itself carries, so a subtree the undo would restore
 * is named from the operation that carries it whether or not anything else
 * knows about it: that is the removal case, and it is the one nothing else can
 * answer.
 */
export const reversalOf = (
  plan: RevertPlan,
  known: ReadonlyMap<string, PartName> = new Map()
): Reversal => {
  if (plan.outcome !== "revertable") return { kind: "blocked", ...blockedReason(plan) }

  const names = firstNamed(known, namesInOperations(plan.operations))

  return {
    kind: "revertable",
    restores: plan.operations.map((operation) => describeRestoration(operation, names)),
    inverse: plan.operations,
    discards: plan.discards,
  }
}

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
  revision: number,
  /** Parts the caller already knows the names of — see `reversalOf`. */
  known: ReadonlyMap<string, PartName> = new Map()
): Promise<Reversal | undefined> => {
  const planned = await planRevert(reader, { treeId, revision, seed })

  return planned.ok ? reversalOf(planned.value, known) : undefined
}
