import type { DeltaId, IdFactory, TreeId } from "../ids.js"
import { jsonObjectSchema, type JsonObject } from "../json.js"
import { assertNever, err, ok, type Result } from "../result.js"
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

/**
 * Every item mapped, in order, stopping at the first failure.
 *
 * It appends to one array rather than spreading the accumulated values per item
 * (0380). The spread made this the product of the list's length and itself, on
 * both lists it is used for. Children of one parent: 8,000 cost 70 ms, 16,000
 * cost 690 and 32,000 cost 4,704. Operations in one reply: 8,000 cost 61 ms and
 * 16,000 cost 783. **How long either list is, is the model's choice.**
 */
const collectResults = <TItem, TValue>(
  items: readonly TItem[],
  map: (item: TItem) => Result<TValue, string>
): Result<readonly TValue[], string> => {
  const collected: TValue[] = []

  for (const item of items) {
    const mapped = map(item)
    if (!mapped.ok) return mapped

    collected.push(mapped.value)
  }

  return ok(collected)
}

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

type DraftElement = Extract<DraftNode, { readonly kind: "element" }>

/**
 * A draft node to read, or an element whose children are now on the finished
 * stack and which is ready to be built around them.
 */
type Step =
  | { readonly step: "read"; readonly node: DraftNode }
  | {
      readonly step: "build"
      readonly node: DraftElement
      readonly props: JsonObject
      readonly children: number
    }

/**
 * A draft becomes a tree without a call frame per level (0380).
 *
 * **The order two things happen in is observable, and both are preserved.**
 * Props are decoded on the way down, so an element with an unreadable bag is
 * refused before anything below it is looked at and its message is the one the
 * caller gets. Ids are minted on the way *up* — every child before its parent,
 * in document order — because that is the order the recursion minted them in
 * and a node's id is in the delta the proposer gets back.
 *
 * The depth of a reply is the model's choice. This answered `RangeError` at two
 * thousand deep — second-shallowest in the framework, behind the render walk's
 * thousand, and both outlived 0372 and 0373 by sitting outside `src/tree/`.
 */
const materializeNode = (root: DraftNode, idFactory: IdFactory): Result<LoomNode, string> => {
  const work: Step[] = [{ step: "read", node: root }]
  const finished: LoomNode[] = []

  for (let next = work.pop(); next !== undefined; next = work.pop()) {
    if (next.step === "build") {
      finished.push({
        kind: "element",
        id: idFactory.nodeId(),
        type: next.node.type,
        props: next.props,
        children: finished.splice(finished.length - next.children, next.children),
      })
      continue
    }

    const node = next.node

    switch (node.kind) {
      case "text":
        finished.push({ kind: "text", id: idFactory.nodeId(), value: node.value })
        break
      case "element": {
        const props = decodeProps(node.props)
        if (!props.ok) return props

        work.push({ step: "build", node, props: props.value, children: node.children.length })

        for (let index = node.children.length - 1; index >= 0; index -= 1) {
          const child = node.children[index]
          if (child) work.push({ step: "read", node: child })
        }

        break
      }
      default:
        return assertNever(node, "materializeNode")
    }
  }

  const built = finished[0]

  /** Unreachable: one node in, one node out, and a failure returned above. */
  return built ? ok(built) : err("a draft node materialized to nothing")
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
