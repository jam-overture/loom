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

export type OperationDescription = {
  readonly verb: string
  /** The node the operation is about — the one to look for in the tree. */
  readonly subject: string
  /** What else the operation says, in the reader's words rather than the schema's. */
  readonly detail: string
}

const configureDetail = (
  set: Readonly<Record<string, unknown>>,
  unset: readonly string[]
): string => {
  const named = [...Object.keys(set), ...unset.map((key) => `${key} (cleared)`)]

  return named.length === 0 ? "no props" : named.join(", ")
}

/**
 * One operation, said in full.
 *
 * A revision log is read to answer "what changed", so unlike the activity view —
 * which summarises a proposal down to its verbs — each operation here names the
 * node it touched and where it went. The delta is the only record of that: the
 * snapshot shows the result and cannot say which part of it is new.
 */
export const describeOperation = (
  operation: TreeDelta["operations"][number]
): OperationDescription => {
  const verb = OPERATION_VERBS[operation.op]

  switch (operation.op) {
    case "insert":
      return {
        verb,
        subject: operation.node.id,
        detail: `${
          operation.node.kind === "element" ? operation.node.type : operation.node.kind
        } into ${operation.parentId} at ${operation.index}`,
      }
    case "remove":
      return { verb, subject: operation.nodeId, detail: "and everything under it" }
    case "move":
      return {
        verb,
        subject: operation.nodeId,
        detail: `into ${operation.parentId} at ${operation.index}`,
      }
    case "configure":
      return {
        verb,
        subject: operation.nodeId,
        detail: configureDetail(operation.set, operation.unset),
      }
  }
}
