import type { NodeId } from "../ids.js"
import type { JsonObject, JsonValue } from "../json.js"
import { assertNever } from "../result.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import type { LoomNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

/**
 * The tree as the model sees it.
 *
 * An indented outline rather than the JSON document, for two reasons: it costs
 * a fraction of the tokens, and it puts each node's id at the start of its own
 * line, which is what the model has to copy to address anything. Rendering is
 * pure and deterministic — props are key-sorted — so the same tree always
 * produces the same prompt, which keeps prompt hashes comparable and leaves the
 * door open to prompt caching.
 */

const INDENT = "  "

const renderPropValue = (value: JsonValue): string => JSON.stringify(value)

const renderProps = (props: JsonObject): string => {
  const keys = Object.keys(props).sort()
  if (keys.length === 0) return ""

  const rendered = keys.map((key) => `${key}=${renderPropValue(props[key] as JsonValue)}`)

  return ` ${rendered.join(" ")}`
}

const renderHeading = (node: LoomNode): string => {
  switch (node.kind) {
    case "element":
      return `${node.id} element ${node.type}${renderProps(node.props)}`
    case "text":
      return `${node.id} text ${JSON.stringify(node.value)}`
    case "slot":
      return `${node.id} slot ${node.name}`
    default:
      return assertNever(node, "renderHeading")
  }
}

const renderNode = (node: LoomNode, depth: number, scopeNodeId?: NodeId): readonly string[] => {
  const marker = node.id === scopeNodeId ? "   <- scope" : ""
  const line = `${INDENT.repeat(depth)}${renderHeading(node)}${marker}`
  const children = node.kind === "text" ? [] : node.children

  return [line, ...children.flatMap((child) => renderNode(child, depth + 1, scopeNodeId))]
}

export const renderTree = (tree: LoomTree, scopeNodeId?: NodeId): string =>
  [`tree ${tree.treeId} revision ${tree.revision}`, ...renderNode(tree.root, 0, scopeNodeId)].join("\n")

const renderPropKeys = (label: string, keys: readonly string[]): string =>
  keys.length === 0 ? "" : ` ${label} ${keys.join(", ")}`

/**
 * One operation per line, in the order they apply. Used to show a model the
 * proposal the Gate refused, so a repair is a revision of something specific
 * rather than a second guess at the same utterance.
 */
const renderOperation = (operation: TreeOperation, position: number): readonly string[] => {
  const prefix = `${position + 1}. `

  switch (operation.op) {
    case "insert":
      return [
        `${prefix}insert into ${operation.parentId} at ${operation.index}:`,
        ...renderNode(operation.node, 2),
      ]
    case "remove":
      return [`${prefix}remove ${operation.nodeId} and its subtree`]
    case "move":
      return [`${prefix}move ${operation.nodeId} into ${operation.parentId} at ${operation.index}`]
    case "configure":
      return [
        `${prefix}configure ${operation.nodeId}${renderPropKeys("set", Object.keys(operation.set).sort())}${renderPropKeys("unset", operation.unset)}`,
      ]
    default:
      return assertNever(operation, "renderOperation")
  }
}

export const renderDelta = (delta: TreeDelta): string =>
  delta.operations.flatMap((operation, position) => renderOperation(operation, position)).join("\n")
