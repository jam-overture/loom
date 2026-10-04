import type { ElementNode, LoomNode } from "@jam-overture/loom"

/**
 * What a page measures out to, counted rather than characterised.
 *
 * The same argument `words.ts` makes for the register: a measurement two bands
 * print is a measurement that has to be taken one way, or the two bands
 * eventually disagree about a number a reader can compare across a click.
 *
 * `piecesIn` lived in `pages/when-it-goes-wrong.ts` until the round-trip band
 * needed it too, and a page module importing another page module is the wrong
 * direction — pages read this layer, they do not read each other. It is the
 * move `NOT_A_RULE` made on 13 September, for the same reason and on the second
 * reader rather than the first.
 */

/**
 * How many pieces a page is made of, counted by walking it.
 *
 * The site says *pieces* wherever the machinery says nodes — the front door's
 * panel has reported *"11 pieces moved"* since the band was written — so this
 * counts the same thing that sentence counts, and a reader comparing the two
 * numbers is comparing like with like.
 */
export const piecesIn = (node: LoomNode): number =>
  node.kind === "text" ? 1 : 1 + node.children.reduce((sum, child) => sum + piecesIn(child), 0)

const isElement = (node: LoomNode): node is ElementNode => node.kind === "element"

/**
 * Every element in a tree, in document order, with the root included when it is
 * one.
 *
 * Nine test files in this route group had written this same four-line walk by
 * the time a tenth needed it, and the tenth is a module rather than a test, so
 * it is written here instead. It is the same argument the top of this file
 * makes about a measurement and the same one `words.ts` makes about copy: a
 * walk copied into ten files is ten chances to disagree about what counts as a
 * node on the page.
 *
 * `piecesIn` above counts text nodes too, because a piece is what the record
 * calls a node and a word is a piece. This does not, because everything that
 * reads it is asking about a prop — an `href`, an `anchor`, a `tone` — and only
 * an element has one.
 */
export const elementsIn = (node: LoomNode): readonly ElementNode[] => [
  ...(isElement(node) ? [node] : []),
  ...(node.kind === "text" ? [] : node.children.flatMap(elementsIn)),
]

/**
 * What a node says, counted in words, through its children and its props alike.
 *
 * Both halves are needed and neither is enough. `loom.card` is given its lines
 * as `loom.prose` children, so its words are in text nodes; `loom.feature`,
 * `loom.stat` and `loom.milestone` are given theirs as `title`, `body`,
 * `label`, `caption` — props the primitive renders itself (0052) — so a count
 * that read only text nodes would score every one of those rows zero and pass
 * on all of them.
 *
 * **A string prop counts as text when it contains a space**, and that line is
 * worth stating because it is doing real work rather than being tidy. The props
 * that decide layout and behaviour are single tokens — `columns: "four"`,
 * `tone: "outline"`, `variant: "quiet"`, `state: "done"`, `marker: "1"` — and
 * an `href` never contains one. Everything with a space in it is a sentence
 * somebody wrote for a reader.
 *
 * **Why this is a heuristic and `words.ts` is an allowlist**, which is the one
 * question a reader of both files asks. They are two instruments for two jobs
 * and the difference is which way each may be wrong. The register reads a
 * string in order to *lint* it, so it needs to know the string is prose — a
 * false positive there is a jargon failure on an `href`. This counts a string
 * in order to *bound* it, so the only expensive mistake is missing one: a new
 * prose prop nobody adds to `PROSE_PROPS` is copy the register cannot see, and
 * a budget that could not see it would be a ceiling with a hole in it. So the
 * register names the props it trusts and this one takes anything with a space
 * in it, and both are right.
 *
 * It lived privately in `balance.test.ts` until the copy budget needed the same
 * number. Two files counting the words on one page in two ways is the failure
 * this module's own note at the top is about, so it moved here rather than
 * being copied.
 */
export const wordsIn = (node: LoomNode): number => {
  if (node.kind === "text") return node.value.trim().split(/\s+/).filter(Boolean).length

  const spoken = isElement(node)
    ? Object.values(node.props)
        .filter((value): value is string => typeof value === "string" && /\s/.test(value))
        .reduce((total, value) => total + value.trim().split(/\s+/).length, 0)
    : 0

  return spoken + node.children.reduce((total, child) => total + wordsIn(child), 0)
}

/**
 * A run of two or more sibling elements of one type, with the element holding
 * them — which is what makes a row of cards, a rail of rungs or a list of
 * questions identifiable without any page builder having to declare one.
 *
 * Slots are not walked into as runs. A slot is a region *inside* one primitive
 * (0051), so two `loom.prose` in a hero's `heading` slot are two paragraphs of
 * one band and never two cells of a row.
 *
 * Two files read this and ask different questions of it. `balance.test.ts` asks
 * whether the cells of a run say *about the same amount as each other*, and
 * classifies the containers it applies to, because its subject is a row laid
 * out across equal columns. `budget.test.ts` asks how much any one cell asks a
 * reader to read in one go, which is true of a question in an FAQ as much as of
 * a card in a row, so it needs no such list.
 */
export type Run = {
  readonly container: string
  readonly cell: string
  readonly words: readonly number[]
  readonly cells: readonly ElementNode[]
}

export const runsIn = (node: LoomNode): readonly Run[] => {
  const found: Run[] = []

  const walk = (current: LoomNode): void => {
    if (current.kind === "text") return

    const cells = current.children.filter(isElement)
    const types = new Set(cells.map((cell) => cell.type))

    if (isElement(current) && cells.length >= 2 && types.size === 1) {
      found.push({
        container: current.type,
        cell: [...types][0] as string,
        words: cells.map(wordsIn),
        cells,
      })
    }

    current.children.forEach(walk)
  }

  walk(node)

  return found
}
