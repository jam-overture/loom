import { describe, expect, it } from "vitest"

import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeKindSilence,
  KIND_SILENCES,
  kindKeyOf,
  libraryReadingOf,
  pageReadingOf,
  type KindReading,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Built on real readings rather than on hand-written rows, for the reason the
 * order over a deployment's pages is: what is being tested is a census of what a
 * deployment actually holds, so a tree and a window's counters go in one end of
 * the pipeline and a kind of part's standing comes out of the other.
 */

const BODY_IS_COPY: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: () => [],
}

const SECTIONS_HEAD: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: (role) => (role === "heading" ? [primitiveType("loom.section")] : []),
}

const element = (
  name: string,
  type: string,
  props: JsonObject = {},
  children: readonly LoomNode[] = []
): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props,
  children,
})

const treeOf = (root: ElementNode, revision = 1, treeId: TreeId = TREE): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const tally = (
  name: string,
  counts: Partial<ReaderTally> = {},
  tree: LoomTree = treeOf(element("page", "loom.stack"))
): ReaderTally => ({
  treeId: tree.treeId,
  revision: tree.revision,
  nodeId: nodeId(name),
  type: primitiveType("loom.section"),
  views: 0,
  reached: 0,
  engaged: 0,
  dwellMs: 0,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
  ...counts,
})

const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

/** Two bands and a pull quote, which is the shape every page below is a variation of. */
const page = (
  { revision = 1, treeId = TREE }: { revision?: number; treeId?: TreeId } = {},
  quote = "a line somebody wrote"
): LoomTree =>
  treeOf(
    element("page", "loom.stack", {}, [
      element("intro", "loom.section", { body: words(10) }),
      element("quote", "loom.quote", { body: quote }),
      element("pricing", "loom.section", { body: words(30) }),
    ]),
    revision,
    treeId
  )

const readingOf = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  declarations: PartDeclarations = BODY_IS_COPY
) => pageReadingOf(tree, counters, declarations)

const typeRow = (library: { readonly byType: readonly KindReading[] }, type: string) =>
  library.byType.find((row) => row.kind.by === "type" && row.kind.type === type)

const roleRow = (library: { readonly byRole: readonly KindReading[] }, role: string | null) =>
  library.byRole.find((row) => row.kind.by === "role" && row.kind.role === role)

