import { describe, expect, it } from "vitest"

import {
  activated,
  activatedIn,
  batchOf,
  completed,
  completedIn,
  disclosedIn,
  dwelled,
  nodeId,
  OTHER_TREE,
  TREE,
  viewed,
  viewKey,
} from "../testing/reader-signal-contract.js"

import { rollUp, type FunnelPair } from "./rollup.js"

const PAIR: FunnelPair = {
  from: { nodeId: nodeId("pricing"), kind: "viewed" },
  to: { nodeId: nodeId("buy"), kind: "activated" },
}

/** One page view's worth: it reached pricing, and possibly pressed the button. */
const aView = (nth: number, converted: boolean) =>
  batchOf(converted ? [viewed("pricing"), activated("buy")] : [viewed("pricing")], { view: viewKey(nth) })

const tallyFor = (rollup: ReturnType<typeof rollUp>, name: string) =>
  rollup.tallies.find((tally) => tally.nodeId === nodeId(name))

describe("rollUp", () => {
  it("reads nothing as nothing", () => {
    expect(rollUp([])).toMatchObject({
      tallies: [],
      funnels: [],
      views: 0,
      appearances: [],
      uncorrelated: 0,
    })
  })

  it("sums occurrences across the views that produced them", () => {
    const rollup = rollUp([
      batchOf([dwelled("hero", 400)], { view: viewKey(1) }),
      batchOf([dwelled("hero", 600)], { view: viewKey(2) }),
    ])

    expect(tallyFor(rollup, "hero")).toMatchObject({ dwellMs: 1_000, views: 2 })
  })

  /**
   * The distinction the whole shape rests on. One enthusiastic reader can be
   * most of the occurrences; they can only ever be one view. A rate taken over
   * occurrences would say more than a hundred percent of readers converted,
   * and it would say it from real data.
   */
  it("counts one reader's many batches as one view", () => {
    const rollup = rollUp([
      batchOf([dwelled("hero", 400), activated("buy")], { view: viewKey(1) }),
      batchOf([dwelled("hero", 600), activated("buy")], { view: viewKey(1) }),
    ])

    expect(tallyFor(rollup, "hero")).toMatchObject({ views: 1, dwellMs: 1_000 })
    expect(tallyFor(rollup, "buy")).toMatchObject({ views: 1, activations: 2 })
    expect(rollup.views).toBe(1)
  })

  it("counts a node as reached only in the views that actually viewed it", () => {
    const rollup = rollUp([
      batchOf([viewed("hero")], { view: viewKey(1) }),
      batchOf([dwelled("hero", 50)], { view: viewKey(2) }),
    ])

    expect(tallyFor(rollup, "hero")).toMatchObject({ views: 2, reached: 1 })
  })

  it("keeps two revisions of the same node apart", () => {
    const rollup = rollUp([
      batchOf([dwelled("hero", 400)], { revision: 1, view: viewKey(1) }),
      batchOf([dwelled("hero", 900)], { revision: 2, view: viewKey(2) }),
    ])

    expect(rollup.tallies.map((tally) => [tally.revision, tally.dwellMs])).toEqual([
      [1, 400],
      [2, 900],
    ])
  })

  it("keeps two trees apart", () => {
    const rollup = rollUp([
      batchOf([dwelled("hero", 400)], { view: viewKey(1) }),
      batchOf([dwelled("hero", 900)], { treeId: OTHER_TREE, view: viewKey(2) }),
    ])

    expect(rollup.tallies.map((tally) => tally.treeId).sort()).toEqual([OTHER_TREE, TREE].sort())
  })

  describe("appearances", () => {
    /**
     * The number the durable page-view counter keeps beside the exact count of
     * page views that *began*, so that the difference between the two is the
     * straddle 0147 bounds. It is per revision because that is how every
     * durable counter here is keyed and because *before versus after a change*
     * is the question the subtraction is worth doing for.
     */
    it("counts the window's page views, per revision", () => {
      const rollup = rollUp([
        batchOf([viewed("hero")], { view: viewKey(1) }),
        batchOf([viewed("hero")], { view: viewKey(2) }),
        batchOf([viewed("hero")], { revision: 2, view: viewKey(3) }),
      ])

      expect(rollup.appearances).toEqual([
        { treeId: TREE, revision: 1, views: 2 },
        { treeId: TREE, revision: 2, views: 1 },
      ])
    })

    /**
     * The same reader's batches are one appearance, exactly as they are one
     * view. A rollup that counted deliveries here would report a drift the
     * length of every visit and tell a deployment its counters were useless.
     */
    it("counts one reader's many batches once", () => {
      const rollup = rollUp([
        batchOf([dwelled("hero", 400)], { view: viewKey(1) }),
        batchOf([dwelled("hero", 600)], { view: viewKey(1) }),
      ])

      expect(rollup.appearances).toEqual([{ treeId: TREE, revision: 1, views: 1 }])
    })

    it("keeps trees apart", () => {
      const rollup = rollUp([
        batchOf([viewed("hero")], { view: viewKey(1) }),
        batchOf([viewed("hero")], { treeId: OTHER_TREE, view: viewKey(2) }),
      ])

      expect(rollup.appearances.map((one) => one.treeId).sort()).toEqual([OTHER_TREE, TREE].sort())
    })

    /**
     * Absent rather than nought. A revision whose batches carried no key has
     * nothing to compare against the openings, and a zero row would be read as
     * *no readers* rather than as *nobody minted a key* — which is the
     * distinction `uncorrelated` exists to keep.
     */
    it("leaves out a revision whose batches carried no view key", () => {
      const rollup = rollUp([batchOf([viewed("hero")]), batchOf([viewed("hero")], { revision: 2 })])

      expect(rollup.appearances).toEqual([])
      expect(rollup.uncorrelated).toBe(2)
    })

    it("counts the correlated page views of a window that also held uncorrelated batches", () => {
      const rollup = rollUp([batchOf([viewed("hero")]), batchOf([viewed("hero")], { view: viewKey(1) })])

      expect(rollup.appearances).toEqual([{ treeId: TREE, revision: 1, views: 1 }])
    })

    /**
     * An opening marker never reaches a rollup: the buffer drops it at the door
     * (0214), and a rollup that could see it would be a second place deciding
     * how many readers arrived. So a window of openings is a window of
     * appearances like any other.
     */
    it("counts an opening batch as an appearance and nothing more", () => {
      const rollup = rollUp([batchOf([viewed("hero")], { view: viewKey(1), first: true })])

      expect(rollup.appearances).toEqual([{ treeId: TREE, revision: 1, views: 1 }])
      expect(JSON.stringify(rollup)).not.toContain("first")
    })
  })

  describe("batches with no view key", () => {
    it("counts their occurrences", () => {
      const rollup = rollUp([batchOf([dwelled("hero", 400)])])

      expect(tallyFor(rollup, "hero")).toMatchObject({ dwellMs: 400 })
    })

    /**
     * Treating each uncorrelated batch as its own view would inflate every
     * denominator by however often a page happened to flush — a number about
     * the network rather than about readers.
     */
    it("counts no views for them, and says how many it could not correlate", () => {
      const rollup = rollUp([batchOf([viewed("hero")]), batchOf([viewed("hero")])])

      expect(tallyFor(rollup, "hero")).toMatchObject({ views: 0, reached: 0 })
      expect(rollup).toMatchObject({ views: 0, uncorrelated: 2 })
    })
  })

  describe("funnels", () => {
    it("answers nothing when no pair was asked about", () => {
      expect(rollUp([aView(1, true)]).funnels).toEqual([])
    })

    it("answers of-the-views-that-reached-A-how-many-did-B", () => {
      const rollup = rollUp([aView(1, true), aView(2, false), aView(3, true), aView(4, false)], {
        pairs: [PAIR],
      })

      expect(rollup.funnels).toEqual([
        { treeId: TREE, revision: 1, pair: PAIR, reached: 4, converted: 2 },
      ])
    })

    it("does not count a conversion in a view that never reached the first end", () => {
      const rollup = rollUp(
        [aView(1, true), batchOf([activated("buy")], { view: viewKey(2) })],
        { pairs: [PAIR] }
      )

      expect(rollup.funnels[0]).toMatchObject({ reached: 1, converted: 1 })
    })

    it("counts one view once however many times it converted", () => {
      const rollup = rollUp(
        [aView(1, true), batchOf([activated("buy")], { view: viewKey(1) })],
        { pairs: [PAIR] }
      )

      expect(rollup.funnels[0]).toMatchObject({ reached: 1, converted: 1 })
    })

    it("answers the same pair separately for each revision it saw", () => {
      const rollup = rollUp(
        [
          batchOf([viewed("pricing"), activated("buy")], { revision: 1, view: viewKey(1) }),
          batchOf([viewed("pricing")], { revision: 2, view: viewKey(2) }),
        ],
        { pairs: [PAIR] }
      )

      expect(rollup.funnels.map((answer) => [answer.revision, answer.reached, answer.converted])).toEqual([
        [1, 1, 1],
        [2, 1, 0],
      ])
    })

    it("answers zero for a pair no view reached, rather than omitting it", () => {
      const rollup = rollUp([batchOf([viewed("hero")], { view: viewKey(1) })], { pairs: [PAIR] })

      expect(rollup.funnels[0]).toMatchObject({ reached: 0, converted: 0 })
    })

    it("never reports more conversions than it reported reaches", () => {
      const rollup = rollUp([aView(1, true), aView(2, true), aView(1, true)], { pairs: [PAIR] })
      const [answer] = rollup.funnels

      expect((answer?.converted ?? 0) <= (answer?.reached ?? 0)).toBe(true)
    })

    it("cannot correlate a view that never had a key", () => {
      const rollup = rollUp([batchOf([viewed("pricing"), activated("buy")])], { pairs: [PAIR] })

      expect(rollup.funnels[0]).toMatchObject({ reached: 0, converted: 0 })
    })
  })

  /**
   * The counter a region is reported by. Everything else on a tally is about
   * the node itself, and a band is never the node anybody pressed.
   */
  /**
   * The conversion counter (0211). Everything above it counts a reader looking;
   * this one counts a reader finishing.
   */
  describe("completions", () => {
    it("counts a form let go against the node the form is", () => {
      const rollup = rollUp([batchOf([completed("signup")], { view: viewKey(1) })])

      expect(tallyFor(rollup, "signup")).toMatchObject({ completions: 1, views: 1 })
    })

    /**
     * The double-count that would be permanent if it got in (0158). Occurrences
     * sum, so two submissions in one view are two completions — and the number
     * that must *not* move with them is the view count, which is what any rate
     * is taken over.
     */
    it("sums two submissions in one page view without counting the view twice", () => {
      const rollup = rollUp([
        batchOf([completed("signup")], { view: viewKey(1) }),
        batchOf([completed("signup")], { view: viewKey(1) }),
      ])

      expect(tallyFor(rollup, "signup")).toMatchObject({ completions: 2, views: 1 })
      expect(rollup.views).toBe(1)
    })

    /**
     * The commercial question, and the reason the kind carries an ancestry at
     * all: *which band converted*. The form's own row says it was submitted;
     * the band's row says somebody finished something in it.
     */
    it("credits the bands the form was the end of, and not the form", () => {
      const rollup = rollUp([batchOf([completedIn("signup", "pricing", "page")], { view: viewKey(1) })])

      expect(tallyFor(rollup, "signup")).toMatchObject({ completions: 1, engaged: 0 })
      expect(tallyFor(rollup, "pricing")).toMatchObject({ completions: 0, engaged: 1 })
      expect(tallyFor(rollup, "page")).toMatchObject({ completions: 0, engaged: 1 })
    })

    /**
     * What the kind was approved for: the difference between *they looked at
     * the pricing band* and *they bought*. A pair ending in `completed` is a
     * conversion rate, and it needed no new shape — a funnel end already names
     * a kind.
     */
    it("answers a funnel that ends in a completion", () => {
      const rollup = rollUp(
        [
          batchOf([viewed("pricing"), completed("signup")], { view: viewKey(1) }),
          batchOf([viewed("pricing")], { view: viewKey(2) }),
        ],
        {
          pairs: [
            { from: { nodeId: nodeId("pricing"), kind: "viewed" }, to: { nodeId: nodeId("signup"), kind: "completed" } },
          ],
        }
      )

      expect(rollup.funnels).toMatchObject([{ reached: 2, converted: 1 }])
    })

    it("counts nothing for a node nobody submitted", () => {
      const rollup = rollUp([batchOf([viewed("pricing")], { view: viewKey(1) })])

      expect(tallyFor(rollup, "pricing")).toMatchObject({ completions: 0 })
    })
  })

  describe("engaged", () => {
    it("credits the regions a press happened inside, and not the region with the press", () => {
      const rollup = rollUp([batchOf([activatedIn("buy", "pricing", "page")], { view: viewKey(1) })])

      expect(tallyFor(rollup, "buy")).toMatchObject({ activations: 1, engaged: 0 })
      expect(tallyFor(rollup, "pricing")).toMatchObject({ activations: 0, engaged: 1 })
      expect(tallyFor(rollup, "page")).toMatchObject({ activations: 0, engaged: 1 })
    })

    /**
     * The reason this is a view counter rather than an occurrence one. *Five
     * readers used something in this band* is the sentence a page wants, and one
     * reader pressing five times is not five readers.
     */
    it("counts one reader who pressed four things in a band as one engaged view", () => {
      const rollup = rollUp([
        batchOf([activatedIn("buy", "pricing"), activatedIn("compare", "pricing")], { view: viewKey(1) }),
        batchOf([activatedIn("buy", "pricing"), activatedIn("help", "pricing")], { view: viewKey(1) }),
      ])

      expect(tallyFor(rollup, "pricing")).toMatchObject({ engaged: 1 })
    })

    it("counts two readers as two", () => {
      const rollup = rollUp([
        batchOf([activatedIn("buy", "pricing")], { view: viewKey(1) }),
        batchOf([activatedIn("buy", "pricing")], { view: viewKey(2) }),
      ])

      expect(tallyFor(rollup, "pricing")).toMatchObject({ engaged: 2 })
    })

    /** Opening a disclosure is a reader using something, and it is never reported as a press. */
    it("counts a disclosure opened inside a region", () => {
      const rollup = rollUp([batchOf([disclosedIn("terms", true, "pricing")], { view: viewKey(1) })])

      expect(tallyFor(rollup, "pricing")).toMatchObject({ engaged: 1, opens: 0 })
      expect(tallyFor(rollup, "terms")).toMatchObject({ engaged: 0, opens: 1 })
    })

    /**
     * Absent ancestry is *nobody looked*, not *there was nothing above it*, so
     * it adds nothing rather than being read as a press at the top of the page.
     */
    it("adds nothing for a signal that carries no ancestry", () => {
      const rollup = rollUp([batchOf([viewed("pricing"), activated("buy")], { view: viewKey(1) })])

      expect(tallyFor(rollup, "pricing")).toMatchObject({ reached: 1, engaged: 0 })
    })

    it("adds nothing from a batch nothing can correlate, like every other view counter", () => {
      const rollup = rollUp([batchOf([activatedIn("buy", "pricing")])])

      expect(tallyFor(rollup, "pricing")).toBeUndefined()
      expect(rollup.uncorrelated).toBe(1)
    })

    /**
     * A region a host asked for no other kind about still gets a row. Its
     * `views` stays 0 on purpose: somebody used something in it, and nothing
     * measured whether it was ever on screen — two different facts, and a row
     * that claimed a view would be the wrong one.
     */
    it("gives a region named only by an ancestry a row, with no view claimed for it", () => {
      const rollup = rollUp([batchOf([activatedIn("buy", "pricing")], { view: viewKey(1) })])

      expect(tallyFor(rollup, "pricing")).toMatchObject({ views: 0, reached: 0, engaged: 1, dwellMs: 0 })
    })

    it("keeps regions apart by revision, like every other counter", () => {
      const rollup = rollUp([
        batchOf([activatedIn("buy", "pricing")], { view: viewKey(1), revision: 1 }),
        batchOf([activatedIn("buy", "pricing")], { view: viewKey(2), revision: 2 }),
      ])

      expect(rollup.tallies.filter((tally) => tally.nodeId === nodeId("pricing"))).toHaveLength(2)
    })
  })

  /**
   * The output is what the portal reads and what the store keeps, so nothing in
   * it may carry the key. This is the assertion that says so rather than a
   * reading of the types.
   */
  it("carries no view key into anything it returns", () => {
    const rollup = rollUp([aView(1, true), aView(2, false)], { pairs: [PAIR] })

    expect(JSON.stringify(rollup)).not.toContain(viewKey(1))
    expect(JSON.stringify(rollup)).not.toContain(viewKey(2))
  })
})
