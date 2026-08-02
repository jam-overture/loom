import type { NodeId, TreeId } from "../ids.js"
import { err, ok, reduceResult, type Result } from "../result.js"
import { applyDelta } from "../tree/apply.js"
import type { TreeOperation } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"
import { invertOperations } from "../tree/inverse.js"
import { namedNodeIds } from "../tree/naming.js"
import type { LoomTree } from "../tree/tree.js"

import type { StoreError } from "./errors.js"
import type { ReplayMismatch } from "./replay.js"
import type { StoredRevision, TreeReader } from "./store.js"

/**
 * Planning a revert: reading the log to work out what undoing one of its
 * entries would mean, without deciding anything.
 *
 * The plan is computed rather than stored. The inverse of every applied delta
 * already exists at assessment time and is thrown away, and the alternative —
 * writing it onto the revision — would put a derived value in the log beside
 * the value it derives from, where the two can disagree and nothing is checking
 * (0016's argument for the snapshot, applied to a place it does not earn its
 * keep: an inverse is needed rarely, a snapshot on every render).
 *
 * So a revert reads the log forward from a seed, exactly as `auditSnapshot`
 * does, and for exactly the same reason 0028 gives: the tree a delta observed
 * is only recoverable by replaying the entries before it.
 *
 * This module decides nothing about whether the revert *should* happen. It
 * produces the operations and the obstacles; the Gate judges, as it does for any
 * other change.
 */

/** A revision after the target that names a node the undo would touch. */
export type ContestedRevision = {
  readonly revision: number
  readonly nodeIds: readonly NodeId[]
}

export type RevertPlan =
  | {
      readonly outcome: "revertable"
      readonly target: StoredRevision
      /**
       * The undo, as operations. They become a delta when something applies
       * them; the id and base revision belong to that delta, not to this plan.
       */
      readonly operations: readonly TreeOperation[]
      /** The head these operations were planned against. */
      readonly headRevision: number
    }
  /**
   * A later revision names a node the undo would touch, so applying the undo
   * would discard work done after the thing being undone — and would do it
   * silently, because the Gate sees a delta rather than the history behind it.
   */
  | {
      readonly outcome: "contested"
      readonly target: StoredRevision
      readonly contestedBy: readonly ContestedRevision[]
    }
  /** The revision is outside the span this reader and this seed can reach. */
  | {
      readonly outcome: "out-of-range"
      readonly revision: number
      /** One past the seed: the oldest revision this seed can replay up to. */
      readonly earliest: number
      readonly headRevision: number
    }
  | { readonly outcome: "unreplayable"; readonly mismatch: ReplayMismatch }
  /**
   * The target's delta cannot be inverted against the tree the replay produced.
   * In practice this means the seed is not this tree's history: inversion walks
   * the delta forward as it inverts, so a delta that applied when it was written
   * inverts against the state it was written for.
   */
  | { readonly outcome: "uninvertible"; readonly revision: number; readonly error: TreeError }

export type UnrevertablePlan = Exclude<RevertPlan, { readonly outcome: "revertable" }>

export const describeRevertPlan = (plan: RevertPlan): string => {
  switch (plan.outcome) {
    case "revertable":
      return `revision ${plan.target.revision} can be undone at head ${plan.headRevision}`
    case "contested":
      return `revision ${plan.target.revision} was built on by ${plan.contestedBy
        .map((contest) => contest.revision)
        .join(", ")}; undoing it would discard their changes`
    case "out-of-range":
      return `revision ${plan.revision} is outside ${plan.earliest}–${plan.headRevision}`
    case "unreplayable":
      return plan.mismatch.code === "revision-gap"
        ? `the log jumps from ${plan.mismatch.expected - 1} to ${plan.mismatch.found}`
        : `revision ${plan.mismatch.revision} no longer applies: ${plan.mismatch.detail}`
    case "uninvertible":
      return `revision ${plan.revision} cannot be inverted: ${plan.error.code}`
  }
}

export type RevertTarget = {
  readonly treeId: TreeId
  /** The revision to undo. Its delta is the one that gets inverted. */
  readonly revision: number
  /**
   * A tree whose revision precedes the target's, to replay from. Usually
   * revision 0; a host that checkpoints may supply a later one (0028).
   */
  readonly seed: LoomTree
}

/** Everything the walk must find before the target, and track after it. */
type Scan =
  | { readonly phase: "seeking"; readonly nextRevision: number; readonly tree: LoomTree }
  | {
      readonly phase: "trailing"
      readonly nextRevision: number
      readonly target: StoredRevision
      readonly operations: readonly TreeOperation[]
      readonly named: ReadonlySet<NodeId>
      readonly contestedBy: readonly ContestedRevision[]
    }

type ScanObstacle = Extract<
  RevertPlan,
  { readonly outcome: "unreplayable" | "uninvertible" }
>

