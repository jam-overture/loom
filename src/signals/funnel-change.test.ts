import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import { nodeId, OTHER_TREE, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION } from "../tree/tree.js"

import {
  CONVERSION_CAUSES,
  conversionCauseOf,
  describeConversionCause,
  describeFunnelChangeSilence,
  describeFunnelMovement,
  describeQuestionMovement,
  FUNNEL_CHANGE_SILENCES,
  FUNNEL_MOVEMENTS,
  funnelChangeOf,
  funnelPairKey,
  funnelReachOf,
  pageReadingOf,
  QUESTION_MOVEMENTS,
  type FunnelPair,
  type FunnelReach,
  type PageReading,
  type PartDeclarations,
  type StoredFunnel,
  type StoredPageViews,
} from "./index.js"

/**
 * Built out of two readings `funnelReachOf` made, because those are what the
 * comparison takes: a window's funnel counters read against the arrivals that
 * window had and the revision the questions are asked of. Two of them held
 * against each other answer *did the change sell more*, and say which half of
 * the funnel moved.
 */

const element = (name: string, type: string, children: readonly LoomNode[] = []): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props: {},
  children,
})

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const PAGE = element("root", "loom.stack", [
  element("band", "loom.section", [element("form", "loom.form")]),
  element("other", "loom.section", [element("signup", "loom.form")]),
])

/** The same page with the pricing band's form taken out, which breaks a question. */
const WITHOUT_FORM = element("root", "loom.stack", [
  element("band", "loom.section"),
  element("other", "loom.section", [element("signup", "loom.form")]),
])

const AT = "2026-10-16T09:00:00.000Z"

const readingOf = (root: ElementNode, revision: number, treeId = TREE): PageReading =>
  pageReadingOf({ treeId, schemaVersion: TREE_SCHEMA_VERSION, revision, root }, [], {
    ...NOTHING_DECLARED,
  })

const pair = (from: string, to: string): FunnelPair => ({
  from: { nodeId: nodeId(from), kind: "viewed" },
  to: { nodeId: nodeId(to), kind: "completed" },
})

/** One window of one revision, as a deployment's rows would have it. */
const window = (
  {
    revision,
    opened,
    appearances,
    root = PAGE,
    treeId = TREE,
  }: {
    readonly revision: number
    readonly opened: number
    readonly appearances: number
    readonly root?: ElementNode
    readonly treeId?: typeof TREE | typeof OTHER_TREE
  },
  funnels: readonly {
    readonly from: string
    readonly to: string
    readonly reached: number
    readonly converted: number
  }[],
  rows?: readonly StoredPageViews[]
): FunnelReach => {
  const reading = readingOf(root, revision, treeId)
  const stored: readonly StoredFunnel[] = funnels.map((one) => ({
    audienceId: DEFAULT_AUDIENCE_ID,
    treeId,
    revision,
    pair: pair(one.from, one.to),
    reached: one.reached,
    converted: one.converted,
    updatedAt: AT,
  }))

  return funnelReachOf(
    reading,
    stored,
    rows ?? [
      {
        audienceId: DEFAULT_AUDIENCE_ID,
        treeId,
        revision,
        opened,
        appearances,
        updatedAt: AT,
      },
    ]
  )
}

/** The question every fixture below asks unless it says otherwise. */
const BUY = funnelPairKey(pair("band", "form"))

const only = (change: ReturnType<typeof funnelChangeOf>) => {
  const [first] = change.compared

  if (first === undefined) throw new Error("the fixture was meant to compare one pair")

  return first
}