describe("whether a kind of part gets read", () => {
  it("counts a kind's placements across the pages it stands on, and the trees apart from them", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })

    const library = libraryReadingOf([
      readingOf(first, [tally("page", { views: 4, reached: 4 }, first)]),
      readingOf(second, [tally("page", { views: 4, reached: 4 }, second)]),
    ])

    expect(library.pages).toBe(2)
    expect(library.trees).toBe(2)
    expect(typeRow(library, "loom.section")?.placements).toBe(4)
    expect(typeRow(library, "loom.section")?.trees).toBe(2)
    expect(typeRow(library, "loom.quote")?.placements).toBe(2)
    expect(library.placements).toBe(8)
  })

  /**
   * The sentence this module exists for, in the shape a deployment is actually
   * in: one page where the band was reached and one where it was not.
   */
  it("reads a kind as a share of the places it stands that readers reached", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })

    const library = libraryReadingOf([
      readingOf(first, [
        tally("page", { views: 4, reached: 4 }, first),
        tally("intro", { views: 4, reached: 4 }, first),
        tally("pricing", { views: 4, reached: 3 }, first),
      ]),
      readingOf(second, [
        tally("page", { views: 9, reached: 9 }, second),
        tally("intro", { views: 9, reached: 9 }, second),
      ]),
    ])

    const section = typeRow(library, "loom.section")

    expect(section?.standings).toEqual({ read: 3, skipped: 1, unknown: 0 })
    expect(section?.readShare).toBe(0.75)
    expect(section?.silence).toBeNull()
  })

  /**
   * The direction a census of a quiet deployment must not be wrong in. A page
   * whose window held no views makes every standing `unknown`, and a share built
   * on it would call the whole library skipped.
   */
  it("leaves a placement nothing can be said about out of both terms of the share", () => {
    const quiet = page({ treeId: OTHER_TREE })
    const read = page({ treeId: TREE })

    const library = libraryReadingOf([
      readingOf(read, [
        tally("page", { views: 4, reached: 4 }, read),
        tally("intro", { views: 4, reached: 4 }, read),
      ]),
      readingOf(quiet, []),
    ])

    const section = typeRow(library, "loom.section")

    expect(section?.standings).toEqual({ read: 1, skipped: 1, unknown: 2 })
    expect(section?.readShare).toBe(0.5)
    expect(library.standings.unknown).toBe(4)
  })

  it("withholds the share of a kind no window said anything about, and says which reason", () => {
    const library = libraryReadingOf([readingOf(page(), [])])
    const section = typeRow(library, "loom.section")

    expect(section?.placements).toBe(2)
    expect(section?.readShare).toBeNull()
    expect(section?.silence).toBe("unread")
  })

  it("names a role nothing in the library plays, rather than leaving its row out", () => {
    const library = libraryReadingOf([
      readingOf(page(), [tally("page", { views: 4, reached: 4 })]),
    ])

    expect(roleRow(library, "heading")?.placements).toBe(0)
    expect(roleRow(library, "heading")?.silence).toBe("unplaced")
    expect(roleRow(library, null)?.placements).toBe(4)
  })

  /**
   * The thinness 0212 named, from the other side: the day a role is declared,
   * the counters already stored reinterpret because the join is at read time.
   */
  it("fills the role rows from the declarations, without a counter moving", () => {
    const tree = page()
    const counters = [
      tally("page", { views: 4, reached: 4 }),
      tally("intro", { views: 4, reached: 4 }),
    ]

    const undeclared = libraryReadingOf([readingOf(tree, counters)])
    const declared = libraryReadingOf([readingOf(tree, counters, SECTIONS_HEAD)])

    expect(roleRow(undeclared, "heading")?.placements).toBe(0)
    expect(roleRow(declared, "heading")?.placements).toBe(2)
    expect(roleRow(declared, "heading")?.standings).toEqual({ read: 1, skipped: 1, unknown: 0 })
    expect(roleRow(declared, "heading")?.readShare).toBe(0.5)
    expect(typeRow(declared, "loom.section")?.role).toBe("heading")
  })

  it("adds the words a kind says, and the words a reader reached of them", () => {
    const tree = page()

    const library = libraryReadingOf([
      readingOf(tree, [
        tally("page", { views: 4, reached: 4 }),
        tally("intro", { views: 4, reached: 4 }),
      ]),
    ])

    const section = typeRow(library, "loom.section")

    expect(section?.words).toBe(40)
    expect(section?.wordsReached).toBe(10)
    expect(section?.wordShare).toBe(0.25)
  })

  it("counts the placements whose words are a floor, and says nothing of a kind with no words", () => {
    const library = libraryReadingOf([
      readingOf(page(), [tally("page", { views: 4, reached: 4 })]),
    ])

    expect(typeRow(library, "loom.section")?.floored).toBe(0)
    expect(typeRow(library, "loom.quote")?.floored).toBe(1)
    expect(typeRow(library, "loom.stack")?.words).toBe(0)
    expect(typeRow(library, "loom.stack")?.wordShare).toBeNull()
  })

  it("adds the occurrences filed against a kind, which are counts of things that happened", () => {
    const tree = page()

    const library = libraryReadingOf([
      readingOf(tree, [
        tally("page", { views: 4, reached: 4 }),
        tally("intro", { views: 4, reached: 4, activations: 7, dwellMs: 1_000 }),
        tally("pricing", { views: 4, reached: 4, activations: 5, completions: 2, opens: 3 }),
      ]),
    ])

    const section = typeRow(library, "loom.section")

    expect(section?.activations).toBe(12)
    expect(section?.completions).toBe(2)
    expect(section?.opens).toBe(3)
    expect(section?.closes).toBe(0)
    expect(section?.dwellMs).toBe(1_000)
  })

  /**
   * Every view count is absent from a row, and the test is over the published
   * keys rather than over a list this file remembers — a field added in a later
   * run that counts distinct page views fails here (0147, 0167).
   */
  it("publishes no count of readers on a row, because distinctness cannot be added", () => {
    const library = libraryReadingOf([
      readingOf(page(), [tally("page", { views: 4, reached: 4, engaged: 2 })]),
    ])

    const section = typeRow(library, "loom.section")

    expect(Object.keys(section ?? {}).sort()).toEqual([
      "activations",
      "closes",
      "completions",
      "dwellMs",
      "floored",
      "kind",
      "opens",
      "placements",
      "readShare",
      "revisions",
      "role",
      "silence",
      "standings",
      "trees",
      "wordShare",
      "words",
      "wordsReached",
    ])
  })
})

