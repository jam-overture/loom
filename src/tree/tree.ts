import { z } from "zod"

import { treeIdSchema, type IdFactory, type TreeId } from "../ids.js"
import { err, ok, type Result } from "../result.js"

import type { TreeError } from "./errors.js"
import { duplicateNodeIds } from "./navigation.js"
import { elementNodeSchema, type ElementNode } from "./node.js"

/**
 * The persisted document. A tree is a root element plus a revision counter —
 * no timestamps, because minting one is a side effect and every function in
 * this module is pure. Storage and telemetry stamp their own times.
 *
 * `revision` increments once per accepted delta. A delta names the revision it
 * was authored against, which is how a stale AI proposal is detected instead of
 * being applied to a tree that has moved on underneath it.
 */

export const TREE_SCHEMA_VERSION = 1

export const loomTreeSchema = z.object({
  treeId: treeIdSchema,
  schemaVersion: z.literal(TREE_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  root: elementNodeSchema,
})

export type LoomTree = {
  readonly treeId: TreeId
  readonly schemaVersion: typeof TREE_SCHEMA_VERSION
  readonly revision: number
  readonly root: ElementNode
}

/**
 * The root is an element rather than any node because a document always has a
 * container: a bare text or slot root has no place to insert into, which would
 * make the first `insert` of every tree a special case.
 */
export const createTree = (root: ElementNode, idFactory: IdFactory): LoomTree => ({
  treeId: idFactory.treeId(),
  schemaVersion: TREE_SCHEMA_VERSION,
  revision: 0,
  root,
})

export const withRoot = (tree: LoomTree, root: ElementNode): LoomTree => ({
  ...tree,
  revision: tree.revision + 1,
  root,
})

/**
 * Structural invariants Zod cannot express. Currently one: node ids are unique
 * across the whole tree, since ids are the addressing scheme for every
 * downstream operation.
 */
export const validateTreeInvariants = (tree: LoomTree): Result<LoomTree, TreeError> => {
  const [duplicate] = duplicateNodeIds(tree.root)
  if (duplicate) return err({ code: "duplicate-node-id", nodeId: duplicate })

  return ok(tree)
}

/** The boundary parse: unknown input in, a validated tree or a TreeError out. */
export const parseTree = (input: unknown): Result<LoomTree, TreeError> => {
  const parsed = loomTreeSchema.safeParse(input)
  if (!parsed.success) {
    const [issue] = parsed.error.issues
    return err({
      code: "schema-violation",
      path: issue ? issue.path.join(".") : "",
      detail: issue?.message ?? "unknown schema violation",
    })
  }

  return validateTreeInvariants(parsed.data)
}