describe("what a change did to the funnel", () => {
  /**
   * The headline sentence, and the one two screens and a subtraction by eye
   * used to answer: a change shipped, and a tenth of the readers who reached
   * the pricing band bought where a twentieth did.
   */
  it("holds one question's two windows against each other", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 2 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 4 },
      ])
    )
    const buy = only(change)

    expect(change.silence).toBeNull()
    expect(change.revisions).toStrictEqual({ was: 1, now: 2 })
    expect(funnelPairKey(buy.pair)).toBe(BUY)
    expect(buy.movement).toBe("held")
    expect(buy.question).toBe("asked")
    expect(buy.rateRatio).toBe(2)
    expect(buy.conversionRatio).toBe(2)
    expect(buy.entryRatio).toBe(1)
    expect(buy.readersMoved).toBeCloseTo(2, 10)
  })

  it("counts every compared pair in exactly one movement and one question", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 4 },
        { from: "other", to: "signup", reached: 20, converted: 0 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 0 },
        { from: "other", to: "signup", reached: 20, converted: 5 },
      ])
    )

    const movements = Object.values(change.movements).reduce((sum, count) => sum + count, 0)
    const questions = Object.values(change.questions).reduce((sum, count) => sum + count, 0)

    expect(change.compared).toHaveLength(2)
    expect(movements).toBe(2)
    expect(questions).toBe(2)
    expect(change.movements.abandoned).toBe(1)
    expect(change.movements["taken-up"]).toBe(1)
  })

  it("names the funnel readers get to and never finish, and keeps it apart from one they finish", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 0 },
        { from: "other", to: "signup", reached: 30, converted: 3 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 0 },
        { from: "other", to: "signup", reached: 30, converted: 3 },
      ])
    )

    expect(change.movements["still-unconverted"]).toBe(1)
    expect(change.movements.held).toBe(1)
  })

  it("has no verdict where a window never got anybody to the first end", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 0, converted: 0 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 4 },
      ])
    )
    const buy = only(change)

    expect(buy.movement).toBe("unknown")
    expect(buy.question).toBe("asked")
    expect(buy.rateRatio).toBeNull()
    expect(buy.was.rate).toBeNull()
  })

  it("orders the compared pairs by the question and not by how either window stored them", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "other", to: "signup", reached: 20, converted: 2 },
        { from: "band", to: "form", reached: 40, converted: 4 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 4 },
        { from: "other", to: "signup", reached: 20, converted: 2 },
      ])
    )

    expect(change.compared.map((one) => funnelPairKey(one.pair))).toStrictEqual(
      [...change.compared.map((one) => funnelPairKey(one.pair))].sort((one, other) =>
        one.localeCompare(other)
      )
    )
  })
})

describe("the question a change can break", () => {
  /**
   * 0238 made an end the revision no longer has a standing rather than a
   * nought, because the two are indistinguishable in the counters. A
   * comparison is where that standing becomes a sentence about a change: the
   * page stopped having the form, so the funnel did not collapse — the
   * question did.
   */
  it("says the change broke the question rather than that readers stopped buying", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 8 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100, root: WITHOUT_FORM }, [
        { from: "band", to: "form", reached: 40, converted: 0 },
      ])
    )
    const buy = only(change)

    expect(buy.question).toBe("broken")
    expect(change.questions.broken).toBe(1)
    expect(buy.movement).toBe("unknown")
    expect(buy.now.stale).toBe(true)
    expect(buy.now.rate).toBeNull()
    expect(buy.rateRatio).toBeNull()
    expect(buy.conversionRatio).toBeNull()
  })

  it("says the change put a question back", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100, root: WITHOUT_FORM }, [
        { from: "band", to: "form", reached: 40, converted: 0 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 8 },
      ])
    )

    expect(only(change).question).toBe("restored")
    expect(change.questions.restored).toBe(1)
  })

  it("says a question neither revision answers is stale rather than broken", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "gone", reached: 40, converted: 0 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "gone", reached: 40, converted: 0 },
      ])
    )

    expect(only(change).question).toBe("stale")
    expect(change.questions.stale).toBe(1)
    expect(change.questions.broken).toBe(0)
  })

  /** A fact about the two trees, so it answers where the door cannot. */
  it("answers the question's movement under a silence, as a census of a change does", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 8 },
      ]),
      window({ revision: 2, opened: 0, appearances: 0, root: WITHOUT_FORM }, [
        { from: "band", to: "form", reached: 0, converted: 0 },
      ])
    )

    expect(change.silence).toBe("unopened")
    expect(only(change).question).toBe("broken")
  })
})

