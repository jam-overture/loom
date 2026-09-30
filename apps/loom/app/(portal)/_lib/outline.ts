import {
  assertNever,
  outlineTree,
  type LoomNode,
  type LoomTree,
  type NodeId,
  type NodeKind,
} from "@jam-overture/loom"
import { addressNode, type Addressing, type DecorationLookup } from "@jam-overture/loom/react"

import { nounOf } from "./part-name"

/**
 * The outline pane's view model: one flat, serialisable row per node.
 *
 * It is built on the server because addressability depends on the registry, and
 * it is flat because it crosses into a Client Component — a row holding its own
 * subtree would send every node down the wire once per ancestor.
 *
 * ## The rail was the last thing on this screen speaking the runtime's words
 *
 * Every row of it printed a registered type — `loom.page`, `loom.heading`,
 * `loom.card` — four inches from a sentence about the same card in a person's
 * words. A reader who has a page has a heading and a card; `loom.heading` is
 * what the registry calls the thing that draws it.
 *
 * **A rail is an address book, and every row of it is a place.** So a row is
 * named by *what it is* and not by what it says — the rule the review queue
 * settled for the second and third parts a sentence names. The words are on the
 * rail already, on the text rows nested under each part, and repeating them on
 * the container above would say the same thing twice at two indents.
 *
 * ## And the type is kept, not dropped
 *
 * `technical` carries the registry's own word for the same row. The pane beside
 * the list prints it under *What this addresses*, closed, with the node id and
 * the kind it has always kept there. Nothing a reader could read off this rail
 * before has gone; it is one disclosure further down than it was.
 */

export type OutlineRow = {
  /**
   * The node's own id, branded.
   *
   * It was widened to `string` while this was only ever read back as a label,
   * and the widening was never true: the id comes out of the tree. What it cost
   * is that a row could not be handed to anything in the published API that
   * asks for a `NodeId` without a cast at the call site — `renderLoomExcerpt`
   * being the one the inspector needs. `addressing` has carried branded ids
   * across the same boundary since this file was written, which is the proof
   * that a brand survives the wire: it is a compile-time fact and there is
   * nothing of it left at runtime to serialise.
   */
  readonly nodeId: NodeId
  /**
   * The row this one is nested inside, and null at the root.
   *
   * `outlineTree` knows it and this view model was dropping it. Recovering it
   * afterwards means a second traversal per row, and the thing that needs it —
   * the smallest part holding everything a reader picked — would otherwise
   * have to infer ancestry from `depth`, which is the same answer derived from
   * a weaker fact. A depth run is a shape that happens to imply nesting; a
   * parent is the nesting itself.
   */
  readonly parentId: NodeId | null
  readonly depth: number
  readonly kind: NodeKind
  /** What this part is, in a person's words. Never a registered type. */
  readonly label: string
  /**
   * The runtime's own name for the same row — a registered type, or a slot's
   * name — and `null` for a text node, which has none to add beyond the words
   * the row is already showing.
   */
  readonly technical: string | null
  /** Where a click meant for this node would actually land. */
  readonly addressing: Addressing
}

const LABEL_LIMIT = 42

/** A text node's own text is its only useful name, so it is the label. */
const summarise = (value: string): string => {
  const collapsed = value.replace(/\s+/gu, " ").trim()

  return collapsed.length > LABEL_LIMIT ? `${collapsed.slice(0, LABEL_LIMIT)}…` : collapsed
}

/**
 * A noun at the head of a row rather than inside a sentence.
 *
 * `part-name.ts` owns the rule that turns `acme.buy-button` into *buy button*
 * and this is the only thing added to it: a list item starts with a capital and
 * carries no article, because *the card* under *the page* under *the heading*
 * reads as three fragments of a sentence nobody wrote.
 */
const asRow = (noun: string): string => `${noun.slice(0, 1).toUpperCase()}${noun.slice(1)}`

const labelOf = (node: LoomNode): string => {
  switch (node.kind) {
    case "element":
      return asRow(nounOf(node.type))
    /**
     * A slot is the one node that already has a name, and it is the name the
     * person who registered the primitive chose — `body`, `footer`. The word
     * after it is the legend's: a space is what a slot is to somebody who has
     * never read the schema.
     */
    case "slot":
      return `${asRow(node.name)} space`
    case "text":
      return summarise(node.value)
    default:
      return assertNever(node, "labelOf")
  }
}

const technicalOf = (node: LoomNode): string | null => {
  switch (node.kind) {
    case "element":
      return node.type
    case "slot":
      return node.name
    case "text":
      return null
    default:
      return assertNever(node, "technicalOf")
  }
}

/**
 * `addressNode` walks to the root for every row, which is one traversal per node
 * rather than one for the whole tree. That is deliberate: the alternative is a
 * second implementation of the delegation rule that happens to fold over the
 * outline, and two copies of that rule would be a worse bug than a quadratic over
 * a page-sized tree.
 */
export const outlineRows = (
  tree: LoomTree,
  decorates: DecorationLookup
): readonly OutlineRow[] =>
  outlineTree(tree.root).map((entry) => ({
    nodeId: entry.node.id,
    parentId: entry.parentId,
    depth: entry.depth,
    kind: entry.node.kind,
    label: labelOf(entry.node),
    technical: technicalOf(entry.node),
    addressing: addressNode(tree.root, entry.node.id, decorates),
  }))
