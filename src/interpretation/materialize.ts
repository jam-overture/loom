import type { DeltaId, IdFactory, TreeId } from "../ids.js"
import { jsonValueSchema, type JsonObject, type JsonValue } from "../json.js"
import { assertNever, err, ok, reduceResult, type Result } from "../result.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import type { LoomNode } from "../tree/node.js"

import type { DraftNode, DraftOperation, DraftProp, DraftPropValue } from "./draft.js"

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

const decodePropValue = (key: string, value: DraftPropValue): Result<JsonValue, string> => {
  switch (value.kind) {
    case "string":
      return ok(value.string)
    case "number":
      return ok(value.number)
    case "boolean":
      return ok(value.boolean)
    case "null":
      return ok(null)
    case "json": {
      const parsed = parseJson(value.json)
      if (!parsed.ok) return err(`prop "${key}": ${parsed.error}`)

      const validated = jsonValueSchema.safeParse(parsed.value)

      return validated.success ? ok(validated.data) : err(`prop "${key}": not a JSON value`)
    }
    default:
      return assertNever(value, "decodePropValue")
  }
}

/**
 * Duplicate keys are rejected rather than resolved last-wins: two values for
 * one prop is an ambiguous proposal, and guessing which the model meant would
 * hide that from the Gate and from telemetry.
 */
export const decodeProps = (props: readonly DraftProp[]): Result<JsonObject, string> =>
  reduceResult<DraftProp, JsonObject, string>(props, {}, (accumulator, prop) => {
    if (Object.hasOwn(accumulator, prop.key)) return err(`prop "${prop.key}" set twice`)

    const value = decodePropValue(prop.key, prop.value)

    return value.ok ? ok({ ...accumulator, [prop.key]: value.value }) : value
  })

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
    case "slot": {
      const children = collectResults(node.children, (child) => materializeNode(child, idFactory))
      if (!children.ok) return children

      return ok({ kind: "slot", id: idFactory.nodeId(), name: node.name, children: children.value })
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
