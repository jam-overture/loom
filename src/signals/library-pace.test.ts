import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeKindPaceSilence,
  KIND_PACE_SILENCES,
  kindKeyOf,
  libraryPaceOf,
  meaningOfKindPaceSilence,
  pageReadingOf,
  READING_WORDS_PER_MINUTE,
  type KindPace,
  type LibraryPace,
  type PartDeclarations,
  type ReaderTally,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on real readings and real door rows, because those are what the
 * function takes.
 *
 * The arithmetic is kept in round numbers on purpose: at the published costing
 * rate a word takes **250 ms**, so a section of twenty words needs five seconds
 * of one reader's time and every expectation below is a figure a person can
 * check by hand rather than a number copied out of a previous run.
 */

const MS_PER_WORD = 60_000 / READING_WORDS_PER_MINUTE

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

const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

/** A section of `count` words, which is the only thing that declares any. */
const section = (name: string, count: number, children: readonly LoomNode[] = []): ElementNode =>
  element(name, "loom.section", { body: words(count) }, children)

const tally = (
  name: string,
  counts: Partial<ReaderTally>,
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

const row = (counts: Partial<StoredPageViews> = {}): StoredPageViews => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  treeId: TREE,
  revision: 1,
  opened: 100,
  appearances: 100,
  updatedAt: "2026-10-30T00:00:00.000Z",
  ...counts,
})

/** Two sections of twenty words each, side by side under a stack that says nothing. */
const page = ({ revision = 1, treeId = TREE }: { revision?: number; treeId?: TreeId } = {}) =>
  treeOf(element("page", "loom.stack", {}, [section("intro", 20), section("outro", 20)]), revision, treeId)

const readingOf = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  declarations: PartDeclarations = BODY_IS_COPY
) => pageReadingOf(tree, counters, declarations)

const typeRow = (library: LibraryPace, type: string): KindPace | undefined =>
  library.byType.find((entry) => kindKeyOf(entry.kind) === kindKeyOf({ by: "type", type: primitiveType(type) }))

const roleRow = (library: LibraryPace, role: "heading" | null): KindPace | undefined =>
  library.byRole.find((entry) => kindKeyOf(entry.kind) === kindKeyOf({ by: "role", role }))

