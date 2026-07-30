import type { DeltaId, IdFactory, TreeId } from "../ids.js"
import { jsonObjectSchema, type JsonObject } from "../json.js"
import { assertNever, err, ok, reduceResult, type Result } from "../result.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import type { LoomNode } from "../tree/node.js"

import type { DraftNode, DraftOperation } from "./draft.js"

/**
 * The inverse of the projection in `draft.ts`: a validated draft becomes a real
 * TreeDelta. This is where the runtime, not the proposer, decides identity —
 * every inserted node gets its id here, from the same seam the rest of the
 * system mints through.
 *
 * Failures are reported as a sentence rather than a code because they all mean
 * one thing to the caller: the model said something it was not allowed to say.
 * The sentence is what makes that debuggable.
 */

export type MaterializeContext = {
  readonly treeId: TreeId
  readonly baseRevision: number
  readonly deltaId: DeltaId
  readonly idFactory: IdFactory
}

const collectResults = <TItem, TValue>(
  items: readonly TItem[],
  map: (item: TItem) => Result<TValue, string>
): Result<readonly TValue[], string> =>
  reduceResult<TItem, readonly TValue[], string>(items, [], (accumulator, item) => {
    const mapped = map(item)

    return mapped.ok ? ok([...accumulator, mapped.value]) : mapped
  })

const parseJson = (text: string): Result<unknown, string> => {
  try {
    return ok(JSON.parse(text) as unknown)
  } catch {
    return err("value is not parseable JSON")
  }
}

/**
 * Props arrive as one JSON-encoded object (0014). This is the whole of the trust
 * boundary for them: parse it, require an object rather than an array or a
 * scalar, and validate every value against the JSON value space so nothing
 * un-serialisable reaches a tree.
 *
 * What the old tagged union enforced in the grammar is enforced here instead —
 * strictly later, and reported as `malformed-proposal` rather than being
 * unsayable. Prop *meaning* is checked later still, by §4's registry against the
 * primitive's own declared schema (0011).
 *
 * One thing is genuinely lost: a duplicate key. `JSON.parse` collapses
 * `{"a":1,"a":2}` to the last value before this code sees it, so the "set twice"
 * refusal the tagged array allowed is not expressible any more. It is a smaller
 * loss than it looks — duplicate names in JSON have a deterministic outcome in
 * every parser anyone would use, where two entries in our own array genuinely
 * had none.
 */
export const decodeProps = (encoded: string): Result<JsonObject, string> => {
  const parsed = parseJson(encoded)

  /** Truncated: the reply is model-authored and this sentence ends up in telemetry. */
  if (!parsed.ok) return err(`props are not parseable JSON: ${encoded.slice(0, 80)}`)

  if (parsed.value === null || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return err("props must be a JSON object")
  }

  const validated = jsonObjectSchema.safeParse(parsed.value)

  return validated.success ? ok(validated.data) : err("props contain a value that is not JSON")
}

const materializeNode = (node: DraftNode, idFactory: IdFactory): Result<LoomNode, string> => {
  switch (node.kind) {
    case "text":
      return ok({ kind: "text", id: idFactory.nodeId(), value: node.value })
    case "element": {
      const props = decodeProps(node.props)
      if (!props.ok) return props

      const children = collectResults(node.children, (child) => materializeNode(child, idFactory))
      if (!children.ok) return children

      return ok({
        kind: "element",
        id: idFactory.nodeId(),
        type: node.type,
        props: props.value,
        children: children.value,
      })
    }
    default:
      return assertNever(node, "materializeNode")
  }
}

const materializeOperation = (
  operation: DraftOperation,
  idFactory: IdFactory
): Result<TreeOperation, string> => {
  switch (operation.op) {
    case "insert": {
      const node = materializeNode(operation.node, idFactory)

      return node.ok
        ? ok({ op: "insert", parentId: operation.parentId, index: operation.index, node: node.value })
        : node
    }
    case "remove":
      return ok({ op: "remove", nodeId: operation.nodeId })
    case "move":
      return ok({
        op: "move",
        nodeId: operation.nodeId,
        parentId: operation.parentId,
        index: operation.index,
      })
    case "configure": {
      const set = decodeProps(operation.set)

      return set.ok
        ? ok({ op: "configure", nodeId: operation.nodeId, set: set.value, unset: operation.unset })
        : set
    }
    default:
      return assertNever(operation, "materializeOperation")
  }
}

export const materializeDelta = (
  operations: readonly DraftOperation[],
  context: MaterializeContext
): Result<TreeDelta, string> => {
  if (operations.length === 0) return err("proposed a change with no operations")

  const materialized = collectResults(operations, (operation) =>
    materializeOperation(operation, context.idFactory)
  )

  return materialized.ok
    ? ok({
        deltaId: context.deltaId,
        treeId: context.treeId,
        baseRevision: context.baseRevision,
        operations: materialized.value,
      })
    : materialized
}
