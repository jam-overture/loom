import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import { treeIdSchema, type TreeId } from "../ids.js"
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
  DEPLOYMENT_CHANGE_SILENCES,
  deploymentChangeOf,
  describeMovementStanding,
  MOVEMENT_STANDINGS,
  pageReadingOf,
  readingChangeOf,
  type PartDeclarations,
  type ReaderTally,
  type ReadingChange,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on real comparisons rather than on hand-written ones, because the thing
 * under test is an order over what a deployment actually holds: two trees and
 * two windows of counters go in one end of the pipeline and a page's place in
 * the order comes out of the other.
 *
 * Nothing here reaches a store, a clock or a browser, and nothing added to a
 * payload is under test because nothing was added to one.
 */

const THIRD_TREE = treeIdSchema.parse("t_third") as TreeId

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const band = (name: string): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType("loom.section"),
  props: {},
  children: [],
})

const treeOf = (treeId: TreeId, revision: number, bands: number): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root: {
    kind: "element",
    id: nodeId("page"),
    type: primitiveType("loom.stack"),
    props: {},
    children: Array.from({ length: bands }, (_, at) => band(`band${at + 1}`)),
  },
})

const tally = (treeId: TreeId, revision: number, name: string, reached: number): ReaderTally => ({
  treeId,
  revision,
  nodeId: nodeId(name),
  type: primitiveType("loom.section"),
  views: reached,
  reached,
  engaged: 0,
  dwellMs: 0,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
})

/**
 * One window of one page, as a band-by-band reading.
 *
 * A band reached by nobody is handed in with no row at all, which is what a
 * rollup does.
 */
const windowOf = (treeId: TreeId, revision: number, reached: readonly number[]) =>
  pageReadingOf(
    treeOf(treeId, revision, reached.length),
    reached.flatMap((count, at) =>
      count > 0 ? [tally(treeId, revision, `band${at + 1}`, count)] : []
    ),
    NOTHING_DECLARED
  )

/** One page compared across two windows, which is what this order is made of. */
const changeOf = (
  treeId: TreeId,
  was: readonly number[],
  now: readonly number[],
  revisions: { readonly was: number; readonly now: number } = { was: 1, now: 2 }
): ReadingChange =>
  readingChangeOf(windowOf(treeId, revisions.was, was), windowOf(treeId, revisions.now, now))

const door = (
  treeId: TreeId,
  revision: number,
  opened: number,
  appearances: number
): StoredPageViews => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  treeId,
  revision,
  opened,
  appearances,
  updatedAt: "2026-10-16T21:00:00.000Z",
})

/** A page whose readers never straddled a window, so its counters need no scaling. */
const exact = (treeId: TreeId, revision: number, views: number): StoredPageViews =>
  door(treeId, revision, views, views)

