import { describe, expect, it } from "vitest"

import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { PRIMITIVE_ROLES } from "../role.js"
import { nodeId, OTHER_TREE, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeKindChangeSilence,
  describeKindMovement,
  KIND_CHANGE_SILENCES,
  KIND_MOVEMENTS,
  libraryChangeOf,
  libraryReadingOf,
  pageReadingOf,
  type KindChange,
  type LibraryChange,
  type PageReading,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Built on real readings rather than on hand-written rows, for the reason the
 * census it compares is: what is being tested is a comparison of what a
 * deployment actually holds, so two trees and two windows of counters go in one
 * end of the pipeline and a kind of part's before and after comes out of the
 * other.
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
  counts: Partial<ReaderTally>,
  tree: LoomTree
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
const page = ({
  revision = 1,
  treeId = TREE,
}: { revision?: number; treeId?: TreeId } = {}): LoomTree =>
  treeOf(
    element("page", "loom.stack", {}, [
      element("intro", "loom.section", { body: words(10) }),
      element("quote", "loom.quote", { body: "a line somebody wrote" }),
      element("pricing", "loom.section", { body: words(30) }),
    ]),
    revision,
    treeId
  )

/**
 * One window of one page: the parts named were reached, the rest were not, and
 * the root always was — which is what gives the page its views and so makes
 * every other part's silence a skip rather than an unknown (`parts.ts`).
 */
const read = (
  tree: LoomTree,
  reached: readonly string[],
  { views = 10, declarations = BODY_IS_COPY }: { views?: number; declarations?: PartDeclarations } = {}
): PageReading =>
  pageReadingOf(
    tree,
    [
      tally("page", { views, reached: views }, tree),
      ...reached.map((name) => tally(name, { views, reached: views }, tree)),
    ],
    declarations
  )

/**
 * One form of one page: the same window as {@link read}, with the audience the
 * store keeps the rows under (0284) and the reading scoped to it.
 */
const inAudience = (
  audienceId: typeof SKIERS,
  tree: LoomTree,
  reached: readonly string[],
  views = 10
): PageReading =>
  pageReadingOf(
    tree,
    [
      { ...tally("page", { views, reached: views }, tree), audienceId },
      ...reached.map((name) => ({
        ...tally(name, { views, reached: views }, tree),
        audienceId,
      })),
    ],
    BODY_IS_COPY,
    audienceId
  )

/** A window that measured nothing of a page, which is what makes every standing unknown. */
const unmeasured = (tree: LoomTree): PageReading => pageReadingOf(tree, [], BODY_IS_COPY)

const typeRow = (change: LibraryChange, type: string): KindChange | undefined =>
  change.byType.find((row) => row.kind.by === "type" && row.kind.type === type)

const roleRow = (change: LibraryChange, role: string | null): KindChange | undefined =>
  change.byRole.find((row) => row.kind.by === "role" && row.kind.role === role)

describe("what a change did to a kind of part", () => {
  /** The sentence this module exists for: an author changed a component, and it is read now. */
  it("reads a kind taken up as the places that were skipped and are read now", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })

    const change = libraryChangeOf(
      [read(first, ["intro"]), read(second, ["intro"])],
      [read(first, ["intro", "pricing"]), read(second, ["intro", "pricing"])]
    )
    const sections = typeRow(change, "loom.section")

    expect(sections?.places).toBe(4)
    expect(sections?.comparable).toBe(4)
    expect(sections?.tookUp).toBe(2)
    expect(sections?.fellAway).toBe(0)
    expect(sections?.keptRead).toBe(2)
    expect(sections?.readShareWas).toBe(0.5)
    expect(sections?.readShareNow).toBe(1)
    expect(sections?.movement).toBe("taken-up")
    expect(change.mostTakenUp?.kind).toEqual({ by: "type", type: "loom.section" })
  })

  it("reads a kind abandoned as the places that were read and are skipped now", () => {
    const tree = page()

    const change = libraryChangeOf([read(tree, ["intro", "pricing"])], [read(tree, ["intro"])])
    const sections = typeRow(change, "loom.section")

    expect(sections?.fellAway).toBe(1)
    expect(sections?.tookUp).toBe(0)
    expect(sections?.readShareWas).toBe(1)
    expect(sections?.readShareNow).toBe(0.5)
    expect(sections?.movement).toBe("abandoned")
    expect(change.mostAbandoned?.kind).toEqual({ by: "type", type: "loom.section" })
  })

  /**
   * The whole method in one assertion: the figure a person subtracting two
   * censuses would get is published beside the figure this module gives, because
   * the two are different numbers and the difference is places and not readers.
   */
  it("takes both shares over the places both windows bore, and not over each window's own", () => {
    const before = treeOf(
      element("page", "loom.stack", {}, [element("intro", "loom.section", { body: words(10) })]),
      1
    )
    const after = treeOf(
      element("page", "loom.stack", {}, [
        element("intro", "loom.section", { body: words(10) }),
        element("added", "loom.section", { body: words(10) }),
        element("also", "loom.section", { body: words(10) }),
      ]),
      2
    )

    const was = [read(before, ["intro"])]
    const now = [read(after, ["intro"])]
    const change = libraryChangeOf(was, now)
    const sections = typeRow(change, "loom.section")

    /* Two censuses, which is what a screen showing one window twice would hold. */
    const censusWas = libraryReadingOf(was).byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )
    const censusNow = libraryReadingOf(now).byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )

    expect(censusWas?.readShare).toBe(1)
    expect(censusNow?.readShare).toBeCloseTo(1 / 3, 12)

    /* The subtraction of those two says two thirds of the band's reading was lost. */
    expect(sections?.places).toBe(1)
    expect(sections?.gained).toBe(2)
    expect(sections?.readShareWas).toBe(1)
    expect(sections?.readShareNow).toBe(1)
    expect(sections?.movement).toBe("held")
  })

  /**
   * The ranking rule, which is a count of places and not a rate — 0221's rule
   * for a page's falls and 0257's for a census's kinds, holding here.
   */
  it("leads with the kind that lost its reading in the most places and not with the worst rate", () => {
    const many = treeOf(
      element("page", "loom.stack", {}, [
        ...Array.from({ length: 9 }, (_unused, nth) =>
          element(`band${nth}`, "loom.section", { body: words(10) })
        ),
        element("quote", "loom.quote", { body: "one place and one only" }),
      ]),
      1
    )
    const everyBand = Array.from({ length: 9 }, (_unused, nth) => `band${nth}`)

    const change = libraryChangeOf(
      [read(many, [...everyBand, "quote"])],
      [read(many, [...everyBand.slice(3)])]
    )
    const sections = typeRow(change, "loom.section")
    const quote = typeRow(change, "loom.quote")

    /* The quote lost its one and only place: a perfect rate and a smaller problem. */
    expect(quote?.fellAway).toBe(1)
    expect(quote?.readShareWas).toBe(1)
    expect(quote?.readShareNow).toBe(0)
    expect(sections?.fellAway).toBe(3)

    expect(change.mostAbandoned?.kind).toEqual({ by: "type", type: "loom.section" })
    expect(change.byType[0]?.kind).toEqual({ by: "type", type: "loom.section" })
  })

  /**
   * The property that makes this reading different from every other comparison
   * in the subsystem: the denominator is the same count of places on both sides,
   * so a verdict is the sign of a subtraction of two whole numbers.
   */
  it("holds a kind whose places traded places, and publishes both counts rather than a net", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("one", "loom.section", { body: words(10) }),
        element("two", "loom.section", { body: words(10) }),
        element("three", "loom.section", { body: words(10) }),
        element("four", "loom.section", { body: words(10) }),
      ]),
      1
    )

    const change = libraryChangeOf([read(tree, ["one", "two"])], [read(tree, ["three", "four"])])
    const sections = typeRow(change, "loom.section")

    expect(sections?.tookUp).toBe(2)
    expect(sections?.fellAway).toBe(2)
    expect(sections?.readShareWas).toBe(sections?.readShareNow)
    expect(sections?.movement).toBe("held")
  })

  it("keeps a kind nobody read in either window apart from one that held its reading", () => {
    const tree = page()
    const change = libraryChangeOf([read(tree, ["intro"])], [read(tree, ["intro"])])

    expect(typeRow(change, "loom.quote")?.movement).toBe("still-unread")
    expect(typeRow(change, "loom.quote")?.keptSkipped).toBe(1)
    expect(typeRow(change, "loom.quote")?.readShareNow).toBe(0)
    expect(typeRow(change, "loom.stack")?.movement).toBe("held")
    expect(typeRow(change, "loom.stack")?.readShareNow).toBe(1)
  })

  it("reverses every movement when the two sides are handed over the other way round", () => {
    const tree = page()
    const quiet = read(tree, ["intro"])
    const busy = read(tree, ["intro", "pricing"])

    expect(typeRow(libraryChangeOf([quiet], [busy]), "loom.section")?.movement).toBe("taken-up")
    expect(typeRow(libraryChangeOf([busy], [quiet]), "loom.section")?.movement).toBe("abandoned")
  })
})

