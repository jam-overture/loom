import { describe, expect, it } from "vitest"

import { nodeIdSchema, treeIdSchema, type NodeId, type TreeId } from "../ids.js"
import { primitiveTypeSchema, type PrimitiveType } from "../primitive-type.js"
import type { ReaderSignalJournal } from "../signals/journal.js"
import {
  UNKNOWN_REGION,
  type ReaderRegion,
  type ReaderRegionCount,
  type ReaderRegionStore,
} from "../signals/region.js"
import type { RevisionViews } from "../signals/page-views.js"
import type { FunnelPair, ReaderTally } from "../signals/rollup.js"
import type { ReaderSignal, ReaderSignalBatch, ViewKey } from "../signals/signal.js"
import type { ReaderTallyStore } from "../signals/tally.js"

/**
 * Three suites, run against every implementation of the buffer, the counters and
 * the regions.
 *
 * The same argument as `store-contract.ts` and `journal-contract.ts`: an
 * interface is only tested once a second implementation exists, and a
 * disagreement between what runs under `pnpm dev` and what runs in production
 * should be a failing test rather than a number somebody queries six weeks
 * later and cannot explain.
 */

export const TREE = treeIdSchema.parse("t_contract") as TreeId
export const OTHER_TREE = treeIdSchema.parse("t_other") as TreeId

export const nodeId = (name: string): NodeId => nodeIdSchema.parse(`n_${name}`) as NodeId

export const primitiveType = (name: string): PrimitiveType => primitiveTypeSchema.parse(name) as PrimitiveType

/** A key of the right shape, spelled so a failing assertion says which view it was. */
export const viewKey = (nth: number): ViewKey => String(nth).padStart(32, "0") as ViewKey

export const region = (code: string): ReaderRegion => code as ReaderRegion

export const batchOf = (
  signals: readonly ReaderSignal[],
  overrides: Partial<Omit<ReaderSignalBatch, "signals">> = {}
): ReaderSignalBatch => ({
  treeId: TREE,
  revision: 1,
  sentAt: 1_000,
  ...overrides,
  signals: [...signals],
})

export const viewed = (name: string): ReaderSignal => ({
  kind: "viewed",
  nodeId: nodeId(name),
  type: primitiveType("loom.section"),
  at: 1_000,
})

export const activated = (name: string): ReaderSignal => ({
  kind: "activated",
  nodeId: nodeId(name),
  type: primitiveType("loom.button"),
  at: 1_100,
})

/**
 * A press, and the regions it happened inside — nearest first, which is the
 * order a broadcaster walks in.
 *
 * Spelled out rather than spread onto `activated`, because the ancestry is the
 * thing under test and a helper that hid it would let a test pass while the
 * field was absent.
 */
export const activatedIn = (name: string, ...regions: readonly string[]): ReaderSignal => ({
  kind: "activated",
  nodeId: nodeId(name),
  type: primitiveType("loom.button"),
  at: 1_100,
  within: regions.map((region) => ({ nodeId: nodeId(region), type: primitiveType("loom.section") })),
})

export const disclosedIn = (name: string, open: boolean, ...regions: readonly string[]): ReaderSignal => ({
  kind: "disclosed",
  nodeId: nodeId(name),
  type: primitiveType("loom.faq"),
  open,
  at: 1_200,
  within: regions.map((region) => ({ nodeId: nodeId(region), type: primitiveType("loom.section") })),
})

export const completed = (name: string): ReaderSignal => ({
  kind: "completed",
  nodeId: nodeId(name),
  type: primitiveType("loom.form"),
  at: 1_300,
})

/** A form let go, and the bands it was the end of — nearest first, like a press. */
export const completedIn = (name: string, ...regions: readonly string[]): ReaderSignal => ({
  kind: "completed",
  nodeId: nodeId(name),
  type: primitiveType("loom.form"),
  at: 1_300,
  within: regions.map((region) => ({ nodeId: nodeId(region), type: primitiveType("loom.section") })),
})

export const dwelled = (name: string, ms: number): ReaderSignal => ({
  kind: "dwelled",
  nodeId: nodeId(name),
  type: primitiveType("loom.section"),
  ms,
})

const tally = (overrides: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: TREE,
  revision: 1,
  nodeId: nodeId("hero"),
  type: primitiveType("loom.section"),
  views: 1,
  reached: 1,
  engaged: 0,
  dwellMs: 500,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
  ...overrides,
})