/**
 * The undo's own reach, plus the target delta's.
 *
 * Both halves are needed. The undo of a removal is an insert carrying the whole
 * subtree, so only the inverse names what the removal destroyed; the undo of an
 * insert is a bare remove, so only the original names what was inserted.
 */
const reachOf = (
  target: StoredRevision,
  operations: readonly TreeOperation[]
): ReadonlySet<NodeId> =>
  new Set([...namedNodeIds(target.delta.operations), ...namedNodeIds(operations)])

const reachTarget = (
  scan: Extract<Scan, { readonly phase: "seeking" }>,
  entry: StoredRevision
): Result<Scan, ScanObstacle> => {
  const inverted = invertOperations(scan.tree, entry.delta)
  if (!inverted.ok) {
    return err({ outcome: "uninvertible", revision: entry.revision, error: inverted.error })
  }

  return ok({
    phase: "trailing",
    nextRevision: entry.revision + 1,
    target: entry,
    operations: inverted.value,
    named: reachOf(entry, inverted.value),
    contestedBy: [],
  })
}

const noteContest = (
  scan: Extract<Scan, { readonly phase: "trailing" }>,
  entry: StoredRevision
): Scan => {
  const overlap = namedNodeIds(entry.delta.operations).filter((nodeId) => scan.named.has(nodeId))

  return {
    ...scan,
    nextRevision: entry.revision + 1,
    contestedBy:
      overlap.length === 0
        ? scan.contestedBy
        : [...scan.contestedBy, { revision: entry.revision, nodeIds: overlap }],
  }
}

const stepScan = (
  scan: Scan,
  entry: StoredRevision,
  revision: number
): Result<Scan, ScanObstacle> => {
  if (entry.revision !== scan.nextRevision) {
    return err({
      outcome: "unreplayable",
      mismatch: { code: "revision-gap", expected: scan.nextRevision, found: entry.revision },
    })
  }

  if (scan.phase === "trailing") return ok(noteContest(scan, entry))
  if (entry.revision === revision) return reachTarget(scan, entry)

  const applied = applyDelta(scan.tree, entry.delta)
  if (!applied.ok) {
    return err({
      outcome: "unreplayable",
      mismatch: { code: "delta-rejected", revision: entry.revision, detail: applied.error.code },
    })
  }

  return ok({ phase: "seeking", nextRevision: entry.revision + 1, tree: applied.value })
}

/**
 * Walks the log forward one page at a time, in one pass: replaying up to the
 * target, inverting it, then checking everything after it for overlap.
 *
 * One pass rather than three because the three questions are answered at
 * different points of the same sequence, and reading it three times would give
 * three answers about three moments of a log that is still being appended to.
 *
 * Entries at or before the seed are skipped rather than folded — a checkpoint
 * seed already contains them, and a walk that refused them would make the seed
 * parameter useless for anything but revision 0.
 */
const scanLog = async (
  reader: TreeReader,
  target: RevertTarget,
  scan: Scan,
  cursor?: string
): Promise<Result<Result<Scan, ScanObstacle>, StoreError>> => {
  const page = await reader.revisions(target.treeId, cursor === undefined ? {} : { cursor })
  if (!page.ok) return page

  const walked = reduceResult<StoredRevision, Scan, ScanObstacle>(
    page.value.revisions.filter((entry) => entry.revision > target.seed.revision),
    scan,
    (current, entry) => stepScan(current, entry, target.revision)
  )

  if (!walked.ok) return ok(walked)

  return page.value.newer === null
    ? ok(walked)
    : await scanLog(reader, target, walked.value, page.value.newer)
}

/**
 * What undoing a revision would take, or what stands in the way.
 *
 * A `StoreError` means the log could not be read. Everything else is a verdict
 * about the revert itself, which is why the obstacles are values in the plan
 * rather than errors: "this revision was built on since" is an answer, not a
 * failure.
 */
export const planRevert = async (
  reader: TreeReader,
  target: RevertTarget
): Promise<Result<RevertPlan, StoreError>> => {
  const head = await reader.head(target.treeId)
  if (!head.ok) return head

  const earliest = target.seed.revision + 1
  const headRevision = head.value.revision

  if (target.revision < earliest || target.revision > headRevision) {
    return ok({ outcome: "out-of-range", revision: target.revision, earliest, headRevision })
  }

  const walked = await scanLog(reader, target, {
    phase: "seeking",
    nextRevision: earliest,
    tree: target.seed,
  })

  if (!walked.ok) return walked
  if (!walked.value.ok) return ok(walked.value.error)

  const scan = walked.value.value

  /** Head claimed a revision the log does not contain, so the two disagree. */
  if (scan.phase === "seeking") {
    return ok({
      outcome: "unreplayable",
      mismatch: { code: "revision-gap", expected: scan.nextRevision, found: headRevision },
    })
  }

  return ok(
    scan.contestedBy.length > 0
      ? { outcome: "contested", target: scan.target, contestedBy: scan.contestedBy }
      : {
          outcome: "revertable",
          target: scan.target,
          operations: scan.operations,
          headRevision,
        }
  )
}
