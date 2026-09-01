import { z } from "zod"

import { deltaIdSchema, nodeIdSchema, treeIdSchema, type DeltaId, type NodeId, type TreeId } from "../ids.js"
import { jsonObjectSchema, type JsonObject } from "../json.js"
import { err, ok, type Result } from "../result.js"

import type { TreeError } from "./errors.js"
import { loomNodeSchema, type LoomNode } from "./node.js"

/**
 * A TreeDelta is the only way a tree changes.
 *
 * Four discrete operations, chosen so that every structural edit is expressible
 * and every operation is individually reviewable by the Gate: you can reason
 * about "insert a checkout button into the sidebar" without diffing two trees.
 * A whole-tree replacement would collapse that reasoning into a single opaque
 * change, so it is deliberately not an operation.
 *
 * Operations within a delta are ordered and applied atomically — a delta that
 * fails halfway leaves the tree untouched. Each operation observes the effects
 * of the ones before it, so `index` in a `move` refers to the child list
 * *after* the node has been detached.
 */

export const insertOperationSchema = z.object({
  op: z.literal("insert"),
  parentId: nodeIdSchema,
  index: z.number().int().nonnegative(),
  node: loomNodeSchema,
})

export const removeOperationSchema = z.object({
  op: z.literal("remove"),
  nodeId: nodeIdSchema,
})

export const moveOperationSchema = z.object({
  op: z.literal("move"),
  nodeId: nodeIdSchema,
  parentId: nodeIdSchema,
  index: z.number().int().nonnegative(),
})

export const configureOperationSchema = z.object({
  op: z.literal("configure"),
  nodeId: nodeIdSchema,
  set: jsonObjectSchema.default({}),
  unset: z.array(z.string()).default([]),
})

export const treeOperationSchema = z.discriminatedUnion("op", [
  insertOperationSchema,
  removeOperationSchema,
  moveOperationSchema,
  configureOperationSchema,
])

export type InsertOperation = {
  readonly op: "insert"
  readonly parentId: NodeId
  readonly index: number
  readonly node: LoomNode
}

export type RemoveOperation = {
  readonly op: "remove"
  readonly nodeId: NodeId
}

export type MoveOperation = {
  readonly op: "move"
  readonly nodeId: NodeId
  readonly parentId: NodeId
  readonly index: number
}

export type ConfigureOperation = {
  readonly op: "configure"
  readonly nodeId: NodeId
  readonly set: JsonObject
  readonly unset: readonly string[]
}

export type TreeOperation = InsertOperation | RemoveOperation | MoveOperation | ConfigureOperation

export type TreeOperationName = TreeOperation["op"]

/**
 * The whole vocabulary of structural change, in the order the doc comment above
 * argues it.
 *
 * Four is a claim this project makes about itself in prose — on the front door,
 * in the course, in the reference — and until now every one of those was a digit
 * somebody typed. A sentence that counts a list in `src/` and cannot be checked
 * against it is the shape that has broken the build eleven times over a
 * different number; the remedy is the same one `EPISODE_RESOLUTION_KINDS` and
 * `UNJUDGED_REASONS` already are, and it costs a line.
 *
 * A fifth operation would be a change to what Loom is rather than an addition to
 * it, so this list is not expected to grow. That is exactly why it is worth
 * exporting: a number nobody expects to move is the one nobody re-checks.
 */
export const TREE_OPERATIONS: readonly TreeOperationName[] = [
  "insert",
  "remove",
  "move",
  "configure",
]

export const treeDeltaSchema = z.object({
  deltaId: deltaIdSchema,
  treeId: treeIdSchema,
  baseRevision: z.number().int().nonnegative(),
  operations: z.array(treeOperationSchema).min(1),
})

export type TreeDelta = {
  readonly deltaId: DeltaId
  readonly treeId: TreeId
  readonly baseRevision: number
  readonly operations: readonly TreeOperation[]
}

/** The boundary parse for deltas arriving from AI interpretation or the wire. */
export const parseDelta = (input: unknown): Result<TreeDelta, TreeError> => {
  const parsed = treeDeltaSchema.safeParse(input)
  if (!parsed.success) {
    const [issue] = parsed.error.issues
    return err({
      code: "schema-violation",
      path: issue ? issue.path.join(".") : "",
      detail: issue?.message ?? "unknown schema violation",
    })
  }

  return ok(parsed.data)
}
