import type { CataloguedPrimitive, CataloguedProp, PrimitiveCatalogue } from "../catalogue.js"
import type { DataCatalogue } from "../data/catalogue.js"
import type { FrameCatalogue } from "../frame/catalogue.js"
import type { SubmissionCatalogue } from "../submit/catalogue.js"
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

const childrenOf = (node: LoomNode): readonly LoomNode[] => (node.kind === "text" ? [] : node.children)

/**
 * The nodes from the root down to `nodeId` inclusive, or `undefined` when the
 * id is not in this tree.
 *
 * Depth-first and stopping at the first match, which is exact rather than merely
 * adequate: an id appears at most once in a tree, and a delta that would
 * duplicate one is refused before it can be applied (0038).
 */
const chainTo = (node: LoomNode, nodeId: NodeId): readonly LoomNode[] | undefined => {
  if (node.id === nodeId) return [node]

  for (const child of childrenOf(node)) {
    const below = chainTo(child, nodeId)
    if (below !== undefined) return [node, ...below]
  }

  return undefined
}

const omitted = (count: number, where: "preceding" | "following"): string =>
  `… ${count} ${where} ${count === 1 ? "child" : "children"} omitted`

/**
 * The spine down to the scope, and the scope's subtree in full.
 *
 * Each ancestor contributes its own heading and nothing else — its other
 * children collapse to a count, above and below, so that the elision is visible
 * rather than silent. Two separate counts rather than one because the preceding
 * count *is* the scope node's index among its siblings, which is what an insert
 * beside it would have to name; a single total would take that away.
 */
const renderChain = (chain: readonly LoomNode[], depth: number): readonly string[] => {
  const [node, ...rest] = chain
  if (node === undefined) return []

  const next = rest[0]
  if (next === undefined) return renderNode(node, depth, node.id)

  const children = childrenOf(node)
  const index = children.findIndex((child) => child.id === next.id)
  const following = children.length - index - 1
  const childIndent = INDENT.repeat(depth + 1)

  return [
    `${INDENT.repeat(depth)}${renderHeading(node)}`,
    ...(index > 0 ? [`${childIndent}${omitted(index, "preceding")}`] : []),
    ...renderChain(rest, depth + 1),
    ...(following > 0 ? [`${childIndent}${omitted(following, "following")}`] : []),
  ]
}

/**
 * A scoped request sends the scope, not the page it sits on.
 *
 * Without a scope the whole tree is rendered, which is the only honest answer to
 * "change this page". With one, the intent has already said the change is
 * confined to a subtree, and sending the rest costs a request that grows with a
 * page the model has been told not to touch — the outline is linear in the node
 * count and it is re-sent on every proposal and again on every repair
 * ([0083](../../decisions/0083-a-scoped-request-sends-the-scope.md)).
 *
 * A scope naming a node this tree does not contain renders the whole tree, which
 * is the same thing that happened before there was anything to elide. It is a
 * caller error rather than a shape the renderer can resolve, and a total
 * projection does not get to throw (0008).
 */
export const renderTree = (tree: LoomTree, scopeNodeId?: NodeId): string => {
  const chain = scopeNodeId === undefined ? undefined : chainTo(tree.root, scopeNodeId)
  const body = chain === undefined ? renderNode(tree.root, 0, scopeNodeId) : renderChain(chain, 0)

  return [`tree ${tree.treeId} revision ${tree.revision}`, ...body].join("\n")
}

/**
 * Declared fields, as a catalogue line writes them.
 *
 * Shared by primitives and sources because the two projections answer the same
 * three-way question in the same shape — a list, an empty list, or `undefined`
 * meaning the schema could not be enumerated — and a second copy of the
 * `not declared` / `none` distinction is a second chance to collapse it.
 *
 * The label is a parameter rather than a constant because the two are not the
 * same word to a reader: a primitive takes props and a source takes params, and
 * telling a model a source has `props` invites it to set them on the node.
 */
const renderDeclaredFields = (
  label: string,
  fields: readonly CataloguedProp[] | undefined
): string => {
  if (fields === undefined) return ` ${label}: not declared`
  if (fields.length === 0) return ` ${label}: none`

  const rendered = fields.map((field) => (field.required ? field.name : `${field.name}?`))

  return ` ${label}: ${rendered.join(", ")}`
}