describe("what a comparison of two libraries refuses to say", () => {
  it("withholds both shares where no place of a kind can be spoken for in both windows", () => {
    const tree = page()

    const change = libraryChangeOf([read(tree, ["pricing"])], [unmeasured(tree)])
    const sections = typeRow(change, "loom.section")

    expect(sections?.places).toBe(2)
    expect(sections?.comparable).toBe(0)
    expect(sections?.readShareWas).toBeNull()
    expect(sections?.readShareNow).toBeNull()
    expect(sections?.silence).toBe("unread")
    expect(sections?.movement).toBe("unknown")
  })

  it("says the places moved, rather than that nobody read them, where nothing is held still", () => {
    const only = page({ treeId: OTHER_TREE })

    const change = libraryChangeOf([read(page({ treeId: TREE }), ["intro"])], [read(only, ["intro"])])
    const sections = typeRow(change, "loom.section")

    expect(sections?.places).toBe(0)
    expect(sections?.gained).toBe(2)
    expect(sections?.lost).toBe(2)
    expect(sections?.silence).toBe("unpaired")
    expect(sections?.movement).toBe("unknown")
    expect(change.pagesGained).toBe(1)
    expect(change.pagesLost).toBe(1)
    expect(change.pages).toBe(0)
  })

  it("reports a role nothing in either window plays as there being none of the kind", () => {
    const tree = page()

    const change = libraryChangeOf([read(tree, ["intro"])], [read(tree, ["intro"])])

    expect(roleRow(change, "heading")?.silence).toBe("unplaced")
    expect(roleRow(change, "heading")?.places).toBe(0)
    expect(roleRow(change, null)?.silence).toBeNull()
  })

  it("excludes a page held at two revisions in one window, and names the form it left out", () => {
    const tree = page()
    const second = page({ revision: 2 })

    const change = libraryChangeOf([read(tree, ["intro"]), read(second, ["intro"])], [read(tree, [])])

    expect(change.ambiguous).toEqual([{ treeId: TREE, audienceId: null }])
    expect(change.pages).toBe(0)
    expect(change.placements).toBe(0)
    expect(change.duplicated).toBe(0)
    /* A type row stands only where a part of that type does, so there is none at all. */
    expect(typeRow(change, "loom.section")).toBeUndefined()
  })

  it("compares a page whose revision moved, and says that it moved", () => {
    const before = page({ revision: 1 })
    const after = page({ revision: 4 })

    const change = libraryChangeOf([read(before, ["intro"])], [read(after, ["intro", "pricing"])])

    expect(change.pages).toBe(1)
    expect(change.republished).toBe(1)
    expect(typeRow(change, "loom.section")?.tookUp).toBe(1)
  })

  it("publishes both windows' page views, which is what every transition here is confounded by", () => {
    const tree = page()

    const change = libraryChangeOf(
      [read(tree, ["intro", "pricing"], { views: 400 })],
      [read(tree, ["intro"], { views: 3 })]
    )

    expect(change.viewsWas).toBe(400)
    expect(change.viewsNow).toBe(3)
    expect(typeRow(change, "loom.section")?.fellAway).toBe(1)
  })

  it("names a type the two windows disagree about the role of", () => {
    const tree = page()

    const change = libraryChangeOf(
      [read(tree, ["intro"], { declarations: BODY_IS_COPY })],
      [read(tree, ["intro"], { declarations: SECTIONS_HEAD })]
    )

    expect(change.roleDisagreed).toEqual(["loom.section"])
    expect(typeRow(change, "loom.section")?.role).toBe("heading")
  })
})

