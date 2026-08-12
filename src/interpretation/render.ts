import type { CataloguedPrimitive, PrimitiveCatalogue } from "../catalogue.js"
import type { ThemeCatalogue, ThemeCatalogueEntry } from "../theme/registry.js"
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

const renderCataloguedProps = (primitive: CataloguedPrimitive): string => {
  if (primitive.props === undefined) return " props: not declared"
  if (primitive.props.length === 0) return " props: none"

  const rendered = primitive.props.map((prop) => (prop.required ? prop.name : `${prop.name}?`))

  return ` props: ${rendered.join(", ")}`
}

const renderCataloguedSlots = (primitive: CataloguedPrimitive): string =>
  primitive.slots.length === 0 ? "" : ` slots: ${primitive.slots.join(", ")}`

/**
 * The catalogue as the model sees it: one line per primitive, in registration
 * order, so the deployment's own ordering is what the model reads first.
 *
 * A trailing `?` marks an optional prop, mirroring how the same fact is written
 * in TypeScript, which is a notation a model has seen far more of than any
 * convention invented here.
 */
export const renderCatalogue = (catalogue: PrimitiveCatalogue): string =>
  catalogue
    .map(
      (primitive) =>
        `- ${primitive.type} — ${primitive.description}.${renderCataloguedProps(primitive)}${renderCataloguedSlots(primitive)}`
    )
    .join("\n")

const renderThemeGroup = (label: string, entries: readonly ThemeCatalogueEntry[]): readonly string[] =>
  entries.length === 0
    ? []
    : [`${label}:`, ...entries.map((entry) => `- ${entry.id} — ${entry.name}. ${entry.description}`)]

/**
 * The theme vocabulary as the model sees it — three lists of ids with the
 * sentence their author wrote about each.
 *
 * Without it, "make it warmer" resolves against a vocabulary the model was
 * never shown: the tree carries `palette: "editorial"` and nothing says which
 * other palettes exist, so the only reachable answers are the one already
 * mounted and an invented id that fails to resolve. The hex is deliberately not
 * here. A model choosing between registered palettes by description is the
 * bargain 0049 struck; a model choosing colours is the thing it rules out.
 */
export const renderThemeCatalogue = (catalogue: ThemeCatalogue): string =>
  [
    ...renderThemeGroup("Palettes", catalogue.palettes),
    ...renderThemeGroup("Font packs", catalogue.fontPacks),
    ...renderThemeGroup("Style presets", catalogue.stylePresets),
  ].join("\n")

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
