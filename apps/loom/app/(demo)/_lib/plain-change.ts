import {
  applyOperation,
  findNode,
  walkTree,
  type LoomNode,
  type LoomTree,
  type TreeDelta,
  type TreeOperation,
} from "@loom/runtime"
import type { PrimitiveRegistry } from "@loom/runtime/sdk"

/**
 * What a change would do to the page, in the words on the page.
 *
 * This exists because of where the demo puts the *other* answer. A held
 * proposal's card carries `(portal)/_components/proposal-effect`, above the
 * disclosure and unasked, and on the demo's leading ask it reads:
 *
 * > **what this would change** · `delete` `loom.stat-grid` · `loom.page` ·
 * > *and 3 nodes under it*
 *
 * Every word of that is true and it is the review tool's sentence. In the
 * portal it is exactly right — a reviewer knows what `loom.stat-grid` is, has
 * the tree outline open beside it, and is being asked a question about a
 * delta. Here it is the one thing on the surface a stranger is asked to make a
 * decision from, in vocabulary the rest of this route group is built to keep
 * one click away. The maintainer's direction for it is not ambiguous: **plain
 * language is the default, the technical record is one click away, nothing is
 * ever removed.** The technical record has since moved into the disclosure; this
 * is what stands where it stood.
 *
 * **It names nothing by its type**, and that is the load-bearing decision here.
 * The obvious plain rendering is a table of friendly names — *loom.stat-grid* →
 * "the numbers band" — and it is a trap twice over: the starter registry holds
 * sixty-eight primitives and `Loom primitives` ships more most weeks, so the
 * table is stale by construction and a test binding it to the registry would
 * turn another lane's pull requests red. A visitor does not know what a stat
 * grid is called anyway. **What they recognise is the words they were just
 * reading** — "3,400", "appointments last year" — so those are what a change is
 * named by, and no registry can outgrow them.
 *
 * What is left, once types are gone, is the delta model's own distinction, which
 * turns out to be the plainest thing on this page: an insert or a remove changes
 * **what the page says**, a move changes **where it says it**, and a configure
 * changes **how it looks**. Four operations (0001), three sentences, and a
 * stranger can check every one of them against the page beside them.
 */

/** Long enough to recognise a sentence by, short enough not to be one. */
const WORD_LIMIT = 56

/**
 * How many strings are shown before the rest become a count. Three is what fits
 * on a phone under the two buttons without pushing them off the screen, which is
 * the viewport this whole unit is about.
 */
const WORDS_SHOWN = 3

const collapse = (value: string): string => value.replace(/\s+/gu, " ").trim()

const truncate = (value: string): string =>
  value.length > WORD_LIMIT ? `${value.slice(0, WORD_LIMIT).trimEnd()}…` : value

/**
 * An address rather than a sentence. A `mailto:`, a `tel:` and an `https://` are
 * strings a primitive carries and nobody reads off the page, so quoting one back
 * at a visitor as "the words that would go" would be a lie about what they can
 * see.
 */
const isAddress = (value: string): boolean => /^[a-z][a-z0-9+.-]*:/iu.test(value)

/**
 * The prop names whose values are a setting rather than words, by primitive
 * type.
 *
 * Taken from the registry's own `choices` — the props whose accepted values can
 * be listed — rather than from a list written here. `tone`, `align`, `backdrop`
 * and `variant` are closed vocabularies the author declared, and a primitive
 * that gains one gets it excluded on the next render with nothing to maintain.
 * A primitive with no closed choice at all (`loom.stat` is the case that
 * matters: `value`, `label`, `caption`) contributes every string it carries,
 * which is correct — all three are printed on the page.
 */
export const settingsOf = (registry: PrimitiveRegistry): ReadonlySet<string> =>
  new Set(
    registry.primitives.flatMap((primitive) =>
      primitive.choices.map((choice) => `${primitive.type}.${choice.name}`)
    )
  )

/**
 * The one string this node puts on the page, if it puts one there.
 *
 * **One per node, never all of them.** A stat carries three strings and a page
 * carries dozens; taking every string in document order fills the whole
 * allowance from the first node and reports a removal of the numbers band as
 * *"3,400" · "appointments last year" · "four clinicians, six days a week"* —
 * one figure, described three ways. One per node reports it as *"3,400" · "24" ·
 * "92%"*, which is what a visitor would say the band is.
 */