describe("whether the readers who meet a kind of part have time for it", () => {
  it("divides the time on screen by the time its words take the readers who met it", () => {
    const tree = page()
    const reading = readingOf(tree, [
      tally("intro", { reached: 50, dwellMs: 100_000 }, tree),
      tally("outro", { reached: 50, dwellMs: 100_000 }, tree),
    ])

    const found = typeRow(libraryPaceOf([reading], [row()]), "loom.section")

    expect(found?.counted).toBe(2)
    expect(found?.readers).toBe(100)
    expect(found?.dwellMs).toBe(200_000)
    /** Two placements of twenty words, each met by fifty readers, at 250 ms a word. */
    expect(found?.needMs).toBe(2 * 50 * 20 * MS_PER_WORD)
    expect(found?.pace).toBeCloseTo(0.4, 10)
    expect(found?.spentMs).toBe(2000)
    expect(found?.shortMs).toBe(300_000)
    expect(found?.standing).toBe("skimmed")
    expect(found?.silence).toBeNull()
  })

  it("weights a placement by the words it put in front of readers, not by being a placement", () => {
    const tree = treeOf(element("page", "loom.stack", {}, [section("band", 100), section("note", 4)]))
    /**
     * The band is read at 0.25 by four hundred readers and the note at 4 by
     * one. A mean of the two ratios is above two; the pooled figure is the one
     * that says the library is skimmed, which is what a reader actually meets.
     */
    const reading = readingOf(tree, [
      tally("band", { reached: 400, dwellMs: 400 * 6250 }, tree),
      tally("note", { reached: 1, dwellMs: 4000 }, tree),
    ])

    const found = typeRow(libraryPaceOf([reading], [row({ opened: 400, appearances: 400 })]), "loom.section")

    expect(found?.pace).toBeCloseTo((400 * 6250 + 4000) / (400 * 100 * MS_PER_WORD + 1 * 4 * MS_PER_WORD), 10)
    expect(found?.pace).toBeLessThan(0.5)
    expect(found?.standing).toBe("skimmed")
  })

  it("counts a placement standing inside another of its own kind once", () => {
    const tree = treeOf(element("page", "loom.stack", {}, [section("outer", 20, [section("inner", 20)])]))
    const reading = readingOf(tree, [
      tally("outer", { reached: 10, dwellMs: 50_000 }, tree),
      tally("inner", { reached: 10, dwellMs: 50_000 }, tree),
    ])

    const found = typeRow(libraryPaceOf([reading], [row()]), "loom.section")

    expect(found?.placements).toBe(2)
    expect(found?.nested).toBe(1)
    expect(found?.counted).toBe(1)
    /** The outer one's forty words, once — never its twenty plus the subtree's forty. */
    expect(found?.needMs).toBe(10 * 40 * MS_PER_WORD)
    expect(found?.dwellMs).toBe(50_000)
    expect(found?.readers).toBe(10)
  })

  it("counts two placements of one kind standing side by side as two", () => {
    const tree = page()
    const reading = readingOf(tree, [
      tally("intro", { reached: 10, dwellMs: 50_000 }, tree),
      tally("outro", { reached: 10, dwellMs: 50_000 }, tree),
    ])

    const found = typeRow(libraryPaceOf([reading], [row()]), "loom.section")

    expect(found?.nested).toBe(0)
    expect(found?.counted).toBe(2)
    expect(found?.readers).toBe(20)
    expect(found?.needMs).toBe(2 * 10 * 20 * MS_PER_WORD)
    /** Two places on one page are one page, which is the other half of counting once. */
    expect(found?.pages).toBe(1)
  })

  it("counts a page bearing it once, and two pages as two", () => {
    const here = page()
    const far = page({ treeId: OTHER_TREE })

    const found = libraryPaceOf(
      [
        readingOf(here, [tally("intro", { reached: 10, dwellMs: 50_000 }, here)]),
        readingOf(far, [
          tally("intro", { reached: 10, dwellMs: 50_000 }, far),
          tally("outro", { reached: 10, dwellMs: 50_000 }, far),
        ]),
      ],
      [row(), row({ treeId: OTHER_TREE })]
    )

    expect(typeRow(found, "loom.section")?.counted).toBe(3)
    expect(typeRow(found, "loom.section")?.pages).toBe(2)
  })

  it("counts one reading handed over twice once", () => {
    const tree = page()
    const reading = readingOf(tree, [tally("intro", { reached: 10, dwellMs: 50_000 }, tree)])

    const once = libraryPaceOf([reading], [row()])
    const twice = libraryPaceOf([reading, reading], [row()])

    expect(twice.duplicated).toBe(1)
    expect(twice.pages).toBe(1)
    expect(typeRow(twice, "loom.section")?.needMs).toBe(typeRow(once, "loom.section")?.needMs)
    expect(typeRow(twice, "loom.section")?.dwellMs).toBe(typeRow(once, "loom.section")?.dwellMs)
  })

  it("ignores a second door row for one revision rather than adding it", () => {
    const tree = page()
    const reading = readingOf(tree, [tally("intro", { reached: 10, dwellMs: 50_000 }, tree)])

    const found = libraryPaceOf([reading], [row(), row()])

    expect(found.duplicatedRows).toBe(1)
    expect(typeRow(found, "loom.section")?.readers).toBe(10)
  })
})

describe("what the door does to a kind's pace", () => {
  it("takes each page's own straddle off its own row", () => {
    const tree = page()
    /**
     * A rollup window shorter than a visit counts one page view twice, so
     * `appearances` and every `reached` against the page are doubled. The
     * readers behind the figure halve back and the dwell does not move,
     * because a page view counted twice carried one page view's seconds.
     */
    const reading = readingOf(tree, [tally("intro", { reached: 100, dwellMs: 200_000 }, tree)])

    const straddled = typeRow(libraryPaceOf([reading], [row({ opened: 100, appearances: 200 })]), "loom.section")
    const clean = typeRow(
      libraryPaceOf([readingOf(tree, [tally("intro", { reached: 50, dwellMs: 200_000 }, tree)])], [row()]),
      "loom.section"
    )

    /**
     * The correction reaches the per-placement verdicts too, which is the half
     * of it the pooled figure cannot show: at 1,500 ms a reader this section is
     * skimmed, and corrected for the straddle it is paced.
     */
    expect(
      typeRow(
        libraryPaceOf(
          [readingOf(tree, [tally("intro", { reached: 100, dwellMs: 150_000 }, tree)])],
          [row({ opened: 100, appearances: 200 })]
        ),
        "loom.section"
      )?.standings
    ).toEqual({ skimmed: 0, paced: 1, lingered: 0, unknown: 1 })

    expect(straddled?.readers).toBe(50)
    expect(straddled?.dwellMs).toBe(200_000)
    expect(straddled?.pace).toBe(clean?.pace)
    expect(straddled?.unscaled).toBe(0)
  })

  it("keeps a page the door cannot scale, says how much of the figure it is, and names it", () => {
    const tree = page()
    const reading = readingOf(tree, [tally("intro", { reached: 10, dwellMs: 20_000 }, tree)])

    const found = libraryPaceOf([reading], [])
    const section = typeRow(found, "loom.section")

    expect(found.scaled).toBe(0)
    expect(found.unscaled).toEqual([{ treeId: TREE, revision: 1, silence: "unmeasured" }])
    expect(section?.counted).toBe(1)
    expect(section?.unscaled).toBe(10)
    expect(section?.pace).toBeCloseTo(20_000 / (10 * 20 * MS_PER_WORD), 10)
    expect(section?.silence).toBeNull()
  })

  it("names no page the door could not scale where nothing on it was counted", () => {
    const tree = page()

    expect(libraryPaceOf([readingOf(tree, [])], []).unscaled).toEqual([])
  })

  it("orders the pages it could not scale by tree, newest revision first", () => {
    const one = page({ revision: 2 })
    const other = page({ revision: 1 })
    const far = page({ treeId: OTHER_TREE })

    const found = libraryPaceOf(
      [
        readingOf(other, [tally("intro", { reached: 1, dwellMs: 10 }, other)]),
        readingOf(far, [tally("intro", { reached: 1, dwellMs: 10 }, far)]),
        readingOf(one, [tally("intro", { reached: 1, dwellMs: 10 }, one)]),
      ],
      []
    )

    expect(found.unscaled.map((at) => [at.treeId, at.revision])).toEqual([
      [TREE, 2],
      [TREE, 1],
      [OTHER_TREE, 1],
    ])
  })
})

