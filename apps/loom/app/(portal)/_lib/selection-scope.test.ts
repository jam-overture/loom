import { describe, expect, it } from "vitest"

import { buildElement, buildSlot, buildText, createTree, sequentialIdFactory } from "@jam-overture/loom"
import type { DecorationLookup } from "@jam-overture/loom/react"

import { outlineRows, type OutlineRow } from "./outline"
import { runtimeWordsIn } from "../_test/plain-language"
import { scopeNodeIdOf, scopeOf, scopeWords } from "./selection-scope"

const everything: DecorationLookup = () => true

/**
 * Two cards side by side, each holding a heading and its words, under one page.
 *
 *     Page
 *       Card A            Card B
 *         Heading A         Heading B
 *           "Left"            "Right"
 *
 * Built rather than stubbed, because the rule under test is about ancestry and a
 * hand-written list of rows is exactly where a wrong `parentId` would hide.
 */
const ids = sequentialIdFactory("s")

const card = (words: string) =>
  buildElement(ids, {
    type: "loom.card",
    children: [
      buildElement(ids, { type: "loom.heading", children: [buildText(ids, words)] }),
      buildSlot(ids, "body"),
    ],
  })

const tree = createTree(
  buildElement(ids, { type: "loom.page", children: [card("Left"), card("Right")] }),
  ids
)

const rows = outlineRows(tree, everything)

const at = (label: string): OutlineRow => {
  const found = rows.find((row) => row.label === label)
  if (!found) throw new Error(`no row labelled ${label}`)

  return found
}

/** Both cards read `Card`, so they are told apart by position rather than name. */
const cards = rows.filter((row) => row.label === "Card")
const headings = rows.filter((row) => row.label === "Heading")
const spaces = rows.filter((row) => row.label === "Body space")

/** The two parts of the left-hand card that are siblings rather than nested. */
const leftCard = cards[0]!
const leftHeading = headings[0]!
const leftSpace = spaces[0]!

const pick = (...picked: readonly OutlineRow[]) => scopeOf(rows, picked)

describe("scopeOf", () => {
  it("narrows nothing when nothing is picked", () => {
    expect(pick()).toEqual({ kind: "nothing" })
  })

  it("is the part itself when one is picked", () => {
    expect(pick(at("Left"))).toEqual({ kind: "part", row: at("Left") })
  })

  /**
   * The case the whole module exists for. Two parts of one card scope to the
   * card, which is bigger than either of them — and `around` rather than `part`
   * is what makes the screen say so.
   */
  it("is the part that holds both when two inside one part are picked", () => {
    expect(pick(leftHeading, leftSpace)).toEqual({ kind: "around", row: leftCard, count: 2 })
  })

  /**
   * A picked part may be its own answer. Picking a card and something inside it
   * is still a widening — the ask covers the rest of the card — so it is not
   * reported as `part`.
   */
  it("reports a widening even when the answer is one of the picked parts", () => {
    expect(pick(leftCard, leftSpace)).toEqual({ kind: "around", row: leftCard, count: 2 })
  })

  /**
   * Nothing smaller than the page holds one part of each card, and the page is
   * not reported as a part: a reader who is told *the whole page* has learned
   * something, and a reader told *the part called Page* has not.
   */
  it("is the whole page when the picked parts are in different parts", () => {
    expect(pick(at("Left"), at("Right"))).toEqual({ kind: "spread", count: 2 })
  })

  it("is the whole page when the page itself is one of the picked parts", () => {
    expect(pick(at("Page"), at("Left"))).toEqual({ kind: "spread", count: 2 })
  })

  it("counts every picked part, not only the two that decided the answer", () => {
    expect(pick(at("Left"), at("Right"), at("Page"))).toEqual({ kind: "spread", count: 3 })
  })

  /**
   * The ancestry walk reads `parentId` against the rows it was given. A row
   * whose parent is not among them ends the walk early, which can only widen the
   * answer — and widening is the direction that cannot mislead a reader.
   */
  it("widens rather than guesses when a part's ancestry is not all there", () => {
    const orphans = [leftHeading, headings[1]!]

    expect(scopeOf(orphans, orphans)).toEqual({ kind: "spread", count: 2 })
  })
})

describe("scopeNodeIdOf", () => {
  it("sends the part's own id when one part is picked", () => {
    expect(scopeNodeIdOf(pick(at("Left")))).toBe(at("Left").nodeId)
  })

  it("sends the holding part's id when several are picked inside one", () => {
    expect(scopeNodeIdOf(pick(leftHeading, leftSpace))).toBe(leftCard.nodeId)
  })

  /**
   * One encoding for the whole-page ask, whichever way a reader reached it.
   * `actions.ts` reads `""` as *no scope* and omits the field, so a spread
   * selection and an empty one produce the same request.
   */
  it("sends no scope at all for both ways of meaning the whole page", () => {
    expect(scopeNodeIdOf(pick())).toBe("")
    expect(scopeNodeIdOf(pick(at("Left"), at("Right")))).toBe("")
  })
})

describe("scopeWords", () => {
  it("tells a reader who has picked nothing what picking would do", () => {
    const words = scopeWords(pick())

    expect(words.label).toBe("Anywhere on this page")
    expect(words.meaning).toContain("Pick one or more parts")
  })

  it("says a single pick is kept to that part", () => {
    expect(scopeWords(pick(at("Left"))).meaning).toContain("only be asked about this part")
  })

  /**
   * The sentence 0019 requires: the selection resolved to something other than
   * what was picked, and it says so along with what that costs.
   */
  it("says out loud that a widened ask may change more than was picked", () => {
    const words = scopeWords(pick(leftHeading, leftSpace))

    expect(words.meaning).toContain("2 parts you picked")
    expect(words.meaning).toContain("may change other things inside it too")
  })

  it("says why nothing smaller could hold a spread selection", () => {
    const words = scopeWords(pick(at("Left"), at("Right")))

    expect(words.label).toBe("The whole page")
    expect(words.meaning).toContain("too far apart")
  })

  /**
   * These four sentences are the ones a reader meets unasked, next to the button
   * that changes their page. `ancestor`, `scope` and `node` are the three words
   * the runtime would have used for all of it.
   */
  it("says none of it in the runtime's vocabulary", () => {
    const every = [
      pick(),
      pick(at("Left")),
      pick(leftHeading, leftSpace),
      pick(at("Left"), at("Right")),
    ]

    for (const scope of every) {
      const words = scopeWords(scope)

      expect(runtimeWordsIn(`${words.label} ${words.meaning}`), words.label).toEqual([])
      expect(`${words.label} ${words.meaning}`).not.toMatch(/\b(ancestor|scoped?|selection)\b/i)
    }
  })
})