describe("deploymentChangeOf", () => {
  it("names the page a change hurt and the page it helped, out of the pages a deployment holds", () => {
    const reading = deploymentChangeOf(
      [changeOf(TREE, [100, 100, 100], [100, 40, 40]), changeOf(OTHER_TREE, [100, 20, 20], [100, 90, 90])],
      [exact(TREE, 2, 100), exact(OTHER_TREE, 2, 100)]
    )

    expect(reading.worst?.treeId).toBe(TREE)
    expect(reading.best?.treeId).toBe(OTHER_TREE)
    expect(reading.harmed.map((row) => row.treeId)).toEqual([TREE])
    expect(reading.helped.map((row) => row.treeId)).toEqual([OTHER_TREE])
    expect(reading.compared).toBe(2)
    expect(reading.arrivals).toBe(200)
    expect(reading.standings.ranked).toBe(2)
  })

  it("names the band each movement happened at, and the share it moved by", () => {
    const reading = deploymentChangeOf(
      [changeOf(TREE, [100, 100], [100, 40])],
      [exact(TREE, 2, 100)]
    )

    expect(reading.worst?.worsened?.at.after).toBe(nodeId("band1"))
    expect(reading.worst?.worsened?.at.before).toBe(nodeId("band2"))
    expect(reading.worst?.worsened?.share).toBeCloseTo(0.6, 10)
    expect(reading.worst?.worsened?.readers).toBeCloseTo(60, 10)
    expect(reading.worst?.improved).toBeNull()
  })

  /**
   * The whole reason this is a unit rather than a sort somebody writes on a
   * screen.
   *
   * Both pages lose the same share of the readers that reached the band, and one
   * of them has four times the straddle: a rollup window short against how long
   * its readers stay. Unscaled, the long-dwell page is the deployment's worst
   * problem by a factor of two; scaled, it is the lesser of the two, and the
   * pages swap places.
   */
  describe("the door's scale, which is what makes two pages' movements comparable", () => {
    const LINGERED = changeOf(TREE, [1000, 1000], [1000, 800])
    const QUICK = changeOf(OTHER_TREE, [200, 200], [200, 100])
    const ROWS = [door(TREE, 2, 1000, 4000), exact(OTHER_TREE, 2, 200)]

    it("orders by the movement the door has scaled and not by the raw one", () => {
      const reading = deploymentChangeOf([LINGERED, QUICK], ROWS)

      expect(reading.harmed.map((row) => row.treeId)).toEqual([OTHER_TREE, TREE])
      expect(reading.worst?.worsened?.readers).toBeCloseTo(100, 10)
      expect(reading.harmed[1]?.worsened?.readers).toBeCloseTo(50, 10)
    })

    it("is the opposite order to the one the comparisons' own figures give", () => {
      expect(Math.abs(LINGERED.mostLost?.readersKept ?? 0)).toBeCloseTo(200, 10)
      expect(Math.abs(QUICK.mostLost?.readersKept ?? 0)).toBeCloseTo(100, 10)
    })

    it("publishes each page's own straddle rate beside the figure it scaled", () => {
      const reading = deploymentChangeOf([LINGERED, QUICK], ROWS)

      expect(reading.harmed.map((row) => row.inflation)).toEqual([0, 3])
      expect(reading.harmed.map((row) => row.opened)).toEqual([200, 1000])
    })
  })

  /**
   * A real change does both, which is why there are two orders and no net.
   *
   * The band that was skipped is read now and the one after it is skipped
   * instead — one page, two movements, and no number anywhere that adds them.
   */
  it("puts a page the change both helped and hurt in both orders, and counts it once", () => {
    const reading = deploymentChangeOf(
      [changeOf(TREE, [100, 50, 25], [100, 90, 20])],
      [exact(TREE, 2, 100)]
    )

    expect(reading.harmed).toHaveLength(1)
    expect(reading.helped).toHaveLength(1)
    expect(reading.worst).toBe(reading.best)
    expect(reading.standings.ranked).toBe(1)
    expect(reading.compared).toBe(1)
    expect(reading.unranked).toEqual([])
  })

  it("orders the pages a change helped by their own scaled movements, best first", () => {
    const reading = deploymentChangeOf(
      [
        changeOf(TREE, [1000, 200], [1000, 1000], { was: 1, now: 2 }),
        changeOf(OTHER_TREE, [500, 50], [500, 500]),
      ],
      [door(TREE, 2, 1000, 4000), exact(OTHER_TREE, 2, 500)]
    )

    expect(reading.helped.map((row) => row.treeId)).toEqual([OTHER_TREE, TREE])
    expect(reading.best?.improved?.readers).toBeCloseTo(450, 10)
    expect(reading.helped[1]?.improved?.readers).toBeCloseTo(200, 10)
    expect(reading.harmed).toEqual([])
  })

  /**
   * The counters are *meant* to exceed the openings, which is what the scale is
   * for: a page whose readers straddle three rollup windows out of four reports
   * distinct counts well above the page views that began, and that is a
   * measurement rather than a disagreement. Only a count above the appearances
   * is something no rollup produces.
   */
  it("ranks a page whose counters exceed its openings and not its appearances", () => {
    const reading = deploymentChangeOf(
      [changeOf(TREE, [2000, 2000], [2000, 800])],
      [door(TREE, 2, 1000, 4000)]
    )

    expect(reading.harmed.map((row) => row.standing)).toEqual(["ranked"])
    expect(reading.worst?.worsened?.share).toBeCloseTo(0.6, 10)
    expect(reading.worst?.worsened?.readers).toBeCloseTo(300, 10)
  })

  it("orders two pages the change moved identically by tree id, whichever way they arrive", () => {
    const one = changeOf(TREE, [100, 100], [100, 60])
    const other = changeOf(OTHER_TREE, [100, 100], [100, 60])
    const rows = [exact(TREE, 2, 100), exact(OTHER_TREE, 2, 100)]

    expect(deploymentChangeOf([one, other], rows).harmed.map((row) => row.treeId)).toEqual([
      TREE,
      OTHER_TREE,
    ])
    expect(deploymentChangeOf([other, one], rows).harmed.map((row) => row.treeId)).toEqual([
      TREE,
      OTHER_TREE,
    ])
  })

  describe("a page in neither order", () => {
    it("reports a page nothing moved as moved by nothing, with both windows' floors", () => {
      const reading = deploymentChangeOf(
        [changeOf(TREE, [100, 50], [100, 50])],
        [exact(TREE, 2, 100)]
      )

      expect(reading.unranked.map((row) => row.standing)).toEqual(["unmoved"])
      expect(reading.unranked[0]?.views).toEqual({ was: 100, now: 100 })
      expect(reading.unranked[0]?.silence).toBeNull()
      expect(reading.worst).toBeNull()
      expect(reading.best).toBeNull()
    })

    /**
     * The movement is there and is a thousandth of a share; the later window
     * that measured it is three readers wide, so nothing a reader did is in it.
     * The gate is the comparison's own, applied before this order ever sees the
     * page — which is what keeps a page nobody has read yet off the top of a
     * deployment's screen the morning after a change.
     */
    it("keeps a movement no reader could have made out of both orders", () => {
      const reading = deploymentChangeOf([changeOf(TREE, [1000, 999], [3, 3])], [exact(TREE, 2, 3)])

      expect(reading.standings.unmoved).toBe(1)
      expect(reading.harmed).toEqual([])
    })

    it("reports a page with no row at the later door as unscaled, and keeps its shares", () => {
      const reading = deploymentChangeOf([changeOf(TREE, [100, 100], [100, 40])], [])

      expect(reading.unranked.map((row) => row.standing)).toEqual(["unscaled"])
      expect(reading.unranked[0]?.opened).toBeNull()
      expect(reading.unranked[0]?.inflation).toBeNull()
      expect(reading.harmed).toEqual([])
      expect(reading.arrivals).toBe(0)
    })

    it("reports a later row that says no page view began as unopened", () => {
      const reading = deploymentChangeOf(
        [changeOf(TREE, [100, 100], [100, 40])],
        [door(TREE, 2, 0, 100)]
      )

      expect(reading.unranked.map((row) => row.standing)).toEqual(["unopened"])
      expect(reading.unranked[0]?.opened).toBe(0)
    })

    it("carries a comparison's own silence through, where one window reported nothing", () => {
      const reading = deploymentChangeOf(
        [readingChangeOf(windowOf(TREE, 1, [0, 0]), windowOf(TREE, 2, [100, 40]))],
        [exact(TREE, 2, 100)]
      )

      expect(reading.unranked.map((row) => row.standing)).toEqual(["unread"])
      expect(reading.unranked[0]?.silence).toBe("nothing-measured")
      expect(reading.unranked[0]?.views).toEqual({ was: 0, now: 100 })
    })

    /**
     * The order the reasons are tried in, which is the half of this that is a
     * judgement rather than a derivation: *there was nothing to compare* is a
     * better sentence to print than *its movement could not be scaled*, and a
     * deployment whose rollups have not run yet is in both states at once.
     */
    it("says a window reported nothing before it says the door could not scale it", () => {
      const reading = deploymentChangeOf(
        [readingChangeOf(windowOf(TREE, 1, [0, 0]), windowOf(TREE, 2, [0, 0]))],
        []
      )

      expect(reading.unranked.map((row) => row.standing)).toEqual(["unread"])
      expect(reading.unranked[0]?.opened).toBeNull()
    })

    it("reports a comparison of two different pages as mispaired rather than dropping it", () => {
      const reading = deploymentChangeOf(
        [readingChangeOf(windowOf(TREE, 1, [100, 100]), windowOf(OTHER_TREE, 2, [100, 40]))],
        [exact(OTHER_TREE, 2, 100)]
      )

      expect(reading.unranked.map((row) => row.standing)).toEqual(["mispaired"])
      expect(reading.unranked[0]?.silence).toBe("different-trees")
      expect(reading.unranked[0]?.treeId).toBe(TREE)
      expect(reading.compared).toBe(1)
    })

    /**
     * The alarm, and the one standing that publishes half of its row: a reading
     * that reports more readers at a band than the door has ever seen appear is
     * not a reading, and the share it moved by is still true of whatever it is.
     */
    it("withholds the scaled figure where a stop reports more readers than ever appeared", () => {
      const reading = deploymentChangeOf(
        [changeOf(TREE, [100, 100], [100, 40])],
        [door(TREE, 2, 10, 20)]
      )

      expect(reading.unranked.map((row) => row.standing)).toEqual(["inconsistent"])
      expect(reading.unranked[0]?.worsened?.share).toBeCloseTo(0.6, 10)
      expect(reading.unranked[0]?.worsened?.readers).toBeNull()
      expect(reading.harmed).toEqual([])
    })
  })

  /**
   * The guard this lane owes anything that counts, and the only error an order
   * has available to it: one page standing in it twice.
   *
   * A caller that concatenated two reads of the same window has every page's
   * comparison twice. Nothing here is added, so the damage is not a doubled
   * total — it is a screen that says a deployment has twice as many pages to fix
   * as it has, with the same page at the top and immediately under it.
   */
  describe("two reads of one window, concatenated", () => {
    const HONEST = [changeOf(TREE, [100, 100], [100, 40]), changeOf(OTHER_TREE, [100, 100], [100, 80])]
    const ROWS = [exact(TREE, 2, 100), exact(OTHER_TREE, 2, 100)]

    it("reads one comparison per page and counts the rest", () => {
      const twice = deploymentChangeOf([...HONEST, ...HONEST], ROWS)
      const once = deploymentChangeOf(HONEST, ROWS)

      expect(twice.duplicated).toBe(2)
      expect(twice.compared).toBe(2)
      expect(twice.harmed.map((row) => row.treeId)).toEqual(once.harmed.map((row) => row.treeId))
      expect(twice.harmed.map((row) => row.worsened?.readers)).toEqual(
        once.harmed.map((row) => row.worsened?.readers)
      )
      expect(twice.worst?.treeId).toBe(once.worst?.treeId)
      expect(twice.standings).toEqual(once.standings)
    })

    it("does not double the arrivals behind the order", () => {
      expect(deploymentChangeOf([...HONEST, ...HONEST], ROWS).arrivals).toBe(200)
    })

    it("ignores a second door row for one revision and says it did", () => {
      const reading = deploymentChangeOf(HONEST, [...ROWS, exact(TREE, 2, 100)])

      expect(reading.duplicatedRows).toBe(1)
      expect(reading.arrivals).toBe(200)
    })

    /**
     * The one case the row-keyed guard above cannot catch, because the two rows
     * are two pages: a mispaired comparison is filed under the earlier page and
     * looks up the later one's door, so a caller holding it beside the honest
     * comparison of that later page names one revision twice.
     */
    it("counts one revision's openings once however many rows name it", () => {
      const reading = deploymentChangeOf(
        [
          readingChangeOf(windowOf(THIRD_TREE, 1, [100, 100]), windowOf(TREE, 2, [100, 40])),
          changeOf(TREE, [100, 100], [100, 40]),
        ],
        [exact(TREE, 2, 100)]
      )

      expect(reading.compared).toBe(2)
      expect(reading.arrivals).toBe(100)
    })
  })

  /**
   * A tree live at two revisions is two live versions of one page, and an order
   * over one window keeps both; a comparison pairs by page, so two comparisons
   * of one tree are two movements and neither is the page's.
   */
  it("reads neither comparison of a page handed in with two, and names the page", () => {
    const reading = deploymentChangeOf(
      [
        changeOf(TREE, [100, 100], [100, 40], { was: 1, now: 2 }),
        changeOf(TREE, [100, 100], [100, 90], { was: 1, now: 3 }),
        changeOf(OTHER_TREE, [100, 100], [100, 50]),
      ],
      [exact(TREE, 2, 100), exact(TREE, 3, 100), exact(OTHER_TREE, 2, 100)]
    )

    expect(reading.ambiguous).toEqual([TREE])
    expect(reading.compared).toBe(1)
    expect(reading.harmed.map((row) => row.treeId)).toEqual([OTHER_TREE])
    expect(reading.unranked).toEqual([])
    expect(reading.arrivals).toBe(100)
    expect(reading.duplicated).toBe(0)
  })

  /**
   * A page is one base tree and the deltas an audience earns (0263), so two
   * forms of it are compared over the same two revisions and each movement is
   * somebody's. Before the audience was part of the pairing, the second form's
   * comparison was the first one handed in twice — or, where the two forms were
   * compared over different revision pairs, the tree was `ambiguous` and both
   * forms were lost.
   */
  describe("a page served in two forms", () => {
    const servedTo = (audienceId: typeof SKIERS, treeId: TreeId, reached: readonly number[], revision: number) =>
      pageReadingOf(
        treeOf(treeId, revision, reached.length),
        reached.flatMap((count, at) =>
          count > 0 ? [{ ...tally(treeId, revision, `band${at + 1}`, count), audienceId }] : []
        ),
        NOTHING_DECLARED,
        audienceId
      )

    const changeFor = (
      audienceId: typeof SKIERS,
      treeId: TreeId,
      was: readonly number[],
      now: readonly number[],
      revisions: { readonly was: number; readonly now: number } = { was: 1, now: 2 }
    ): ReadingChange =>
      readingChangeOf(
        servedTo(audienceId, treeId, was, revisions.was),
        servedTo(audienceId, treeId, now, revisions.now)
      )

    const inAudience = (audienceId: typeof SKIERS, row: StoredPageViews): StoredPageViews => ({
      ...row,
      audienceId,
    })

    it("ranks both forms, each scaled by its own door row, and counts neither as a repeat", () => {
      const reading = deploymentChangeOf(
        [
          changeFor(SKIERS, TREE, [100, 100], [100, 40]),
          changeFor(RIDERS, TREE, [100, 20], [100, 90]),
        ],
        [inAudience(SKIERS, exact(TREE, 2, 100)), inAudience(RIDERS, exact(TREE, 2, 200))]
      )

      expect(reading.duplicated).toBe(0)
      expect(reading.duplicatedRows).toBe(0)
      expect(reading.ambiguous).toEqual([])
      expect(reading.compared).toBe(2)
      expect(reading.harmed.map((row) => row.audienceId)).toEqual([SKIERS])
      expect(reading.helped.map((row) => row.audienceId)).toEqual([RIDERS])
    })

    /**
     * The door row is the sharpest of these: the two forms' rows carry
     * different arrival counts, so taking the wrong one scales a movement by a
     * readership that is not its own.
     */
    it("adds each form's arrivals, rather than one form's row twice", () => {
      const reading = deploymentChangeOf(
        [
          changeFor(SKIERS, TREE, [100, 100], [100, 40]),
          changeFor(RIDERS, TREE, [100, 20], [100, 90]),
        ],
        [inAudience(SKIERS, exact(TREE, 2, 100)), inAudience(RIDERS, exact(TREE, 2, 200))]
      )

      expect(reading.arrivals).toBe(300)
      expect(reading.harmed[0]?.opened).toBe(100)
      expect(reading.helped[0]?.opened).toBe(200)
    })

    it("holds one form ambiguous without losing the other, and names the page once", () => {
      const reading = deploymentChangeOf(
        [
          changeFor(SKIERS, TREE, [100, 100], [100, 40], { was: 1, now: 2 }),
          changeFor(SKIERS, TREE, [100, 100], [100, 90], { was: 1, now: 3 }),
          changeFor(RIDERS, TREE, [100, 20], [100, 90], { was: 1, now: 2 }),
        ],
        [
          inAudience(SKIERS, exact(TREE, 2, 100)),
          inAudience(SKIERS, exact(TREE, 3, 100)),
          inAudience(RIDERS, exact(TREE, 2, 200)),
        ]
      )

      expect(reading.ambiguous).toEqual([TREE])
      expect(reading.compared).toBe(1)
      expect(reading.helped.map((row) => row.audienceId)).toEqual([RIDERS])
      expect(reading.arrivals).toBe(200)
    })

    it("still reads one form handed in twice as one comparison", () => {
      const once = changeFor(SKIERS, TREE, [100, 100], [100, 40])
      const reading = deploymentChangeOf(
        [once, once],
        [inAudience(SKIERS, exact(TREE, 2, 100))]
      )

      expect(reading.duplicated).toBe(1)
      expect(reading.compared).toBe(1)
      expect(reading.arrivals).toBe(100)
    })
  })

  describe("the standings this order publishes", () => {
    it("holds every silence and nothing twice", () => {
      expect([...MOVEMENT_STANDINGS].sort()).toEqual([...new Set(MOVEMENT_STANDINGS)].sort())

      for (const silence of DEPLOYMENT_CHANGE_SILENCES) {
        expect(MOVEMENT_STANDINGS).toContain(silence)
      }
    })

    it("describes every standing, and never twice the same way", () => {
      const lines = MOVEMENT_STANDINGS.map(describeMovementStanding)

      expect(new Set(lines).size).toBe(MOVEMENT_STANDINGS.length)
      expect(lines.every((line) => line.length > 0)).toBe(true)
      for (const line of lines) expect(line).not.toMatch(/\b0\d{3}\b/)
    })

    it("counts every page read in exactly one standing", () => {
      const reading = deploymentChangeOf(
        [
          changeOf(TREE, [100, 100], [100, 40]),
          changeOf(OTHER_TREE, [100, 50], [100, 50]),
          changeOf(THIRD_TREE, [100, 100], [100, 40]),
        ],
        [exact(TREE, 2, 100), exact(OTHER_TREE, 2, 100)]
      )

      expect(Object.values(reading.standings).reduce((sum, count) => sum + count, 0)).toBe(
        reading.compared
      )
      expect(reading.standings).toMatchObject({ ranked: 1, unmoved: 1, unscaled: 1 })
    })
  })
})