describe("what a kind of part has no pace for", () => {
  it("says nothing of a kind nothing in the pages read is of", () => {
    const found = roleRow(libraryPaceOf([readingOf(page(), [])], [row()]), "heading")

    expect(found?.placements).toBe(0)
    expect(found?.silence).toBe("unplaced")
    expect(found?.pace).toBeNull()
    expect(found?.readers).toBeNull()
  })

  it("says nothing of a kind no view reported", () => {
    const found = typeRow(libraryPaceOf([readingOf(page(), [])], [row()]), "loom.section")

    expect(found?.placements).toBe(2)
    expect(found?.counted).toBe(0)
    expect(found?.silences.unreached).toBe(2)
    expect(found?.silence).toBe("unread")
    expect(found?.standing).toBe("unknown")
  })

  it("says nothing of a kind that says nothing", () => {
    const tree = treeOf(element("page", "loom.stack", {}, [element("rule", "loom.rule")]))
    const reading = readingOf(tree, [
      tally("rule", { reached: 10, dwellMs: 20_000, type: primitiveType("loom.rule") }, tree),
    ])

    const found = typeRow(libraryPaceOf([reading], [row()]), "loom.rule")

    expect(found?.silences.wordless).toBe(1)
    expect(found?.silence).toBe("wordless")
  })

  it("prefers the floor to the silence where its places are silent for both reasons", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        section("read", 0, [element("quote", "loom.quote", { body: "a line" })]),
        section("unseen", 20),
      ])
    )
    /** One place nobody reached, one place whose only words nobody counted. */
    const reading = readingOf(tree, [tally("read", { reached: 10, dwellMs: 20_000 }, tree)])

    const found = typeRow(libraryPaceOf([reading], [row()]), "loom.section")

    expect(found?.counted).toBe(0)
    expect(found?.silences).toEqual({ unreached: 1, unreadable: 1, wordless: 0 })
    expect(found?.silence).toBe("unreadable")
  })

  it("says it says nothing where its places are silent for that and for no reader", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [element("one", "loom.rule"), element("two", "loom.rule")])
    )
    const reading = readingOf(tree, [
      tally("one", { reached: 10, dwellMs: 20_000, type: primitiveType("loom.rule") }, tree),
    ])

    const found = typeRow(libraryPaceOf([reading], [row()]), "loom.rule")

    expect(found?.silences).toEqual({ unreached: 1, unreadable: 0, wordless: 1 })
    expect(found?.silence).toBe("wordless")
  })

  it("is short of no time at all where readers stayed longer than the words account for", () => {
    const tree = page()
    const reading = readingOf(tree, [tally("intro", { reached: 10, dwellMs: 10 * 100_000 }, tree)])

    const found = typeRow(libraryPaceOf([reading], [row()]), "loom.section")

    expect(found?.standing).toBe("lingered")
    expect(found?.shortMs).toBe(0)
    expect(found?.needMs).toBeLessThan(found?.dwellMs ?? 0)
  })

  it("holds up any verdict but a skim where a type inside it declares no copy", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [section("band", 20, [element("quote", "loom.quote", { body: "a line" })])])
    )
    /** Time enough and more for the twenty words anybody counted, and a child whose words nobody did. */
    const reading = readingOf(tree, [tally("band", { reached: 10, dwellMs: 10 * 20_000 }, tree)])

    const found = typeRow(libraryPaceOf([reading], [row()]), "loom.section")

    expect(found?.counted).toBe(1)
    expect(found?.floored).toBe(1)
    expect(found?.pace).toBeNull()
    expect(found?.standing).toBe("unknown")
    expect(found?.silence).toBe("unreadable")
  })

  it("still calls a floored kind skimmed, because words nobody counted only make it more so", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [section("band", 20, [element("quote", "loom.quote", { body: "a line" })])])
    )
    const reading = readingOf(tree, [tally("band", { reached: 10, dwellMs: 10_000 }, tree)])

    const found = typeRow(libraryPaceOf([reading], [row()]), "loom.section")

    expect(found?.floored).toBe(1)
    expect(found?.standing).toBe("skimmed")
    expect(found?.silence).toBeNull()
    expect(found?.pace).toBeCloseTo(10_000 / (10 * 20 * MS_PER_WORD), 10)
  })
})