describe("a difference of two floors", () => {
  /**
   * The error this reading exists to refuse, and it is not hypothetical: 0231
   * found `rate` the one figure here biased **downward**, because a page view
   * that straddles a rollup boundary contributes `reached 1, converted 0` to
   * the first window and nothing to the second, so the conversion is lost.
   *
   * The size of that loss is set by the deployment's own rollup window (0158).
   * Shorten it between two readings and the later funnel reads as a collapse
   * with no reader anywhere behaving differently — which is exactly what the
   * bracket is for.
   */
  it("refuses to sign a rate movement the rollup window alone could produce", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 10 },
      ]),
      window({ revision: 2, opened: 100, appearances: 140 }, [
        { from: "band", to: "form", reached: 70, converted: 10 },
      ])
    )
    const buy = only(change)

    expect(buy.was.rate).toBe(0.2)
    expect(buy.now.rate).toBeCloseTo(0.142857, 6)
    expect(buy.rateRatio).toBeCloseTo(0.714286, 6)

    expect(buy.rateRatioAtLeast).toBeCloseTo(0.714286, 6)
    expect(buy.rateRatioAtMost).toBe(5)
    expect(buy.rateMoved).toBe(false)
    expect(change.undecided).toBe(1)
    expect(change.exact).toBe(false)
  })

  it("signs a movement where neither window straddled, because there is nothing to divide out", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 10 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 20 },
      ])
    )
    const buy = only(change)

    expect(change.exact).toBe(true)
    expect(buy.rateRatio).toBe(2)
    expect(buy.rateRatioAtLeast).toBe(2)
    expect(buy.rateRatioAtMost).toBe(2)
    expect(buy.rateMoved).toBe(true)
    expect(change.undecided).toBe(0)
  })

  it("brackets a movement large enough to survive the straddle", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 110 }, [
        { from: "band", to: "form", reached: 50, converted: 5 },
      ]),
      window({ revision: 2, opened: 100, appearances: 110 }, [
        { from: "band", to: "form", reached: 50, converted: 40 },
      ])
    )
    const buy = only(change)

    expect(buy.rateRatio).toBe(8)
    expect(buy.rateRatioAtLeast ?? 0).toBeGreaterThan(1)
    expect(buy.rateMoved).toBe(true)
  })

  it("gives both ends of the bracket or neither", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 10 },
      ]),
      window({ revision: 2, opened: 0, appearances: 0 }, [
        { from: "band", to: "form", reached: 50, converted: 20 },
      ])
    )
    const buy = only(change)

    expect(buy.rateRatio).toBe(2)
    expect(buy.now.rateAtMost).toBeNull()
    expect(buy.rateRatioAtLeast).toBeNull()
    expect(buy.rateRatioAtMost).toBeNull()
    expect(buy.rateMoved).toBeNull()
  })
})