const PAIR: FunnelPair = {
  from: { nodeId: nodeId("pricing"), kind: "viewed" },
  to: { nodeId: nodeId("buy"), kind: "activated" },
}

const AT = "2026-09-14T00:00:00.000Z"
const LATER = "2026-09-14T01:00:00.000Z"

const unwrap = <TValue, TError>(result: { ok: true; value: TValue } | { ok: false; error: TError }): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)

  return result.value
}

export const describeReaderSignalJournalContract = (
  name: string,
  make: () => ReaderSignalJournal | Promise<ReaderSignalJournal>
): void => {
  describe(`${name} — ReaderSignalJournal contract`, () => {
    it("reads back batches in the order they arrived", async () => {
      const journal = await make()
      await journal.receive([batchOf([viewed("a")]), batchOf([viewed("b")])])

      const page = unwrap(await journal.read())

      expect(page.batches.map((batch) => batch.signals[0]?.nodeId)).toEqual([nodeId("a"), nodeId("b")])
    })

    it("reads a tree it has never heard of as an empty page", async () => {
      const journal = await make()

      expect(unwrap(await journal.read({ treeId: OTHER_TREE })).batches).toEqual([])
    })

    it("accepts a delivery of nothing", async () => {
      const journal = await make()

      expect(unwrap(await journal.receive([]))).toBeUndefined()
      expect(unwrap(await journal.read()).batches).toEqual([])
    })

    it("survives the round trip with every kind intact", async () => {
      const journal = await make()
      const signals: readonly ReaderSignal[] = [
        viewed("a"),
        dwelled("a", 2_500),
        activated("b"),
        { kind: "disclosed", nodeId: nodeId("c"), type: primitiveType("loom.disclosure"), open: true, at: 1_200 },
      ]
      await journal.receive([batchOf(signals)])

      expect(unwrap(await journal.read()).batches[0]?.signals).toEqual(signals)
    })

    it("carries the view key through storage", async () => {
      const journal = await make()
      await journal.receive([batchOf([viewed("a")], { view: viewKey(7) })])

      expect(unwrap(await journal.read()).batches[0]?.view).toBe(viewKey(7))
    })

    it("keeps a batch that never had a view key distinguishable from one that did", async () => {
      const journal = await make()
      await journal.receive([batchOf([viewed("a")]), batchOf([viewed("b")], { view: viewKey(1) })])

      expect(unwrap(await journal.read()).batches.map((batch) => batch.view)).toEqual([
        undefined,
        viewKey(1),
      ])
    })

    /**
     * The marker that says a page view began with this delivery is read at the
     * door and goes no further. Both implementations drop it, and they have to
     * agree: a buffer that kept it in memory and lost it in Postgres is a
     * rollup whose answer depends on where it ran.
     */
    it("does not buffer the opening marker", async () => {
      const journal = await make()
      await journal.receive([batchOf([viewed("a")], { view: viewKey(3), first: true })])

      const [stored] = unwrap(await journal.read()).batches

      expect(stored?.first).toBeUndefined()
      expect(stored?.view).toBe(viewKey(3))
    })

    it("keeps trees apart", async () => {
      const journal = await make()
      await journal.receive([batchOf([viewed("a")]), batchOf([viewed("b")], { treeId: OTHER_TREE })])

      const page = unwrap(await journal.read({ treeId: OTHER_TREE }))

      expect(page.batches).toHaveLength(1)
      expect(page.batches[0]?.treeId).toBe(OTHER_TREE)
    })

    it("stamps an arrival instant the sender never supplied", async () => {
      const journal = await make()
      await journal.receive([batchOf([viewed("a")], { sentAt: 0 })])

      const [batch] = unwrap(await journal.read()).batches

      expect(batch?.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it("increases seq across separate deliveries", async () => {
      const journal = await make()
      await journal.receive([batchOf([viewed("a")])])
      await journal.receive([batchOf([viewed("b")])])

      const [first, second] = unwrap(await journal.read()).batches

      expect((second?.seq ?? 0) > (first?.seq ?? 0)).toBe(true)
    })

    describe("paging", () => {
      const many = (count: number): readonly ReaderSignalBatch[] =>
        Array.from({ length: count }, (_unused, index) => batchOf([viewed(`n${index}`)]))

      it("hands back a cursor and resumes after it", async () => {
        const journal = await make()
        await journal.receive(many(5))

        const first = unwrap(await journal.read({ limit: 2 }))
        expect(first.batches).toHaveLength(2)
        expect(first.newer).not.toBeNull()

        const next = unwrap(await journal.read({ limit: 2, cursor: first.newer as string }))

        expect(next.batches.map((batch) => batch.signals[0]?.nodeId)).toEqual([
          nodeId("n2"),
          nodeId("n3"),
        ])
      })

      it("reports no cursor on the last page", async () => {
        const journal = await make()
        await journal.receive(many(2))

        expect(unwrap(await journal.read({ limit: 50 })).newer).toBeNull()
      })

      it("clamps a limit rather than honouring it", async () => {
        const journal = await make()
        await journal.receive(many(3))

        expect(unwrap(await journal.read({ limit: 10_000 })).batches).toHaveLength(3)
      })

      it("starts from the beginning when the cursor cannot be read", async () => {
        const journal = await make()
        await journal.receive(many(3))

        expect(unwrap(await journal.read({ cursor: "not a position" })).batches).toHaveLength(3)
      })

      it("reads the newest page when asked for older with no cursor", async () => {
        const journal = await make()
        await journal.receive(many(5))

        const page = unwrap(await journal.read({ direction: "older", limit: 2 }))

        expect(page.batches.map((batch) => batch.signals[0]?.nodeId)).toEqual([
          nodeId("n3"),
          nodeId("n4"),
        ])
      })
    })

    describe("forgetting", () => {
      it("drops the batches below a position and keeps the rest", async () => {
        const journal = await make()
        await journal.receive([batchOf([viewed("a")]), batchOf([viewed("b")]), batchOf([viewed("c")])])

        const seqs = unwrap(await journal.read()).batches.map((batch) => batch.seq)
        const forgotten = unwrap(await journal.forget({ before: seqs[2] as number }))

        expect(forgotten.removed).toBe(2)
        expect(unwrap(await journal.read()).batches.map((batch) => batch.signals[0]?.nodeId)).toEqual([
          nodeId("c"),
        ])
      })

      it("is a no-op the second time", async () => {
        const journal = await make()
        await journal.receive([batchOf([viewed("a")])])

        const seqs = unwrap(await journal.read()).batches.map((batch) => batch.seq)
        const before = (seqs[0] as number) + 1

        expect(unwrap(await journal.forget({ before })).removed).toBe(1)
        expect(unwrap(await journal.forget({ before })).removed).toBe(0)
      })

      it("does not reuse the positions it forgot", async () => {
        const journal = await make()
        await journal.receive([batchOf([viewed("a")])])
        const [gone] = unwrap(await journal.read()).batches
        await journal.forget({ before: (gone?.seq ?? 0) + 1 })

        await journal.receive([batchOf([viewed("b")])])
        const [fresh] = unwrap(await journal.read()).batches

        expect((fresh?.seq ?? 0) > (gone?.seq ?? 0)).toBe(true)
      })

      it("forgets across every tree, because a position is buffer-wide", async () => {
        const journal = await make()
        await journal.receive([batchOf([viewed("a")]), batchOf([viewed("b")], { treeId: OTHER_TREE })])

        const seqs = unwrap(await journal.read()).batches.map((batch) => batch.seq)
        await journal.forget({ before: (seqs[1] as number) + 1 })

        expect(unwrap(await journal.read()).batches).toEqual([])
      })
    })
  })
}

export const describeReaderTallyStoreContract = (
  name: string,
  make: () => ReaderTallyStore | Promise<ReaderTallyStore>
): void => {
  describe(`${name} — ReaderTallyStore contract`, () => {
    it("reads back a tally it was given", async () => {
      const store = await make()
      await store.apply({ tallies: [tally()], funnels: [] }, AT)

      const [row] = unwrap(await store.tallies())

      expect(row).toMatchObject({ nodeId: nodeId("hero"), dwellMs: 500, views: 1, updatedAt: AT })
    })

    it("reads nothing from a store nothing has been applied to", async () => {
      const store = await make()

      expect(unwrap(await store.tallies())).toEqual([])
      expect(unwrap(await store.funnels())).toEqual([])
    })

    it("accepts a rollup with nothing in it", async () => {
      const store = await make()

      expect(unwrap(await store.apply({ tallies: [], funnels: [] }, AT))).toBeUndefined()
    })

    /**
     * The property the whole design rests on. Rollup reports what one window
     * added, so a second window must add to the first rather than replace it —
     * a store that overwrote would describe only the last few minutes and look
     * entirely plausible doing it.
     */
    it("adds a second window to the first rather than replacing it", async () => {
      const store = await make()
      await store.apply({ tallies: [tally({ dwellMs: 500, activations: 1, completions: 1 })], funnels: [] }, AT)
      await store.apply(
        { tallies: [tally({ dwellMs: 250, activations: 2, completions: 2 })], funnels: [] },
        LATER
      )

      const [row] = unwrap(await store.tallies())

      expect(row).toMatchObject({ dwellMs: 750, activations: 3, completions: 3, views: 2, updatedAt: LATER })
    })

    /**
     * The counter regions are reported by, held to the same rule as the rest.
     * It is a view count, so adding windows over-counts a reader whose visit
     * straddled a boundary — the same bound that already applies to `views` and
     * `reached` (0147), and the reason a store must add rather than replace all
     * the same.
     */
    it("adds the engaged views of a second window to the first", async () => {
      const store = await make()
      await store.apply({ tallies: [tally({ engaged: 2 })], funnels: [] }, AT)
      await store.apply({ tallies: [tally({ engaged: 3 })], funnels: [] }, LATER)

      const [row] = unwrap(await store.tallies())

      expect(row).toMatchObject({ engaged: 5, updatedAt: LATER })
    })

    /**
     * The same seam the page views were bitten by, held on the counter it would
     * matter most on: `ON CONFLICT … DO UPDATE` refuses to affect one row twice
     * in one command, so a rollup handed a list with a node in it twice must be
     * folded before the statement rather than refused by the driver. Nothing in
     * the repository can produce that list — `rollUp` keys its output by map —
     * and a caller composing counters of its own can.
     */
    it("adds up two tallies of the same node in one call", async () => {
      const store = await make()
      await store.apply(
        {
          tallies: [
            tally({ dwellMs: 500, views: 1, reached: 1, activations: 1 }),
            tally({ dwellMs: 250, views: 2, reached: 2, activations: 3 }),
          ],
          funnels: [],
        },
        AT
      )

      const rows = unwrap(await store.tallies())

      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ dwellMs: 750, views: 3, reached: 3, activations: 4 })
    })

    /** The later row wins the one column that is not a number, in both stores. */
    it("takes the last type given for a node named twice in one call", async () => {
      const store = await make()
      await store.apply(
        {
          tallies: [
            tally({ type: primitiveType("loom.section") }),
            tally({ type: primitiveType("loom.hero") }),
          ],
          funnels: [],
        },
        AT
      )

      expect(unwrap(await store.tallies())[0]).toMatchObject({ type: "loom.hero" })
    })

    it("keeps revisions of the same node apart", async () => {
      const store = await make()
      await store.apply(
        { tallies: [tally({ revision: 1, dwellMs: 500 }), tally({ revision: 2, dwellMs: 30 })], funnels: [] },
        AT
      )

      expect(unwrap(await store.tallies({ revision: 2 })).map((row) => row.dwellMs)).toEqual([30])
    })

    it("keeps trees apart", async () => {
      const store = await make()
      await store.apply(
        { tallies: [tally(), tally({ treeId: OTHER_TREE, dwellMs: 11 })], funnels: [] },
        AT
      )

      expect(unwrap(await store.tallies({ treeId: OTHER_TREE })).map((row) => row.dwellMs)).toEqual([11])
    })

    it("keeps nodes of the same revision apart", async () => {
      const store = await make()
      await store.apply(
        { tallies: [tally({ nodeId: nodeId("hero") }), tally({ nodeId: nodeId("pricing") })], funnels: [] },
        AT
      )

      expect(unwrap(await store.tallies())).toHaveLength(2)
    })

    it("reads back a funnel answer as the pair it was asked about", async () => {
      const store = await make()
      await store.apply(
        { tallies: [], funnels: [{ treeId: TREE, revision: 1, pair: PAIR, reached: 40, converted: 9 }] },
        AT
      )

      const [row] = unwrap(await store.funnels())

      expect(row?.pair).toEqual(PAIR)
      expect(row).toMatchObject({ reached: 40, converted: 9 })
    })

    it("adds funnel windows together too", async () => {
      const store = await make()
      const answer = { treeId: TREE, revision: 1, pair: PAIR, reached: 40, converted: 9 }
      await store.apply({ tallies: [], funnels: [answer] }, AT)
      await store.apply({ tallies: [], funnels: [{ ...answer, reached: 10, converted: 1 }] }, LATER)

      expect(unwrap(await store.funnels())[0]).toMatchObject({ reached: 50, converted: 10 })
    })

    /** The funnels' half of the same fold, keyed by both ends of the pair. */
    it("adds up two answers about the same pair in one call", async () => {
      const store = await make()
      await store.apply(
        {
          tallies: [],
          funnels: [
            { treeId: TREE, revision: 1, pair: PAIR, reached: 40, converted: 9 },
            { treeId: TREE, revision: 1, pair: PAIR, reached: 10, converted: 1 },
          ],
        },
        AT
      )

      const rows = unwrap(await store.funnels())

      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ reached: 50, converted: 10 })
    })

    describe("page views", () => {
      const opening = (over: Partial<RevisionViews> = {}): RevisionViews => ({
        treeId: TREE,
        revision: 1,
        views: 1,
        ...over,
      })

      it("reads nothing before anybody has arrived", async () => {
        const store = await make()

        expect(unwrap(await store.pageViews())).toEqual([])
      })

      it("accepts a delivery that opened nothing", async () => {
        const store = await make()

        expect(unwrap(await store.opened([], AT))).toBeUndefined()
        expect(unwrap(await store.pageViews())).toEqual([])
      })

      it("reads back the page views a door counted", async () => {
        const store = await make()
        await store.opened([opening({ views: 3 })], AT)

        expect(unwrap(await store.pageViews())[0]).toMatchObject({
          treeId: TREE,
          revision: 1,
          opened: 3,
          appearances: 0,
          updatedAt: AT,
        })
      })

      /**
       * The property the exactness rests on. Every call is one delivery's worth
       * of arrivals, so a store that replaced would report the last reader
       * rather than the readership — and unlike a distinct count there is no
       * window here for the error to be bounded by.
       */
      it("adds a second delivery's arrivals to the first", async () => {
        const store = await make()
        await store.opened([opening({ views: 2 })], AT)
        await store.opened([opening({ views: 5 })], LATER)

        expect(unwrap(await store.pageViews())[0]).toMatchObject({ opened: 7, updatedAt: LATER })
      })

      /**
       * The two numbers are counted from opposite ends and must not land in the
       * same column: their difference is the over-count in every distinct view
       * count stored against the revision (0147), and a store that added them
       * together would report nought drift for ever.
       */
      it("keeps a rollup's appearances beside the openings rather than in them", async () => {
        const store = await make()
        await store.opened([opening({ views: 10 })], AT)
        await store.apply({ tallies: [], funnels: [], appearances: [opening({ views: 11 })] }, LATER)

        expect(unwrap(await store.pageViews())[0]).toMatchObject({
          opened: 10,
          appearances: 11,
          updatedAt: LATER,
        })
      })

      it("adds a second window's appearances to the first", async () => {
        const store = await make()
        await store.apply({ tallies: [], funnels: [], appearances: [opening({ views: 4 })] }, AT)
        await store.apply({ tallies: [], funnels: [], appearances: [opening({ views: 6 })] }, LATER)

        expect(unwrap(await store.pageViews())[0]).toMatchObject({ opened: 0, appearances: 10 })
      })

      /**
       * A rollup applied with no appearances is a caller that has none to
       * report — a backfill, a fixture — and it must not write a row saying
       * nobody arrived, which a reading would show as counters that are exact.
       */
      it("writes no page-view row for a rollup that reported no window", async () => {
        const store = await make()
        await store.apply({ tallies: [tally()], funnels: [] }, AT)

        expect(unwrap(await store.pageViews())).toEqual([])
      })

      it("keeps revisions apart, which is what before and after a change means here", async () => {
        const store = await make()
        await store.opened([opening({ views: 3 }), opening({ revision: 2, views: 8 })], AT)

        expect(unwrap(await store.pageViews({ revision: 2 })).map((row) => row.opened)).toEqual([8])
      })

      it("keeps trees apart", async () => {
        const store = await make()
        await store.opened([opening(), opening({ treeId: OTHER_TREE, views: 4 })], AT)

        expect(
          unwrap(await store.pageViews({ treeId: OTHER_TREE })).map((row) => row.opened)
        ).toEqual([4])
      })

      /** Two arrivals in one call are one row and one addition, not a row each. */
      it("adds up two openings of the same revision in one call", async () => {
        const store = await make()
        await store.opened([opening({ views: 2 }), opening({ views: 3 })], AT)

        const rows = unwrap(await store.pageViews())

        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ opened: 5 })
      })
    })

    it("keeps two funnels that share a starting node apart", async () => {
      const store = await make()
      const other: FunnelPair = { from: PAIR.from, to: { nodeId: nodeId("contact"), kind: "activated" } }
      await store.apply(
        {
          tallies: [],
          funnels: [
            { treeId: TREE, revision: 1, pair: PAIR, reached: 40, converted: 9 },
            { treeId: TREE, revision: 1, pair: other, reached: 40, converted: 3 },
          ],
        },
        AT
      )

      expect(unwrap(await store.funnels()).map((row) => row.converted).sort()).toEqual([3, 9])
    })
  })
}