describe("a kind keyed by the part it plays", () => {
  it("gives a declared role the placements of every type that plays it", () => {
    const tree = page()
    const reading = readingOf(
      tree,
      [
        tally("intro", { reached: 10, dwellMs: 50_000 }, tree),
        tally("outro", { reached: 10, dwellMs: 50_000 }, tree),
      ],
      SECTIONS_HEAD
    )

    const found = roleRow(libraryPaceOf([reading], [row()]), "heading")

    expect(found?.counted).toBe(2)
    expect(found?.needMs).toBe(2 * 10 * 20 * MS_PER_WORD)
    expect(typeRow(libraryPaceOf([reading], [row()]), "loom.section")?.needMs).toBe(found?.needMs)
  })

  it("leaves the row for parts that declare none holding the outermost of them, which is the page", () => {
    const tree = page()
    const reading = readingOf(tree, [
      tally("page", { reached: 10, dwellMs: 100_000, type: primitiveType("loom.stack") }, tree),
      tally("intro", { reached: 10, dwellMs: 50_000 }, tree),
      tally("outro", { reached: 10, dwellMs: 50_000 }, tree),
    ])

    const found = roleRow(libraryPaceOf([reading], [row()]), null)

    expect(found?.placements).toBe(3)
    expect(found?.nested).toBe(2)
    expect(found?.counted).toBe(1)
    expect(found?.whole).toBe(1)
    /** The page's forty words, once, and never a third time for each section inside it. */
    expect(found?.needMs).toBe(10 * 40 * MS_PER_WORD)
  })
})