describe("which half of the funnel moved", () => {
  /**
   * The identity the counterfactual rests on, asserted rather than assumed: of
   * the readers who arrived, the share that finished is the share that got to
   * the first end multiplied by the share of those who finished.
   */
  it("is a product of two shares, each with its own window's straddle divided out", () => {
    const reading = window({ revision: 1, opened: 100, appearances: 120 }, [
      { from: "band", to: "form", reached: 60, converted: 15 },
    ])
    const [buy] = reading.pairs

    expect(buy?.conversion.share).toBeCloseTo((buy?.entry.share ?? 0) * (buy?.rate ?? 0), 12)
  })

  it("says the readers got further when the closing rate did not move", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 20, converted: 10 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 20 },
      ])
    )
    const buy = only(change)

    expect(buy.conversionRatio).toBe(2)
    expect(buy.entryRatio).toBe(2)
    expect(buy.rateRatio).toBe(1)
    expect(buy.ifOnlyEntryMoved).toBeCloseTo(0.2, 12)
    expect(buy.ifOnlyClosingMoved).toBeCloseTo(0.1, 12)
    expect(buy.cause).toBe("entry")
  })

  it("says the ask got better when the same readers reached it", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 10 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 20 },
      ])
    )

    expect(only(change).cause).toBe("closing")
  })

  it("says either where both moved the same way", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 20, converted: 5 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 20 },
      ])
    )

    expect(only(change).cause).toBe("either")
  })

  it("attributes nothing where the conversion share did not move", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 20, converted: 10 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 40, converted: 10 },
      ])
    )
    const buy = only(change)

    expect(buy.conversionRatio).toBe(1)
    expect(buy.cause).toBeNull()
  })

  /**
   * The fourth answer 0244 and 0279 publish, shown to be unreachable here
   * rather than argued away. A product's two counterfactuals multiply to the
   * product of its two levels, so one of them always carries the movement.
   */
  it("has no fourth answer, because a product's counterfactuals cannot both fall short", () => {
    const sides = [0.05, 0.1, 0.2, 0.25, 0.4, 0.5, 0.75, 1]
    const answers = new Set<string>()

    for (const entryWas of sides)
      for (const rateWas of [0, ...sides])
        for (const entryNow of sides)
          for (const rateNow of [0, ...sides]) {
            const cause = conversionCauseOf(
              entryWas * rateWas,
              entryNow * rateNow,
              entryNow * rateWas,
              entryWas * rateNow
            )

            answers.add(String(cause))
          }

    expect([...answers].sort()).toStrictEqual(["closing", "either", "entry", "null"])
  })

  /**
   * And the rule is total anyway. Handed four numbers that are not a funnel's
   * two factors, it says nothing rather than attributing the movement to a
   * side that did not carry it.
   */
  it("attributes nothing where neither counterfactual carries the movement", () => {
    expect(conversionCauseOf(0.1, 0.2, 0.05, 0.05)).toBeNull()
  })
})

describe("the ranking, which is by readers and not by rate", () => {
  /**
   * 0221's rule at the scale of a funnel: a question two readers in three now
   * finish is a better rate and a smaller win than one four hundred in a
   * thousand do.
   */
  it("leads with the pair that moved the most readers, not the biggest ratio", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 1000, appearances: 1000 }, [
        { from: "band", to: "form", reached: 900, converted: 100 },
        { from: "other", to: "signup", reached: 4, converted: 1 },
      ]),
      window({ revision: 2, opened: 1000, appearances: 1000 }, [
        { from: "band", to: "form", reached: 900, converted: 200 },
        { from: "other", to: "signup", reached: 4, converted: 4 },
      ])
    )

    expect(change.mostGained?.pair.from.nodeId).toBe(nodeId("band"))
    expect(change.mostGained?.readersMoved).toBeCloseTo(100, 8)
    expect(change.mostGained?.rateRatio).toBeCloseTo(2, 8)
    expect(change.compared.find((one) => one.pair.from.nodeId === nodeId("other"))?.rateRatio).toBe(
      4
    )
    expect(change.mostLost).toBeNull()
  })

  it("names the pair that lost the most and leaves the gainer out of it", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 20 },
        { from: "other", to: "signup", reached: 50, converted: 5 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 5 },
        { from: "other", to: "signup", reached: 50, converted: 10 },
      ])
    )

    expect(change.mostLost?.pair.from.nodeId).toBe(nodeId("band"))
    expect(change.mostLost?.readersMoved).toBeCloseTo(-15, 8)
    expect(change.mostGained?.pair.from.nodeId).toBe(nodeId("other"))
  })

  it("keeps the first in the compared order on a tie", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 5 },
        { from: "other", to: "signup", reached: 50, converted: 5 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 10 },
        { from: "other", to: "signup", reached: 50, converted: 10 },
      ])
    )

    expect(change.mostGained?.pair).toStrictEqual(change.compared[0]?.pair)
  })

  it("ranks nothing where no share can be taken", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 0, appearances: 0 }, [
        { from: "band", to: "form", reached: 50, converted: 5 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 10 },
      ])
    )

    expect(only(change).readersMoved).toBeNull()
    expect(change.mostGained).toBeNull()
    expect(change.mostLost).toBeNull()
  })
})

