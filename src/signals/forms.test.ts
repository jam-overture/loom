import { describe, expect, it } from "vitest"

import type { AudienceId } from "../audience/audience.js"
import { nodeId, OTHER_TREE, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeFormComparisonSilence,
  formComparisonOf,
  FORM_COMPARISON_SILENCES,
  pageReadingOf,
  readingChangeOf,
  type ComparedForm,
  type FormComparison,
  type FormComparisonSilence,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Two forms of one page, built the way a deployment serving two audiences has
 * them: one tree id, one revision, two windows of counters told apart by the
 * column the store writes (0284), and two composed roots that need not hold the
 * same nodes because a form is a base tree plus the deltas an audience earns
 * (0263).
 */

const element = (name: string, type: string, children: readonly ElementNode[] = []): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props: {},
  children,
})

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
  audienceId: AudienceId,
  counters: Partial<ReaderTally> = {},
  revision = 7
): ReaderTally & { readonly audienceId: AudienceId } => ({
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
  audienceId,
  ...counters,
})

/** The three bands every form below holds, under a root that holds them. */
const THREE = [
  element("hero", "loom.section"),
  element("pricing", "loom.section"),
  element("footer", "loom.section"),
]

/** The same page with a fourth band only one form's deltas put there. */
const FOUR = [...THREE, element("bonus", "loom.section")]

/**
 * One form's window: a root carrying the view floor and whichever bands it
 * reached, all under one audience.
 */
const windowOf = (
  audience: AudienceId,
  views: number,
  reached: Readonly<Record<string, number>>,
  revision = 7
): readonly (ReaderTally & { readonly audienceId: AudienceId })[] => [
  tally("page", audience, { views, reached: views }, revision),
  ...Object.entries(reached).map(([name, count]) =>
    tally(name, audience, { views, reached: count }, revision)
  ),
]

const formOf = (
  audience: AudienceId,
  views: number,
  reached: Readonly<Record<string, number>>,
  bands: readonly ElementNode[] = THREE,
  revision = 7
) => pageReadingOf(treeOf(bands, revision), windowOf(audience, views, reached, revision), DECLARATIONS)

const part = (comparison: FormComparison, name: string): ComparedForm | undefined =>
  comparison.compared.find((compared) => compared.nodeId === nodeId(name))

