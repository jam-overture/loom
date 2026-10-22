import { describe, expect, it } from "vitest"

import type { AudienceId } from "../audience/audience.js"
import {
  nodeId,
  OTHER_TREE,
  primitiveType,
  RIDERS,
  SKIERS,
  TREE,
} from "../testing/reader-signal-contract.js"
import type { ElementNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeFormActionSilence,
  formActionComparisonOf,
  FORM_ACTION_SILENCES,
  pageReadingOf,
  type ComparedFormAction,
  type FormActionComparison,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Two forms of one page, built the way a deployment serving two audiences has
 * them: one tree id, one revision, two windows of counters told apart by the
 * column the store writes (0284), and two composed roots that need not hold the
 * same nodes because a form is a base tree plus the deltas an audience earns
 * (0263).
 *
 * Every band here carries a control, because `engaged` is structurally nought
 * on a part with no element parts under it (0167) and a fixture of bare bands
 * would answer `unknown` everywhere for a reason that has nothing to do with
 * this comparison.
 */

const element = (
  name: string,
  type: string,
  children: readonly ElementNode[] = []
): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props: {},
  children,
})

/** A band with a control inside it, so that a reader has somewhere to act. */
const band = (name: string): ElementNode =>
  element(name, "loom.section", [element(`${name}cta`, "loom.button")])

const treeOf = (bands: readonly ElementNode[], revision = 7, treeId = TREE): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root: element("page", "loom.stack", bands),
})

/** `loom.section` plays the heading role, so a part's role travels with it. */
const DECLARATIONS: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: (role) => (role === "heading" ? [primitiveType("loom.section")] : []),
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

/** The three bands every form below holds, under a root that holds them. */
const THREE = [band("hero"), band("pricing"), band("footer")]

/** The same page with a fourth band only one form's deltas put there. */
const FOUR = [...THREE, band("bonus")]

/** What one node's window says: readers who reached it, and readers who acted inside it. */
type Row = { readonly reached: number; readonly within?: number; readonly presses?: number }

/**
 * One form's window: a root carrying the view floor and the readers who acted
 * anywhere on the page, plus whichever bands reported anything.
 */
const windowOf = (
  audience: AudienceId | undefined,
  views: number,
  rows: Readonly<Record<string, Row>>,
  revision = 7
): readonly (ReaderTally & { readonly audienceId?: AudienceId })[] =>
  Object.entries(rows).map(([name, row]) =>
    tally(
      name,
      audience,
      {
        views,
        reached: row.reached,
        engaged: row.within ?? 0,
        activations: row.presses ?? 0,
      },
      revision
    )
  )

const formOf = (
  audience: AudienceId | undefined,
  views: number,
  rows: Readonly<Record<string, Row>>,
  bands: readonly ElementNode[] = THREE,
  revision = 7,
  treeId = TREE
) =>
  pageReadingOf(
    treeOf(bands, revision, treeId),
    windowOf(audience, views, rows, revision).map((row) => ({ ...row, treeId })),
    DECLARATIONS
  )

const part = (
  comparison: FormActionComparison,
  name: string
): ComparedFormAction | undefined =>
  comparison.compared.find((compared) => compared.nodeId === nodeId(name))

/** Half the skiers who reach the pricing band act in it; a tenth of the riders do. */
const SKIER_WINDOW: Readonly<Record<string, Row>> = {
  page: { reached: 1000, within: 400 },
  hero: { reached: 900, within: 90 },
  pricing: { reached: 500, within: 250 },
  footer: { reached: 300, within: 30 },
}

const RIDER_WINDOW: Readonly<Record<string, Row>> = {
  page: { reached: 100, within: 10 },
  hero: { reached: 90, within: 9 },
  pricing: { reached: 50, within: 5 },
  footer: { reached: 30, within: 3 },
}