describe("what survives a door that cannot say how many readers arrived", () => {
  /**
   * The division this reading is built on. A share of the arrivals needs the
   * door on both sides; a rate does not, because it is two counts off one row.
   */
  it("keeps the rate and the movement where a window has no page-view row", () => {
    const change = funnelChangeOf(
      window(
        { revision: 1, opened: 100, appearances: 100 },
        [{ from: "band", to: "form", reached: 50, converted: 10 }],
        []
      ),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 20 },
      ])
    )
    const buy = only(change)

    expect(change.silence).toBe("unscaled")
    expect(change.compared).toHaveLength(1)
    expect(buy.movement).toBe("held")
    expect(buy.rateRatio).toBe(2)

    expect(buy.entryRatio).toBeNull()
    expect(buy.conversionRatio).toBeNull()
    expect(buy.cause).toBeNull()
    expect(buy.readersMoved).toBeNull()
    expect(buy.rateMoved).toBeNull()
  })

  it("names the senders that are not marking their openings", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 0, appearances: 40 }, [
        { from: "band", to: "form", reached: 20, converted: 4 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 20 },
      ])
    )

    expect(change.silence).toBe("unopened")
    expect(only(change).rateRatio).toBeCloseTo(2, 8)
  })

  it("names a window no rollup has folded yet", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 10 },
      ]),
      window({ revision: 2, opened: 40, appearances: 0 }, [
        { from: "band", to: "form", reached: 0, converted: 0 },
      ])
    )

    expect(change.silence).toBe("uncounted")
  })

  it("reports the worse of two door states rather than one side's", () => {
    const change = funnelChangeOf(
      window(
        { revision: 1, opened: 100, appearances: 100 },
        [{ from: "band", to: "form", reached: 50, converted: 10 }],
        []
      ),
      window({ revision: 2, opened: 40, appearances: 0 }, [
        { from: "band", to: "form", reached: 0, converted: 0 },
      ])
    )

    expect(change.readings.was.silence).toBe("unmeasured")
    expect(change.readings.now.silence).toBe("uncounted")
    expect(change.silence).toBe("unscaled")
  })

  it("refuses two pages outright and compares nothing", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 10 },
      ]),
      window({ revision: 1, opened: 100, appearances: 100, treeId: OTHER_TREE }, [
        { from: "band", to: "form", reached: 50, converted: 20 },
      ])
    )

    expect(change.silence).toBe("different-trees")
    expect(change.compared).toStrictEqual([])
    expect(change.added).toStrictEqual([])
    expect(change.removed).toStrictEqual([])
  })

  it("says the two windows have no question in common", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 10 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "other", to: "signup", reached: 50, converted: 20 },
      ])
    )

    expect(change.silence).toBe("unasked")
    expect(change.compared).toStrictEqual([])
    expect(change.added).toHaveLength(1)
    expect(change.removed).toHaveLength(1)
  })

  it("keeps the questions each window alone was asked, as that window answered them", () => {
    const change = funnelChangeOf(
      window({ revision: 1, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 10 },
        { from: "other", to: "signup", reached: 10, converted: 1 },
      ]),
      window({ revision: 2, opened: 100, appearances: 100 }, [
        { from: "band", to: "form", reached: 50, converted: 20 },
      ])
    )

    expect(change.silence).toBeNull()
    expect(change.compared).toHaveLength(1)
    expect(change.added).toStrictEqual([])
    expect(change.removed.map((one) => one.pair.from.nodeId)).toStrictEqual([nodeId("other")])
  })
})