describe("two forms of one page, side by side", () => {
  /**
   * The headline sentence, and the only one this reading is for: half the
   * skiers who arrived reached the pricing band and one rider in ten did, over
   * one tree at one revision, so nothing about the page moved and the only
   * thing that differs is who was reading.
   */
  it("says which form's readers reached a part and by how much", () => {
    const comparison = formComparisonOf(
      formOf(SKIERS, 100, { hero: 100, pricing: 50, footer: 20 }),
      formOf(RIDERS, 80, { hero: 80, pricing: 8, footer: 16 })
    )

    expect(comparison.silence).toBeNull()

    const pricing = part(comparison, "pricing")

    expect(pricing?.favours).toBe(SKIERS)
    expect(pricing?.gap).toBeCloseTo(0.4, 10)
    expect(pricing?.one.reach).toBeCloseTo(0.1, 10)
    expect(pricing?.other.reach).toBeCloseTo(0.5, 10)
    expect(pricing?.role).toBe("heading")
    expect(comparison.sharpest?.nodeId).toBe(nodeId("pricing"))
  })

  /**
   * The order of the two audience names, not the order of the arguments. The
   * lower name is `one` whichever way round the question is asked, which is the
   * property that makes a sign on a difference meaningless and `favours`
   * necessary.
   */
  it("puts the lower audience name first, whichever way round it is asked", () => {
    const skiers = formOf(SKIERS, 100, { pricing: 50 })
    const riders = formOf(RIDERS, 100, { pricing: 10 })

    expect(formComparisonOf(skiers, riders).one.audienceId).toBe(RIDERS)
    expect(formComparisonOf(riders, skiers).one.audienceId).toBe(RIDERS)
  })

  it("answers the same thing whichever way round it is asked", () => {
    const skiers = formOf(SKIERS, 100, { hero: 90, pricing: 50 }, FOUR)
    const riders = formOf(RIDERS, 80, { hero: 40, pricing: 8 })

    expect(formComparisonOf(skiers, riders)).toEqual(formComparisonOf(riders, skiers))
  })

  /**
   * The reason a share is the only comparable figure, measured. One form has
   * ten times the traffic of the other and both reached half of it, so a
   * comparison of counts would have reported the busier form reading five times
   * better and this one reports no difference at all.
   */
  it("compares shares and never counts, so ten times the traffic is not ten times the reading", () => {
    const comparison = formComparisonOf(
      formOf(SKIERS, 1000, { pricing: 500 }),
      formOf(RIDERS, 100, { pricing: 50 })
    )

    expect(part(comparison, "pricing")?.gap).toBe(0)
    expect(part(comparison, "pricing")?.favours).toBeNull()
    expect(comparison.counted.alike).toBeGreaterThan(0)
    expect(comparison.counted.one).toBe(0)
    expect(comparison.counted.other).toBe(0)
  })

  /**
   * What the deltas did, stated rather than estimated: a band only one form has
   * is not a part the other form's readers skipped, and putting it in the
   * comparison would have published that as a difference between two
   * populations.
   */
  it("names a part only one form has instead of comparing it", () => {
    const comparison = formComparisonOf(
      formOf(SKIERS, 100, { pricing: 50, bonus: 30 }, FOUR),
      formOf(RIDERS, 100, { pricing: 50 })
    )

    expect(part(comparison, "bonus")).toBeUndefined()
    expect(comparison.onlyIn).toHaveLength(1)
    expect(comparison.onlyIn[0]?.nodeId).toBe(nodeId("bonus"))
    expect(comparison.onlyIn[0]?.audienceId).toBe(SKIERS)
    expect(comparison.onlyIn[0]?.side.reach).toBeCloseTo(0.3, 10)
    expect(comparison.one.parts).toBe(4)
    expect(comparison.other.parts).toBe(5)
  })

  /**
   * The census is of the forms and not of one side, so a part each form has
   * that the other does not is two entries and each names its own form.
   */
  it("names the form each unshared part is in", () => {
    const comparison = formComparisonOf(
      formOf(SKIERS, 100, {}, [...THREE, element("bonus", "loom.section")]),
      formOf(RIDERS, 100, {}, [...THREE, element("offer", "loom.section")])
    )

    expect(comparison.onlyIn.map((of) => [of.nodeId, of.audienceId])).toEqual([
      [nodeId("offer"), RIDERS],
      [nodeId("bonus"), SKIERS],
    ])
  })

  /**
   * The three lists partition the two forms' nodes exactly once each, which is
   * the double-count guard this reading needs: every shared part is in both
   * sides' part lists and must be counted once, and the second pass over the
   * later side must not re-file it.
   */
  it("files every node of either form exactly once", () => {
    const comparison = formComparisonOf(
      formOf(SKIERS, 100, { pricing: 50 }, FOUR),
      formOf(RIDERS, 100, { pricing: 10 }, [...THREE, element("offer", "loom.section")])
    )

    const filed = [
      ...comparison.compared.map((of) => of.nodeId),
      ...comparison.onlyIn.map((of) => of.nodeId),
    ]

    expect(new Set(filed).size).toBe(filed.length)
    expect(filed).toHaveLength(6)
    expect(
      comparison.counted.one +
        comparison.counted.other +
        comparison.counted.alike +
        comparison.counted.unknown
    ).toBe(comparison.compared.length)
  })

  /**
   * A node both forms have whose type the deltas replaced. The two reaches are
   * each their own form's and stay comparable; what would be silent without
   * this is that the two sides are not showing the same thing.
   */
  it("reports a shared node the two forms give different types, and still compares it", () => {
    const skiers = pageReadingOf(
      treeOf([element("hero", "loom.section"), element("pricing", "loom.card")]),
      windowOf(SKIERS, 100, { pricing: 50 }),
      DECLARATIONS
    )
    const comparison = formComparisonOf(skiers, formOf(RIDERS, 100, { pricing: 10 }))

    expect(comparison.disagreed).toEqual([nodeId("pricing")])
    expect(part(comparison, "pricing")?.favours).toBe(SKIERS)
  })

  /**
   * `unknown` is *nothing can be said* and never *nobody reached it* (0282), so
   * a part one form's window says nothing about has no difference against the
   * other form's measurement — and the two states the reading can be in are
   * kept apart by the pair of fields rather than by one null.
   */
  it("withholds a difference where one form cannot say, and tells that from alike", () => {
    const comparison = formComparisonOf(
      formOf(SKIERS, 100, { pricing: 50, footer: 20 }),
      formOf(RIDERS, 100, { pricing: 50 })
    )

    expect(part(comparison, "footer")?.one.standing).toBe("skipped")
    expect(part(comparison, "footer")?.gap).toBeCloseTo(0.2, 10)

    const quiet = formComparisonOf(
      formOf(SKIERS, 100, { pricing: 50 }),
      pageReadingOf(treeOf(THREE), [tally("pricing", RIDERS, { reached: 3 })], DECLARATIONS)
    )

    expect(quiet.one.views).toBe(0)
    expect(part(quiet, "pricing")?.gap).toBeNull()
    expect(part(quiet, "pricing")?.favours).toBeNull()
    expect(part(comparison, "pricing")?.gap).toBe(0)
    expect(part(comparison, "pricing")?.favours).toBeNull()
  })

  /**
   * The other half of the same rule, and the half a window with no views cannot
   * reach: this form's window **held readers** and has a row for the band whose
   * reach is nought because a reader pressed something inside it and no `viewed`
   * ever named it (0212, 0282). A reach of nought that is a missing report is
   * not a reader who did not arrive, so subtracting against it would publish the
   * other form's whole reach as a difference between two populations.
   */
  it("withholds a difference against a nought that is a missing report", () => {
    const quiet = pageReadingOf(
      treeOf(THREE),
      [
        tally("page", RIDERS, { views: 100, reached: 100 }),
        tally("pricing", RIDERS, { views: 100, reached: 0, engaged: 9 }),
      ],
      DECLARATIONS
    )
    const comparison = formComparisonOf(formOf(SKIERS, 100, { pricing: 50 }), quiet)

    expect(part(comparison, "pricing")?.one.standing).toBe("unknown")
    expect(part(comparison, "pricing")?.one.views).toBe(100)
    expect(part(comparison, "pricing")?.one.reach).toBe(0)
    expect(part(comparison, "pricing")?.gap).toBeNull()
    expect(part(comparison, "pricing")?.favours).toBeNull()
    expect(comparison.silence).toBeNull()
  })

  /**
   * A reach above its own ceiling is the alarm `reach.ts` calls `inconsistent`,
   * and it is left in place here rather than clamped: a figure cut to fit is a
   * fault made undrawable instead of visible.
   */
  it("does not clamp a reach above the views it is a share of", () => {
    const impossible = pageReadingOf(
      treeOf(THREE),
      [tally("page", RIDERS, { views: 10, reached: 10 }), tally("pricing", RIDERS, { views: 10, reached: 30 })],
      DECLARATIONS
    )

    expect(
      part(formComparisonOf(formOf(SKIERS, 100, { pricing: 50 }), impossible), "pricing")?.one.reach
    ).toBe(3)
  })

  /** Two parts the forms differ on by the same amount keep a stable order. */
  it("breaks a tie for the sharpest part by node id", () => {
    const comparison = formComparisonOf(
      formOf(SKIERS, 100, { hero: 60, pricing: 60 }),
      formOf(RIDERS, 100, { hero: 10, pricing: 10 })
    )

    expect(comparison.sharpest?.nodeId).toBe(nodeId("hero"))
  })
})