const renderCataloguedProps = (primitive: CataloguedPrimitive): string =>
  renderDeclaredFields("props", primitive.props)

const renderCataloguedSlots = (primitive: CataloguedPrimitive): string =>
  primitive.slots.length === 0 ? "" : ` slots: ${primitive.slots.join(", ")}`

/**
 * The binding names a primitive reads, where its author has said.
 *
 * The three-way distinction `renderDeclaredFields` spells out is kept, and
 * spelled differently: a declared list and a declared `none` are written, and
 * *nobody has said* is written by saying nothing. That is the opposite of what
 * props do, and the difference is which answer is the common one. Every
 * primitive declares a props schema, so `props: not declared` is the rare line
 * and is worth its words; `reads` is absent on every primitive whose author has
 * not thought about data, which today is nearly all of them, and a catalogue
 * carrying `reads: not declared` on ninety-six consecutive lines would spend
 * real tokens on every proposal to tell a model nothing at all.
 *
 * The distinction survives because absence of the clause *is* the third
 * answer — the model is told in the data block how to read it.
 */
const renderCataloguedReads = (primitive: CataloguedPrimitive): string => {
  if (primitive.reads === undefined) return ""
  if (primitive.reads.length === 0) return " reads: none"

  return ` reads: ${primitive.reads.join(", ")}`
}

/**
 * A description ends its own sentence, and the renderer finishes one that does
 * not.
 *
 * Every description in the starter library already ends in a full stop, so
 * appending one unconditionally gave the model sixty-one lines reading
 * `…in one column.. props: fills?` on every proposal and again on every repair.
 * Nothing renders this string and no snapshot can look wrong, which is why it
 * survived until a documentation page printed the real request.
 *
 * Refusing to append at all was the other way, and it is worse for the case
 * this does not control: a host's own primitive may be described without
 * terminal punctuation, and `— A banner props: tone?` runs the sentence into
 * the props with nothing between them.
 */
const TERMINAL_PUNCTUATION = new Set([".", "!", "?"])

const renderCataloguedDescription = (description: string): string =>
  TERMINAL_PUNCTUATION.has(description.slice(-1)) ? description : `${description}.`

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
        `- ${primitive.type} — ${renderCataloguedDescription(primitive.description)}${renderCataloguedProps(primitive)}${renderCataloguedSlots(primitive)}${renderCataloguedReads(primitive)}`
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

/**
 * The sources as the model sees it — one line per registered source, with the
 * params it declares written the way a primitive's props are.
 *
 * Registration order, like the primitive catalogue and for the same reason: the
 * deployment's own ordering is what the model reads first, and sorting here
 * would silently overrule a host that put its most-used source at the top.
 */
export const renderSourceCatalogue = (catalogue: DataCatalogue): string =>
  catalogue
    .map(
      (source) =>
        `- ${source.id} — ${renderCataloguedDescription(source.description)}${renderDeclaredFields("params", source.params)}`
    )
    .join("\n")

/**
 * The endpoints as the model sees it — an id and a line, and deliberately
 * nothing else.
 *
 * `submissionCatalogue` is thin because there is nothing else a model may
 * supply (0065): where a form posts to, whether it posts or gets, and what it
 * carries are resolved after the choice is made. Rendering anything more here
 * would be putting an address in front of a model that must never name one.
 */
export const renderSubmissionCatalogue = (catalogue: SubmissionCatalogue): string =>
  catalogue
    .map((endpoint) => `- ${endpoint.id} — ${renderCataloguedDescription(endpoint.description)}`)
    .join("\n")

/**
 * The framable origins as the model sees it — scheme, host and port, and the
 * sentence whoever runs the deployment wrote about each.
 *
 * Unlike the two above, this list is not the set of values a model may write.
 * A frame's URL is a content decision and stays in the tree (0095); what the
 * list constrains is the origin that URL must be on. So the line is an origin
 * rather than an address, and the block below says which of the two it is.
 */
export const renderFrameCatalogue = (catalogue: FrameCatalogue): string =>
  catalogue
    .map((entry) => `- ${entry.origin} — ${renderCataloguedDescription(entry.description)}`)
    .join("\n")

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