describe("the two keys a change is read under", () => {
  /**
   * A node whose type changed is a place one kind left and another took, and the
   * role rows hold it still where the two types play the same part. The two
   * answers are the point of asking both, not a disagreement to resolve.
   */
  it("counts a node recast into another type as lost by one kind and gained by the other", () => {
    const before = treeOf(
      element("page", "loom.stack", {}, [element("band", "loom.section", { body: words(10) })]),
      1
    )
    const after = treeOf(
      element("page", "loom.stack", {}, [element("band", "loom.quote", { body: "a line" })]),
      2
    )

    const change = libraryChangeOf([read(before, ["band"])], [read(after, ["band"])])

    expect(change.recast).toBe(1)
    expect(typeRow(change, "loom.section")?.lost).toBe(1)
    expect(typeRow(change, "loom.section")?.places).toBe(0)
    expect(typeRow(change, "loom.section")?.silence).toBe("unpaired")
    expect(typeRow(change, "loom.quote")?.gained).toBe(1)

    /* To a reader it is the same place, playing the part neither type declares. */
    expect(roleRow(change, null)?.places).toBe(2)
    expect(roleRow(change, null)?.keptRead).toBe(2)
  })

  it("counts a node whose role moved as lost by one role row and gained by the other", () => {
    const tree = page()

    const change = libraryChangeOf(
      [read(tree, ["intro"], { declarations: BODY_IS_COPY })],
      [read(tree, ["intro"], { declarations: SECTIONS_HEAD })]
    )

    expect(roleRow(change, "heading")?.gained).toBe(2)
    expect(roleRow(change, "heading")?.places).toBe(0)
    expect(roleRow(change, null)?.lost).toBe(2)
    expect(roleRow(change, null)?.places).toBe(2)
  })
})

