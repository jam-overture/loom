import type { TreeDelta } from "@loom/runtime"

/**
 * What a delta did, in the words a reviewer uses.
 *
 * One place, because a change described as "add" in the review queue and
 * "insert" in the activity log reads as two different things having happened.
 * The runtime's operation names are the delta model's vocabulary (0001); these
 * are the portal's, and the mapping between them belongs here rather than in
 * each component that happens to render a delta.
 */
const OPERATION_VERBS: Readonly<Record<TreeDelta["operations"][number]["op"], string>> = {
  insert: "add",
  remove: "delete",
  move: "move",
  configure: "reconfigure",
}

export const summariseOperations = (operations: TreeDelta["operations"]): string =>
  operations.length === 0
    ? "no operations"
    : operations.map((operation) => OPERATION_VERBS[operation.op]).join(", ")
