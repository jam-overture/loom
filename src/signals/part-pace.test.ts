import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  KIND_PACE_SILENCES,
  PACE_STANDINGS,
  describePartPaceSilence,
  meaningOfKindPaceSilence,
  pageReadingOf,
  partPaceOf,
  READING_WORDS_PER_MINUTE,
  type PacedPlace,
  type PartDeclarations,
  type ReaderTally,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on real readings and real door rows, because those are what the
 * function takes, and on the same round numbers `library-pace.test.ts` uses: at
 * the published costing rate a word takes **250 ms**, so twenty words need five
 * seconds of one reader's time and every expectation below is a figure a person
 * can check by hand.
 */

const MS_PER_WORD = 60_000 / READING_WORDS_PER_MINUTE

const BODY_IS_COPY: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: () => [],
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

const tally = (name: string, counts: Partial<ReaderTally>, tree: LoomTree): ReaderTally => ({
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
  updatedAt: "2026-11-12T00:00:00.000Z",
  ...counts,
})

/**
 * The part a goal names, on a page with something else beside it.
 *
 * `goal` is the same node id on every page of these fixtures, which is what a
 * goal's part is (0350): one id, counted wherever the site publishes it.
 */
const page = ({
  revision = 1,
  treeId = TREE,
  said = 20,
}: { revision?: number; treeId?: TreeId; said?: number } = {}) =>
  treeOf(element("page", "loom.stack", {}, [section("goal", said), section("other", 20)]), revision, treeId)

const readingOf = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  declarations: PartDeclarations = BODY_IS_COPY
) => pageReadingOf(tree, counters, declarations)

/** The part, reached by `reached` page views for `dwellMs` between them. */
const met = (tree: LoomTree, reached: number, dwellMs: number) =>
  readingOf(tree, [tally("goal", { reached, dwellMs }, tree)])

const GOAL = nodeId("goal")

