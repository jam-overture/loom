import { describe, expect, it } from "vitest"

import { nodeIdSchema, treeIdSchema, type NodeId, type TreeId } from "../ids.js"
import { primitiveTypeSchema, type PrimitiveType } from "../primitive-type.js"
import type { ReaderSignalJournal } from "../signals/journal.js"
import type { FunnelPair, ReaderTally } from "../signals/rollup.js"
import type { ReaderSignal, ReaderSignalBatch, ViewKey } from "../signals/signal.js"
import type { ReaderTallyStore } from "../signals/tally.js"

/**
 * Two suites, run against every implementation of the buffer and of the
 * counters.
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