describe("the double counts a comparison of two libraries can be told", () => {
  /** 0158: counting a window and forgetting it are one operation, so every count is tested where it would double. */
  it("drops a reading handed in twice in one window, and reports that it did", () => {
    const tree = page()
    const once = libraryChangeOf([read(tree, ["intro"])], [read(tree, ["intro", "pricing"])])
    const twice = libraryChangeOf(
      [read(tree, ["intro"]), read(tree, ["intro"])],
      [read(tree, ["intro", "pricing"]), read(tree, ["intro", "pricing"])]
    )

    expect(twice.duplicated).toBe(2)
    expect(twice.pages).toBe(1)
    expect(typeRow(twice, "loom.section")).toEqual(typeRow(once, "loom.section"))
  })

  /**
   * The whole of 0293, from the side that was 0158-permanent. Two forms of a
   * page (0263) sit at one revision with one tree between them, so a pairing
   * keyed by the tree dropped the second as the first handed in twice — a count
   * that was never added, which nothing can notice.
   */
  it("pairs two forms of one page as two pages, and reports no double count", () => {
    const tree = page()
    const change = libraryChangeOf(
      [inAudience(SKIERS, tree, ["intro"]), inAudience(RIDERS, tree, ["intro"])],
      [
        inAudience(SKIERS, tree, ["intro", "pricing"]),
        inAudience(RIDERS, tree, ["intro", "pricing"]),
      ]
    )

    expect(change.duplicated).toBe(0)
    expect(change.ambiguous).toEqual([])
    expect(change.pages).toBe(2)
    expect(typeRow(change, "loom.section")?.places).toBe(4)
    expect(typeRow(change, "loom.section")?.tookUp).toBe(2)
  })

  /**
   * The other side of the same narrowing, which is the one that could quietly
   * stop catching a real repeat: *the same form handed in twice* is still a
   * double count, and it is told apart from the page above by one column.
   */
  it("still drops one form handed in twice, with the other form standing", () => {
    const tree = page()
    const change = libraryChangeOf(
      [
        inAudience(SKIERS, tree, ["intro"]),
        inAudience(SKIERS, tree, ["intro"]),
        inAudience(RIDERS, tree, ["intro"]),
      ],
      [
        inAudience(SKIERS, tree, ["intro", "pricing"]),
        inAudience(RIDERS, tree, ["intro", "pricing"]),
      ]
    )

    expect(change.duplicated).toBe(1)
    expect(change.pages).toBe(2)
    expect(typeRow(change, "loom.section")?.places).toBe(4)
  })

  /**
   * A form held at two revisions says nothing about the other form, which is
   * what a pairing keyed by the tree could not express: before this, both were
   * excluded from every row, every total and every ranking.
   */
  it("excludes the ambiguous form alone and leaves the other form in the comparison", () => {
    const tree = page()
    const second = page({ revision: 2 })
    const change = libraryChangeOf(
      [
        inAudience(SKIERS, tree, ["intro"]),
        inAudience(SKIERS, second, ["intro"]),
        inAudience(RIDERS, tree, ["intro"]),
      ],
      [inAudience(RIDERS, tree, ["intro", "pricing"])]
    )

    expect(change.ambiguous).toEqual([{ treeId: TREE, audienceId: SKIERS }])
    expect(change.pages).toBe(1)
    expect(typeRow(change, "loom.section")?.places).toBe(2)
    expect(typeRow(change, "loom.section")?.tookUp).toBe(1)
  })

  it("counts one page on both sides as one paired page and never as two", () => {
    const tree = page()
    const change = libraryChangeOf([read(tree, ["intro"])], [read(tree, ["intro"])])

    expect(change.pages).toBe(1)
    expect(change.pagesGained).toBe(0)
    expect(change.pagesLost).toBe(0)
    expect(change.placements).toBe(4)
  })

  it("counts a kind standing three times on one page as three places and the page once", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("one", "loom.section", { body: words(10) }),
        element("two", "loom.section", { body: words(10) }),
        element("three", "loom.section", { body: words(10) }),
      ]),
      1
    )

    const change = libraryChangeOf([read(tree, ["one"])], [read(tree, ["one", "two"])])

    expect(typeRow(change, "loom.section")?.places).toBe(3)
    expect(change.pages).toBe(1)
    expect(change.viewsNow).toBe(10)
  })

  /** A placement inside a placement of its own kind is counted at both depths, which is what a placement is. */
  it("counts a kind standing inside itself at both depths", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("outer", "loom.section", {}, [element("inner", "loom.section", { body: words(10) })]),
      ]),
      1
    )

    const change = libraryChangeOf([read(tree, ["outer"])], [read(tree, ["outer", "inner"])])

    expect(typeRow(change, "loom.section")?.places).toBe(2)
    expect(typeRow(change, "loom.section")?.tookUp).toBe(1)
    expect(typeRow(change, "loom.section")?.keptRead).toBe(1)
  })

  /**
   * The identity that makes the reading's own totals checkable: every node of a
   * paired page is in exactly one of the three, and a recast node is in two of
   * them because it is two facts about two kinds.
   */
  it("adds the type rows' places, gains and losses to the reading's own three totals", () => {
    const before = treeOf(
      element("page", "loom.stack", {}, [
        element("band", "loom.section", { body: words(10) }),
        element("gone", "loom.quote", { body: "a line" }),
      ]),
      1
    )
    const after = treeOf(
      element("page", "loom.stack", {}, [
        element("band", "loom.quote", { body: "a line" }),
        element("new", "loom.section", { body: words(10) }),
      ]),
      2
    )
    const alone = page({ treeId: OTHER_TREE })

    const change = libraryChangeOf(
      [read(before, ["band"]), read(alone, ["intro"])],
      [read(after, ["band"])]
    )
    const added = (figure: (row: KindChange) => number): number =>
      change.byType.reduce((total, row) => total + figure(row), 0)

    expect(added((row) => row.places)).toBe(change.placements)
    expect(added((row) => row.gained)).toBe(change.gained)
    expect(added((row) => row.lost)).toBe(change.lost)
    expect(change.recast).toBe(1)
    expect(change.pagesLost).toBe(1)
  })

  it("counts a comparison of two windows of one unchanged library as every place held", () => {
    const tree = page()
    const other = page({ treeId: OTHER_TREE })
    const change = libraryChangeOf(
      [read(tree, ["intro"]), read(other, ["intro"])],
      [read(tree, ["intro"]), read(other, ["intro"])]
    )

    expect(change.gained).toBe(0)
    expect(change.lost).toBe(0)
    expect(change.recast).toBe(0)
    expect(change.republished).toBe(0)
    expect(change.byType.every((row) => row.movement !== "taken-up")).toBe(true)
    expect(change.byType.every((row) => row.movement !== "abandoned")).toBe(true)
  })
})