describe("whether the readers who reach one part have time for what it says", () => {
  it("divides the time on screen by the time its words take the readers who reached it", () => {
    const here = page()
    const far = page({ treeId: OTHER_TREE })

    const found = partPaceOf(
      GOAL,
      [met(here, 50, 100_000), met(far, 50, 100_000)],
      [row(), row({ treeId: OTHER_TREE })]
    )

    expect(found.nodeId).toBe(GOAL)
    expect(found.placements).toBe(2)
    expect(found.counted).toBe(2)
    expect(found.pages).toBe(2)
    expect(found.trees).toBe(2)
    expect(found.readers).toBe(100)
    expect(found.dwellMs).toBe(200_000)
    /** Twenty words on each of two pages, each met by fifty readers, at 250 ms a word. */
    expect(found.needMs).toBe(2 * 50 * 20 * MS_PER_WORD)
    expect(found.pace).toBeCloseTo(0.4, 10)
    /** The figure a goal's screen asks for: two seconds on it, each time somebody got there. */
    expect(found.spentMs).toBe(2000)
    expect(found.shortMs).toBe(300_000)
    expect(found.standing).toBe("skimmed")
    expect(found.silence).toBeNull()
  })

  it("pools the two sums rather than averaging the pages' paces", () => {
    const busy = page({ said: 100 })
    const quiet = page({ treeId: OTHER_TREE, said: 4 })

    /**
     * Four hundred readers get a quarter of the time the busy page's hundred
     * words take; one reader gets four times what the quiet page's four take.
     * The mean of 0.25 and 4 is above two and would read as `lingered`. The
     * pooled quotient is a quarter, which is what readers of this part
     * actually met.
     */
    const found = partPaceOf(
      GOAL,
      [met(busy, 400, 400 * 6250), met(quiet, 1, 4000)],
      [row({ opened: 400, appearances: 400 }), row({ treeId: OTHER_TREE, opened: 1, appearances: 1 })]
    )

    expect(found.pace).toBeCloseTo(
      (400 * 6250 + 4000) / (400 * 100 * MS_PER_WORD + 1 * 4 * MS_PER_WORD),
      10
    )
    expect(found.pace).toBeLessThan(0.5)
    expect(found.standing).toBe("skimmed")
    /** Both pages' verdicts are kept, which is the half the pooled figure cannot show. */
    expect(found.standings).toEqual({ skimmed: 1, paced: 0, lingered: 1, unknown: 0 })
  })

  it("costs each page's own words, because one part can say more on one page than another", () => {
    const here = page({ said: 20 })
    const far = page({ treeId: OTHER_TREE, said: 60 })

    const found = partPaceOf(
      GOAL,
      [met(here, 10, 10_000), met(far, 10, 10_000)],
      [row(), row({ treeId: OTHER_TREE })]
    )

    expect(found.needMs).toBe(10 * 20 * MS_PER_WORD + 10 * 60 * MS_PER_WORD)
    expect(found.dwellMs).toBe(20_000)
    expect(found.spentMs).toBe(1000)
  })

  it("adds the subtree's words and not the part's own, because what is on screen is the subtree", () => {
    const tree = treeOf(element("page", "loom.stack", {}, [section("goal", 20, [section("inside", 20)])]))

    const found = partPaceOf(GOAL, [met(tree, 10, 50_000)], [row()])

    expect(found.needMs).toBe(10 * 40 * MS_PER_WORD)
  })

  it("counts the root as the whole page where a goal names it", () => {
    const tree = treeOf(section("goal", 20))

    const found = partPaceOf(GOAL, [met(tree, 10, 50_000)], [row()])

    expect(found.whole).toBe(1)
    expect(found.counted).toBe(1)
  })

  it("carries what the part is, as the first reading holding it has it", () => {
    const found = partPaceOf(GOAL, [readingOf(page(), []), met(page({ treeId: OTHER_TREE }), 1, 10)], [row()])

    expect(found.type).toBe(primitiveType("loom.section"))
    expect(found.role).toBeNull()
    expect(found.typeDisagreed).toEqual([])
  })

  it("names the types a later page had the same node as, and keeps the first page's answer", () => {
    const here = page()
    const far = treeOf(element("page", "loom.stack", {}, [element("goal", "loom.rule")]), 1, OTHER_TREE)

    const found = partPaceOf(
      GOAL,
      [
        met(here, 10, 50_000),
        readingOf(far, [tally("goal", { reached: 10, dwellMs: 50_000, type: primitiveType("loom.rule") }, far)]),
      ],
      [row(), row({ treeId: OTHER_TREE })]
    )

    expect(found.type).toBe(primitiveType("loom.section"))
    expect(found.typeDisagreed).toEqual([primitiveType("loom.rule")])
    expect(found.placements).toBe(2)
  })
})

describe("a page handed in twice", () => {
  it("counts one reading handed over twice once", () => {
    const tree = page()
    const reading = met(tree, 10, 50_000)

    const once = partPaceOf(GOAL, [reading], [row()])
    const twice = partPaceOf(GOAL, [reading, reading], [row()])

    expect(twice.duplicated).toBe(1)
    expect(twice.placements).toBe(1)
    expect(twice.counted).toBe(1)
    expect(twice.pages).toBe(1)
    expect(twice.readers).toBe(once.readers)
    expect(twice.dwellMs).toBe(once.dwellMs)
    expect(twice.needMs).toBe(once.needMs)
    expect(twice.pace).toBe(once.pace)
    /** The figure the screen prints is the one that would have doubled unnoticed. */
    expect(twice.spentMs).toBe(once.spentMs)
  })

  it("counts two revisions of one page as two, because a page's versions are not one page", () => {
    const first = page()
    const second = page({ revision: 2 })

    const found = partPaceOf(
      GOAL,
      [met(first, 10, 50_000), met(second, 10, 50_000)],
      [row(), row({ revision: 2 })]
    )

    expect(found.duplicated).toBe(0)
    expect(found.pages).toBe(2)
    expect(found.trees).toBe(1)
    expect(found.readers).toBe(20)
  })

  it("ignores a second door row for one revision rather than adding it", () => {
    const found = partPaceOf(GOAL, [met(page(), 10, 50_000)], [row(), row()])

    expect(found.duplicatedRows).toBe(1)
    expect(found.readers).toBe(10)
  })
})