describe("the kind to look at first", () => {
  it("ranks by the places a kind is skipped and not by its share", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("one", "loom.section", { body: words(5) }),
        element("two", "loom.section", { body: words(5) }),
        element("three", "loom.section", { body: words(5) }),
        element("rare", "loom.quote", { body: "once" }),
      ])
    )

    const library = libraryReadingOf([readingOf(tree, [tally("page", { views: 4, reached: 4 })])])

    expect(typeRow(library, "loom.quote")?.readShare).toBe(0)
    expect(typeRow(library, "loom.section")?.readShare).toBe(0)
    expect(library.mostSkipped?.kind).toEqual({ by: "type", type: "loom.section" })
    expect(library.mostSkipped?.standings.skipped).toBe(3)
  })

  it("has nothing to look at first on a library where nothing was skipped", () => {
    const tree = page()

    const library = libraryReadingOf([
      readingOf(tree, [
        tally("page", { views: 4, reached: 4 }),
        tally("intro", { views: 4, reached: 4 }),
        tally("quote", { views: 4, reached: 4 }),
        tally("pricing", { views: 4, reached: 4 }),
      ]),
    ])

    expect(library.mostSkipped).toBeNull()
    expect(library.standings.skipped).toBe(0)
  })

  it("has nothing to look at first on a library nothing was measured on, and says so apart", () => {
    const library = libraryReadingOf([readingOf(page(), [])])

    expect(library.mostSkipped).toBeNull()
    expect(library.standings).toEqual({ read: 0, skipped: 0, unknown: 4 })
  })

  it("names the kind used most by presses, and nothing where nobody pressed anything", () => {
    const tree = page()

    const pressed = libraryReadingOf([
      readingOf(tree, [
        tally("page", { views: 4, reached: 4 }),
        tally("intro", { views: 4, reached: 4, activations: 2 }),
        tally("quote", { views: 4, reached: 4, activations: 9 }),
      ]),
    ])

    expect(pressed.mostUsed?.kind).toEqual({ by: "type", type: "loom.quote" })
    expect(libraryReadingOf([readingOf(tree, [])]).mostUsed).toBeNull()
  })

  it("sorts a kind with no share after one with a share of nought, not above it", () => {
    const read = treeOf(
      element("page", "loom.stack", {}, [element("one", "loom.section", { body: words(5) })]),
      1,
      TREE
    )
    const quiet = treeOf(
      element("page", "loom.stack", {}, [element("two", "loom.quote", { body: "once" })]),
      1,
      OTHER_TREE
    )

    const library = libraryReadingOf([
      readingOf(read, [tally("page", { views: 4, reached: 4 }, read)]),
      readingOf(quiet, []),
    ])

    const order = library.byType.map((row) => (row.kind.by === "type" ? `${row.kind.type}` : ""))

    expect(typeRow(library, "loom.section")?.readShare).toBe(0)
    expect(typeRow(library, "loom.quote")?.readShare).toBeNull()
    expect(order.indexOf("loom.section")).toBeLessThan(order.indexOf("loom.quote"))
  })

  it("gives the same order twice, so a refresh does not reshuffle two equal kinds", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("one", "loom.section", { body: words(5) }),
        element("two", "loom.quote", { body: "once" }),
      ])
    )
    const readings = [readingOf(tree, [tally("page", { views: 4, reached: 4 })])]

    expect(libraryReadingOf(readings)).toEqual(libraryReadingOf(readings))
    expect(libraryReadingOf(readings).byType.map((row) => kindKeyOf(row.kind))).toEqual(
      libraryReadingOf([...readings]).byType.map((row) => kindKeyOf(row.kind))
    )
  })
})

