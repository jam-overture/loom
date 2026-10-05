import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import { nodeId, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode, SlotNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  pageReadingOf,
  readingPaceOf,
  READING_WORDS_PER_MINUTE,
  type PaceOptions,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Built on the reading rather than on counters, because that is what the
 * function takes: a tree, a window's rows and what the library has declared go
 * in one end, and a verdict about whether readers had time for the words comes
 * out of the other.
 */

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

const text = (name: string, value: string): LoomNode => ({
  kind: "text",
  id: nodeId(name),
  value,
})

const slot = (name: string, children: readonly LoomNode[]): SlotNode => ({
  kind: "slot",
  id: nodeId(name),
  name: "children" as SlotNode["name"],
  children,
})

const treeOf = (root: ElementNode, revision = 1): LoomTree => ({
  treeId: TREE,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

/** Every type declares `body` as copy, which is the library of 0223 in miniature. */
const BODY_IS_COPY: PartDeclarations = {
  copyFor: () => ["body"],
  typesWithRole: () => [],
}

/** Nobody has declared anything, which is what a word in a prop being invisible looks like. */
const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

/** A half-declared library, which is what every real one is on the way to 0223. */
const DECLARED_FOR = (types: readonly string[]): PartDeclarations => ({
  copyFor: (type) => (types.includes(type) ? ["body"] : undefined),
  typesWithRole: () => [],
})

const tally = (name: string, counters: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: TREE,
  revision: 1,
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
  ...counters,
})

/** `n` words, which is the only thing about the string this module reads. */
const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

/** What `count` words take a reader at the published rate. */
const takes = (count: number): number => (count / READING_WORDS_PER_MINUTE) * 60_000

const paceOf = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  declarations: PartDeclarations = BODY_IS_COPY,
  options: PaceOptions = {}
) => readingPaceOf(pageReadingOf(tree, counters, declarations), options)

const partIn = (pace: ReturnType<typeof readingPaceOf>, name: string) =>
  pace.parts.find((part) => part.nodeId === nodeId(name))

/**
 * Two bands of a hundred words each under a root that says nothing itself.
 *
 * A hundred words takes 25 seconds at the published rate, which is the number
 * every case below is built against.
 */
const PAGE = element("page", "loom.stack", {}, [
  element("intro", "loom.section", { body: words(100) }),
  element("pricing", "loom.section", { body: words(100) }),
])

describe("readingPaceOf", () => {
  it("calls a band readers raced through skimmed, and one they stayed on paced", () => {
    const pace = paceOf(treeOf(PAGE), [
      tally("page", { views: 100, reached: 100, dwellMs: 100 * 30_000 }),
      tally("intro", { views: 100, reached: 100, dwellMs: 100 * 20_000 }),
      tally("pricing", { views: 100, reached: 100, dwellMs: 100 * 2_000 }),
    ])

    expect(partIn(pace, "intro")).toMatchObject({
      readers: 100,
      wordsWithin: 100,
      spentMs: 20_000,
      needMs: takes(100),
      pace: 0.8,
      standing: "paced",
      silence: null,
    })

    expect(partIn(pace, "pricing")).toMatchObject({
      spentMs: 2_000,
      pace: 0.08,
      standing: "skimmed",
      silence: null,
    })
  })

  it("judges a part against its own subtree's words and not only its own", () => {
    const pace = paceOf(treeOf(PAGE), [
      tally("page", { views: 10, reached: 10, dwellMs: 10 * 40_000 }),
      tally("intro", { views: 10, reached: 10, dwellMs: 10 * 20_000 }),
    ])

    /**
     * The root says nothing itself and holds two hundred words, which is fifty
     * seconds — so forty seconds on it is a skim of the page even though every
     * word on it belongs to something else.
     */
    expect(partIn(pace, "page")).toMatchObject({
      words: 0,
      wordsWithin: 200,
      needMs: takes(200),
      pace: 0.8,
      standing: "paced",
    })
  })

  it("counts a part's own words once and its subtree's at every level above it", () => {
    const nested = element("page", "loom.stack", {}, [
      element("band", "loom.section", { body: words(40) }, [
        element("note", "loom.text", { body: words(10) }),
      ]),
    ])

    const pace = paceOf(treeOf(nested), [])

    expect(partIn(pace, "page")).toMatchObject({ words: 0, wordsWithin: 50 })
    expect(partIn(pace, "band")).toMatchObject({ words: 40, wordsWithin: 50 })
    expect(partIn(pace, "note")).toMatchObject({ words: 10, wordsWithin: 10 })
  })

  it("reads a part's text children as its own words", () => {
    const spoken = element("page", "loom.stack", {}, [
      element("band", "loom.section", {}, [text("line", words(12))]),
    ])

    expect(partIn(paceOf(treeOf(spoken), []), "band")).toMatchObject({ words: 12, wordsWithin: 12 })
  })

  it("keeps a band's words when a slot sits between it and the page", () => {
    /**
     * A slot is not a part, so a reading that climbed parent ids would leave
     * these forty words on a node it has never heard of and report the page as
     * saying nothing.
     */
    const slotted = element("page", "loom.stack", {}, [
      slot("hole", [element("band", "loom.section", { body: words(40) })]),
    ])

    const pace = paceOf(treeOf(slotted), [])

    expect(partIn(pace, "page")).toMatchObject({ words: 0, wordsWithin: 40 })
    expect(pace.parts.map((part) => part.nodeId)).toEqual([nodeId("page"), nodeId("band")])
  })

  describe("the verdict only goes one way", () => {
    it("still calls a part skimmed when some of its words could not be read", () => {
      /**
       * A hundred words of text, which anything can read, and a band whose type
       * has declared nothing — so the page's count is a floor, and more words
       * can only make two seconds less adequate than it already is.
       */
      const partly = element("page", "loom.stack", {}, [
        text("line", words(100)),
        element("murky", "loom.section", { caption: words(40) }),
      ])

      const pace = paceOf(
        treeOf(partly),
        [tally("page", { views: 10, reached: 10, dwellMs: 10 * 2_000 })],
        NOTHING_DECLARED
      )

      expect(partIn(pace, "page")).toMatchObject({
        wordsWithin: 100,
        floored: true,
        standing: "skimmed",
        silence: null,
      })
    })

    it("withholds every other verdict when the words are a floor", () => {
      const partly = element("page", "loom.stack", {}, [
        text("line", words(20)),
        element("murky", "loom.section", { caption: words(40) }),
      ])

      const pace = paceOf(
        treeOf(partly),
        [tally("page", { views: 10, reached: 10, dwellMs: 10 * 30_000 })],
        NOTHING_DECLARED
      )

      expect(partIn(pace, "page")).toMatchObject({
        floored: true,
        pace: 6,
        standing: "unknown",
        silence: "unreadable",
      })
    })

    it("makes the floor of a subtree the floor of everything above it", () => {
      const mixed = element("page", "loom.stack", {}, [
        element("clean", "loom.section", { body: words(10) }),
        element("murky", "loom.aside", { body: words(10) }),
      ])

      const pace = paceOf(treeOf(mixed), [], DECLARED_FOR(["loom.stack", "loom.section"]))

      expect(partIn(pace, "clean")?.floored).toBe(false)
      expect(partIn(pace, "murky")?.floored).toBe(true)
      expect(partIn(pace, "page")?.floored).toBe(true)
    })

    it("counts a declared prop that is not a string as a word it was owed", () => {
      const figure = element("page", "loom.stack", {}, [
        element("stat", "loom.stat", { body: 3400 }),
      ])

      expect(partIn(paceOf(treeOf(figure), []), "page")).toMatchObject({
        wordsWithin: 0,
        floored: true,
      })
    })
  })

  describe("what cannot be said", () => {
    it("says nothing about a part no view reached", () => {
      const pace = paceOf(treeOf(PAGE), [
        tally("page", { views: 10, reached: 10, dwellMs: 10 * 60_000 }),
        tally("intro", { views: 10, reached: 10, dwellMs: 10 * 30_000 }),
      ])

      expect(partIn(pace, "pricing")).toMatchObject({
        readers: 0,
        spentMs: null,
        pace: null,
        standing: "unknown",
        silence: "unreached",
      })
    })

    it("says nothing about every part of a window with no views", () => {
      const pace = paceOf(treeOf(PAGE), [])

      expect(pace.views).toBe(0)
      expect(pace.standings.unknown).toBe(3)
      expect(pace.silences.unreached).toBe(3)
      expect(pace.whole).toMatchObject({ standing: "unknown", silence: "unreached" })
      expect(pace.mostSkimmed).toBeNull()
    })

    it("tells a part that says nothing from one whose words nobody declared", () => {
      const quiet = element("page", "loom.stack", {}, [
        element("rule", "loom.divider"),
        element("murky", "loom.aside", { body: words(10) }),
      ])

      const pace = paceOf(
        treeOf(quiet),
        [
          tally("page", { views: 10, reached: 10, dwellMs: 10 * 1_000 }),
          tally("rule", { views: 10, reached: 10, dwellMs: 10 * 1_000 }),
          tally("murky", { views: 10, reached: 10, dwellMs: 10 * 1_000 }),
        ],
        DECLARED_FOR(["loom.stack", "loom.divider"])
      )

      expect(partIn(pace, "rule")).toMatchObject({
        wordsWithin: 0,
        floored: false,
        needMs: 0,
        pace: null,
        standing: "unknown",
        silence: "wordless",
      })

      expect(partIn(pace, "murky")).toMatchObject({
        wordsWithin: 0,
        floored: true,
        standing: "unknown",
        silence: "unreadable",
      })
    })

    it("counts the silences apart from each other", () => {
      const pace = paceOf(treeOf(PAGE), [
        tally("page", { views: 10, reached: 10, dwellMs: 10 * 50_000 }),
        tally("intro", { views: 10, reached: 10, dwellMs: 10 * 25_000 }),
      ])

      expect(pace.standings).toEqual({ skimmed: 0, paced: 2, lingered: 0, unknown: 1 })
      expect(pace.silences).toEqual({ unreached: 1, unreadable: 0, wordless: 0 })
    })
  })

  describe("the page and the part it loses most words in", () => {
    it("reports the root apart, because it contains every part it would outrank", () => {
      const pace = paceOf(treeOf(PAGE), [
        tally("page", { views: 100, reached: 100, dwellMs: 100 * 5_000 }),
        tally("intro", { views: 100, reached: 100, dwellMs: 100 * 2_000 }),
        tally("pricing", { views: 40, reached: 40, dwellMs: 40 * 1_000 }),
      ])

      expect(pace.whole).toMatchObject({ nodeId: nodeId("page"), standing: "skimmed" })
      expect(pace.mostSkimmed).toMatchObject({ nodeId: nodeId("intro"), wordsPassed: 10_000 })
    })

    it("ranks by the words readers passed, not by how badly they were passed", () => {
      /**
       * `aside` is hurried past four times as hard and by four readers; `main`
       * is hurried past by four hundred, which is the larger problem and the
       * reason 0221 ranks by readers lost rather than by share.
       */
      const page = element("page", "loom.stack", {}, [
        element("main", "loom.section", { body: words(100) }),
        element("aside", "loom.section", { body: words(100) }),
      ])

      const pace = paceOf(treeOf(page), [
        tally("page", { views: 400, reached: 400, dwellMs: 400 * 4_000 }),
        tally("main", { views: 400, reached: 400, dwellMs: 400 * 4_000 }),
        tally("aside", { views: 4, reached: 4, dwellMs: 4 * 1_000 }),
      ])

      expect(partIn(pace, "aside")?.pace).toBeLessThan(partIn(pace, "main")?.pace ?? 0)
      expect(pace.mostSkimmed?.nodeId).toBe(nodeId("main"))
    })

    it("keeps the first in reading order when two parts passed exactly the same words", () => {
      const pace = paceOf(treeOf(PAGE), [
        tally("page", { views: 10, reached: 10, dwellMs: 10 * 4_000 }),
        tally("intro", { views: 10, reached: 10, dwellMs: 10 * 2_000 }),
        tally("pricing", { views: 10, reached: 10, dwellMs: 10 * 2_000 }),
      ])

      expect(partIn(pace, "intro")?.wordsPassed).toBe(partIn(pace, "pricing")?.wordsPassed)
      expect(pace.mostSkimmed?.nodeId).toBe(nodeId("intro"))
    })

    it("names nothing where nothing was skimmed", () => {
      const pace = paceOf(treeOf(PAGE), [
        tally("page", { views: 10, reached: 10, dwellMs: 10 * 50_000 }),
        tally("intro", { views: 10, reached: 10, dwellMs: 10 * 25_000 }),
        tally("pricing", { views: 10, reached: 10, dwellMs: 10 * 25_000 }),
      ])

      expect(pace.mostSkimmed).toBeNull()
      expect(pace.standings.skimmed).toBe(0)
    })
  })

  describe("the reader count the rows hold is generous, and a deployment can say by how much", () => {
    it("credits each reader with more time when the openings say the counts straddled", () => {
      const counters = [
        tally("page", { views: 100, reached: 100, dwellMs: 100 * 12_000 }),
        tally("intro", { views: 100, reached: 100, dwellMs: 100 * 12_000 }),
      ]

      const uncorrected = paceOf(treeOf(PAGE), counters)
      /** `drift ÷ opened` off the page-view rows: a tenth of the counts are a straddle. */
      const corrected = paceOf(treeOf(PAGE), counters, BODY_IS_COPY, { inflation: 0.1 })

      expect(partIn(uncorrected, "intro")).toMatchObject({ spentMs: 12_000, standing: "skimmed" })
      expect(partIn(corrected, "intro")).toMatchObject({ spentMs: 13_200, standing: "paced" })
      expect(corrected.inflation).toBe(0.1)
    })

    it("leaves the reader counts the integers the rows hold", () => {
      const pace = paceOf(
        treeOf(PAGE),
        [tally("intro", { views: 9, reached: 9, dwellMs: 9_000 })],
        BODY_IS_COPY,
        { inflation: 0.37 }
      )

      expect(partIn(pace, "intro")?.readers).toBe(9)
    })

    it("refuses an inflation that no rollup could produce", () => {
      for (const inflation of [-0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(paceOf(treeOf(PAGE), [], BODY_IS_COPY, { inflation }).inflation).toBe(0)
      }
    })
  })

  describe("the costing rate", () => {
    it("is the published one unless a deployment gives its own", () => {
      const counters = [tally("intro", { views: 10, reached: 10, dwellMs: 10 * 12_000 })]

      expect(paceOf(treeOf(PAGE), counters).wordsPerMinute).toBe(READING_WORDS_PER_MINUTE)
      expect(partIn(paceOf(treeOf(PAGE), counters), "intro")).toMatchObject({
        needMs: 25_000,
        standing: "skimmed",
      })

      /** Half the rate: the same hundred words now take fifty seconds. */
      const slower = paceOf(treeOf(PAGE), counters, BODY_IS_COPY, { wordsPerMinute: 120 })

      expect(partIn(slower, "intro")).toMatchObject({ needMs: 50_000, standing: "skimmed" })
      expect(slower.wordsPerMinute).toBe(120)
    })

    it("refuses a rate that is not a rate", () => {
      for (const wordsPerMinute of [0, -240, Number.NaN]) {
        expect(paceOf(treeOf(PAGE), [], BODY_IS_COPY, { wordsPerMinute }).wordsPerMinute).toBe(
          READING_WORDS_PER_MINUTE
        )
      }
    })
  })

  it("asks whether readers stayed longer than the words account for, without answering it", () => {
    const pace = paceOf(treeOf(PAGE), [
      tally("intro", { views: 10, reached: 10, dwellMs: 10 * 100_000 }),
    ])

    expect(partIn(pace, "intro")).toMatchObject({ pace: 4, standing: "lingered" })
  })

  describe("nothing here is added up", () => {
    it("has no page-wide word count, because a nested part's words are in its parent's", () => {
      const pace = paceOf(treeOf(PAGE), [
        tally("page", { views: 10, reached: 10, dwellMs: 10 * 50_000 }),
        tally("intro", { views: 10, reached: 10, dwellMs: 10 * 25_000 }),
        tally("pricing", { views: 10, reached: 10, dwellMs: 10 * 25_000 }),
      ])

      /**
       * Two hundred words are on the page and the parts hold four hundred
       * between them, which is exactly why no field adds them: the root's two
       * hundred are the two bands' hundreds counted a second time.
       */
      expect(pace.parts.reduce((total, part) => total + part.wordsWithin, 0)).toBe(400)
      expect(Object.keys(pace)).not.toContain("words")
      expect(Object.keys(pace)).not.toContain("wordsWithin")
      expect(Object.keys(pace)).not.toContain("wordsPassed")
    })

    it("holds every part of the page exactly once, judged or not", () => {
      const pace = paceOf(treeOf(PAGE), [
        tally("page", { views: 10, reached: 10, dwellMs: 10 * 5_000 }),
        tally("intro", { views: 10, reached: 10, dwellMs: 10 * 2_000 }),
      ])

      expect(pace.parts).toHaveLength(3)
      expect(new Set(pace.parts.map((part) => part.nodeId)).size).toBe(3)

      const counted = Object.values(pace.standings).reduce((total, count) => total + count, 0)

      expect(counted).toBe(pace.parts.length)
    })

    it("counts a reader who hurried past a band and the page it was in at both depths", () => {
      /**
       * The same ten readers are in the root's figure and the band's, which is
       * right for each row and wrong for any sum of them — so the ranking takes
       * the largest rather than the total, and the root is held out of it.
       */
      const pace = paceOf(treeOf(PAGE), [
        tally("page", { views: 10, reached: 10, dwellMs: 10 * 2_000 }),
        tally("intro", { views: 10, reached: 10, dwellMs: 10 * 1_000 }),
        tally("pricing", { views: 10, reached: 10, dwellMs: 10 * 1_000 }),
      ])

      expect(pace.standings.skimmed).toBe(3)
      expect(pace.whole?.wordsPassed).toBe(2_000)
      expect(pace.mostSkimmed?.wordsPassed).toBe(1_000)
    })
  })
})