describe("what the door does to one part's pace", () => {
  it("takes each page's own straddle off its own row", () => {
    const tree = page()

    /**
     * A rollup window shorter than a visit counts one page view twice, so
     * `appearances` and the `reached` against the page are doubled. The readers
     * halve back and the dwell does not move, because a page view counted twice
     * carried one page view's seconds.
     */
    const straddled = partPaceOf(GOAL, [met(tree, 100, 200_000)], [row({ opened: 100, appearances: 200 })])
    const clean = partPaceOf(GOAL, [met(tree, 50, 200_000)], [row()])

    expect(straddled.readers).toBe(50)
    expect(straddled.dwellMs).toBe(200_000)
    expect(straddled.pace).toBe(clean.pace)
    expect(straddled.spentMs).toBe(clean.spentMs)
    expect(straddled.unscaled).toBe(0)
    expect(straddled.unscaledPages).toEqual([])
  })

  it("keeps a page the door cannot scale, says how much of the figure it is, and names it", () => {
    const found = partPaceOf(GOAL, [met(page(), 10, 20_000)], [])

    expect(found.counted).toBe(1)
    expect(found.unscaled).toBe(10)
    expect(found.unscaledPages).toEqual([{ treeId: TREE, revision: 1, silence: "unmeasured" }])
    expect(found.pace).toBeCloseTo(20_000 / (10 * 20 * MS_PER_WORD), 10)
    expect(found.silence).toBeNull()
  })

  it("names no page the door could not scale where the part was not counted on it", () => {
    expect(partPaceOf(GOAL, [readingOf(page(), [])], []).unscaledPages).toEqual([])
  })

  it("orders the pages it could not scale by tree, newest revision first", () => {
    const one = page({ revision: 2 })
    const other = page({ revision: 1 })
    const far = page({ treeId: OTHER_TREE })

    const found = partPaceOf(
      GOAL,
      [met(other, 1, 10), met(far, 1, 10), met(one, 1, 10)],
      []
    )

    expect(found.unscaledPages.map((at) => [at.treeId, at.revision])).toEqual([
      [TREE, 2],
      [TREE, 1],
      [OTHER_TREE, 1],
    ])
  })
})

