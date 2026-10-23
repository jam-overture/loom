import { describe, expect, it } from "vitest"

import type { AudienceId } from "../audience/audience.js"
import type { JsonObject } from "../json.js"
import {
  nodeId,
  OTHER_TREE,
  primitiveType,
  RIDERS,
  SKIERS,
  TREE,
} from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeFormCopySilence,
  formCopyComparisonOf,
  FORM_COPY_SILENCES,
  pageReadingOf,
  type ComparedFormPassage,
  type FormCopyComparison,
  type PartDeclarations,
  type ReaderTally,
  type RewordedFormPassage,
} from "./index.js"

/**
 * Two forms of one page, built the way a deployment serving two audiences has
 * them: one tree id, one revision, two windows of counters told apart by the
 * column the store writes (0284), and two composed roots that say different
 * things because a form is a base tree plus the deltas an audience earns
 * (0263).
 *
 * `aud_riders` sorts below `aud_skiers`, so the riders are always `one` and the
 * skiers always `other` however the two are handed in — which is the pairing
 * rule this reading imports rather than restates (0302, 0303).
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

/** `n` words, which is nearly the only thing about the string these modules read. */
const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

/** A band saying `count` words of its own, under a root that says none. */
const band = (name: string, count: number): ElementNode =>
  element(name, "loom.section", { body: words(count) })

const treeOf = (
  bands: readonly ElementNode[],
  revision = 7,
  treeId = TREE
): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root: element("page", "loom.stack", {}, bands),
})

/** Every type declares `body` as copy, which is the library of 0223 in miniature. */
const BODY_IS_COPY: PartDeclarations = {
  copyFor: () => ["body"],
  typesWithRole: () => [],
}

/**
 * Only `loom.section` has declared which of its props are copy, which is what
 * every real library is on the way to declaring all of (0122, 0223).
 *
 * A `loom.card` holding a `body` therefore says words nothing here can see: its
 * passage is kept, counted as floored, and its visible word count is nought.
 */
const SECTIONS_DECLARE_COPY: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: () => [],
}

const tally = (
  name: string,
  audienceId: AudienceId | undefined,
  counters: Partial<ReaderTally> = {},
  revision = 7
): ReaderTally & { readonly audienceId?: AudienceId } => ({
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
  ...(audienceId === undefined ? {} : { audienceId }),
  ...counters,
})

/** What one node's window says: the readers who reported it coming into view. */
type Row = { readonly reached: number; readonly views?: number }

const windowOf = (
  audience: AudienceId | undefined,
  views: number,
  rows: Readonly<Record<string, Row>>,
  revision = 7
): readonly (ReaderTally & { readonly audienceId?: AudienceId })[] =>
  Object.entries(rows).map(([name, row]) =>
    tally(name, audience, { views: row.views ?? views, reached: row.reached }, revision)
  )

const formOf = (
  audience: AudienceId | undefined,
  views: number,
  rows: Readonly<Record<string, Row>>,
  bands: readonly ElementNode[],
  declarations: PartDeclarations = BODY_IS_COPY,
  revision = 7,
  treeId = TREE
) =>
  pageReadingOf(
    treeOf(bands, revision, treeId),
    windowOf(audience, views, rows, revision).map((row) => ({ ...row, treeId })),
    declarations
  )

const passage = (
  comparison: FormCopyComparison,
  name: string
): ComparedFormPassage | undefined =>
  comparison.compared.find((compared) => compared.nodeId === nodeId(name))

const rewording = (
  comparison: FormCopyComparison,
  name: string
): RewordedFormPassage | undefined =>
  comparison.reworded.find((compared) => compared.nodeId === nodeId(name))

/**
 * Three bands the two forms say identically — ten, twenty and twenty-five
 * words — one the deltas reworded, and one the skiers alone have.
 *
 * The two directions are deliberately opposite: nine in ten skiers reach the
 * intro against half the riders, and half the riders reach the footer against
 * one in ten skiers. A page figure that were the sum of the rows could not tell
 * that apart from both of them favouring one form.
 */
const RIDER_BANDS = [band("intro", 10), band("pricing", 30), band("footer", 20), band("legal", 25)]

const SKIER_BANDS = [
  band("intro", 10),
  band("pricing", 90),
  band("footer", 20),
  band("legal", 25),
  band("bonus", 40),
]

