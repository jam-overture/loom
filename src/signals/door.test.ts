import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import { TREE } from "../testing/reader-signal-contract.js"

import { atDoorScale, doorOf, type PageDoor, type RevisionPageViews } from "./index.js"

/**
 * The scale three readings share, tested once where it lives.
 *
 * It was two hand-written copies of one rule before a third reading needed it,
 * and the fact worth pinning here is the one a copy could get wrong quietly:
 * which of the three door states a row is in, and that the weight is a minimum
 * of two whole numbers rather than a division.
 */

const row = (counts: Partial<RevisionPageViews> = {}): RevisionPageViews => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  audiences: [DEFAULT_AUDIENCE_ID],
  treeId: TREE,
  revision: 1,
  opened: 0,
  appearances: 0,
  updatedAt: "2026-10-14T00:00:00.000Z",
  drift: 0,
  pending: 0,
  inflation: null,
  ...counts,
})

/**
 * A door built the way the page-view reading builds one, so that `drift`,
 * `pending` and `inflation` cannot disagree with the two counts they are derived
 * from. A hand-written row with an invented inflation would test the fixture.
 */
const scaleOf = (opened: number, appearances: number): PageDoor =>
  doorOf(
    row({
      opened,
      appearances,
      drift: Math.max(0, appearances - opened),
      pending: Math.max(0, opened - appearances),
      inflation: opened === 0 ? null : Math.max(0, appearances - opened) / opened,
    })
  )

/**
 * The spelling three ranking keys wrote by hand until 0344, kept here to be
 * compared against.
 *
 * The straddle rate is taken off the door's own two counts rather than read from
 * a field, because {@link PageDoor} deliberately does not carry one: the figure
 * the scale needs is the weight, and the fraction it stands for is what 0229 was
 * bitten by. Reaching for `of.inflation` here cost this unit an afternoon — it
 * is `undefined`, and `count ÷ (1 + undefined)` is a `NaN` that a test helper
 * then looked for the exact value of.
 */
const divisionFirst = (count: number, of: PageDoor): number =>
  count / (1 + of.drift / of.opened)

/**
 * One double, exactly, as a fraction of two integers.
 *
 * A double is a dyadic rational, so doubling the value until it is a whole
 * number loses nothing — which is what lets two candidate figures be ranked by
 * their distance from a value neither of them can hold.
 *
 * It refuses anything that is not finite rather than doubling it for ever, which
 * is what a `NaN` handed in here did once.
 */
const fractionOf = (value: number): { readonly over: bigint; readonly under: bigint } => {
  if (!Number.isFinite(value)) throw new Error(`no exact fraction for ${value}`)

  let over = value
  let under = 1n

  while (!Number.isInteger(over)) {
    over *= 2
    under *= 2n
  }

  return { over: BigInt(over), under }
}

/**
 * Which of two candidates is further from `over ÷ under`, as `-1`, `0` or `1`.
 *
 * `|a − n/d|` against `|b − n/d|` is `|a.over × d − n × a.under| × b.under`
 * against the same for `b`, which is whole-number arithmetic throughout and so
 * says what two doubles that differ in the last place cannot say about
 * themselves.
 */
const furtherFrom = (
  exact: { readonly over: bigint; readonly under: bigint },
  one: number,
  other: number
): number => {
  const [a, b] = [fractionOf(one), fractionOf(other)]
  const off = (of: { readonly over: bigint; readonly under: bigint }): bigint => {
    const by = of.over * exact.under - exact.over * of.under
    return by < 0n ? -by : by
  }
  const [offOne, offOther] = [off(a) * b.under, off(b) * a.under]

  return offOne === offOther ? 0 : offOne > offOther ? 1 : -1
}

describe("the scale a page's door counts in", () => {
  it("weighs a page by the page views a rollup folded, at the door's scale", () => {
    const door = doorOf(row({ opened: 100, appearances: 140, drift: 40, inflation: 0.4 }))

    expect(door.counted).toBe(100)
    expect(door.opened).toBe(100)
    expect(door.appearances).toBe(140)
    expect(door.drift).toBe(40)
    expect(door.silence).toBe(null)
  })

  /**
   * Taken as a minimum and not as `appearances ÷ (1 + inflation)`, because the
   * division of three floats agrees with it to fifteen places and not to
   * sixteen (0229).
   */
  it("takes the weight as a whole number, which the division it stands for is not", () => {
    const door = doorOf(row({ opened: 3, appearances: 7, drift: 4, inflation: 4 / 3 }))

    expect(door.counted).toBe(3)
    expect(Number.isInteger(door.counted)).toBe(true)
    expect(7 / (1 + 4 / 3)).not.toBe(3)
  })

  it("keeps the page views waiting to be folded, which weigh nothing yet", () => {
    const door = doorOf(row({ opened: 25, appearances: 10, pending: 15 }))

    expect(door.counted).toBe(10)
    expect(door.pending).toBe(15)
    expect(door.silence).toBe(null)
  })

  /**
   * The three reasons in the order a page's own reading tries them in: no row
   * before nothing opened, because *there is no row* is a state a deployment can
   * be in without its senders being at fault.
   */
  it("tells a missing row, an unmarked opening and an unfolded window apart", () => {
    expect(doorOf(null).silence).toBe("unmeasured")
    expect(doorOf(null).opened).toBe(0)
    expect(doorOf(row({ opened: 0, appearances: 10 })).silence).toBe("unopened")
    expect(doorOf(row({ opened: 10, appearances: 0, pending: 10 })).silence).toBe("uncounted")
  })

  it("carries the openings of a page it cannot scale, because arrivals are counted either way", () => {
    const door = doorOf(row({ opened: 10, appearances: 0, pending: 10 }))

    expect(door.opened).toBe(10)
    expect(door.counted).toBe(0)
  })
})

