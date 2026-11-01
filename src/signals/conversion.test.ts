import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID, type AudienceId } from "../audience/audience.js"
import { nodeId, OTHER_TREE, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION } from "../tree/tree.js"
import type { TreeId } from "../ids.js"

import {
  CONVERSION_SILENCES,
  CONVERSION_STANDINGS,
  describeConversionStanding,
  deploymentConversionOf,
  funnelReachOf,
  pageReadingOf,
  type FunnelPair,
  type FunnelReach,
  type PageReading,
  type PartDeclarations,
  type StoredFunnel,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on funnel answers, because that is what the order takes: each one is a
 * revision's questions read against the exact number of readers that revision
 * had. The answers are produced by the reading rather than written out, so what
 * this order is over is what a deployment would actually hand it.
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
  element("band", "loom.section"),
  element("form", "loom.form"),
  element("other", "loom.section"),
])

/** A page with no `gone` node, so a question naming one is stale. */
const readingOf = (
  treeId: TreeId = TREE,
  revision = 1,
  /** `null` is a reading that asked for no form, which is not the same as the default one. */
  audienceId: AudienceId | null = DEFAULT_AUDIENCE_ID
): PageReading =>
  pageReadingOf(
    { treeId, schemaVersion: TREE_SCHEMA_VERSION, revision, root: PAGE },
    [],
    NOTHING_DECLARED,
    audienceId ?? undefined
  )

const AT = "2026-11-01T09:00:00.000Z"

const pair = (from: string, to: string): FunnelPair => ({
  from: { nodeId: nodeId(from), kind: "viewed" },
  to: { nodeId: nodeId(to), kind: "completed" },
})

const funnel = (
  where: PageReading,
  from: string,
  to: string,
  reached: number,
  converted: number
): StoredFunnel => ({
  audienceId: where.audienceId ?? DEFAULT_AUDIENCE_ID,
  treeId: where.treeId,
  revision: where.revision,
  pair: pair(from, to),
  reached,
  converted,
  updatedAt: AT,
})

const views = (where: PageReading, opened: number, appearances: number): StoredPageViews => ({
  audienceId: where.audienceId ?? DEFAULT_AUDIENCE_ID,
  treeId: where.treeId,
  revision: where.revision,
  opened,
  appearances,
  updatedAt: AT,
})

const answerOf = (
  reading: PageReading,
  funnels: readonly StoredFunnel[],
  rows: readonly StoredPageViews[]
): FunnelReach => funnelReachOf(reading, funnels, rows)

/** One page, one sound question, with a loss and a scale for it. */
const leaking = (
  reading: PageReading,
  reached: number,
  converted: number,
  opened = 100,
  appearances = 100
): FunnelReach =>
  answerOf(
    reading,
    [funnel(reading, "band", "form", reached, converted)],
    [views(reading, opened, appearances)]
  )