/**
 * No row names `legal` in either window, so it is `skipped` in both: the window
 * held views and nothing reported that passage coming into view. A row that
 * names a part and reports a `reached` of nought is `unknown` instead, which is
 * the distinction every withheld figure below turns on (`parts.ts`).
 */
const RIDER_WINDOW: Readonly<Record<string, Row>> = {
  page: { reached: 100 },
  intro: { reached: 50 },
  pricing: { reached: 40 },
  footer: { reached: 50 },
}

const SKIER_WINDOW: Readonly<Record<string, Row>> = {
  page: { reached: 1000 },
  intro: { reached: 900 },
  pricing: { reached: 400 },
  footer: { reached: 100 },
}

const riders = (
  rows: Readonly<Record<string, Row>> = RIDER_WINDOW,
  bands: readonly ElementNode[] = RIDER_BANDS,
  declarations: PartDeclarations = BODY_IS_COPY
) => formOf(RIDERS, 100, rows, bands, declarations)

const skiers = (
  rows: Readonly<Record<string, Row>> = SKIER_WINDOW,
  bands: readonly ElementNode[] = SKIER_BANDS,
  declarations: PartDeclarations = BODY_IS_COPY
) => formOf(SKIERS, 1000, rows, bands, declarations)

const COMPARISON = formCopyComparisonOf(riders(), skiers())

