import { describe, expect, it } from "vitest"

import {
  activated,
  batchOf,
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
    expect(rollUp([])).toMatchObject({ tallies: [], funnels: [], views: 0, uncorrelated: 0 })
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