/**
 * Where readers were, against every implementation.
 *
 * Shorter than the other two suites because the table is narrower, and the
 * properties it does assert are the ones a wrong implementation would be
 * plausible without: that a second delivery adds to the first, that two
 * countries are two rows, and that a revision is part of the key.
 */
export const describeReaderRegionStoreContract = (
  name: string,
  make: () => ReaderRegionStore | Promise<ReaderRegionStore>
): void => {
  describe(`${name} — ReaderRegionStore contract`, () => {
    const count = (over: Partial<ReaderRegionCount> = {}): ReaderRegionCount => ({
      treeId: TREE,
      revision: 1,
      region: region("GB"),
      views: 1,
      ...over,
    })

    it("reads back a count it was given", async () => {
      const store = await make()
      await store.count([count({ views: 4 })], AT)

      expect(unwrap(await store.regions())[0]).toMatchObject({
        region: "GB",
        views: 4,
        revision: 1,
        updatedAt: AT,
      })
    })

    it("reads nothing from a store nothing has been counted into", async () => {
      const store = await make()

      expect(unwrap(await store.regions())).toEqual([])
    })

    it("accepts a delivery that counted nothing", async () => {
      const store = await make()

      expect(unwrap(await store.count([], AT))).toBeUndefined()
    })

    /**
     * The property the floor depends on. Every call carries one delivery's
     * arrivals, so a store that replaced would hold a bucket at one view for
     * ever and withhold a country a thousand readers came from.
     */
    it("adds a second delivery to the first rather than replacing it", async () => {
      const store = await make()
      await store.count([count({ views: 3 })], AT)
      await store.count([count({ views: 2 })], LATER)

      const rows = unwrap(await store.regions())

      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ views: 5, updatedAt: LATER })
    })

    /**
     * The sharpest of the four, because of where it runs. A delivery whose
     * batches place two readers in one country reaches this with the bucket
     * named twice — and a refused write at the door is a bucket that silently
     * did not move, reported in the delivery's outcome and nowhere else.
     */
    it("adds up two counts of the same bucket in one call", async () => {
      const store = await make()
      await store.count([count({ views: 3 }), count({ views: 2 })], AT)

      const rows = unwrap(await store.regions())

      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ region: "GB", views: 5 })
    })

    it("keeps two regions apart", async () => {
      const store = await make()
      await store.count([count({ views: 3 }), count({ region: region("FR"), views: 1 })], AT)

      expect(
        unwrap(await store.regions())
          .map((row) => `${row.region}:${row.views}`)
          .sort()
      ).toEqual(["FR:1", "GB:3"])
    })

    it("keeps the readers of one revision apart from the next", async () => {
      const store = await make()
      await store.count([count({ views: 3 }), count({ revision: 2, views: 1 })], AT)

      expect(unwrap(await store.regions()).map((row) => row.revision).sort()).toEqual([1, 2])
    })

    it("keeps a bucket for the readers it could not place", async () => {
      const store = await make()
      await store.count([count({ region: UNKNOWN_REGION, views: 2 })], AT)

      expect(unwrap(await store.regions())[0]).toMatchObject({ region: "unknown", views: 2 })
    })

    it("reads one tree without the other", async () => {
      const store = await make()
      await store.count([count(), count({ treeId: OTHER_TREE, views: 7 })], AT)

      const rows = unwrap(await store.regions({ treeId: OTHER_TREE }))

      expect(rows).toHaveLength(1)
      expect(rows[0]?.views).toBe(7)
    })

    it("reads one revision without the other", async () => {
      const store = await make()
      await store.count([count(), count({ revision: 9, views: 7 })], AT)

      const rows = unwrap(await store.regions({ revision: 9 }))

      expect(rows).toHaveLength(1)
      expect(rows[0]?.views).toBe(7)
    })
  })
}
