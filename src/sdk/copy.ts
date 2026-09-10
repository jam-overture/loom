import type { NodeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { LoomNode } from "../tree/node.js"

/**
 * The words a node shows.
 *
 * `textOf` (`tree/navigation.ts`) answers this for text children and stops
 * there, and text children are not where most copy lives.
 * [0052](../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
 * settled that a fixed field stays a prop and only repeated content earns a
 * node, so `loom.stat` holds its figure, its label and its caption as props and
 * `loom.quote` holds the quote, the author and the role as props. A reading
 * that walks text children reports a proposal to delete three headline numbers
 * as taking away *no words at all*.
 *
 * Which props are copy is knowable by exactly one party. `loom.stat`'s `value`,
 * `label` and `caption` are words a reader reads; `loom.hero`'s `backdrop`,
 * `align` and `stature` are not, and every one of the six is a string in the
 * same shape of JSON. Nothing outside the component can tell them apart —
 * neither the schema, which types both as strings, nor `description`, which is
 * one line of prose for a model.
 *
 * So the author says, and this reads what they said.
 */

/**
 * A type's declared copy props, or `undefined` where it has not said.
 *
 * The two are different answers and the gap between them is the point: a
 * registry built by this SDK satisfies this, and so does a two-line double.
 */
export type CopyDeclarations = {
  readonly copyFor: (type: PrimitiveType) => readonly string[] | undefined
}

/**
 * A node whose words this reading could not see, and the props it could not
 * classify.
 *
 * Only a type that declared *nothing* appears here. A type that declared
 * `copy: []` said it shows no words and is believed; a type that declared
 * `copy: ["value"]` and also holds `align` said `align` is not copy and is
 * believed about that too. Absence is the only ambiguity, and it is the one
 * reported — the same bargain `RegistryPairings.unprobedProps` makes, and for
 * the same reason: *I cannot tell you* is not *there are none*, and a reading
 * that quietly rounded one to the other would be wrong in the direction nobody
 * checks.
 */
export type UnreadCopy = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** Its string-valued props, in the order the node carries them. */
  readonly props: readonly string[]
}

export type NodeCopy = {
  /**
   * In reading order: each element's own declared copy before its children's,
   * because a stat's label is above the things under it and a card's title is
   * above its body. Blank and whitespace-only values are left out — a caller
   * composing a sentence wants words, and an empty string is not one.
   */
  readonly words: readonly string[]
  /** What this reading could not see. Empty when every type under it declared. */
  readonly unread: readonly UnreadCopy[]
}

const NO_WORDS: NodeCopy = Object.freeze({
  words: Object.freeze([]),
  unread: Object.freeze([]),
})

const isWord = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== ""

/**
 * A declared copy prop whose value is not a string is skipped, and deliberately
 * not coerced. `loom.stat` renders `3400` as *3,400*, and the component owns
 * that formatting — the runtime knows the number and not the separator, so
 * `String(value)` would put a figure on a reviewer's screen that the page does
 * not show. A missing word is a gap; a wrong one is a lie.
 */
const declaredWords = (props: Readonly<Record<string, unknown>>, declared: readonly string[]): string[] =>
  declared.map((name) => props[name]).filter(isWord)

const stringProps = (props: Readonly<Record<string, unknown>>): readonly string[] =>
  Object.keys(props).filter((name) => isWord(props[name]))

/**
 * Reads a node and everything under it.
 *
 * Pure, and a function of the tree rather than of a render: it never calls a
 * component and never touches the DOM, so it answers the same for a node on a
 * server, in a test, and inside a proposal nobody has approved yet — which is
 * where the callers that filed for it are asking from.
 */
export const copyIn = (node: LoomNode, declarations: CopyDeclarations): NodeCopy => {
  const words: string[] = []
  const unread: UnreadCopy[] = []

  const read = (current: LoomNode): void => {
    if (current.kind === "text") {
      if (isWord(current.value)) words.push(current.value)

      return
    }

    if (current.kind === "element") {
      const declared = declarations.copyFor(current.type)

      if (declared === undefined) {
        const props = stringProps(current.props)

        if (props.length > 0) unread.push({ nodeId: current.id, type: current.type, props })
      } else {
        words.push(...declaredWords(current.props, declared))
      }
    }

    for (const child of current.children) read(child)
  }

  read(node)

  return words.length === 0 && unread.length === 0
    ? NO_WORDS
    : { words: Object.freeze(words), unread: Object.freeze(unread) }
}
