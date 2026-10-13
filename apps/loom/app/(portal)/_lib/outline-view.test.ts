import { describe, expect, it } from "vitest"

import type { NodeId } from "@jam-overture/loom"

import type { OutlineRow } from "./outline"
import {
  ROWS_BEFORE_FOLDING,
  ancestorsOf,
  initiallyOpen,
  outlineView,
  partsInside,
  type OutlineViewState,
} from "./outline-view"

/**
 * The folding and the search over the address book.
 *
 * The property every test here is a reading of: **nothing is removed.** A row
 * that is not drawn is behind a control that says how many are behind it, or
 * behind a search the reader typed, and in both cases one action brings it
 * back. A test that passed because a row had quietly gone would be this file
 * enforcing the opposite of the rule it exists for, so the two that matter most
 * are the one that counts what a fold holds and the one that clears a search.
 */

const row = (
  nodeId: string,
  parentId: string | null,
  depth: number,
  kind: OutlineRow["kind"],
  label: string,
  technical: string | null
): OutlineRow => ({
  nodeId: nodeId as NodeId,
  parentId: parentId === null ? null : (parentId as NodeId),
  depth,
  kind,
  label,
  technical,
  addressing: { outcome: "addressable", nodeId: nodeId as NodeId },
})

/**
 * A page shaped like a real one: a root, a space inside it, two parts in the
 * space, and words three and four levels down. Seven rows, which is well under
 * the budget — so it arrives whole, and the folding mechanics below are tested
 * against an open set written out by hand rather than against the one it starts
 * with.
 */
const rows: readonly OutlineRow[] = [
  row("n_page", null, 0, "element", "Page", "loom.page"),
  row("n_body", "n_page", 1, "slot", "Body space", "body"),
  row("n_head", "n_body", 2, "element", "Heading", "loom.heading"),
  row("n_title", "n_head", 3, "text", "Find me", null),
  row("n_card", "n_body", 2, "element", "Card", "loom.card"),
  row("n_inner", "n_card", 3, "slot", "Inside space", "inside"),
  row("n_words", "n_inner", 4, "text", "Buy now", null),
]

/**
 * The folding mechanics are tested against an open set written out here rather
 * than against `initiallyOpen`, because what a list *starts* folded to is a
 * separate question with its own block at the bottom of this file. Two levels
 * open is what a long page starts at, and the seven-row page below is the
 * smallest one that has something to fold.
 */
const state = (over: Partial<OutlineViewState> = {}): OutlineViewState => ({
  query: "",
  open: new Set(["n_page" as NodeId, "n_body" as NodeId]),
  revealed: [],
  ...over,
})

const drawn = (over: Partial<OutlineViewState> = {}): readonly string[] =>
  outlineView(rows, state(over)).entries.map((entry) => entry.row.nodeId)

describe("the nesting a flat list of rows carries", () => {
  it("reads every row a part is inside, nearest first", () => {
    expect(ancestorsOf(rows, "n_words" as NodeId)).toEqual(["n_inner", "n_card", "n_body", "n_page"])
  })

  it("has no ancestors for the root", () => {
    expect(ancestorsOf(rows, "n_page" as NodeId)).toEqual([])
  })

  it("counts every part inside one, at any depth", () => {
    expect(partsInside(rows, "n_page" as NodeId)).toBe(6)
    expect(partsInside(rows, "n_card" as NodeId)).toBe(2)
    expect(partsInside(rows, "n_words" as NodeId)).toBe(0)
  })

  /**
   * A row whose parent is not in the list is top level rather than unreachable.
   * Read the other way it carries an ancestor nothing can open, so it is folded
   * away for good — a part of somebody's page no search and no click could
   * reach.
   */
  it("reads a part whose parent is not in the list as a top-level one", () => {
    const orphan = [row("n_lost", "n_gone", 2, "element", "Card", "loom.card")]

    expect(ancestorsOf(orphan, "n_lost" as NodeId)).toEqual([])
    expect(outlineView(orphan, { query: "", open: new Set(), revealed: [] }).entries).toHaveLength(1)
  })
})