describe("the five states in which there are not two forms", () => {
  it("says two pages first, whatever else is wrong with the pair", () => {
    const elsewhere = pageReadingOf(
      treeOf(THREE, 7, OTHER_TREE),
      [{ ...tally("pricing", SKIERS), treeId: OTHER_TREE }],
      DECLARATIONS
    )

    expect(formComparisonOf(formOf(SKIERS, 100, { pricing: 50 }), elsewhere).silence).toBe(
      "different-pages"
    )
  })

  /**
   * A window of two forms with neither asked for: the rows **collide** on one
   * node, which is what makes the fault reachable at all — a test whose two
   * audiences name two different nodes documents the intent and exercises
   * nothing (0300).
   */
  const UNSPLIT = pageReadingOf(
    treeOf(THREE),
    [...windowOf(SKIERS, 100, { pricing: 50 }), ...windowOf(RIDERS, 80, { pricing: 8 })],
    DECLARATIONS
  )

  it("refuses a window read as neither of its two forms", () => {
    expect(UNSPLIT.audiences).toEqual([RIDERS, SKIERS])
    expect(UNSPLIT.audienceId).toBeNull()

    const comparison = formComparisonOf(UNSPLIT, formOf(RIDERS, 80, { pricing: 8 }))

    expect(comparison.silence).toBe("unsplit")
    expect(comparison.compared).toEqual([])
    expect(comparison.onlyIn).toEqual([])
  })

  it("refuses it on either side", () => {
    expect(formComparisonOf(formOf(SKIERS, 100, { pricing: 50 }), UNSPLIT).silence).toBe("unsplit")
  })

  /** A window from before the column existed names nothing, and cannot be a form. */
  const UNLABELLED = pageReadingOf(
    treeOf(THREE),
    [
      { treeId: TREE, revision: 7, nodeId: nodeId("page"), type: primitiveType("loom.stack"), views: 100, reached: 100, engaged: 0, dwellMs: 0, activations: 0, opens: 0, closes: 0, completions: 0 },
    ],
    DECLARATIONS
  )

  it("refuses a window that names no audience at all", () => {
    expect(formComparisonOf(UNLABELLED, formOf(RIDERS, 80, { pricing: 8 })).silence).toBe(
      "unattributed"
    )
  })

  /**
   * One side unlabelled and the other unsplit is the one pair that reaches both
   * of those guards, so the order between them is a real decision: the caller is
   * told the fault it can do something about.
   */
  it("says the window to split before the window from before the column", () => {
    expect(formComparisonOf(UNLABELLED, UNSPLIT).silence).toBe("unsplit")
    expect(formComparisonOf(UNSPLIT, UNLABELLED).silence).toBe("unsplit")
  })

  it("refuses one audience handed in twice, because there is no second form", () => {
    expect(
      formComparisonOf(formOf(SKIERS, 100, { pricing: 50 }), formOf(SKIERS, 90, { pricing: 40 }))
        .silence
    ).toBe("one-population")
  })

  it("refuses two revisions, because two forms of a page share one", () => {
    expect(
      formComparisonOf(
        formOf(SKIERS, 100, { pricing: 50 }, THREE, 7),
        formOf(RIDERS, 100, { pricing: 10 }, THREE, 8)
      ).silence
    ).toBe("different-revisions")
  })

  /**
   * Both of the orderings above are real and the fixtures reach both guards: a
   * pair can be of two revisions **and** have no second population, and a
   * caller told *two revisions* would fix the half that was not the problem.
   */
  it("says there is no second population before it says there are two revisions", () => {
    expect(
      formComparisonOf(
        formOf(SKIERS, 100, { pricing: 50 }, THREE, 7),
        formOf(SKIERS, 100, { pricing: 10 }, THREE, 8)
      ).silence
    ).toBe("one-population")
    expect(
      formComparisonOf(UNSPLIT, formOf(RIDERS, 100, { pricing: 10 }, THREE, 8)).silence
    ).toBe("unsplit")
  })

  /**
   * The one member that is not a refusal. What the forms hold is a fact about
   * the two composed trees and survives a window nobody read.
   */
  it("publishes the parts census over a window that held no views", () => {
    const comparison = formComparisonOf(
      formOf(SKIERS, 0, {}, FOUR),
      formOf(RIDERS, 100, { pricing: 50 })
    )

    expect(comparison.silence).toBe("nothing-measured")
    expect(comparison.compared).toHaveLength(4)
    expect(comparison.onlyIn.map((of) => of.nodeId)).toEqual([nodeId("bonus")])
    expect(comparison.counted.unknown).toBe(4)
    expect(comparison.sharpest).toBeNull()
  })

  it("answers the same thing whichever way round a refusal is asked", () => {
    const skiers = formOf(SKIERS, 100, { pricing: 50 }, THREE, 7)
    const riders = formOf(RIDERS, 100, { pricing: 10 }, THREE, 8)

    expect(formComparisonOf(skiers, riders)).toEqual(formComparisonOf(riders, skiers))
  })

  /** No member of the set is unreachable, which is the dead-code guard. */
  it("reaches every member of its own vocabulary", () => {
    const reached = new Set<FormComparisonSilence>()
    const pairs: readonly (readonly [ReturnType<typeof formOf>, ReturnType<typeof formOf>])[] = [
      [formOf(SKIERS, 100, {}), pageReadingOf(treeOf(THREE, 7, OTHER_TREE), [], DECLARATIONS)],
      [UNSPLIT, formOf(RIDERS, 80, {})],
      [UNLABELLED, formOf(RIDERS, 80, {})],
      [formOf(SKIERS, 100, {}), formOf(SKIERS, 90, {})],
      [formOf(SKIERS, 100, {}, THREE, 7), formOf(RIDERS, 100, {}, THREE, 8)],
      [formOf(SKIERS, 0, {}), formOf(RIDERS, 100, {})],
    ]

    for (const [one, other] of pairs) {
      const silence = formComparisonOf(one, other).silence

      if (silence !== null) reached.add(silence)
    }

    expect([...FORM_COMPARISON_SILENCES].filter((of) => !reached.has(of))).toEqual([])
  })

  it("has a line for every member, and no two of them the same", () => {
    const lines = FORM_COMPARISON_SILENCES.map(describeFormComparisonSilence)

    expect(new Set(lines).size).toBe(FORM_COMPARISON_SILENCES.length)
    expect(lines.every((line) => line.length > 0)).toBe(true)
  })
})

/**
 * The two readings divide the space rather than overlapping, which is the whole
 * argument of §36: a before-and-after holds the readership still and varies the
 * tree, and this holds the tree still and varies the readership. Each refuses
 * exactly what the other answers, so a caller holding the wrong pair is sent to
 * the right function instead of being given a number.
 */
describe("beside a before-and-after", () => {
  it("refuses what a before-and-after answers, and answers what it refuses", () => {
    const earlier = formOf(SKIERS, 100, { pricing: 50 }, THREE, 7)
    const later = formOf(SKIERS, 100, { pricing: 80 }, THREE, 8)
    const otherForm = formOf(RIDERS, 100, { pricing: 10 }, THREE, 7)

    expect(formComparisonOf(earlier, later).silence).toBe("one-population")
    expect(readingChangeOf(earlier, later).silence).toBeNull()

    expect(formComparisonOf(earlier, otherForm).silence).toBeNull()
    expect(readingChangeOf(earlier, otherForm).silence).toBe("different-audiences")
  })
})