const wordOf = (node: LoomNode, settings: ReadonlySet<string>): string | undefined => {
  if (node.kind === "text") {
    const value = truncate(collapse(node.value))

    return value === "" ? undefined : value
  }

  if (node.kind === "slot") return undefined

  for (const [key, value] of Object.entries(node.props)) {
    if (typeof value !== "string") continue
    if (settings.has(`${node.type}.${key}`)) continue
    if (isAddress(value)) continue

    const word = truncate(collapse(value))
    if (word !== "") return word
  }

  return undefined
}

/** Every word a subtree puts on the page, in the order it is read. */
const wordsIn = (node: LoomNode, settings: ReadonlySet<string>): readonly string[] =>
  Array.from(walkTree(node))
    .map((candidate) => wordOf(candidate, settings))
    .filter((word): word is string => word !== undefined)

export type PlainChange = {
  /**
   * What would happen to the page, in one sentence, with no id, type or count
   * in it. Always present: it is the half a visitor answers from.
   */
  readonly sentence: string
  /** The words it would take, bring or move — at most `WORDS_SHOWN` of them. */
  readonly words: readonly string[]
  /** How many more there are, so a shown three cannot read as all of them. */
  readonly more: number
}

const shown = (words: readonly string[]): Pick<PlainChange, "words" | "more"> => ({
  words: words.slice(0, WORDS_SHOWN),
  more: Math.max(words.length - WORDS_SHOWN, 0),
})

/**
 * One operation, said plainly against the tree the operations before it left.
 *
 * A change the tree cannot honour is described as one rather than skipped: the
 * card is asking the visitor to allow something, and an operation naming a node
 * this page no longer has is the most important thing on it.
 */
const plainOperation = (
  root: LoomNode,
  operation: TreeOperation,
  settings: ReadonlySet<string>
): PlainChange => {
  switch (operation.op) {
    case "insert": {
      const words = wordsIn(operation.node, settings)

      return {
        sentence:
          words.length === 0
            ? "Something new goes onto the page."
            : "This goes onto the page, and nothing already on it is touched.",
        ...shown(words),
      }
    }

    case "remove": {
      const node = findNode(root, operation.nodeId)
      if (node === null) {
        return { sentence: "This would take off something the page no longer has.", words: [], more: 0 }
      }

      const words = wordsIn(node, settings)

      return {
        sentence:
          words.length === 0
            ? "Something comes off the page."
            : "This comes off the page, and everything under it goes too.",
        ...shown(words),
      }
    }

    case "move": {
      const node = findNode(root, operation.nodeId)
      if (node === null) {
        return { sentence: "This would move something the page no longer has.", words: [], more: 0 }
      }

      return {
        sentence: "This moves to a different place on the page. Not a word of it changes.",
        ...shown(wordsIn(node, settings)),
      }
    }

    /**
     * The one operation with nothing to quote, and it needs nothing: a
     * configure writes settings, so the honest plain sentence is about what it
     * leaves alone. Whether it is the whole page or one band is the difference a
     * visitor can see, and it is the only thing the surface has to decide here —
     * the root is the page.
     */
    case "configure":
      return {
        sentence:
          operation.nodeId === root.id
            ? "How the whole page looks changes. Not a word on it changes."
            : "How one part of the page looks changes. Not a word on it changes.",
        words: [],
        more: 0,
      }
  }
}

/**
 * What this proposal would do to this page, one sentence per operation.
 *
 * Walked in order, each operation read against the tree the ones before it left,
 * for the reason `describeProposalEffect` gives: that is how they are applied
 * (0001), and describing the second against the tree the first has not touched
 * would report a page nobody will ever see.
 *
 * A failed step does not stop the walk. `applyOperation` is allowed to refuse —
 * a stale proposal is exactly the case this card exists for — and the operations
 * after it are still what was asked for.
 */
export const plainChange = (
  tree: LoomTree,
  delta: TreeDelta,
  settings: ReadonlySet<string>
): readonly PlainChange[] => {
  const lines: PlainChange[] = []
  let state: LoomNode = tree.root

  for (const operation of delta.operations) {
    lines.push(plainOperation(state, operation, settings))

    const advanced = applyOperation(state, operation)
    if (advanced.ok) state = advanced.value
  }

  return lines
}
