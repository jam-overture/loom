import type { TreeDelta } from "@jam-overture/loom"

import { partNameOf, subjectFor, type PartName } from "./part-name"
import { namedList, type PlainLine } from "./vocabulary"

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

/**
 * The same operation, said to somebody who has not read the delta model.
 *
 * `describeOperation` above is the reviewer's reading and it is a good one, but
 * it is still the delta talking: `reconfigure n_head title, width (cleared)` is
 * three of the schema's own words and a comma-separated list. This is the
 * sentence that leads on the History screen, and the reviewer's reading moves
 * one click down beside the raw operation rather than being dropped.
 *
 * The verbs are the ordinary ones for what happened to a page. `configure` in
 * particular is not a word anybody uses about their own site — the thing that
 * happened is that a setting changed, so that is what it says.
 */
const PLAIN_VERBS: Readonly<Record<TreeDelta["operations"][number]["op"], string>> = {
  insert: "Added ",
  remove: "Deleted ",
  move: "Moved ",
  configure: "Changed ",
}

/**
 * What a reconfigure did to a node's settings.
 *
 * Set and unset are two different acts and the schema is right to separate
 * them, but a reader meets one sentence. Clearing is spelled out because
 * "changed its width" and "removed its width" are not the same news.
 */
const settingWords = (set: Readonly<Record<string, unknown>>, unset: readonly string[]): string => {
  const changed = Object.keys(set)

  if (changed.length === 0 && unset.length === 0) return " — it changed no settings."
  if (changed.length === 0) return `, clearing its ${namedList(unset)}.`
  if (unset.length === 0) return `'s ${namedList(changed)}.`

  return `'s ${namedList(changed)}, and cleared its ${namedList(unset)}.`
}

export const plainOperation = (
  operation: TreeDelta["operations"][number],
  names: ReadonlyMap<string, PartName> = new Map()
): PlainLine => {
  switch (operation.op) {
    /*
     * An insert needs no map: it carries the node it places, so the part can
     * always be named from the operation itself. The apposition that used to
     * say `, a loom.card,` is gone from this sentence because the name says
     * "the card" already — and the exact type has not left the screen, it is in
     * `describeOperation` beside the raw delta, one click down, which is where
     * the rule puts it.
     */
    case "insert":
      return {
        before: PLAIN_VERBS.insert,
        subject: partNameOf(operation.node),
        after: ` inside ${operation.parentId}.`,
      }
    case "remove":
      return {
        before: PLAIN_VERBS.remove,
        subject: subjectFor(names, operation.nodeId),
        after: " and everything inside it.",
      }
    case "move":
      return {
        before: PLAIN_VERBS.move,
        subject: subjectFor(names, operation.nodeId),
        after: ` inside ${operation.parentId}.`,
      }
    case "configure":
      return {
        before: PLAIN_VERBS.configure,
        subject: subjectFor(names, operation.nodeId),
        after: settingWords(operation.set, operation.unset),
      }
  }
}
