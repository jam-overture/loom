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
  /**
   * Its string-valued props, in the order the node carries them.
   *
   * String-valued, and that is a decision rather than an accident (0169). Where
   * nothing has been declared, a value that is not a string is not a candidate
   * word at all: a `loom.divider` holding `weight: 2` would otherwise be
   * reported as a part whose words a reader might lose, and every layout
   * primitive in the library would join it. The opposite call is made on the
   * declared side, and a declaration is the whole of the difference.
   */
  readonly props: readonly string[]
}

/**
 * A prop a type declared as copy, holding something this reading will not turn
 * into a word.
 *
 * `loom.stat` renders `3400` as *3,400*, and the component owns that
 * formatting — so the reading declines to guess it, which is right and used to
 * be the end of the matter. It was also silent: the figure left `words` and
 * arrived nowhere else, on the one seam whose return type exists so that a
 * missing word is never mistaken for an absent one.
 *
 * This is the other half of `unread`, and the two say different things. `unread`
 * is *nobody has told me whether these are words*. This is *somebody told me
 * these are words, and what is in them is not one*. A caller that has neither
 * has read everything the node says.
 */
export type UnspokenCopy = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** The declared copy props holding a non-string value, in declaration order. */
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
  /** What it was told to read and could not. Empty when every declared copy prop held a string. */
  readonly unspoken: readonly UnspokenCopy[]
}

const NO_WORDS: NodeCopy = Object.freeze({
  words: Object.freeze([]),
  unread: Object.freeze([]),
  unspoken: Object.freeze([]),
})

const isWord = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== ""

/**
 * What a type's declaration is worth on one node: the words it found, and the
 * props it was sent to and came back from empty-handed.
 *
 * A value that is not a string is still not coerced. `loom.stat` renders `3400`
 * as *3,400*, the component owns that separator and the runtime does not, so
 * `String(value)` would put a figure on a reviewer's screen that the page does
 * not show. A missing word is a gap; a wrong one is a lie. What changed is that
 * the gap is now handed back rather than dropped.
 *
 * Three cases and only one of them is unspoken:
 *
 * - **Not set.** Nothing to report — a `caption` nobody wrote is not a word
 *   this reading lost. Own keys only, so a type that declares a prop named after
 *   something on `Object.prototype` reports nothing rather than the prototype's.
 * - **A string, blank or whitespace-only.** Also nothing: the page really does
 *   show nothing there, so the absence is the truth rather than a gap in it.
 * - **Set, and not a string.** A word is owed and cannot be given, which is the
 *   case this reports.
 */
const readDeclared = (
  props: Readonly<Record<string, unknown>>,
  declared: readonly string[]
): { readonly words: readonly string[]; readonly unspoken: readonly string[] } => {
  const words: string[] = []
  const unspoken: string[] = []

  for (const name of declared) {
    if (!Object.hasOwn(props, name)) continue

    const value = props[name]

    if (value === undefined) continue

    if (typeof value === "string") {
      if (isWord(value)) words.push(value)
      continue
    }

    unspoken.push(name)
  }

  return { words, unspoken }
}

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
  const unspoken: UnspokenCopy[] = []

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
        const read = readDeclared(current.props, declared)

        words.push(...read.words)

        if (read.unspoken.length > 0)
          unspoken.push({ nodeId: current.id, type: current.type, props: read.unspoken })
      }
    }

    for (const child of current.children) read(child)
  }

  read(node)

  return words.length === 0 && unread.length === 0 && unspoken.length === 0
    ? NO_WORDS
    : {
        words: Object.freeze(words),
        unread: Object.freeze(unread),
        unspoken: Object.freeze(unspoken),
      }
}