describe("the ways a census can be handed the same thing twice", () => {
  /**
   * The double-count case this lane requires of anything that counts. A caller
   * that concatenated two reads holds one page twice, and a page twice in a
   * census is the one way a census can lie about how much of a library there is.
   */
  it("counts a revision handed in twice once, and says it dropped one", () => {
    const tree = page()
    const reading = readingOf(tree, [
      tally("page", { views: 4, reached: 4 }),
      tally("intro", { views: 4, reached: 4, activations: 3 }),
    ])

    const once = libraryReadingOf([reading])
    const twice = libraryReadingOf([reading, reading])

    expect(twice.duplicated).toBe(1)
    expect(twice.pages).toBe(1)
    expect({ ...twice, duplicated: 0 }).toEqual(once)
    expect(twice.byType).toEqual(once.byType)
  })

  /**
   * The same page read twice over two windows is the shape that produces it in
   * the wild, and the figures that would have doubled are the ones checked.
   */
  it("drops a second window of the same revision rather than adding its occurrences", () => {
    const tree = page()

    const library = libraryReadingOf([
      readingOf(tree, [tally("intro", { views: 4, reached: 4, activations: 3, dwellMs: 900 })]),
      readingOf(tree, [tally("intro", { views: 9, reached: 9, activations: 5, dwellMs: 100 })]),
    ])

    const section = typeRow(library, "loom.section")

    expect(section?.placements).toBe(2)
    expect(section?.activations).toBe(3)
    expect(section?.dwellMs).toBe(900)
    expect(section?.words).toBe(40)
    expect(library.duplicated).toBe(1)
  })

  /**
   * Two revisions of one tree are **not** a duplicate: both are live versions of
   * one page, which is the rule the order over a deployment's pages applies
   * (0250), and a part that stands in both stands in two places a reader could
   * have met it.
   */
  it("keeps two revisions of one tree as two, while counting the tree once", () => {
    const was = page({ revision: 1 })
    const now = page({ revision: 2 })

    const library = libraryReadingOf([
      readingOf(was, [tally("page", { views: 4, reached: 4 }, was)]),
      readingOf(now, [tally("page", { views: 4, reached: 4 }, now)]),
    ])

    expect(library.duplicated).toBe(0)
    expect(library.pages).toBe(2)
    expect(library.trees).toBe(1)
    expect(typeRow(library, "loom.section")?.placements).toBe(4)
    expect(typeRow(library, "loom.section")?.revisions).toBe(2)
    expect(typeRow(library, "loom.section")?.trees).toBe(1)
  })

  /**
   * A kind nested inside itself, which is the one place a dwell figure is
   * counted at two depths — the module documentation says so rather than
   * pretending otherwise, and this is the case that holds the sentence true.
   */
  it("counts a nested placement of one kind at both depths, dwell included", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("outer", "loom.stack", {}, [element("inner", "loom.stack")]),
      ])
    )

    const library = libraryReadingOf([
      readingOf(tree, [
        tally("page", { views: 4, reached: 4, dwellMs: 1_000 }),
        tally("outer", { views: 4, reached: 4, dwellMs: 900 }),
        tally("inner", { views: 4, reached: 4, dwellMs: 800 }),
      ]),
    ])

    const stack = typeRow(library, "loom.stack")

    expect(stack?.placements).toBe(3)
    expect(stack?.dwellMs).toBe(2_700)
    expect(Object.keys(library).sort()).not.toContain("dwellMs")
  })

  /** Every placement is in exactly one type row and exactly one role row. */
  it("adds the type rows and the role rows to the same placements, each exactly once", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })

    const library = libraryReadingOf([
      readingOf(first, [tally("page", { views: 4, reached: 4 }, first)], SECTIONS_HEAD),
      readingOf(second, [], SECTIONS_HEAD),
    ])

    const added = (rows: readonly KindReading[]) =>
      rows.reduce((sum, row) => sum + row.placements, 0)

    expect(added(library.byType)).toBe(library.placements)
    expect(added(library.byRole)).toBe(library.placements)

    for (const standing of ["read", "skipped", "unknown"] as const) {
      expect(library.byType.reduce((sum, row) => sum + row.standings[standing], 0)).toBe(
        library.standings[standing]
      )
      expect(library.byRole.reduce((sum, row) => sum + row.standings[standing], 0)).toBe(
        library.standings[standing]
      )
    }
  })
})