describe("what the reading publishes", () => {
  it("publishes one line for every silence and every movement", () => {
    expect(KIND_CHANGE_SILENCES.map(describeKindChangeSilence)).toEqual([
      "no place this kind of part stands in both windows can be spoken for in both",
      "nothing in the pages read, in either window, is of this kind",
      "no place this kind of part stands is in both windows",
    ])
    expect(new Set(KIND_MOVEMENTS.map(describeKindMovement)).size).toBe(KIND_MOVEMENTS.length)
  })

  /**
   * The published keys, pinned so that a figure added later has to argue with
   * this test first — which is how a census's refusal to publish a reading-wide
   * share stays refused (0257).
   */
  it("publishes no total over the kinds, and no comparison of words or occurrences", () => {
    const tree = page()
    const change = libraryChangeOf([read(tree, ["intro"])], [read(tree, ["intro", "pricing"])])

    expect(Object.keys(change).sort()).toEqual([
      "ambiguous",
      "audiences",
      "byRole",
      "byType",
      "duplicated",
      "formsGained",
      "formsLost",
      "gained",
      "lost",
      "mostAbandoned",
      "mostTakenUp",
      "pages",
      "pagesGained",
      "pagesLost",
      "placements",
      "recast",
      "republished",
      "roleDisagreed",
      "viewsNow",
      "viewsWas",
    ])
    expect(Object.keys(change.byType[0] ?? {}).sort()).toEqual([
      "comparable",
      "fellAway",
      "gained",
      "keptRead",
      "keptSkipped",
      "kind",
      "lost",
      "movement",
      "places",
      "readShareNow",
      "readShareWas",
      "role",
      "silence",
      "tookUp",
    ])
  })

  it("gives every role in the vocabulary a row, and orders the rows worst first on a refresh", () => {
    const tree = page()
    const change = libraryChangeOf([read(tree, ["intro", "quote"])], [read(tree, [])])

    expect(change.byRole.length).toBe(PRIMITIVE_ROLES.length + 1)
    expect(roleRow(change, null)).toBeDefined()
    expect(libraryChangeOf([read(tree, ["intro", "quote"])], [read(tree, [])]).byType).toEqual(
      change.byType
    )
    expect(change.byType.map((row) => row.fellAway)).toEqual(
      [...change.byType].map((row) => row.fellAway).sort((one, other) => other - one)
    )
  })

  it("answers nothing at all about two empty windows, without reporting a fault", () => {
    const change = libraryChangeOf([], [])

    expect(change.pages).toBe(0)
    expect(change.byType).toEqual([])
    expect(change.ambiguous).toEqual([])
    expect(change.duplicated).toBe(0)
    expect(change.roleDisagreed).toEqual([])
    expect(change.byRole.every((row) => row.silence === "unplaced")).toBe(true)
  })

  /**
   * The sentence 0295 is for. A deployment that began serving a second form of
   * a page it already served has published nothing, and before this the
   * comparison said its library grew.
   */
  it("counts a second form begun as a form gained and never as a page published", () => {
    const tree = page()
    const change = libraryChangeOf(
      [inAudience(SKIERS, tree, ["intro"])],
      [inAudience(SKIERS, tree, ["intro"]), inAudience(RIDERS, tree, ["intro"])]
    )

    expect(change.pagesGained).toBe(1)
    expect(change.formsGained).toBe(1)
    expect(change.pagesGained - change.formsGained).toBe(0)
    expect(change.pages).toBe(1)
  })

  /** The other half of the same subtraction, so that one number cannot stand for both. */
  it("counts a page published as a page gained and never as a form begun", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })
    const change = libraryChangeOf(
      [inAudience(SKIERS, first, ["intro"])],
      [inAudience(SKIERS, first, ["intro"]), inAudience(SKIERS, second, ["intro"])]
    )

    expect(change.pagesGained).toBe(1)
    expect(change.formsGained).toBe(0)
  })

  /** Both at once, which is the only case where the subtraction is the whole answer. */
  it("tells a page published from a second form begun in one window", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })
    const change = libraryChangeOf(
      [inAudience(SKIERS, first, ["intro"])],
      [
        inAudience(SKIERS, first, ["intro"]),
        inAudience(RIDERS, first, ["intro"]),
        inAudience(SKIERS, second, ["intro"]),
      ]
    )

    expect(change.pagesGained).toBe(2)
    expect(change.formsGained).toBe(1)
    expect(change.pagesGained - change.formsGained).toBe(1)
  })

  /** Withdrawing a form is the mirror, and a deployment doing it has lost no page. */
  it("counts a form withdrawn apart from a page that left the library", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })
    const change = libraryChangeOf(
      [
        inAudience(SKIERS, first, ["intro"]),
        inAudience(RIDERS, first, ["intro"]),
        inAudience(SKIERS, second, ["intro"]),
      ],
      [inAudience(SKIERS, first, ["intro"])]
    )

    expect(change.pagesLost).toBe(2)
    expect(change.formsLost).toBe(1)
    expect(change.pagesLost - change.formsLost).toBe(1)
  })

  /**
   * The double count this counter could have had: a caller that concatenated
   * two reads of one window holds a form twice, and a form counted twice is a
   * page published that nobody published (0158).
   */
  it("counts a form gained once however many times the window was handed in", () => {
    const tree = page()
    const once = libraryChangeOf(
      [inAudience(SKIERS, tree, ["intro"])],
      [inAudience(SKIERS, tree, ["intro"]), inAudience(RIDERS, tree, ["intro"])]
    )
    const twice = libraryChangeOf(
      [inAudience(SKIERS, tree, ["intro"]), inAudience(SKIERS, tree, ["intro"])],
      [
        inAudience(SKIERS, tree, ["intro"]),
        inAudience(RIDERS, tree, ["intro"]),
        inAudience(RIDERS, tree, ["intro"]),
      ]
    )

    expect(twice.duplicated).toBe(2)
    expect(twice.formsGained).toBe(once.formsGained)
    expect(twice.pagesGained).toBe(once.pagesGained)
    expect(twice.formsGained).toBe(1)
  })

  /**
   * A form excluded as ambiguous is still a form the window held, which is the
   * deliberate half of `pagesHeld`: the question is what the deployment served
   * and not what could be compared.
   */
  it("reads a page held only in an ambiguous form as a page the window held", () => {
    const tree = page()
    const second = page({ revision: 2 })
    const change = libraryChangeOf(
      [inAudience(SKIERS, tree, ["intro"]), inAudience(SKIERS, second, ["intro"])],
      [inAudience(SKIERS, tree, ["intro"]), inAudience(RIDERS, tree, ["intro"])]
    )

    expect(change.ambiguous).toEqual([{ treeId: TREE, audienceId: SKIERS }])
    expect(change.pagesGained).toBe(1)
    expect(change.formsGained).toBe(1)
  })

  /** Whose library each side was, published and never refused. */
  it("names the audiences each window held, and refuses nothing for holding two", () => {
    const tree = page()
    const change = libraryChangeOf(
      [inAudience(SKIERS, tree, ["intro"])],
      [inAudience(SKIERS, tree, ["intro", "pricing"]), inAudience(RIDERS, tree, ["intro"])]
    )

    expect(change.audiences).toEqual({ was: [SKIERS], now: [RIDERS, SKIERS] })
    expect(typeRow(change, "loom.section")?.tookUp).toBe(1)
    expect(typeRow(change, "loom.section")?.places).toBe(2)
  })

  /** A window of rows that never carried the column names none, and is read whole. */
  it("names no audience for a window whose forms named none", () => {
    const tree = page()
    const change = libraryChangeOf([read(tree, ["intro"])], [read(tree, ["intro"])])

    expect(change.audiences).toEqual({ was: [], now: [] })
    expect(change.formsGained).toBe(0)
    expect(change.formsLost).toBe(0)
  })
})
