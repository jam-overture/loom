import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describePaceCause,
  describePaceChangeSilence,
  describePaceMovement,
  PACE_CAUSES,
  PACE_CHANGE_SILENCES,
  PACE_MOVEMENTS,
  paceChangeOf,
  pageReadingOf,
  READING_WORDS_PER_MINUTE,
  type PaceChange,
  type PaceChangeOptions,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Built on two readings rather than on two pace readings, because that is what
 * the function takes: two trees, two windows of rows and what the library has
 * declared go in one end, and what the change did to whether readers had time
 * comes out of the other.
 *
 * Every window below is written as readers times a per-reader time, so the
 * `spentMs` each case is about is the second number and nothing has to be
 * divided back out by eye.
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

const treeOf = (root: ElementNode, revision: number): LoomTree => ({
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

/** A half-declared library, which is what every real one is on the way to 0223. */
const DECLARED_FOR = (types: readonly string[]): PartDeclarations => ({
  copyFor: (type) => (types.includes(type) ? ["body"] : undefined),
  typesWithRole: () => [],
})

const tally = (
  name: string,
  revision: number,
  counters: Partial<ReaderTally> = {}
): ReaderTally => ({
  treeId: TREE,
  revision,
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

/** `n` words, which is nearly the only thing about the string these modules read. */
const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

/** What `count` words take a reader at the published rate. */
const takes = (count: number): number => (count / READING_WORDS_PER_MINUTE) * 60_000

const band = (name: string, count: number): ElementNode =>
  element(name, "loom.section", { body: words(count) })

/** A page whose root says nothing itself, so every word below belongs to a band. */
const pageOf = (revision: number, bands: readonly ElementNode[]): LoomTree =>
  treeOf(element("page", "loom.stack", {}, bands), revision)

type Window = {
  readonly tree: LoomTree
  readonly counters: readonly ReaderTally[]
  readonly declarations?: PartDeclarations
}

const changeOf = (was: Window, now: Window, options: PaceChangeOptions = {}): PaceChange =>
  paceChangeOf(
    pageReadingOf(was.tree, was.counters, was.declarations ?? BODY_IS_COPY),
    pageReadingOf(now.tree, now.counters, now.declarations ?? BODY_IS_COPY),
    options
  )

const partIn = (change: PaceChange, name: string) =>
  change.compared.find((part) => part.nodeId === nodeId(name))

/**
 * One reader, so every window below reads as the time one reader had.
 *
 * `views` is on the root's row because a page reading takes its view floor from
 * the largest row (0212) and a root is in the viewport of every view.
 */
const window = (
  revision: number,
  rows: readonly { readonly name: string; readonly spentMs: number }[]
): readonly ReaderTally[] =>
  rows.map(({ name, spentMs }) =>
    tally(name, revision, { views: 1, reached: 1, dwellMs: spentMs })
  )

describe("paceChangeOf", () => {
  describe("the move, and which side of the division made it", () => {
    /**
     * Two hundred words take fifty seconds and a hundred take twenty-five. The
     * reader gives the band twenty seconds in both windows, so nothing about
     * the reading changed and the verdict moved anyway — which is the figure a
     * single before-and-after pace would have reported as readers settling
     * down.
     */
    it("calls a band readers skimmed and now have time for eased, and names the words as the cause", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("pricing", 200)]),
          counters: window(1, [
            { name: "page", spentMs: 20_000 },
            { name: "pricing", spentMs: 20_000 },
          ]),
        },
        {
          tree: pageOf(2, [band("pricing", 100)]),
          counters: window(2, [
            { name: "page", spentMs: 20_000 },
            { name: "pricing", spentMs: 20_000 },
          ]),
        }
      )

      expect(partIn(change, "pricing")).toMatchObject({
        movement: "eased",
        cause: "words",
        timeRatio: 1,
        needRatio: 0.5,
        paceRatio: 2,
        was: { standing: "skimmed", pace: 0.4, needMs: takes(200) },
        now: { standing: "paced", pace: 0.8, needMs: takes(100) },
        ifWordsHeld: { pace: 0.4, standing: "skimmed" },
        ifTimeHeld: { pace: 0.8, standing: "paced" },
      })

      expect(change.silence).toBeNull()
      expect(change.mostEased?.nodeId).toBe(nodeId("pricing"))
    })

    it("names the readers as the cause where the change left the words alone", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("pricing", 100)]),
          counters: window(1, [
            { name: "page", spentMs: 10_000 },
            { name: "pricing", spentMs: 10_000 },
          ]),
        },
        {
          tree: pageOf(2, [band("pricing", 100)]),
          counters: window(2, [
            { name: "page", spentMs: 20_000 },
            { name: "pricing", spentMs: 20_000 },
          ]),
        }
      )

      expect(partIn(change, "pricing")).toMatchObject({
        movement: "eased",
        cause: "time",
        timeRatio: 2,
        needRatio: 1,
        paceRatio: 2,
        ifWordsHeld: { standing: "paced" },
        ifTimeHeld: { standing: "skimmed" },
      })
    })

    /**
     * Twelve seconds against the old fifty is a skim, twenty-four against the
     * new twenty-five is not, and **neither half of that gets there alone**:
     * the new words at the old reading time are 0.48, and the new reading time
     * against the old words is 0.48 as well.
     */
    it("says neither side would have moved it alone where only the two together did", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("pricing", 200)]),
          counters: window(1, [
            { name: "page", spentMs: 12_000 },
            { name: "pricing", spentMs: 12_000 },
          ]),
        },
        {
          tree: pageOf(2, [band("pricing", 100)]),
          counters: window(2, [
            { name: "page", spentMs: 24_000 },
            { name: "pricing", spentMs: 24_000 },
          ]),
        }
      )

      expect(partIn(change, "pricing")).toMatchObject({
        movement: "eased",
        cause: "together",
        ifWordsHeld: { pace: 0.48, standing: "skimmed" },
        ifTimeHeld: { pace: 0.48, standing: "skimmed" },
      })
    })

    it("says either would have moved it where each one does", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("pricing", 200)]),
          counters: window(1, [
            { name: "page", spentMs: 20_000 },
            { name: "pricing", spentMs: 20_000 },
          ]),
        },
        {
          tree: pageOf(2, [band("pricing", 100)]),
          counters: window(2, [
            { name: "page", spentMs: 30_000 },
            { name: "pricing", spentMs: 30_000 },
          ]),
        }
      )

      expect(partIn(change, "pricing")).toMatchObject({
        movement: "eased",
        cause: "either",
        ifWordsHeld: { pace: 0.6, standing: "paced" },
        ifTimeHeld: { pace: 0.8, standing: "paced" },
      })
    })

    it("calls a band readers had time for and now race through rushed", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("pricing", 100)]),
          counters: window(1, [
            { name: "page", spentMs: 20_000 },
            { name: "pricing", spentMs: 20_000 },
          ]),
        },
        {
          tree: pageOf(2, [band("pricing", 200)]),
          counters: window(2, [
            { name: "page", spentMs: 20_000 },
            { name: "pricing", spentMs: 20_000 },
          ]),
        }
      )

      expect(partIn(change, "pricing")).toMatchObject({
        movement: "rushed",
        cause: "words",
        needRatio: 2,
      })

      expect(change.mostRushed?.nodeId).toBe(nodeId("pricing"))
      expect(change.mostEased).toBeNull()
    })

    /**
     * The band carried a child of an undeclared type, so the earlier side's
     * words are a floor and the counterfactual that divides by them is a
     * question about words nobody counted. The verdicts either side stand —
     * `skimmed` survives a floor and `paced` is reached without one — and the
     * attribution does not.
     */
    it("leaves the cause unknown where either side's words are a floor", () => {
      const note = element("note", "loom.note", { body: words(40) })

      const change = changeOf(
        {
          tree: pageOf(1, [element("pricing", "loom.section", { body: words(100) }, [note])]),
          counters: window(1, [
            { name: "page", spentMs: 10_000 },
            { name: "pricing", spentMs: 10_000 },
          ]),
          declarations: DECLARED_FOR(["loom.section", "loom.stack"]),
        },
        {
          tree: pageOf(2, [band("pricing", 100)]),
          counters: window(2, [
            { name: "page", spentMs: 20_000 },
            { name: "pricing", spentMs: 20_000 },
          ]),
          declarations: DECLARED_FOR(["loom.section", "loom.stack"]),
        }
      )

      expect(partIn(change, "pricing")).toMatchObject({
        movement: "eased",
        cause: "unknown",
        was: { standing: "skimmed", floored: true },
        now: { standing: "paced", floored: false },
        ifWordsHeld: { standing: "unknown" },
      })

      /** Twice, because the root's subtree holds the floored note as well. */
      expect(change.causes).toMatchObject({ unknown: 2, words: 0, time: 0 })
    })

    it("publishes the two factors, and the pace moved by exactly their quotient", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("pricing", 300)]),
          counters: window(1, [
            { name: "page", spentMs: 30_000 },
            { name: "pricing", spentMs: 30_000 },
          ]),
        },
        {
          tree: pageOf(2, [band("pricing", 120)]),
          counters: window(2, [
            { name: "page", spentMs: 45_000 },
            { name: "pricing", spentMs: 45_000 },
          ]),
        }
      )

      const pricing = partIn(change, "pricing")

      expect(pricing?.timeRatio).toBe(1.5)
      expect(pricing?.needRatio).toBe(0.4)
      expect(pricing?.paceRatio).toBeCloseTo(1.5 / 0.4, 10)
    })
  })

  describe("what it refuses to add up", () => {
    /**
     * A band of a hundred words holding a paragraph of a hundred more, both of
     * them eased, with a root that eased as well. Three rows, five hundred
     * words between them if anything were ever summed, and the page asks for
     * two hundred.
     */
    const NESTED = {
      was: {
        tree: treeOf(
          element("page", "loom.stack", {}, [
            element("band", "loom.section", { body: words(100) }, [
              element("para", "loom.text", { body: words(100) }),
            ]),
          ]),
          1
        ),
        counters: window(1, [
          { name: "page", spentMs: 20_000 },
          { name: "band", spentMs: 20_000 },
          { name: "para", spentMs: 10_000 },
        ]),
      },
      now: {
        tree: treeOf(
          element("page", "loom.stack", {}, [
            element("band", "loom.section", { body: words(50) }, [
              element("para", "loom.text", { body: words(50) }),
            ]),
          ]),
          2
        ),
        counters: window(2, [
          { name: "page", spentMs: 20_000 },
          { name: "band", spentMs: 20_000 },
          { name: "para", spentMs: 10_000 },
        ]),
      },
    }

    it("counts a parent and its child as two parts and never adds their words or their time", () => {
      const change = changeOf(NESTED.was, NESTED.now)

      expect(change.movements).toMatchObject({ eased: 3 })

      /**
       * The guard against the double count this module could acquire quietly: a
       * page total of time or words taken over the parts charges one reader
       * once per level, so the page's figure is the root's row and the
       * subtraction is of two root figures.
       */
      expect(change.need).toEqual({
        was: takes(200),
        now: takes(100),
        change: takes(100) - takes(200),
      })

      expect(change.whole?.nodeId).toBe(nodeId("page"))
      expect(change.whole).toMatchObject({ movement: "eased" })
    })

    it("keeps the root out of every ranking, although by words passed it would win each one", () => {
      const change = changeOf(NESTED.was, NESTED.now)

      /** The root holds every word the band does, so the two tie and arrival order would give it away. */
      expect(change.whole?.now.wordsPassed).toBe(partIn(change, "band")?.now.wordsPassed)
      expect(change.mostEased?.nodeId).toBe(nodeId("band"))
    })

    it("files a part in the comparison or in the census and never in both", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 100), band("pricing", 100)]),
          counters: window(1, [
            { name: "page", spentMs: 20_000 },
            { name: "intro", spentMs: 20_000 },
            { name: "pricing", spentMs: 2_000 },
          ]),
        },
        {
          tree: pageOf(2, [band("intro", 100), band("extra", 100)]),
          counters: window(2, [
            { name: "page", spentMs: 20_000 },
            { name: "intro", spentMs: 20_000 },
            { name: "extra", spentMs: 2_000 },
          ]),
        }
      )

      const compared = change.compared.map((part) => part.nodeId)
      const census = [...change.added, ...change.removed].map((part) => part.nodeId)

      expect(compared).toEqual([nodeId("page"), nodeId("intro")])
      expect(change.added.map((part) => part.nodeId)).toEqual([nodeId("extra")])
      expect(change.removed.map((part) => part.nodeId)).toEqual([nodeId("pricing")])
      expect(compared.filter((id) => census.includes(id))).toEqual([])

      const movements = PACE_MOVEMENTS.reduce(
        (total, movement) => total + change.movements[movement],
        0
      )

      expect(movements).toBe(change.compared.length)
    })

    it("counts a cause for every verdict that moved and for no other part", () => {
      const change = changeOf(NESTED.was, NESTED.now)

      const causes = PACE_CAUSES.reduce((total, cause) => total + change.causes[cause], 0)

      expect(causes).toBe(change.movements.eased + change.movements.rushed)
      expect(change.compared.filter((part) => part.cause !== null)).toHaveLength(causes)
    })
  })

  describe("the parts a change did not reach", () => {
    it("ranks the bands readers skimmed before and skim now by the words they were shown", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 100), band("pricing", 300)]),
          counters: [
            ...window(1, [{ name: "page", spentMs: 2_000 }]),
            tally("intro", 1, { views: 10, reached: 10, dwellMs: 10 * 2_000 }),
            tally("pricing", 1, { views: 10, reached: 10, dwellMs: 10 * 2_000 }),
          ],
        },
        {
          tree: pageOf(2, [band("intro", 100), band("pricing", 300)]),
          counters: [
            ...window(2, [{ name: "page", spentMs: 2_000 }]),
            tally("intro", 2, { views: 10, reached: 10, dwellMs: 10 * 2_000 }),
            tally("pricing", 2, { views: 10, reached: 10, dwellMs: 10 * 2_000 }),
          ],
        }
      )

      expect(change.stillSkimmed.map((part) => part.nodeId)).toEqual([
        nodeId("pricing"),
        nodeId("intro"),
      ])

      expect(change.movements).toMatchObject({ "still-skimmed": 3, eased: 0, rushed: 0 })
      expect(change.causes).toMatchObject({ words: 0, time: 0, either: 0, together: 0, unknown: 0 })
    })

    it("leaves a part nobody reached out of the list and in the count", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("pricing", 100)]),
          counters: window(1, [{ name: "page", spentMs: 2_000 }]),
        },
        {
          tree: pageOf(2, [band("pricing", 100)]),
          counters: window(2, [{ name: "page", spentMs: 2_000 }]),
        }
      )

      expect(partIn(change, "pricing")).toMatchObject({
        movement: "unknown",
        cause: null,
        was: { silence: "unreached" },
        now: { silence: "unreached" },
      })

      expect(change.stillSkimmed).toEqual([])
      expect(change.movements).toMatchObject({ unknown: 1, "still-skimmed": 1 })
    })
  })

  describe("what it leaves alone", () => {
    it("reports no movement at all between two readings of one window", () => {
      const counters = window(1, [
        { name: "page", spentMs: 20_000 },
        { name: "intro", spentMs: 20_000 },
        { name: "pricing", spentMs: 2_000 },
      ])

      const reading = pageReadingOf(
        pageOf(1, [band("intro", 100), band("pricing", 100)]),
        counters,
        BODY_IS_COPY
      )

      const change = paceChangeOf(reading, reading)

      expect(change.movements).toMatchObject({ eased: 0, rushed: 0 })
      expect(change.need).toEqual({ was: takes(200), now: takes(200), change: 0 })

      for (const part of change.compared) {
        expect(part.paceRatio).toBe(1)
        expect(part.timeRatio).toBe(1)
        expect(part.needRatio).toBe(1)
        expect(part.cause).toBeNull()
      }
    })

    /**
     * Nothing here reads a depth, an index or a parent, so a band dragged to
     * the top of the page is the same band. The rows arrive in the later
     * reading order, because that is the page somebody is looking at.
     */
    it("compares a part the change moved like any other, in the later reading order", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 100), band("pricing", 100)]),
          counters: window(1, [
            { name: "page", spentMs: 40_000 },
            { name: "intro", spentMs: 20_000 },
            { name: "pricing", spentMs: 10_000 },
          ]),
        },
        {
          tree: pageOf(2, [band("pricing", 100), band("intro", 100)]),
          counters: window(2, [
            { name: "page", spentMs: 40_000 },
            { name: "intro", spentMs: 20_000 },
            { name: "pricing", spentMs: 20_000 },
          ]),
        }
      )

      expect(change.compared.map((part) => part.nodeId)).toEqual([
        nodeId("page"),
        nodeId("pricing"),
        nodeId("intro"),
      ])

      expect(partIn(change, "pricing")).toMatchObject({ movement: "eased", cause: "time" })
      expect(partIn(change, "intro")).toMatchObject({ movement: "held", cause: null })
    })

    it("leaves out a part that says nothing on either side and hides nothing", () => {
      const spacer = element("spacer", "loom.rule")

      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 100), spacer]),
          counters: window(1, [
            { name: "page", spentMs: 20_000 },
            { name: "intro", spentMs: 20_000 },
            { name: "spacer", spentMs: 20_000 },
          ]),
        },
        {
          tree: pageOf(2, [band("intro", 100), spacer]),
          counters: window(2, [
            { name: "page", spentMs: 20_000 },
            { name: "intro", spentMs: 20_000 },
            { name: "spacer", spentMs: 20_000 },
          ]),
        }
      )

      expect(change.compared.map((part) => part.nodeId)).toEqual([
        nodeId("page"),
        nodeId("intro"),
      ])
    })
  })

  describe("how the two sides are read", () => {
    it("costs both sides at one rate, so no ratio here is a comparison of two rates", () => {
      const was: Window = {
        tree: pageOf(1, [band("pricing", 100)]),
        counters: window(1, [
          { name: "page", spentMs: 10_000 },
          { name: "pricing", spentMs: 10_000 },
        ]),
      }

      const now: Window = {
        tree: pageOf(2, [band("pricing", 100)]),
        counters: window(2, [
          { name: "page", spentMs: 10_000 },
          { name: "pricing", spentMs: 10_000 },
        ]),
      }

      const slow = changeOf(was, now, { wordsPerMinute: 120 })

      expect(slow.wordsPerMinute).toBe(120)
      expect(slow.readings.was.wordsPerMinute).toBe(120)
      expect(slow.readings.now.wordsPerMinute).toBe(120)
      expect(partIn(slow, "pricing")).toMatchObject({ movement: "still-skimmed", paceRatio: 1 })

      /** A rate no reader could have is refused on both sides at once, as `pace.ts` refuses it. */
      expect(changeOf(was, now, { wordsPerMinute: 0 }).wordsPerMinute).toBe(
        READING_WORDS_PER_MINUTE
      )
    })

    /**
     * The straddle is a fact about one window (0219), so a deployment that
     * shortened its rollup window between the two has two corrections and not
     * one — and handing the later one to both sides would report the readers of
     * the earlier window as having been quicker than they were.
     */
    it("takes a straddle correction per window, and the later one does not reach the earlier side", () => {
      const was: Window = {
        tree: pageOf(1, [band("pricing", 100)]),
        counters: window(1, [
          { name: "page", spentMs: 10_000 },
          { name: "pricing", spentMs: 10_000 },
        ]),
      }

      const now: Window = {
        tree: pageOf(2, [band("pricing", 100)]),
        counters: window(2, [
          { name: "page", spentMs: 10_000 },
          { name: "pricing", spentMs: 10_000 },
        ]),
      }

      const change = changeOf(was, now, { inflation: { now: 1 } })

      expect(change.inflation).toEqual({ was: 0, now: 1 })
      expect(partIn(change, "pricing")).toMatchObject({
        was: { spentMs: 10_000, standing: "skimmed" },
        now: { spentMs: 20_000, standing: "paced" },
        movement: "eased",
        cause: "time",
      })

      /** A correction no rollup can produce is no correction, which `pace.ts` already holds. */
      expect(changeOf(was, now, { inflation: { was: -1, now: Number.NaN } }).inflation).toEqual({
        was: 0,
        now: 0,
      })
    })
  })

  describe("what it withholds, and what it keeps anyway", () => {
    it("answers nothing about two different pages", () => {
      const change = paceChangeOf(
        pageReadingOf(
          pageOf(1, [band("pricing", 100)]),
          window(1, [{ name: "page", spentMs: 10_000 }]),
          BODY_IS_COPY
        ),
        pageReadingOf(
          { ...pageOf(2, [band("pricing", 100)]), treeId: OTHER_TREE },
          [],
          BODY_IS_COPY
        )
      )

      expect(change.silence).toBe("different-trees")
      expect(change.compared).toEqual([])
      expect(change.added).toEqual([])
      expect(change.removed).toEqual([])
      expect(change.need).toBeNull()
      expect(change.whole).toBeNull()
    })

    /**
     * The word side of the division has no reader in it, so what the change did
     * to the time the page asks for is answerable in a window nobody opened —
     * which is the half `copy-change.ts` keeps for the same reason.
     */
    it("says what the change did to the time the page asks for when one window held no views", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("pricing", 200)]),
          counters: window(1, [
            { name: "page", spentMs: 20_000 },
            { name: "pricing", spentMs: 20_000 },
          ]),
        },
        { tree: pageOf(2, [band("pricing", 100)]), counters: [] }
      )

      expect(change.silence).toBe("nothing-measured")
      expect(change.need).toEqual({
        was: takes(200),
        now: takes(100),
        change: takes(100) - takes(200),
      })

      expect(partIn(change, "pricing")).toMatchObject({
        movement: "unknown",
        cause: null,
        needRatio: 0.5,
        now: { silence: "unreached" },
      })
    })

    it("says nothing of two revisions that say nothing", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [element("spacer", "loom.rule")]),
          counters: window(1, [{ name: "page", spentMs: 10_000 }]),
        },
        {
          tree: pageOf(2, [element("spacer", "loom.rule")]),
          counters: window(2, [{ name: "page", spentMs: 10_000 }]),
        }
      )

      expect(change.silence).toBe("wordless")
      expect(change.compared).toEqual([])
    })

    it("says a page that kept no part of itself has nothing to compare, and still counts both censuses", () => {
      const change = changeOf(
        {
          tree: treeOf(element("before", "loom.stack", { body: words(100) }), 1),
          counters: [tally("before", 1, { views: 1, reached: 1, dwellMs: 10_000 })],
        },
        {
          tree: treeOf(element("after", "loom.stack", { body: words(50) }), 2),
          counters: [tally("after", 2, { views: 1, reached: 1, dwellMs: 10_000 })],
        }
      )

      expect(change.silence).toBe("dissolved")
      expect(change.compared).toEqual([])
      expect(change.added.map((part) => part.nodeId)).toEqual([nodeId("after")])
      expect(change.removed.map((part) => part.nodeId)).toEqual([nodeId("before")])
      expect(change.need).toBeNull()
    })

    it("says what a change wrote with the window that saw it, which is not an exact census", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 100)]),
          counters: window(1, [
            { name: "page", spentMs: 20_000 },
            { name: "intro", spentMs: 20_000 },
          ]),
        },
        {
          tree: pageOf(2, [band("intro", 100), band("extra", 100)]),
          counters: window(2, [
            { name: "page", spentMs: 20_000 },
            { name: "intro", spentMs: 20_000 },
            { name: "extra", spentMs: 2_000 },
          ]),
        }
      )

      expect(change.added).toHaveLength(1)
      expect(change.added[0]).toMatchObject({
        nodeId: nodeId("extra"),
        standing: "skimmed",
        wordsWithin: 100,
      })
    })
  })

  describe("the vocabularies it publishes", () => {
    it("describes every movement, cause and silence, and never twice the same way", () => {
      const lines = [
        ...PACE_MOVEMENTS.map(describePaceMovement),
        ...PACE_CAUSES.map(describePaceCause),
        ...PACE_CHANGE_SILENCES.map(describePaceChangeSilence),
      ]

      for (const line of lines) expect(line.length).toBeGreaterThan(0)

      expect(new Set(lines).size).toBe(lines.length)
    })
  })
})