describe("the order a deployment's conversions should be looked at in", () => {
  it("ranks a page by the readers it loses between the two ends, on the door's scale", () => {
    const reading = readingOf()
    const order = deploymentConversionOf([leaking(reading, 80, 20, 100, 125)])

    const row = order.ranked[0]

    expect(order.ranked).toHaveLength(1)
    expect(row?.standing).toBe("ranked")
    expect(row?.lost).toBe(60)
    /** 100 openings against 125 appearances is a quarter of a straddle on top. */
    expect(row?.inflation).toBe(0.25)
    expect(row?.readers).toBe(48)
    expect(row?.rate).toBe(0.25)
    expect(order.worst).toEqual(row)
  })

  it("never ranks the readers lost before the first end, which is where reading stopped", () => {
    const reading = readingOf()
    /**
     * Two readers of a hundred reached the ask and both answered it. The
     * ninety-eight who never got there are the fall the order of falls ranks,
     * and this order has nothing to say about them.
     */
    const order = deploymentConversionOf([leaking(reading, 2, 2)])

    expect(order.ranked).toEqual([])
    expect(order.unranked[0]?.standing).toBe("unleaked")
    expect(order.unranked[0]?.at?.reached).toBe(2)
  })

  it("puts the worse loss above the worse rate, which is how a page ranks its own falls", () => {
    const big = readingOf(TREE)
    const small = readingOf(OTHER_TREE)

    const order = deploymentConversionOf([
      /** A tenth of four hundred left, which is a kinder rate and a bigger problem. */
      leaking(small, 10, 1, 100, 100),
      leaking(big, 400, 360, 1_000, 1_000),
    ])

    expect(order.ranked.map((row) => row.treeId)).toEqual([TREE, OTHER_TREE])
    expect(order.worst?.lost).toBe(40)
  })

  it("breaks a tie on the worse rate, and then on the page, so nothing reorders on a refresh", () => {
    const one = readingOf(TREE)
    const other = readingOf(OTHER_TREE)

    const order = deploymentConversionOf([
      /** The same ten readers lost, out of fifty reaching the ask and out of twenty. */
      leaking(one, 50, 40),
      leaking(other, 20, 10),
    ])

    expect(order.ranked.map((row) => row.rate)).toEqual([0.5, 0.8])
    expect(order.ranked.map((row) => row.treeId)).toEqual([OTHER_TREE, TREE])
  })

  it("ranks the sharpest of a page's questions and counts the rest", () => {
    const reading = readingOf()
    const order = deploymentConversionOf([
      answerOf(
        reading,
        [
          funnel(reading, "band", "form", 30, 25),
          funnel(reading, "other", "form", 90, 10),
        ],
        [views(reading, 100, 100)]
      ),
    ])

    expect(order.ranked[0]?.at?.pair.from.nodeId).toBe(nodeId("other"))
    expect(order.ranked[0]?.lost).toBe(80)
    expect(order.questions).toBe(2)
  })

  describe("what keeps a page out of the order", () => {
    it("reports a window of two forms as neither, rather than as a page nothing asks of", () => {
      /**
       * The reading names no audience and the rows name two, so no question was
       * read — which is the same empty pair list a page with no question has,
       * and the reason this is checked first.
       */
      const reading = readingOf(TREE, 1, null)
      const both = [
        { ...funnel(reading, "band", "form", 80, 10), audienceId: SKIERS },
        { ...funnel(reading, "band", "form", 40, 30), audienceId: RIDERS },
      ]
      const order = deploymentConversionOf([
        answerOf(reading, both, [
          { ...views(reading, 500, 500), audienceId: SKIERS },
          { ...views(reading, 300, 300), audienceId: RIDERS },
        ]),
      ])

      expect(order.unranked[0]?.standing).toBe("unsplit")
      expect(order.unranked[0]?.questions).toBe(0)
    })

    it("tells a page nothing asks anything of apart from one nobody has answered", () => {
      const asked = readingOf(TREE)
      const silent = readingOf(OTHER_TREE)

      const order = deploymentConversionOf([
        answerOf(asked, [], [views(asked, 50, 50)]),
        answerOf(
          silent,
          [funnel(silent, "band", "form", 0, 0)],
          [views(silent, 50, 50)]
        ),
      ])

      expect(order.standings.unasked).toBe(1)
      expect(order.standings.unanswered).toBe(1)
    })

    it("holds a revision whose every question names a part it no longer has out of the order", () => {
      const reading = readingOf()
      const order = deploymentConversionOf([
        answerOf(
          reading,
          [funnel(reading, "gone", "form", 40, 2)],
          [views(reading, 100, 100)]
        ),
      ])

      expect(order.unranked[0]?.standing).toBe("stale")
      expect(order.unranked[0]?.stalePairs).toBe(1)
      expect(order.stalePairs).toBe(1)
    })

    it("ranks a sound question on a page that also holds a stale one", () => {
      const reading = readingOf()
      const order = deploymentConversionOf([
        answerOf(
          reading,
          [
            /** The larger loss, and it is against a part the page has not got. */
            funnel(reading, "gone", "form", 90, 1),
            funnel(reading, "band", "form", 40, 30),
          ],
          [views(reading, 100, 100)]
        ),
      ])

      expect(order.ranked[0]?.standing).toBe("ranked")
      expect(order.ranked[0]?.lost).toBe(10)
      expect(order.ranked[0]?.stalePairs).toBe(1)
    })

    it("names each of the door's three states rather than one of them", () => {
      const unscaled = readingOf(TREE)
      const unopened = readingOf(OTHER_TREE)
      const uncounted = readingOf(TREE, 2)

      const order = deploymentConversionOf([
        answerOf(unscaled, [funnel(unscaled, "band", "form", 9, 1)], []),
        answerOf(unopened, [funnel(unopened, "band", "form", 9, 1)], [
          views(unopened, 0, 0),
        ]),
        answerOf(uncounted, [funnel(uncounted, "band", "form", 9, 1)], [
          views(uncounted, 40, 0),
        ]),
      ])

      expect(order.standings.unscaled).toBe(1)
      expect(order.standings.unopened).toBe(1)
      expect(order.standings.uncounted).toBe(1)
      expect(order.ranked).toEqual([])
      /** No row for the revision is not a row saying nought arrivals. */
      expect(order.unranked.find((row) => row.standing === "unscaled")?.opened).toBeNull()
      expect(order.unranked.find((row) => row.standing === "unopened")?.opened).toBe(0)
    })

    it("keeps the counts and withholds the scale where more readers reached an ask than appeared", () => {
      const reading = readingOf()
      const order = deploymentConversionOf([leaking(reading, 300, 40, 100, 100)])

      const row = order.unranked[0]

      expect(row?.standing).toBe("inconsistent")
      expect(row?.lost).toBe(260)
      expect(row?.readers).toBeNull()
      /** Sound without any correction, because both counts come off one row. */
      expect(row?.rate).toBeCloseTo(40 / 300)
    })
  })

  describe("a page is counted once, however many times it was handed in", () => {
    it("drops a reading of a revision beyond the first and says how many it dropped", () => {
      const reading = readingOf()
      const answer = leaking(reading, 80, 20)

      const order = deploymentConversionOf([answer, answer, answer])

      expect(order.ranked).toHaveLength(1)
      expect(order.duplicated).toBe(2)
      /** The arrivals, the questions and the stale questions all counted once. */
      expect(order.arrivals).toBe(100)
      expect(order.questions).toBe(1)
      expect(order.trees).toBe(1)
    })

    it("keeps two forms of one page as two rows, because their losses are of two populations", () => {
      const skiers = readingOf(TREE, 1, SKIERS)
      const riders = readingOf(TREE, 1, RIDERS)

      const order = deploymentConversionOf([
        leaking(skiers, 80, 20, 500, 500),
        leaking(riders, 40, 30, 300, 300),
      ])

      expect(order.ranked).toHaveLength(2)
      expect(order.duplicated).toBe(0)
      expect(order.trees).toBe(1)
      expect(order.arrivals).toBe(800)
    })

    it("keeps two revisions of one tree as two rows and one tree", () => {
      const was = readingOf(TREE, 1)
      const now = readingOf(TREE, 2)

      const order = deploymentConversionOf([leaking(was, 80, 20), leaking(now, 40, 30)])

      expect(order.ranked).toHaveLength(2)
      expect(order.trees).toBe(1)
      /** The order is by the loss, so the earlier revision leads it on sixty against ten. */
      expect(order.ranked.map((row) => row.revision)).toEqual([1, 2])
    })
  })

  describe("the vocabulary", () => {
    it("answers nothing for a deployment whose pages were all handed in empty", () => {
      const order = deploymentConversionOf([])

      expect(order).toEqual({
        ranked: [],
        unranked: [],
        worst: null,
        standings: Object.fromEntries(CONVERSION_STANDINGS.map((standing) => [standing, 0])),
        trees: 0,
        arrivals: 0,
        questions: 0,
        stalePairs: 0,
        duplicated: 0,
      })
    })

    it("is a closed set whose silences are all standings, described once each", () => {
      const lines = CONVERSION_STANDINGS.map(describeConversionStanding)

      expect(new Set(lines).size).toBe(CONVERSION_STANDINGS.length)
      expect(lines.every((line) => line.length > 0 && !/\b0\d{3}\b/.test(line))).toBe(true)
      expect(CONVERSION_SILENCES.every((silence) => CONVERSION_STANDINGS.includes(silence))).toBe(
        true
      )
      /** In the order, nothing asked, and nothing lost are the three that are not silences. */
      expect(CONVERSION_STANDINGS.length - CONVERSION_SILENCES.length).toBe(3)
    })

    it("counts every page read in exactly one standing", () => {
      const order = deploymentConversionOf([
        leaking(readingOf(TREE), 80, 20),
        leaking(readingOf(OTHER_TREE), 2, 2),
        answerOf(readingOf(TREE, 2), [], [views(readingOf(TREE, 2), 10, 10)]),
      ])

      const counted = Object.values(order.standings).reduce((sum, count) => sum + count, 0)

      expect(counted).toBe(order.ranked.length + order.unranked.length)
      expect(counted).toBe(3)
    })
  })
})