describe("what one part has no pace for", () => {
  it("says nothing of a part none of the pages read holds", () => {
    const found = partPaceOf(nodeId("absent"), [met(page(), 10, 50_000)], [row()])

    expect(found.placements).toBe(0)
    expect(found.type).toBeNull()
    expect(found.silence).toBe("unplaced")
    expect(found.pace).toBeNull()
    expect(found.readers).toBeNull()
    expect(found.spentMs).toBeNull()
    expect(found.standing).toBe("unknown")
  })

  it("says nothing of a part no view reported, which is not nought seconds", () => {
    const found = partPaceOf(GOAL, [readingOf(page(), []), readingOf(page({ treeId: OTHER_TREE }), [])], [row()])

    expect(found.placements).toBe(2)
    expect(found.counted).toBe(0)
    expect(found.silences).toEqual({ unreached: 2, unreadable: 0, wordless: 0 })
    expect(found.silence).toBe("unread")
    expect(found.spentMs).toBeNull()
    expect(found.pages).toBe(0)
  })

  it("says nothing of a part that says nothing", () => {
    const tree = treeOf(element("page", "loom.stack", {}, [element("goal", "loom.rule")]))
    const found = partPaceOf(
      GOAL,
      [readingOf(tree, [tally("goal", { reached: 10, dwellMs: 20_000, type: primitiveType("loom.rule") }, tree)])],
      [row()]
    )

    expect(found.silences.wordless).toBe(1)
    expect(found.silence).toBe("wordless")
  })

  it("prefers the floor to the silence where one page is silent for each reason", () => {
    const read = treeOf(
      element("page", "loom.stack", {}, [section("goal", 0, [element("quote", "loom.quote", { body: "a line" })])])
    )
    const unseen = page({ treeId: OTHER_TREE })

    const found = partPaceOf(
      GOAL,
      [met(read, 10, 20_000), readingOf(unseen, [])],
      [row(), row({ treeId: OTHER_TREE })]
    )

    expect(found.counted).toBe(0)
    expect(found.silences).toEqual({ unreached: 1, unreadable: 1, wordless: 0 })
    expect(found.silence).toBe("unreadable")
  })

  it("prefers the floor to saying nothing, where one page owes words and the other has none", () => {
    const owed = treeOf(
      element("page", "loom.stack", {}, [section("goal", 0, [element("quote", "loom.quote", { body: "a line" })])])
    )
    const none = treeOf(element("page", "loom.stack", {}, [element("goal", "loom.rule")]), 1, OTHER_TREE)

    /**
     * Both pages reported a reader and neither can be costed: one owes words
     * nobody counted, the other says nothing at all. *Nobody counted them*
     * outranks *there are none*, because the second is a claim about the part
     * and the first is a claim about this deployment's declarations (0122).
     */
    const found = partPaceOf(
      GOAL,
      [
        met(owed, 10, 20_000),
        readingOf(none, [tally("goal", { reached: 10, dwellMs: 20_000, type: primitiveType("loom.rule") }, none)]),
      ],
      [row(), row({ treeId: OTHER_TREE })]
    )

    expect(found.counted).toBe(0)
    expect(found.silences).toEqual({ unreached: 0, unreadable: 1, wordless: 1 })
    expect(found.silence).toBe("unreadable")
  })

  it("holds up any verdict but a skim where something inside it declares no copy", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [section("goal", 20, [element("quote", "loom.quote", { body: "a line" })])])
    )

    const found = partPaceOf(GOAL, [met(tree, 10, 10 * 20_000)], [row()])

    expect(found.counted).toBe(1)
    expect(found.floored).toBe(1)
    expect(found.pace).toBeNull()
    expect(found.spentMs).toBeNull()
    expect(found.standing).toBe("unknown")
    expect(found.silence).toBe("unreadable")
  })

  it("still calls a floored part skimmed, because words nobody counted only make it more so", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [section("goal", 20, [element("quote", "loom.quote", { body: "a line" })])])
    )

    const found = partPaceOf(GOAL, [met(tree, 10, 10_000)], [row()])

    expect(found.floored).toBe(1)
    expect(found.standing).toBe("skimmed")
    expect(found.silence).toBeNull()
    expect(found.spentMs).toBe(1000)
  })

  it("is short of no time at all where readers stayed longer than the words account for", () => {
    const found = partPaceOf(GOAL, [met(page(), 10, 10 * 100_000)], [row()])

    expect(found.standing).toBe("lingered")
    expect(found.shortMs).toBe(0)
  })
})