describe("a count put on the scale its door counts in", () => {
  it("weighs the count by the page views a rollup folded", () => {
    expect(atDoorScale(1, scaleOf(3, 10))).toBe(0.3)
    expect(atDoorScale(7, scaleOf(250, 1_000))).toBe(1.75)
  })

  /**
   * The reason the rule could be published at all (0344). It was documented as
   * only ever called where `appearances` is positive, and that precondition is
   * what kept two ranking keys spelling the rule a second time by hand. A door
   * that folded nothing has nothing to divide out, so the count is its own
   * figure — and the alternative is not a wrong figure but a `NaN` in a ranking
   * key, which sorts wherever the comparator leaves it.
   */
  it("answers the count itself where a door folded nothing, rather than a NaN", () => {
    expect((7 * 0) / 0).toBeNaN()
    expect(atDoorScale(7, scaleOf(10, 0))).toBe(7)
    expect(atDoorScale(0, scaleOf(10, 0))).toBe(0)
  })

  /**
   * The other half of why the rule could be shared, and the half that is about a
   * published figure rather than an edge. Where the weight equals the
   * appearances it divides — every page with no drift — `count × n ÷ n` is the
   * count mathematically and not in floats. An order of movements ranks on a
   * share movement times a count, which is **not** a whole number, so taking the
   * scale the obvious way would have moved the published figure of every page
   * the door has nothing to correct.
   */
  it("takes a scale that is the identity exactly, which the multiplication it stands for does not", () => {
    expect((0.1 * 3) / 3).not.toBe(0.1)
    expect(atDoorScale(0.1, scaleOf(5, 3))).toBe(0.1)
    expect(atDoorScale(0.1, scaleOf(3, 3))).toBe(0.1)
    expect(atDoorScale(1 / 3, scaleOf(7, 7))).toBe(1 / 3)
  })

  /**
   * The one caller that hands in two: a comparison asks what one side's reading
   * would have come to with the other side's traffic behind it, so the share is
   * of the door the count came from and the weight is the other's.
   */
  it("weighs one side's reading with the other side's traffic", () => {
    const [was, now] = [scaleOf(100, 400), scaleOf(50, 200)]

    expect(atDoorScale(40, was, now)).toBe((40 * 50) / 400)
    expect(atDoorScale(40, was, now)).not.toBe(atDoorScale(40, was))
  })

  /**
   * The claim 0344 rests on, and the reason the two keys that swapped onto this
   * rule moved in their last place rather than staying put: the two spellings are
   * one rule by two routes, and the routes do not agree. Three roundings against
   * two, so the question is not whether they differ but which is nearer, and the
   * answer is checked against whole-number arithmetic rather than asserted.
   */
  it("is never further from the exact value than the spelling it replaced, and is often closer", () => {
    const tally = { compared: 0, closer: 0, further: 0 }

    for (let opened = 1; opened <= 40; opened++) {
      for (let appearances = 1; appearances <= 40; appearances++) {
        const door = scaleOf(opened, appearances)

        if (door.counted === appearances) continue

        for (let count = 0; count <= appearances; count++) {
          const exact = { over: BigInt(count) * BigInt(door.counted), under: BigInt(appearances) }
          const verdict = furtherFrom(exact, atDoorScale(count, door), divisionFirst(count, door))

          tally.compared++
          if (verdict === 1) tally.further++
          if (verdict === -1) tally.closer++
        }
      }
    }

    /** Counted and asserted once rather than per triple, which is 22,100 assertions. */
    expect(tally).toEqual({ compared: 22_100, closer: 4_963, further: 0 })
  })

  /**
   * The double-count case this lane tests every counting unit against (0158).
   * A readership read through two rollup windows: the distinct view counts
   * against the page double and so do the appearances the door saw, while the
   * openings are counted once at the door (0219). The scale is exactly what
   * divides that back out, and the figure does not move in its last place
   * either — `2c × o ÷ 2a` and `c × o ÷ a` are scalings by two of one quotient.
   */
  it("gives one readership the same figure whether a window folded it once or twice", () => {
    const once = atDoorScale(60, scaleOf(100, 400))
    const twice = atDoorScale(120, scaleOf(100, 800))

    expect(twice).toBe(once)
    expect(once).toBe(15)
  })
})