describe("two libraries read as one", () => {
  /**
   * The one failure this join can have that nothing else would catch: readings
   * joined against two different registries and concatenated, after which every
   * role row is about neither library.
   */
  it("names a type whose readings disagreed about the role it plays", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })

    const library = libraryReadingOf([
      readingOf(first, [tally("page", { views: 4, reached: 4 }, first)], SECTIONS_HEAD),
      readingOf(second, [tally("page", { views: 4, reached: 4 }, second)], BODY_IS_COPY),
    ])

    expect(library.roleDisagreed).toEqual(["loom.section"])
    expect(typeRow(library, "loom.section")?.role).toBe("heading")
  })

  it("says nothing disagreed where one registry read every page", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })

    const library = libraryReadingOf([
      readingOf(first, [tally("page", { views: 4, reached: 4 }, first)], SECTIONS_HEAD),
      readingOf(second, [tally("page", { views: 4, reached: 4 }, second)], SECTIONS_HEAD),
    ])

    expect(library.roleDisagreed).toEqual([])
  })
})

describe("a census of nothing", () => {
  it("answers a deployment with no readings at all without a figure that pretends", () => {
    const library = libraryReadingOf([])

    expect(library.pages).toBe(0)
    expect(library.trees).toBe(0)
    expect(library.placements).toBe(0)
    expect(library.byType).toEqual([])
    expect(library.mostSkipped).toBeNull()
    expect(library.mostUsed).toBeNull()
    expect(library.byRole.every((row) => row.silence === "unplaced")).toBe(true)
  })
})

describe("the vocabulary", () => {
  it("describes every silence, each in its own words", () => {
    const lines = KIND_SILENCES.map(describeKindSilence)

    expect(lines.every((line) => line.length > 0)).toBe(true)
    expect(new Set(lines).size).toBe(KIND_SILENCES.length)
  })

  it("keeps a decision number out of the prose, because these lines are read by people", () => {
    for (const line of KIND_SILENCES.map(describeKindSilence)) {
      expect(line).not.toMatch(/\b0\d{3}\b/)
    }
  })

  it("keys a type and a role apart, so neither can be read as the other", () => {
    expect(kindKeyOf({ by: "type", type: primitiveType("loom.section") })).not.toBe(
      kindKeyOf({ by: "role", role: "heading" })
    )
    expect(kindKeyOf({ by: "role", role: null })).not.toBe(kindKeyOf({ by: "role", role: "heading" }))
  })
})