describe("the costing rate", () => {
  it("is the published default, and is reported with the figures it produced", () => {
    expect(partPaceOf(GOAL, [met(page(), 10, 50_000)], [row()]).wordsPerMinute).toBe(
      READING_WORDS_PER_MINUTE
    )
  })

  it("is a deployment's to override, and the words cost less at a higher one", () => {
    const readings = [met(page(), 10, 50_000)]
    const slower = partPaceOf(GOAL, readings, [row()], { wordsPerMinute: 120 })
    const faster = partPaceOf(GOAL, readings, [row()], { wordsPerMinute: 480 })

    expect(slower.needMs).toBe(4 * (faster.needMs ?? 0))
    expect(slower.pace ?? 1).toBeLessThan(faster.pace ?? 0)
    expect(faster.wordsPerMinute).toBe(480)
  })

  it("refuses a rate that is not a positive number", () => {
    for (const rate of [0, -240, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(partPaceOf(GOAL, [met(page(), 10, 50_000)], [row()], { wordsPerMinute: rate }).wordsPerMinute).toBe(
        READING_WORDS_PER_MINUTE
      )
    }
  })
})

describe("why a part has no pace, said to a reader of the screen", () => {
  it("gives every reason a line of its own", () => {
    const lines = KIND_PACE_SILENCES.map(describePartPaceSilence)

    expect(new Set(lines).size).toBe(KIND_PACE_SILENCES.length)
    for (const line of lines) expect(line.length).toBeGreaterThan(10)
  })

  it("says it of one part rather than of a kind of part", () => {
    expect(describePartPaceSilence("unplaced")).toContain("this part")
    expect(describePartPaceSilence("unread")).toContain("any page it stands on")
  })

  it("brings no silence a window has no meaning for", () => {
    for (const silence of KIND_PACE_SILENCES) {
      expect(meaningOfKindPaceSilence(silence).vocabulary).toBe("library-pace")
    }
  })
})

describe("which page the part is skimmed on", () => {
  /** The pages are ranked on a magnitude, so the rows add up to the figure above them. */
  const addedOver = (rows: readonly PacedPlace[], key: "readers" | "dwellMs" | "needMs"): number =>
    rows.reduce((total, place) => total + (place[key] ?? 0), 0)

  it("publishes one row per page the part is counted on, and no row for a page it is not", () => {
    const here = page()
    const far = page({ treeId: OTHER_TREE })
    const unseen = page({ revision: 2 })

    const found = partPaceOf(
      GOAL,
      [met(here, 50, 100_000), met(far, 50, 100_000), readingOf(unseen, [])],
      [row(), row({ treeId: OTHER_TREE }), row({ revision: 2 })]
    )

    expect(found.ranked).toHaveLength(found.counted)
    expect(found.ranked.length + found.unranked.length).toBe(found.placements)
    expect(found.ranked.map((place) => [place.treeId, place.revision])).toEqual([
      [TREE, 1],
      [OTHER_TREE, 1],
    ])
    expect(found.unranked.map((place) => [place.treeId, place.revision, place.silence])).toEqual([
      [TREE, 2, "unreached"],
    ])
  })

  it("adds the rows up to the three figures above them, term by term", () => {
    const here = page({ said: 20 })
    const far = page({ treeId: OTHER_TREE, said: 60 })
    const older = page({ revision: 2, said: 40 })

    const found = partPaceOf(
      GOAL,
      [met(here, 50, 100_000), met(far, 10, 30_000), met(older, 25, 60_000)],
      [row(), row({ treeId: OTHER_TREE }), row({ revision: 2 })]
    )

    /**
     * The only thing tying the breakdown to the figure it breaks down. Every
     * number here is an integer at the published rate, so the sums are exact
     * however the rows are ordered.
     */
    expect(addedOver(found.ranked, "readers")).toBe(found.readers)
    expect(addedOver(found.ranked, "dwellMs")).toBe(found.dwellMs)
    expect(addedOver(found.ranked, "needMs")).toBe(found.needMs)
    expect(found.readers).toBe(85)
    expect(found.dwellMs).toBe(190_000)
  })

  it("ranks the page four hundred readers skimmed above the page one reader hurried past", () => {
    const busy = page()
    const hasty = page({ treeId: OTHER_TREE })

    /**
     * The decision in this unit, as a test. Four hundred readers each had a
     * second of a five-second band; one reader had a tenth of one. The **rate**
     * puts the single reader first and the **reading time missing** puts the
     * four hundred first, and the second is the page to go and look at (0390).
     */
    const found = partPaceOf(
      GOAL,
      [met(busy, 400, 400_000), met(hasty, 1, 100)],
      [
        row({ opened: 400, appearances: 400 }),
        row({ treeId: OTHER_TREE, opened: 1, appearances: 1 }),
      ]
    )

    const [first, second] = found.ranked

    expect(first?.treeId).toBe(TREE)
    expect(first?.shortMs).toBe(400 * (5000 - 1000))
    expect(second?.treeId).toBe(OTHER_TREE)
    expect(second?.shortMs).toBe(4900)
    /** The ordering the rate would have published, which is the one refused. */
    expect(second?.pace ?? 1).toBeLessThan(first?.pace ?? 0)
    expect(found.worst).toBe(first)
  })

  it("breaks a tie on the lower pace, which is the page nearest to being short", () => {
    const spare = page({ revision: 2 })
    const nearer = page({ revision: 1 })

    /**
     * Both pages' readers had time enough, so both are short of nothing. The
     * page-order key would have put revision 2 first; the pace puts the page
     * with the least room first, which is the one to watch.
     */
    const found = partPaceOf(
      GOAL,
      [met(spare, 10, 100_000), met(nearer, 10, 75_000)],
      [row({ revision: 2 }), row()]
    )

    expect(found.ranked.map((place) => place.shortMs)).toEqual([0, 0])
    expect(found.ranked.map((place) => [place.revision, place.pace])).toEqual([
      [1, 1.5],
      [2, 2],
    ])
  })

  it("falls back to tree and newest revision first, so two equal pages do not reorder", () => {
    const found = partPaceOf(
      GOAL,
      [
        met(page({ revision: 1 }), 10, 10_000),
        met(page({ treeId: OTHER_TREE }), 10, 10_000),
        met(page({ revision: 2 }), 10, 10_000),
      ],
      [row(), row({ treeId: OTHER_TREE }), row({ revision: 2 })]
    )

    expect(found.ranked.map((place) => [place.treeId, place.revision])).toEqual([
      [TREE, 2],
      [TREE, 1],
      [OTHER_TREE, 1],
    ])
    expect(found.ranked.every((place) => place.shortMs === 40_000)).toBe(true)
  })

  it("says which page a part that is paced across the deployment is skimmed on", () => {
    const read = page()
    const skipped = page({ treeId: OTHER_TREE })

    /**
     * The sentence `standings` could say and could not finish: *paced across
     * your pages and skimmed on one of them*. The row's verdict is the page's
     * own reading's, so the breakdown cannot name a different number of pages
     * than the census above it does.
     */
    const found = partPaceOf(
      GOAL,
      [met(read, 10, 60_000), met(skipped, 10, 10_000)],
      [row(), row({ treeId: OTHER_TREE })]
    )

    expect(found.standing).toBe("paced")
    expect(found.standings).toEqual({ skimmed: 1, paced: 1, lingered: 0, unknown: 0 })
    expect(found.ranked.filter((place) => place.standing === "skimmed").map((place) => place.treeId)).toEqual([
      OTHER_TREE,
    ])
  })

  it("counts the same standings over the rows as the census above them, silences included", () => {
    const counted = page()
    const wordless = treeOf(element("page", "loom.stack", {}, [element("goal", "loom.rule")]), 1, OTHER_TREE)

    /**
     * The floored page is the one that matters here. Its readers stayed four
     * times as long as its counted words take, so a verdict taken without the
     * floor would read `lingered`; `pace.ts` holds it at `unknown` because some
     * of its words were never counted (0230), and the row has to say the same
     * thing the census does.
     */
    const held = treeOf(
      element("page", "loom.stack", {}, [section("goal", 20, [element("quote", "loom.quote", { body: "a line" })])]),
      3
    )

    const found = partPaceOf(
      GOAL,
      [
        met(counted, 10, 10_000),
        readingOf(wordless, [
          tally("goal", { reached: 10, dwellMs: 20_000, type: primitiveType("loom.rule") }, wordless),
        ]),
        readingOf(page({ revision: 2 }), []),
        met(held, 10, 10 * 20_000),
      ],
      [row(), row({ treeId: OTHER_TREE }), row({ revision: 2 }), row({ revision: 3 })]
    )

    expect(found.ranked.map((place) => [place.revision, place.standing])).toContainEqual([3, "unknown"])

    const overTheRows = Object.fromEntries(
      PACE_STANDINGS.map((standing) => [
        standing,
        [...found.ranked, ...found.unranked].filter((place) => place.standing === standing).length,
      ])
    )

    expect(overTheRows).toEqual(found.standings)
  })

  it("keeps a silent page's time on screen off the sums, because no denominator would take it", () => {
    const counted = page()
    const wordless = treeOf(element("page", "loom.stack", {}, [element("goal", "loom.rule")]), 1, OTHER_TREE)

    /**
     * The one way this breakdown could have put a number in the reading above
     * it: a part that says nothing can still have been on screen for twenty
     * seconds, and that time has no words to be measured against. The row
     * carries it, the sums do not, and the two are not in disagreement.
     */
    const found = partPaceOf(
      GOAL,
      [
        met(counted, 10, 10_000),
        readingOf(wordless, [
          tally("goal", { reached: 10, dwellMs: 20_000, type: primitiveType("loom.rule") }, wordless),
        ]),
      ],
      [row(), row({ treeId: OTHER_TREE })]
    )

    expect(found.unranked.map((place) => [place.silence, place.dwellMs, place.needMs])).toEqual([
      ["wordless", 20_000, null],
    ])
    expect(found.dwellMs).toBe(10_000)
    expect(addedOver(found.ranked, "dwellMs")).toBe(found.dwellMs)
  })

  it("is short of more time over the rows than the pooled figure is, where a page had time to spare", () => {
    const lingered = page()
    const skimmed = page({ treeId: OTHER_TREE })

    /**
     * The term that does not add, asserted as not adding. The pooled figure
     * lets the page readers lingered on pay for the page they skimmed and is
     * short of nothing; the rows are each their own page's and are short of
     * forty seconds. A surface adding these rows has contradicted the number
     * printed above them.
     */
    const found = partPaceOf(
      GOAL,
      [met(lingered, 10, 1_000_000), met(skimmed, 10, 10_000)],
      [row(), row({ treeId: OTHER_TREE })]
    )

    expect(found.shortMs).toBe(0)
    expect(found.ranked.reduce((total, place) => total + place.shortMs, 0)).toBe(40_000)
  })

  it("keeps the rows where the figure above them is withheld, because the pages are what is wrong", () => {
    const held = treeOf(
      element("page", "loom.stack", {}, [section("goal", 20, [element("quote", "loom.quote", { body: "a line" })])])
    )

    /**
     * A part whose words are a floor and whose readers stayed longer than the
     * counted ones take has no publishable pace at all, so every pooled figure
     * is withheld — and the breakdown is then the only thing on the reading
     * that says which page to go and fix the declaration on. The sums tie to
     * the figures above them wherever those figures are published, which here
     * is nowhere.
     */
    const found = partPaceOf(GOAL, [met(held, 10, 10 * 20_000)], [row()])

    expect(found.silence).toBe("unreadable")
    expect(found.needMs).toBeNull()
    expect(found.readers).toBeNull()
    expect(found.ranked.map((place) => [place.readers, place.needMs, place.floored])).toEqual([
      [10, 10 * 20 * MS_PER_WORD, true],
    ])
  })

  it("carries the page's own silence where the door could not scale it, and its unscaled readers", () => {
    const found = partPaceOf(GOAL, [met(page(), 10, 20_000)], [])

    expect(found.ranked.map((place) => [place.readers, place.unscaled])).toEqual([[10, "unmeasured"]])
    expect(found.unscaled).toBe(10)
  })

  it("puts each page's readers on that page's own door scale, and its time per reader with them", () => {
    const straddled = page()
    const clean = page({ treeId: OTHER_TREE })

    /**
     * The first page's rollup counted every page view twice, so its hundred
     * `reached` are fifty readers carrying one page view's seconds each (0147).
     * A row printing the raw count beside the other page's would be printing
     * two numbers in two units, and the sums above it are in the scaled one.
     */
    const found = partPaceOf(
      GOAL,
      [met(straddled, 100, 100_000), met(clean, 50, 100_000)],
      [
        row({ opened: 100, appearances: 200 }),
        row({ treeId: OTHER_TREE, opened: 50, appearances: 50 }),
      ]
    )

    expect(found.ranked.map((place) => [place.treeId, place.readers, place.spentMs])).toEqual([
      [TREE, 50, 2000],
      [OTHER_TREE, 50, 2000],
    ])
    expect(found.readers).toBe(100)
    expect(addedOver(found.ranked, "readers")).toBe(found.readers)
  })

  it("orders the pages with no figures by tree and newest revision first", () => {
    const wordless = treeOf(element("page", "loom.stack", {}, [element("goal", "loom.rule")]), 1, OTHER_TREE)

    const found = partPaceOf(
      GOAL,
      [
        readingOf(wordless, [
          tally("goal", { reached: 10, dwellMs: 20_000, type: primitiveType("loom.rule") }, wordless),
        ]),
        readingOf(page({ revision: 1 }), []),
        readingOf(page({ revision: 2 }), []),
      ],
      [row(), row({ treeId: OTHER_TREE }), row({ revision: 2 })]
    )

    expect(found.unranked.map((place) => [place.treeId, place.revision])).toEqual([
      [TREE, 2],
      [TREE, 1],
      [OTHER_TREE, 1],
    ])
  })

  it("says of each page whether the part is the whole of it and whether its words are a floor", () => {
    const whole = treeOf(section("goal", 20))
    const floored = treeOf(
      element("page", "loom.stack", {}, [section("goal", 20, [element("quote", "loom.quote", { body: "a line" })])]),
      1,
      OTHER_TREE
    )

    const found = partPaceOf(
      GOAL,
      [met(whole, 10, 10_000), met(floored, 10, 10_000)],
      [row(), row({ treeId: OTHER_TREE })]
    )

    expect(found.ranked.map((place) => [place.treeId, place.whole, place.floored])).toEqual([
      [TREE, true, false],
      [OTHER_TREE, false, true],
    ])
    expect(found.whole).toBe(1)
    expect(found.floored).toBe(1)
  })

  it("carries the audience the page's counters were of, as the reading has it", () => {
    const tree = page()
    const reading = pageReadingOf(
      tree,
      [{ ...tally("goal", { reached: 10, dwellMs: 10_000 }, tree), audienceId: DEFAULT_AUDIENCE_ID }],
      BODY_IS_COPY,
      DEFAULT_AUDIENCE_ID
    )

    const found = partPaceOf(GOAL, [reading], [row()])

    expect(reading.audienceId).toBe(DEFAULT_AUDIENCE_ID)
    expect(found.ranked.map((place) => place.audienceId)).toEqual([DEFAULT_AUDIENCE_ID])
  })

  it("carries the words each placement puts on screen, which is its subtree's and not its own", () => {
    const nested = treeOf(element("page", "loom.stack", {}, [section("goal", 20, [section("inside", 20)])]))

    const found = partPaceOf(GOAL, [met(nested, 10, 10_000)], [row()])

    expect(found.ranked.map((place) => place.wordsWithin)).toEqual([40])
    expect(found.ranked.map((place) => place.needMs)).toEqual([10 * 40 * MS_PER_WORD])
  })

  it("has no order and no worst page where nothing was counted", () => {
    const found = partPaceOf(GOAL, [readingOf(page(), [])], [row()])

    expect(found.ranked).toEqual([])
    expect(found.worst).toBeNull()
    expect(found.unranked).toHaveLength(1)
    expect(found.silence).toBe("unread")
  })

  it("has no row at all for a part none of the pages read holds", () => {
    const found = partPaceOf(nodeId("absent"), [met(page(), 10, 10_000)], [row()])

    expect(found.ranked).toEqual([])
    expect(found.unranked).toEqual([])
    expect(found.worst).toBeNull()
  })

  it("puts one reading handed over twice in the order once", () => {
    const reading = met(page(), 10, 10_000)

    const found = partPaceOf(GOAL, [reading, reading], [row()])

    expect(found.ranked).toHaveLength(1)
    expect(addedOver(found.ranked, "readers")).toBe(found.readers)
    expect(addedOver(found.ranked, "dwellMs")).toBe(found.dwellMs)
  })

  it("puts a page whose rows were handed in twice in the order once, at one row's scale", () => {
    const found = partPaceOf(GOAL, [met(page(), 10, 10_000)], [row(), row()])

    expect(found.duplicatedRows).toBe(1)
    expect(found.ranked.map((place) => place.readers)).toEqual([10])
  })
})
