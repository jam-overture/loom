import type { JsonObject, JsonValue } from "../json.js"
import { slotNameSchema } from "../primitive-type.js"
import { assertNever, err, ok, type Result } from "../result.js"

import type { TreeError } from "./errors.js"
import type { LoomNode } from "./node.js"

/**
 * `configure` is one operation across three node kinds, so each kind exposes
 * its settable surface as a plain JSON record:
 *
 * - element → its props, an open key space
 * - text    → `{ value }`
 * - slot    → `{ name }`
 *
 * Element props are open because the primitive owns their meaning; text and
 * slot expose exactly one required key each, so unsetting it is rejected
 * rather than silently producing a malformed node. Keeping the surface uniform
 * is what lets the delta model stay at four operations instead of growing one
 * per node kind.
 */

export const configurationOf = (node: LoomNode): JsonObject => {
  switch (node.kind) {
    case "element":
      return node.props
    case "text":
      return { value: node.value }
    case "slot":
      return { name: node.name }
    default:
      return assertNever(node, "configurationOf")
  }
}

export type NodeConfigurationPatch = {
  readonly set: JsonObject
  readonly unset: readonly string[]
}

const applyPatch = (base: JsonObject, patch: NodeConfigurationPatch): JsonObject => {
  const merged: Record<string, JsonValue> = { ...base, ...patch.set }
  for (const key of patch.unset) delete merged[key]

  return merged
}

const fixedKeyPatch = (
  node: LoomNode,
  patch: NodeConfigurationPatch,
  key: string
): Result<JsonObject, TreeError> => {
  const rejectedKey =
    Object.keys(patch.set).find((candidate) => candidate !== key) ??
    patch.unset.find((candidate) => candidate !== key)

  if (rejectedKey !== undefined) {
    return err({
      code: "unconfigurable-key",
      nodeId: node.id,
      nodeKind: node.kind,
      key: rejectedKey,
    })
  }

  if (patch.unset.includes(key)) {
    return err({
      code: "invalid-configuration",
      nodeId: node.id,
      nodeKind: node.kind,
      detail: `"${key}" is required and cannot be unset`,
    })
  }

  return ok(applyPatch(configurationOf(node), patch))
}

const configureElement = (
  node: Extract<LoomNode, { kind: "element" }>,
  patch: NodeConfigurationPatch
): Result<LoomNode, TreeError> => ok({ ...node, props: applyPatch(node.props, patch) })

const configureText = (
  node: Extract<LoomNode, { kind: "text" }>,
  patch: NodeConfigurationPatch
): Result<LoomNode, TreeError> => {
  const patched = fixedKeyPatch(node, patch, "value")
  if (!patched.ok) return patched

  const value = patched.value["value"]
  if (typeof value !== "string") {
    return err({
      code: "invalid-configuration",
      nodeId: node.id,
      nodeKind: node.kind,
      detail: `"value" must be a string`,
    })
  }

  return ok({ ...node, value })
}

const configureSlot = (
  node: Extract<LoomNode, { kind: "slot" }>,
  patch: NodeConfigurationPatch
): Result<LoomNode, TreeError> => {
  const patched = fixedKeyPatch(node, patch, "name")
  if (!patched.ok) return patched

  const parsed = slotNameSchema.safeParse(patched.value["name"])
  if (!parsed.success) {
    return err({
      code: "invalid-configuration",
      nodeId: node.id,
      nodeKind: node.kind,
      detail: `"name" must be a camelCase slot name`,
    })
  }

  return ok({ ...node, name: parsed.data })
}

export const configureNode = (
  node: LoomNode,
  patch: NodeConfigurationPatch
): Result<LoomNode, TreeError> => {
  const collision = patch.unset.find((key) => key in patch.set)
  if (collision !== undefined) {
    return err({
      code: "invalid-configuration",
      nodeId: node.id,
      nodeKind: node.kind,
      detail: `"${collision}" appears in both set and unset`,
    })
  }

  switch (node.kind) {
    case "element":
      return configureElement(node, patch)
    case "text":
      return configureText(node, patch)
    case "slot":
      return configureSlot(node, patch)
    default:
      return assertNever(node, "configureNode")
  }
}