describe("what readers do inside a page, form by form", () => {
  describe("the figure", () => {
    it("compares each form's share of the readers who reached a part, off that form's own rows", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        formOf(RIDERS, 100, RIDER_WINDOW)
      )

      const pricing = part(comparison, "pricing")

      expect(pricing?.one.share).toBeCloseTo(0.1, 10)
      expect(pricing?.other.share).toBeCloseTo(0.5, 10)
      expect(pricing?.gap).toBeCloseTo(0.4, 10)
      expect(pricing?.favours).toBe(SKIERS)
      expect(comparison.silence).toBeNull()
    })

    /**
     * The measurement that says the figure is a share and not a count: a form
     * with ten times the readers and the same behaviour comes back as no
     * difference at all, where a comparison of counts would have called it ten
     * times better.
     */
    it("reports no gap between a busy form and a quiet one that behave alike", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, { page: { reached: 1000, within: 400 }, hero: { reached: 900, within: 90 } }),
        formOf(RIDERS, 100, { page: { reached: 100, within: 40 }, hero: { reached: 90, within: 9 } })
      )

      expect(part(comparison, "hero")?.gap).toBe(0)
      expect(part(comparison, "hero")?.favours).toBeNull()
      expect(comparison.counted.alike).toBeGreaterThan(0)
    })

    it("names the form rather than signing the difference, so the answer survives the arguments being swapped", () => {
      const skiers = formOf(SKIERS, 1000, SKIER_WINDOW)
      const riders = formOf(RIDERS, 100, RIDER_WINDOW)

      expect(formActionComparisonOf(skiers, riders)).toEqual(
        formActionComparisonOf(riders, skiers)
      )
    })

    it("puts the lower-sorting audience first whichever way round it was asked", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        formOf(RIDERS, 100, RIDER_WINDOW)
      )

      expect(comparison.one.audienceId).toBe(RIDERS)
      expect(comparison.other.audienceId).toBe(SKIERS)
      expect(part(comparison, "pricing")?.gap).toBeGreaterThan(0)
    })

    it("breaks a tie between two equal gaps on the node id, so two reads of one store agree", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 100, {
          page: { reached: 100, within: 50 },
          hero: { reached: 100, within: 80 },
          pricing: { reached: 100, within: 80 },
        }),
        formOf(RIDERS, 100, {
          page: { reached: 100, within: 50 },
          hero: { reached: 100, within: 20 },
          pricing: { reached: 100, within: 20 },
        })
      )

      expect(comparison.sharpest?.nodeId).toBe(nodeId("hero"))
    })
  })

  describe("the page as a whole", () => {
    /**
     * The claim 0302 refuses for reach and this reading may make: the root's
     * own row is one division rather than a sum over parts, so no reader is
     * counted once per level they acted inside.
     */
    it("holds the root against itself as the one page-level figure", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        formOf(RIDERS, 100, RIDER_WINDOW)
      )

      expect(comparison.whole?.nodeId).toBe(nodeId("page"))
      expect(comparison.whole?.one.share).toBeCloseTo(0.1, 10)
      expect(comparison.whole?.other.share).toBeCloseTo(0.4, 10)
      expect(comparison.whole?.favours).toBe(SKIERS)
    })

    /**
     * The double-count guard. A reader who acts inside the pricing band is
     * credited on the band and on every addressed ancestor of it (0167), so the
     * root's `within` is **not** the sum of the parts' and nothing here adds
     * them: the page figure is one row's own division, and `counted` is a count
     * of parts rather than of readers.
     */
    it("never adds a reader's action up across the levels it was credited to", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        formOf(RIDERS, 100, RIDER_WINDOW)
      )

      const withinParts = comparison.compared
        .filter((compared) => compared.one.depth > 0)
        .reduce((total, compared) => total + (compared.one.within ?? 0), 0)

      expect(withinParts).toBe(17)
      expect(comparison.whole?.one.within).toBe(10)
      expect(withinParts).toBeGreaterThan(comparison.whole?.one.within ?? 0)

      const counted = comparison.counted

      expect(counted.one + counted.other + counted.alike + counted.unknown).toBe(
        comparison.compared.length
      )
    })

    it("keeps the page out of the sharpest row, because it contains everything it would outrank", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, { page: { reached: 1000, within: 900 }, pricing: { reached: 500, within: 250 } }),
        formOf(RIDERS, 100, { page: { reached: 100, within: 10 }, pricing: { reached: 50, within: 20 } })
      )

      expect(comparison.whole?.gap).toBeCloseTo(0.8, 10)
      expect(comparison.sharpest?.nodeId).toBe(nodeId("pricing"))
    })
  })

  describe("what the figure cannot survive", () => {
    it("withholds a leaf's gap, because a leaf has no inside to act in", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, { ...SKIER_WINDOW, "pricingcta": { reached: 400, presses: 80 } }),
        formOf(RIDERS, 100, { ...RIDER_WINDOW, "pricingcta": { reached: 40, presses: 20 } })
      )

      const cta = part(comparison, "pricingcta")

      expect(cta?.one.bearsParts).toBe(false)
      expect(cta?.one.share).toBeUndefined()
      expect(cta?.gap).toBeNull()
      expect(cta?.favours).toBeNull()
    })

    it("withholds a gap where one side never reported the part at all", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        formOf(RIDERS, 100, { page: { reached: 100, within: 10 } })
      )

      expect(part(comparison, "pricing")?.gap).toBeNull()
      expect(comparison.counted.unknown).toBeGreaterThan(0)
    })

    /**
     * The state this reading adds to the pairing rule. A window whose delegated
     * signals carry no `within` (0167) reports a nought on every part, and a
     * real share held against it would publish the other form's whole share as
     * a difference between two populations.
     */
    it("withholds every gap where one side holds uses and credits no reader with acting", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        formOf(RIDERS, 100, {
          page: { reached: 100 },
          hero: { reached: 90 },
          pricing: { reached: 50, presses: 40 },
          footer: { reached: 30 },
        })
      )

      expect(comparison.silence).toBe("unwalked")
      expect(comparison.other.unwalked).toBe(false)
      expect(comparison.one.unwalked).toBe(true)
      expect(comparison.compared.every((compared) => compared.gap === null)).toBe(true)
      expect(comparison.counted).toEqual({
        one: 0,
        other: 0,
        alike: 0,
        unknown: comparison.compared.length,
      })
      expect(comparison.whole?.gap).toBeNull()
    })

    /**
     * Where that withholding comes from, which 0304 moved. The reading itself
     * has no share to give on an unwalked side, so this comparison has no
     * clause of its own and the two cannot disagree — the property to pin
     * rather than to describe.
     */
    it("takes the withholding off the reading rather than off a clause of its own", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        formOf(RIDERS, 100, {
          page: { reached: 100 },
          pricing: { reached: 50, presses: 40 },
        })
      )

      expect(comparison.readings.one.unwalked).toBe(true)
      expect(comparison.readings.one.parts.every((part) => part.share === undefined)).toBe(true)
      expect(comparison.readings.one.standings.untouched).toBe(0)
      expect(comparison.readings.one.mostIgnored).toBeNull()
    })

    it("still answers which parts each form has while its shares are withheld", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW, FOUR),
        formOf(RIDERS, 100, { page: { reached: 100 }, pricing: { reached: 50, presses: 40 } })
      )

      expect(comparison.silence).toBe("unwalked")
      expect(comparison.onlyIn.map((only) => only.nodeId)).toContain(nodeId("bonus"))
    })

    /**
     * The guard ordering that is a decision rather than reading order, which is
     * the rule this lane wrote down on 20 October: **a single window reaches
     * both guards**, so the fixture is written before the sentence that ranks
     * them. A side with no page views and presses filed against its parts is a
     * sender that is not one.
     */
    it("says a window does not report where actions happened before it says nobody read it", () => {
      const unwalkedAndEmpty = formOf(RIDERS, 0, {
        page: { reached: 0 },
        pricing: { reached: 0, presses: 40 },
      })

      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        unwalkedAndEmpty
      )

      expect(comparison.one.views).toBe(0)
      expect(comparison.one.unwalked).toBe(true)
      expect(comparison.silence).toBe("unwalked")
    })

    it("reports a window nobody read as that, with every gap already withheld", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        formOf(RIDERS, 0, { page: { reached: 0 } })
      )

      expect(comparison.silence).toBe("nothing-measured")
      expect(comparison.compared.every((compared) => compared.gap === null)).toBe(true)
    })
  })

  describe("what the two forms do not share", () => {
    it("names a part only one form has, with its form, and never compares it", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW, FOUR),
        formOf(RIDERS, 100, RIDER_WINDOW)
      )

      const only = comparison.onlyIn.find((entry) => entry.nodeId === nodeId("bonus"))

      expect(only?.audienceId).toBe(SKIERS)
      expect(part(comparison, "bonus")).toBeUndefined()
    })

    it("names a shared node the two forms give different types", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW, [
          element("hero", "loom.card", [element("herocta", "loom.button")]),
          band("pricing"),
          band("footer"),
        ]),
        formOf(RIDERS, 100, RIDER_WINDOW)
      )

      expect(comparison.disagreed).toEqual([nodeId("hero")])
    })

    /**
     * The diagnosis this reading needs and its sibling does not: a share is
     * withheld on a bare part for a structural reason, so without this a band
     * the deltas filled for one audience and left empty for the other falls
     * into `unknown` with nothing saying why.
     */
    it("names a shared node one form gives an inside and the other does not", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW, [
          band("hero"),
          element("pricing", "loom.section"),
          band("footer"),
        ]),
        formOf(RIDERS, 100, RIDER_WINDOW)
      )

      expect(comparison.insideDisagreed).toEqual([nodeId("pricing")])
      expect(part(comparison, "pricing")?.gap).toBeNull()
    })
  })

  describe("the pairs that are not two forms of one page", () => {
    it("refuses two pages before anything about populations", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        formOf(SKIERS, 100, RIDER_WINDOW, THREE, 7, OTHER_TREE)
      )

      expect(comparison.silence).toBe("different-pages")
      expect(comparison.compared).toEqual([])
      expect(comparison.onlyIn).toEqual([])
    })

    it("refuses a window holding two forms with neither asked for, before an unlabelled side", () => {
      const unsplit = pageReadingOf(
        treeOf(THREE),
        [
          ...windowOf(SKIERS, 1000, SKIER_WINDOW),
          ...windowOf(RIDERS, 100, { page: { reached: 100, within: 10 } }),
        ],
        DECLARATIONS
      )

      expect(formActionComparisonOf(unsplit, formOf(undefined, 100, RIDER_WINDOW)).silence).toBe(
        "unsplit"
      )
    })

    it("refuses a side that names no audience, because the population is the question", () => {
      expect(
        formActionComparisonOf(formOf(SKIERS, 1000, SKIER_WINDOW), formOf(undefined, 100, RIDER_WINDOW))
          .silence
      ).toBe("unattributed")
    })

    it("refuses one audience handed in twice, and sends that caller to a before-and-after", () => {
      expect(
        formActionComparisonOf(formOf(SKIERS, 1000, SKIER_WINDOW), formOf(SKIERS, 100, RIDER_WINDOW))
          .silence
      ).toBe("one-population")
    })

    it("refuses two revisions, after the three population states", () => {
      expect(
        formActionComparisonOf(
          formOf(SKIERS, 1000, SKIER_WINDOW),
          formOf(RIDERS, 100, RIDER_WINDOW, THREE, 8)
        ).silence
      ).toBe("different-revisions")
    })

    it("carries both sides through a refusal, so the caller is told about the pair it handed in", () => {
      const comparison = formActionComparisonOf(
        formOf(SKIERS, 1000, SKIER_WINDOW),
        formOf(SKIERS, 100, RIDER_WINDOW)
      )

      expect(comparison.one.views).toBe(1000)
      expect(comparison.other.views).toBe(100)
      expect(comparison.readings.one.parts.length).toBeGreaterThan(0)
      expect(comparison.whole).toBeNull()
    })
  })

  it("gives every silence a line of its own", () => {
    expect(new Set(FORM_ACTION_SILENCES.map(describeFormActionSilence)).size).toBe(
      FORM_ACTION_SILENCES.length
    )
  })
})