describe("the list a reader browses", () => {
  it("draws three levels and folds the rest behind them", () => {
    expect(drawn()).toEqual(["n_page", "n_body", "n_head", "n_card"])
  })

  /** The number is what makes a fold a disclosure rather than a filter. */
  it("says how many parts each fold is holding", () => {
    const held = outlineView(rows, state()).entries

    expect(held.map((entry) => [entry.row.nodeId, entry.partsInside, entry.open])).toEqual([
      ["n_page", 6, true],
      ["n_body", 5, true],
      ["n_head", 1, false],
      ["n_card", 2, false],
    ])
  })

  it("offers no control on a part with nothing inside it", () => {
    const words = outlineView(rows, state({ open: new Set(rows.map((one) => one.nodeId)) }))
      .entries.find((entry) => entry.row.nodeId === "n_words")

    expect(words?.partsInside).toBe(0)
    expect(words?.open).toBeNull()
  })

  it("shows what a reader opens, and only one level of it", () => {
    expect(drawn({ open: new Set(["n_page" as NodeId, "n_body" as NodeId, "n_card" as NodeId]) })).toEqual([
      "n_page",
      "n_body",
      "n_head",
      "n_card",
      "n_inner",
    ])
  })

  it("draws the rows in the order the page holds them", () => {
    expect(drawn({ open: new Set(rows.map((one) => one.nodeId)) })).toEqual(
      rows.map((one) => one.nodeId)
    )
  })

  it("is not searching, and says so rather than reporting nothing matched", () => {
    expect(outlineView(rows, state()).matched).toBeNull()
  })

  /**
   * A part can be picked by clicking the page rather than the list, and most of
   * a page is deeper than the list arrives open to. Without this the list marks
   * a row that is not on the screen and silently disagrees with the page beside
   * it.
   */
  it("unfolds everything holding a part the reader has picked", () => {
    expect(drawn({ revealed: ["n_words" as NodeId] })).toEqual([
      "n_page",
      "n_body",
      "n_head",
      "n_card",
      "n_inner",
      "n_words",
    ])
  })
})

describe("the list a reader searches", () => {
  it("shows what matched, and everything each match is inside", () => {
    expect(drawn({ query: "buy" })).toEqual(["n_page", "n_body", "n_card", "n_inner", "n_words"])
  })

  it("counts the matches rather than the rows it drew to give them context", () => {
    expect(outlineView(rows, state({ query: "buy" })).matched).toBe(1)
  })

  it("finds a part folded four levels down without the reader opening anything", () => {
    expect(drawn({ query: "buy", open: new Set() })).toContain("n_words")
  })

  /**
   * The *technical record is one click away* half of the brief, read as a
   * search: a developer who knows the part is a `loom.card` should not have to
   * learn that this portal calls it a card before they can find it.
   */
  it("answers to the registry's own word as well as to the person's", () => {
    expect(outlineView(rows, state({ query: "loom.card" })).matched).toBe(1)
    expect(drawn({ query: "loom.card" })).toContain("n_card")
  })

  it("ignores case and the spaces around what was typed", () => {
    expect(drawn({ query: "  FIND ME  " })).toContain("n_title")
  })

  it("reports nothing matched rather than drawing the list it would have drawn", () => {
    expect(outlineView(rows, state({ query: "trombone" }))).toEqual({ entries: [], matched: 0 })
  })

  /**
   * A chevron on a result is a control that appears to do nothing, because the
   * search is what decides the list.
   */
  it("offers no control on any row while a search is running", () => {
    for (const entry of outlineView(rows, state({ query: "space" })).entries) {
      expect(entry.open, entry.row.nodeId).toBeNull()
    }
  })

  /** Nothing is removed: clearing the box gives back every branch they opened. */
  it("gives the reader their own folding back when the search is cleared", () => {
    const opened = new Set(["n_page" as NodeId, "n_body" as NodeId, "n_card" as NodeId])

    expect(drawn({ query: "buy", open: opened })).not.toContain("n_head")
    expect(drawn({ query: "", open: opened })).toEqual([
      "n_page",
      "n_body",
      "n_head",
      "n_card",
      "n_inner",
    ])
  })

  it("treats a box holding only spaces as no search at all", () => {
    expect(outlineView(rows, state({ query: "   " })).matched).toBeNull()
    expect(drawn({ query: "   " })).toEqual(drawn())
  })
})