describe("what the reading publishes over the kinds", () => {
  const library = (): LibraryPace => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        section("band", 100),
        element("quote", "loom.quote", {}, [section("inner", 4)]),
      ])
    )

    return libraryPaceOf(
      [
        readingOf(tree, [
          tally("page", { reached: 80, dwellMs: 80_000, type: primitiveType("loom.stack") }, tree),
          tally("band", { reached: 80, dwellMs: 80_000 }, tree),
          tally("quote", { reached: 20, dwellMs: 40_000, type: primitiveType("loom.quote") }, tree),
          tally("inner", { reached: 20, dwellMs: 40_000 }, tree),
        ]),
      ],
      [row()]
    )
  }

  it("partitions every placement into nested, counted and the silent", () => {
    for (const found of [...library().byType, ...library().byRole]) {
      const silent = Object.values(found.silences).reduce((sum, count) => sum + count, 0)

      expect(found.nested + found.counted + silent).toBe(found.placements)
    }
  })

  it("grades the placements it did not set aside for nesting, and no others", () => {
    for (const found of [...library().byType, ...library().byRole]) {
      const graded = Object.values(found.standings).reduce((sum, count) => sum + count, 0)

      expect(graded).toBe(found.placements - found.nested)
    }
  })

  it("adds every type row's placements to the library's own count", () => {
    const found = library()

    expect(found.byType.reduce((sum, entry) => sum + entry.placements, 0)).toBe(found.placements)
    expect(found.byType.reduce((sum, entry) => sum + entry.nested, 0)).toBe(found.nested)
  })

  it("orders the types by the reading time their readers are short of", () => {
    const found = library().byType.map((entry) => entry.shortMs ?? -1)

    expect([...found].sort((one, other) => other - one)).toEqual(found)
  })

  it("orders by the time missing and not by the ratio, where the two disagree", () => {
    const TWO_COPY: PartDeclarations = {
      copyFor: (type) =>
        type === "loom.section" || type === "loom.note" ? ["body"] : undefined,
      typesWithRole: () => [],
    }
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        section("band", 1000),
        element("note", "loom.note", { body: words(4) }),
      ])
    )
    /**
     * The note is read at a tenth of the pace and costs nine hundred
     * milliseconds of nobody's time; the band is read at four tenths and costs
     * four hours of it. A deployment fixes the band.
     */
    const found = libraryPaceOf(
      [
        pageReadingOf(
          tree,
          [
            tally("band", { reached: 100, dwellMs: 10_000_000 }, tree),
            tally("note", { reached: 1, dwellMs: 100, type: primitiveType("loom.note") }, tree),
          ],
          TWO_COPY
        ),
      ],
      [row()]
    )

    expect(found.byType.map((entry) => entry.kind)).toEqual([
      { by: "type", type: primitiveType("loom.section") },
      { by: "type", type: primitiveType("loom.note") },
      { by: "type", type: primitiveType("loom.stack") },
    ])
    expect(typeRow(found, "loom.note")?.pace).toBeLessThan(typeRow(found, "loom.section")?.pace ?? 0)
    expect(found.mostSkimmed?.kind).toEqual({ by: "type", type: primitiveType("loom.section") })
  })

  it("keeps a kind that holds a page's root out of the kind to look at first", () => {
    const found = library()

    expect(found.mostSkimmed?.kind).toEqual({ by: "type", type: primitiveType("loom.section") })
    expect(found.byType.find((entry) => entry.whole > 0)?.standing).toBe("skimmed")
  })

  it("publishes no pace over the whole library, because two kinds nest in each other", () => {
    expect(Object.keys(library())).toEqual([
      "byType",
      "byRole",
      "pages",
      "trees",
      "placements",
      "nested",
      "scaled",
      "unscaled",
      "mostSkimmed",
      "duplicated",
      "duplicatedRows",
      "roleDisagreed",
      "wordsPerMinute",
    ])
  })

  it("counts the pages and the trees the readings were of", () => {
    const here = page()
    const far = page({ treeId: OTHER_TREE })
    const next = page({ revision: 2 })

    const found = libraryPaceOf([readingOf(here, []), readingOf(far, []), readingOf(next, [])], [row()])

    expect(found.pages).toBe(3)
    expect(found.trees).toBe(2)
    expect(found.scaled).toBe(1)
  })

  it("names a type whose readings disagree about the part it plays", () => {
    const tree = page()

    const found = libraryPaceOf(
      [readingOf(tree, [], BODY_IS_COPY), readingOf(page({ revision: 2 }), [], SECTIONS_HEAD)],
      [row()]
    )

    expect(found.roleDisagreed).toEqual([primitiveType("loom.section")])
  })
})

describe("the costing rate", () => {
  const tree = page()
  const reading = () => readingOf(tree, [tally("intro", { reached: 10, dwellMs: 50_000 }, tree)])

  it("is the published default, and is reported with the figures it produced", () => {
    expect(libraryPaceOf([reading()], [row()]).wordsPerMinute).toBe(READING_WORDS_PER_MINUTE)
  })

  it("is a deployment's to override, and the words cost less at a higher one", () => {
    const found = libraryPaceOf([reading()], [row()], { wordsPerMinute: 480 })

    expect(found.wordsPerMinute).toBe(480)
    expect(typeRow(found, "loom.section")?.needMs).toBe(10 * 20 * (60_000 / 480))
  })

  it("refuses a rate that is not a positive number", () => {
    for (const wordsPerMinute of [0, -240, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(libraryPaceOf([reading()], [row()], { wordsPerMinute }).wordsPerMinute).toBe(
        READING_WORDS_PER_MINUTE
      )
    }
  })
})

describe("the reasons, as the subsystem reads them", () => {
  it("gives every reason a line of its own", () => {
    expect(new Set(KIND_PACE_SILENCES.map(describeKindPaceSilence)).size).toBe(
      KIND_PACE_SILENCES.length
    )
  })

  it("reports each of them of a kind, bringing no condition of its own", () => {
    for (const silence of KIND_PACE_SILENCES) {
      const meaning = meaningOfKindPaceSilence(silence)

      expect(meaning.subject).toBe("kind")
      expect(meaning.vocabulary).toBe("library-pace")
    }

    expect(KIND_PACE_SILENCES.map((silence) => meaningOfKindPaceSilence(silence).condition)).toEqual([
      "no-view-reported",
      "nothing-of-the-kind",
      "words-a-floor",
      "says-nothing",
    ])
  })
})