describe("counting one window's funnel once", () => {
  /**
   * The guard this lane owes every unit that counts (0158): a batch counted
   * twice is counted twice for ever. Here the hazard is a caller that
   * concatenated two reads of the counters, which would put one window's
   * question in the comparison twice and double the readers it moved.
   */
  it("compares a repeated question once and says it dropped one", () => {
    const one = window({ revision: 1, opened: 100, appearances: 100 }, [
      { from: "band", to: "form", reached: 50, converted: 10 },
    ])
    const other = window({ revision: 2, opened: 100, appearances: 100 }, [
      { from: "band", to: "form", reached: 50, converted: 20 },
    ])
    const doubled: FunnelReach = {
      ...other,
      pairs: [...other.pairs, ...other.pairs],
    }

    const change = funnelChangeOf(one, doubled)
    const honest = funnelChangeOf(one, other)

    expect(change.duplicated).toBe(1)
    expect(change.compared).toHaveLength(1)
    expect(change.movements.held).toBe(1)
    expect(only(change).readersMoved).toBe(only(honest).readersMoved)
    expect(change.mostGained?.readersMoved).toBe(honest.mostGained?.readersMoved)
  })

  it("is the pair's two ends and their kinds that make it one question", () => {
    const presses: FunnelPair = {
      from: { nodeId: nodeId("band"), kind: "viewed" },
      to: { nodeId: nodeId("form"), kind: "activated" },
    }

    expect(funnelPairKey(presses)).not.toBe(BUY)
  })
})

describe("the closed sets", () => {
  it("has a line for every silence, movement, question and cause", () => {
    for (const silence of FUNNEL_CHANGE_SILENCES)
      expect(describeFunnelChangeSilence(silence)).toBeTruthy()
    for (const movement of FUNNEL_MOVEMENTS) expect(describeFunnelMovement(movement)).toBeTruthy()
    for (const movement of QUESTION_MOVEMENTS)
      expect(describeQuestionMovement(movement)).toBeTruthy()
    for (const cause of CONVERSION_CAUSES) expect(describeConversionCause(cause)).toBeTruthy()
  })

  it("publishes three causes, one fewer than every other counterfactual here", () => {
    expect(CONVERSION_CAUSES).toStrictEqual(["entry", "closing", "either"])
  })
})

/**
 * A comparison is of one readership, and two forms of one page are two of them.
 *
 * The audience is set on the two readings here rather than threaded through the
 * window helper, because what is under test is the comparison; that a reading
 * names the audience it read is `funnel.test.ts`'s assertion.
 */
describe("funnelChangeOf across two audiences", () => {
  const ONE = window({ revision: 1, opened: 100, appearances: 100 }, [
    { from: "band", to: "form", reached: 50, converted: 10 },
  ])
  const OTHER = window({ revision: 2, opened: 100, appearances: 100 }, [
    { from: "band", to: "form", reached: 50, converted: 20 },
  ])

  /**
   * One question answered twice over two populations, held against itself as
   * though one of the two answers had moved.
   */
  it("refuses a pair of two audiences and holds no question against any other", () => {
    const change = funnelChangeOf(
      { ...ONE, audienceId: SKIERS },
      { ...OTHER, audienceId: RIDERS }
    )

    expect(change.silence).toBe("different-audiences")
    expect(change.compared).toEqual([])
    expect(change.added).toEqual([])
    expect(change.removed).toEqual([])
    expect(change.mostGained).toBeNull()
    expect(change.audiences).toEqual({ was: SKIERS, now: RIDERS })
  })

  it("compares one audience's two windows exactly as it always did", () => {
    const scoped = funnelChangeOf(
      { ...ONE, audienceId: SKIERS },
      { ...OTHER, audienceId: SKIERS }
    )
    const whole = funnelChangeOf(ONE, OTHER)

    expect(scoped.silence).toBe(whole.silence)
    expect(scoped.compared).toEqual(whole.compared)
    expect(scoped.audiences).toEqual({ was: SKIERS, now: SKIERS })
  })

  it("compares a pair it cannot prove and names what it compared across", () => {
    const change = funnelChangeOf(ONE, { ...OTHER, audienceId: SKIERS })

    expect(change.silence).not.toBe("different-audiences")
    expect(change.audiences).toEqual({ was: null, now: SKIERS })
  })

  it("says two pages before it says two audiences", () => {
    const elsewhere = window({ revision: 2, opened: 100, appearances: 100, treeId: OTHER_TREE }, [])
    const change = funnelChangeOf(
      { ...ONE, audienceId: SKIERS },
      { ...elsewhere, audienceId: RIDERS }
    )

    expect(change.silence).toBe("different-trees")
  })
})