/**
 * **The list opens as deep as it can without going over the budget.**
 *
 * One rule and one constant, which replaced two readings each wrong on a page
 * the other one handled. A fixed depth hid the words on a short page; a fixed
 * depth for long pages only left this deployment's front door — 191 rows, 1 at
 * the root, 13 under it, 38 under those — opening to 52 of them.
 */
describe("how far the list opens before anybody touches it", () => {
  /** A page of seven parts: every branch open, nothing behind a chevron. */
  it("opens a page short enough to read, whole", () => {
    expect(rows.length).toBeLessThanOrEqual(ROWS_BEFORE_FOLDING)
    expect(
      outlineView(rows, { query: "", open: initiallyOpen(rows), revealed: [] }).entries
    ).toHaveLength(rows.length)
  })

  /** Deep and narrow: a root, a space, and eleven cards each holding its words. */
  const deep: readonly OutlineRow[] = [
    row("n_page", null, 0, "element", "Page", "loom.page"),
    row("n_body", "n_page", 1, "slot", "Body space", "body"),
    ...Array.from({ length: 11 }, (_unused, index) => [
      row(`n_card${index}`, "n_body", 2, "element", "Card", "loom.card"),
      row(`n_words${index}`, `n_card${index}`, 3, "text", `Words ${index}`, null),
    ]).flat(),
  ]

  it("stops one level short of the budget on a page that would go over it", () => {
    const folded = outlineView(deep, { query: "", open: initiallyOpen(deep), revealed: [] })

    expect(deep).toHaveLength(24)
    expect(folded.entries).toHaveLength(13)
    expect(folded.entries.filter((entry) => entry.open === false)).toHaveLength(11)
  })

  /**
   * Wide and shallow, which is the shape of this deployment's own front door
   * and the page the budget was written for: 1 row at the root, 13 under it, 38
   * under those. A depth of two is 52 rows; the budget gives the 13.
   */
  const wide: readonly OutlineRow[] = [
    row("n_page", null, 0, "element", "Page", "loom.page"),
    ...Array.from({ length: 13 }, (_unused, section) => [
      row(`n_section${section}`, "n_page", 1, "element", "Section", "loom.section"),
      ...Array.from({ length: 3 }, (_also, part) => [
        row(`n_part${section}x${part}`, `n_section${section}`, 2, "element", "Card", "loom.card"),
      ]).flat(),
    ]).flat(),
  ]

  it("opens a wide page to its sections rather than to a third of its contents", () => {
    const folded = outlineView(wide, { query: "", open: initiallyOpen(wide), revealed: [] })

    expect(wide).toHaveLength(53)
    expect(folded.entries).toHaveLength(14)
    expect(folded.entries.map((entry) => entry.row.depth).every((depth) => depth <= 1)).toBe(true)
  })

  /**
   * The floor. A list drawn as one row saying `Page` would be hiding the page's
   * structure rather than disclosing it, so a page whose top level alone is
   * over the budget shows its top level and goes over.
   */
  it("never opens shallower than the page itself", () => {
    const sprawling: readonly OutlineRow[] = [
      row("n_page", null, 0, "element", "Page", "loom.page"),
      ...Array.from({ length: ROWS_BEFORE_FOLDING + 10 }, (_unused, index) => [
        row(`n_section${index}`, "n_page", 1, "element", "Section", "loom.section"),
        row(`n_words${index}`, `n_section${index}`, 2, "text", `Words ${index}`, null),
      ]).flat(),
    ]

    const folded = outlineView(sprawling, {
      query: "",
      open: initiallyOpen(sprawling),
      revealed: [],
    })

    expect(folded.entries).toHaveLength(ROWS_BEFORE_FOLDING + 11)
    expect(folded.entries.filter((entry) => entry.open === false)).toHaveLength(
      ROWS_BEFORE_FOLDING + 10
    )
  })

  /** Asserted rather than read, so that moving it is a decision made here. */
  it("budgets twenty rows", () => {
    expect(ROWS_BEFORE_FOLDING).toBe(20)
  })
})