describe("what two forms of one page say, and how much of each gets read", () => {
  describe("the census, which has no reader in it", () => {
    it("counts the words both forms say the same way, once", () => {
      expect(COMPARISON.says.shared).toBe(55)
      expect(COMPARISON.compared.map((shared) => shared.nodeId)).toEqual([
        nodeId("intro"),
        nodeId("footer"),
        nodeId("legal"),
      ])
    })

    it("accounts for every word each form says, so the census is one and not three lists", () => {
      expect(COMPARISON.one.words).toBe(85)
      expect(COMPARISON.other.words).toBe(185)
      expect(COMPARISON.says.shared + COMPARISON.says.only.one + COMPARISON.says.reworded.one).toBe(
        COMPARISON.one.words
      )
      expect(
        COMPARISON.says.shared + COMPARISON.says.only.other + COMPARISON.says.reworded.other
      ).toBe(COMPARISON.other.words)
    })

    /** The sentence this whole reading was asked for. */
    it("names the form that says more words where the two word a shared node differently", () => {
      expect(COMPARISON.says.reworded).toEqual({ one: 30, other: 90 })
      expect(rewording(COMPARISON, "pricing")?.words).toEqual({ one: 30, other: 90 })
      expect(rewording(COMPARISON, "pricing")?.wordier).toBe(SKIERS)
    })

    it("leaves a reworded passage no gap, because a word-weighted figure needs one word count", () => {
      expect(rewording(COMPARISON, "pricing")).not.toHaveProperty("gap")
      expect(rewording(COMPARISON, "pricing")?.one.reach).toBeCloseTo(0.4)
      expect(rewording(COMPARISON, "pricing")?.other.reach).toBeCloseTo(0.4)
    })

    it("says nothing is wordier where two forms word a node differently in as many words", () => {
      const comparison = formCopyComparisonOf(
        riders(RIDER_WINDOW, [band("intro", 10), element("pricing", "loom.section", { body: "a b c" })]),
        skiers(SKIER_WINDOW, [band("intro", 10), element("pricing", "loom.section", { body: "x y z" })])
      )

      expect(rewording(comparison, "pricing")?.words).toEqual({ one: 3, other: 3 })
      expect(rewording(comparison, "pricing")?.wordier).toBeNull()
    })

    it("files a passage only one form has against that form, with what its own window said", () => {
      expect(COMPARISON.onlyIn.map((only) => only.nodeId)).toEqual([nodeId("bonus")])
      expect(COMPARISON.onlyIn[0]?.audienceId).toBe(SKIERS)
      expect(COMPARISON.says.only).toEqual({ one: 0, other: 40 })
      expect(COMPARISON.says.onlyByStanding.other).toEqual({ read: 0, skipped: 40, unknown: 0 })
      expect(COMPARISON.says.onlyByStanding.one).toEqual({ read: 0, skipped: 0, unknown: 0 })
    })

    /**
     * A node both forms have whose copy one form's deltas emptied is a word a
     * form stopped saying, not a part only one form has — which is why the
     * passages are taken over every part rather than over each reading's own.
     */
    it("reads an emptied band as a rewording and not as a band one form lacks", () => {
      const comparison = formCopyComparisonOf(
        riders(RIDER_WINDOW, [band("intro", 10), element("footer", "loom.section")]),
        skiers(SKIER_WINDOW, [band("intro", 10), band("footer", 20)])
      )

      expect(comparison.onlyIn).toEqual([])
      expect(rewording(comparison, "footer")?.words).toEqual({ one: 0, other: 20 })
      expect(rewording(comparison, "footer")?.wordier).toBe(SKIERS)
    })

    it("names a shared node the two forms give different types, and compares it anyway", () => {
      const comparison = formCopyComparisonOf(
        riders(RIDER_WINDOW, [element("intro", "loom.card", { body: words(10) })]),
        skiers(SKIER_WINDOW, [band("intro", 10)])
      )

      expect(comparison.disagreed).toEqual([nodeId("intro")])
      expect(passage(comparison, "intro")?.gap).toBeCloseTo(4)
    })
  })

  describe("the figure", () => {
    it("weights each form's own share of its own readers by the words the passage says", () => {
      expect(passage(COMPARISON, "intro")?.one.reach).toBeCloseTo(0.5)
      expect(passage(COMPARISON, "intro")?.other.reach).toBeCloseTo(0.9)
      expect(passage(COMPARISON, "intro")?.gap).toBeCloseTo(4)
      expect(passage(COMPARISON, "intro")?.favours).toBe(SKIERS)
    })

    it("never signs the gap, and puts the direction in the form it names", () => {
      expect(passage(COMPARISON, "footer")?.gap).toBeCloseTo(8)
      expect(passage(COMPARISON, "footer")?.favours).toBe(RIDERS)
    })

    it("calls two forms alike where the same share of each reached a passage", () => {
      expect(passage(COMPARISON, "legal")?.gap).toBe(0)
      expect(passage(COMPARISON, "legal")?.favours).toBeNull()
    })

    it("counts the shared passages and the words they say, falling the same way", () => {
      expect(COMPARISON.counted).toEqual({ one: 1, other: 1, alike: 1, unknown: 0 })
      expect(COMPARISON.wordsCounted).toEqual({ one: 20, other: 10, alike: 25, unknown: 0 })
      expect(
        COMPARISON.wordsCounted.one +
          COMPARISON.wordsCounted.other +
          COMPARISON.wordsCounted.alike +
          COMPARISON.wordsCounted.unknown
      ).toBe(COMPARISON.says.shared)
    })

    /**
     * 0282's rule said of a passage: a reach of nought that is a missing
     * counter is not a reader who did not arrive, so there is nothing to
     * subtract against.
     */
    it("withholds the gap where one form's window cannot speak for the passage", () => {
      const comparison = formCopyComparisonOf(
        riders({ ...RIDER_WINDOW, legal: { reached: 100 } }),
        skiers({ ...SKIER_WINDOW, legal: { reached: 0 } })
      )

      expect(passage(comparison, "legal")?.one.standing).toBe("read")
      expect(passage(comparison, "legal")?.other.standing).toBe("unknown")
      expect(passage(comparison, "legal")?.gap).toBeNull()
      expect(passage(comparison, "legal")?.favours).toBeNull()
      expect(comparison.counted.unknown).toBe(1)
      expect(comparison.wordsCounted.unknown).toBe(25)
      expect(comparison.silence).toBeNull()
    })

    it("withholds every gap where one window held no views at all", () => {
      const comparison = formCopyComparisonOf(riders(), skiers({ page: { reached: 0, views: 0 } }))

      expect(comparison.compared.every((shared) => shared.gap === null)).toBe(true)
      expect(comparison.counted.unknown).toBe(3)
    })
  })

  describe("a word count that is a floor", () => {
    /**
     * A page that is half declared, which is the state a real library is in:
     * the intro's words are visible and the aside's are a floor of nought.
     */
    const FLOORED = [band("intro", 10), element("aside", "loom.card", { body: words(15) })]

    const flooredPair = () =>
      formCopyComparisonOf(
        riders({ page: { reached: 100 }, intro: { reached: 50 }, aside: { reached: 50 } }, FLOORED, SECTIONS_DECLARE_COPY),
        skiers({ page: { reached: 1000 }, intro: { reached: 900 }, aside: { reached: 100 } }, FLOORED, SECTIONS_DECLARE_COPY)
      )

    /**
     * The one departure from the two sibling comparisons: a reach is exact
     * where a word count is not (0122), so a passage hiding all of its words
     * has a gap of nought and a direction that is still a measurement.
     */
    it("names the form a floored passage favours even where its gap is nought", () => {
      const comparison = flooredPair()

      expect(passage(comparison, "aside")?.floored).toBe(true)
      expect(passage(comparison, "aside")?.words).toBe(0)
      expect(passage(comparison, "aside")?.gap).toBe(0)
      expect(passage(comparison, "aside")?.favours).toBe(RIDERS)
    })

    /**
     * The census follows the direction and not the magnitude, so a passage
     * whose words are all hidden is one of the rows a form is ahead on rather
     * than a row the two forms read alike.
     */
    it("files a floored passage under the form it favours, not under alike", () => {
      const comparison = flooredPair()

      expect(comparison.counted).toEqual({ one: 1, other: 1, alike: 0, unknown: 0 })
      expect(comparison.wordsCounted).toEqual({ one: 0, other: 10, alike: 0, unknown: 0 })
    })

    it("withholds the page figures under a floor and leaves every row standing", () => {
      const comparison = flooredPair()

      expect(comparison.silence).toBe("floored")
      expect(comparison.floored).toBe(1)
      expect(comparison.typical).toBeNull()
      expect(comparison.sharpest?.nodeId).toBe(nodeId("intro"))
      expect(passage(comparison, "intro")?.gap).toBeCloseTo(4)
    })

    /**
     * A declared prop holding something that is not a string for one audience
     * and nothing for the other (0122): the visible words are the same on both
     * sides, and what is hidden qualifies the figure for both.
     */
    it("counts a passage floored in one form only, because what it hides qualifies both", () => {
      const declared: PartDeclarations = {
        copyFor: () => ["body", "label"],
        typesWithRole: () => [],
      }
      const comparison = formCopyComparisonOf(
        riders(
          { page: { reached: 100 }, intro: { reached: 50 } },
          [element("intro", "loom.section", { body: words(10), label: 3 })],
          declared
        ),
        skiers({ page: { reached: 1000 }, intro: { reached: 900 } }, [band("intro", 10)], declared)
      )

      expect(passage(comparison, "intro")?.words).toBe(10)
      expect(passage(comparison, "intro")?.floored).toBe(true)
      expect(comparison.floored).toBe(1)
      expect(comparison.silence).toBe("floored")
    })
  })

  describe("the page, which is a third argument and not either sibling's", () => {
    it("gives each form the shared words its own average reader got to", () => {
      expect(COMPARISON.typical?.one).toBeCloseTo(15)
      expect(COMPARISON.typical?.other).toBeCloseTo(11)
      expect(COMPARISON.typical?.gap).toBeCloseTo(4)
      expect(COMPARISON.typical?.favours).toBe(RIDERS)
    })

    /**
     * The row gaps are unsigned, so two passages favouring opposite forms add
     * there and cancel here. A screen that summed the rows and called it the
     * page would report twelve where the page is four.
     */
    it("is not the sum of the rows' gaps, and the fixture reaches both directions", () => {
      const rows = COMPARISON.compared.reduce((total, shared) => total + (shared.gap ?? 0), 0)

      expect(rows).toBeCloseTo(12)
      expect(COMPARISON.typical?.gap).toBeCloseTo(4)
      expect(new Set(COMPARISON.compared.map((shared) => shared.favours))).toEqual(
        new Set([SKIERS, RIDERS, null])
      )
    })

    /** One set of passages, so the two means are of the same words (0282). */
    it("leaves a passage one side cannot speak for out of both means", () => {
      const comparison = formCopyComparisonOf(
        riders({ ...RIDER_WINDOW, legal: { reached: 100 } }),
        skiers({ ...SKIER_WINDOW, legal: { reached: 0 } })
      )

      expect(comparison.typical?.one).toBeCloseTo(15)
      expect(comparison.typical?.other).toBeCloseTo(11)
    })
  })

  describe("the rankings", () => {
    it("ranks the shared passage the two forms read most differently, by words and readers", () => {
      expect(COMPARISON.sharpest?.nodeId).toBe(nodeId("footer"))
    })

    it("takes the lower node id where two passages are read as differently", () => {
      const comparison = formCopyComparisonOf(
        riders({ page: { reached: 100 }, alpha: { reached: 50 }, beta: { reached: 50 } }, [
          band("alpha", 10),
          band("beta", 10),
        ]),
        skiers({ page: { reached: 1000 }, alpha: { reached: 900 }, beta: { reached: 900 } }, [
          band("alpha", 10),
          band("beta", 10),
        ])
      )

      expect(comparison.sharpest?.nodeId).toBe(nodeId("alpha"))
    })

    it("lists the shared passages neither form's readers reached, most words first", () => {
      const unread = [band("intro", 10), band("legal", 25)]
      const comparison = formCopyComparisonOf(
        riders({ page: { reached: 100 } }, unread),
        skiers({ page: { reached: 1000 } }, unread)
      )

      expect(comparison.unseenByEither.map((unseen) => unseen.nodeId)).toEqual([
        nodeId("legal"),
        nodeId("intro"),
      ])
    })

    /**
     * Putting an `unknown` passage here would turn *nothing can be said* into
     * *nobody read this*, which is the one direction a reading of a quiet
     * window must not be wrong in (0212).
     */
    it("leaves a passage one side cannot speak for out of the unseen list", () => {
      const comparison = formCopyComparisonOf(
        riders({ page: { reached: 100 } }, [band("intro", 10)]),
        skiers({ page: { reached: 1000 }, intro: { reached: 0 } }, [band("intro", 10)])
      )

      expect(passage(comparison, "intro")?.one.standing).toBe("skipped")
      expect(passage(comparison, "intro")?.other.standing).toBe("unknown")
      expect(comparison.unseenByEither).toEqual([])
    })

    it("leaves a passage neither window reports reach for out of the unseen list", () => {
      const comparison = formCopyComparisonOf(
        riders({ page: { reached: 100 }, intro: { reached: 0 } }, [band("intro", 10)]),
        skiers({ page: { reached: 1000 }, intro: { reached: 0 } }, [band("intro", 10)])
      )

      expect(passage(comparison, "intro")?.one.standing).toBe("unknown")
      expect(passage(comparison, "intro")?.other.standing).toBe("unknown")
      expect(comparison.unseenByEither).toEqual([])
      expect(comparison.silence).toBe("unspoken")
    })
  })

  describe("the pair", () => {
    it("answers the same whichever way round the two forms are handed in", () => {
      expect(formCopyComparisonOf(skiers(), riders())).toEqual(
        formCopyComparisonOf(riders(), skiers())
      )
    })

    it("puts the lower audience id first, whatever the argument order", () => {
      expect(COMPARISON.one.audienceId).toBe(RIDERS)
      expect(COMPARISON.other.audienceId).toBe(SKIERS)
      expect(formCopyComparisonOf(skiers(), riders()).one.audienceId).toBe(RIDERS)
    })

    it("carries each side's own window and its own copy reading through", () => {
      expect(COMPARISON.one.views).toBe(100)
      expect(COMPARISON.other.views).toBe(1000)
      expect(COMPARISON.one.passages).toBe(4)
      expect(COMPARISON.other.passages).toBe(5)
      expect(COMPARISON.readings.one.words).toBe(85)
      expect(COMPARISON.readings.other.share).not.toBeUndefined()
    })

    it("refuses two pages before anything about populations", () => {
      const comparison = formCopyComparisonOf(
        riders(),
        formOf(SKIERS, 1000, SKIER_WINDOW, SKIER_BANDS, BODY_IS_COPY, 7, OTHER_TREE)
      )

      expect(comparison.silence).toBe("different-pages")
      expect(comparison.compared).toEqual([])
      expect(comparison.says.shared).toBe(0)
    })

    it("refuses a window holding two forms with neither asked for, before an unlabelled side", () => {
      const unsplit = pageReadingOf(
        treeOf(RIDER_BANDS),
        [...windowOf(RIDERS, 100, RIDER_WINDOW), ...windowOf(SKIERS, 1000, { page: { reached: 1000 } })],
        BODY_IS_COPY
      )

      expect(
        formCopyComparisonOf(unsplit, formOf(undefined, 1000, SKIER_WINDOW, SKIER_BANDS)).silence
      ).toBe("unsplit")
    })

    it("refuses a side that names no audience, because the population is the question", () => {
      expect(
        formCopyComparisonOf(riders(), formOf(undefined, 1000, SKIER_WINDOW, SKIER_BANDS)).silence
      ).toBe("unattributed")
    })

    it("refuses one audience handed in twice, and sends that caller to a before-and-after", () => {
      expect(
        formCopyComparisonOf(riders(), formOf(RIDERS, 1000, SKIER_WINDOW, SKIER_BANDS)).silence
      ).toBe("one-population")
    })

    it("refuses two revisions, after the three population states", () => {
      expect(
        formCopyComparisonOf(
          riders(),
          formOf(SKIERS, 1000, SKIER_WINDOW, SKIER_BANDS, BODY_IS_COPY, 8)
        ).silence
      ).toBe("different-revisions")
    })
  })

  describe("the states in which there is no reader figure", () => {
    it("reports a wordless pair before an empty window, because a page saying nothing survives the fix", () => {
      const silent = [element("intro", "loom.section"), element("footer", "loom.section")]
      const comparison = formCopyComparisonOf(
        formOf(RIDERS, 0, { page: { reached: 0, views: 0 } }, silent),
        formOf(SKIERS, 1000, SKIER_WINDOW, silent)
      )

      expect(comparison.silence).toBe("wordless")
      expect(comparison.one.views).toBe(0)
      expect(comparison.typical).toBeNull()
    })

    it("reports an empty window before the states it causes, and answers the census anyway", () => {
      const comparison = formCopyComparisonOf(riders(), skiers({ page: { reached: 0, views: 0 } }))

      expect(comparison.silence).toBe("nothing-measured")
      expect(comparison.says.shared).toBe(55)
      expect(comparison.says.reworded).toEqual({ one: 30, other: 90 })
      expect(comparison.compared.every((shared) => shared.other.standing === "unknown")).toBe(true)
      expect(comparison.typical).toBeNull()
    })

    it("reports a passage with more readers than its form has views", () => {
      const comparison = formCopyComparisonOf(
        riders({ ...RIDER_WINDOW, intro: { reached: 500 } }),
        skiers()
      )

      expect(comparison.silence).toBe("inconsistent")
      expect(passage(comparison, "intro")?.one.reach).toBeCloseTo(5)
      expect(comparison.typical).toBeNull()
    })

    /**
     * Two forms that share a tree and no sentence are two pages the deltas
     * made, and that is the answer rather than a silence about readers. It
     * implies the state below it, so the order is not reading order.
     */
    it("reports two forms that say no passage the same way, before nothing being spoken for", () => {
      const comparison = formCopyComparisonOf(
        riders(RIDER_WINDOW, [band("intro", 10)]),
        skiers(SKIER_WINDOW, [band("intro", 90)])
      )

      expect(comparison.silence).toBe("unshared")
      expect(comparison.compared).toEqual([])
      expect(comparison.says.reworded).toEqual({ one: 10, other: 90 })
      expect(comparison.typical).toBeNull()
    })

    it("reports nothing spoken for where every shared passage is unknown on a side", () => {
      const comparison = formCopyComparisonOf(
        riders({ page: { reached: 100 }, intro: { reached: 50 } }, [band("intro", 10)]),
        skiers({ page: { reached: 1000 }, intro: { reached: 0 } }, [band("intro", 10)])
      )

      expect(passage(comparison, "intro")?.other.standing).toBe("unknown")
      expect(comparison.compared.every((shared) => shared.gap === null)).toBe(true)
      expect(comparison.silence).toBe("unspoken")
      expect(comparison.typical).toBeNull()
    })

    /**
     * A floor is a declaration a library has not made, and a pair where nothing
     * reports reach would still have no page figure once every `copy` prop was
     * declared (0282) — so the state with the remedy that produces a figure is
     * not the one reported.
     */
    it("reports nothing spoken for before a floor, where one pair reaches both", () => {
      const half = [band("intro", 10), element("aside", "loom.card", { body: words(15) })]
      const comparison = formCopyComparisonOf(
        riders({ page: { reached: 100 }, intro: { reached: 0 }, aside: { reached: 0 } }, half, SECTIONS_DECLARE_COPY),
        skiers({ page: { reached: 1000 }, intro: { reached: 900 }, aside: { reached: 100 } }, half, SECTIONS_DECLARE_COPY)
      )

      expect(comparison.floored).toBe(1)
      expect(comparison.compared.every((shared) => shared.gap === null)).toBe(true)
      expect(comparison.silence).toBe("unspoken")
    })

    it("gives every silence a line of its own", () => {
      expect(new Set(FORM_COPY_SILENCES.map(describeFormCopySilence)).size).toBe(
        FORM_COPY_SILENCES.length
      )
    })
  })
})
