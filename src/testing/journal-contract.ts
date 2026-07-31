import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema, type TreeId } from "../ids.js"
import type { RuntimeEvent } from "../runtime/events.js"
import { recordOf, type TelemetryJournal, type TelemetryRecord } from "../telemetry/index.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { buildIntent, buildProposal, FIXED_INSTANT } from "./doubles.js"

/**
 * One suite, run against every `TelemetryJournal`.
 *
 * The same argument as `store-contract.ts`: an interface is only tested once a
 * second implementation exists, and a disagreement between the in-memory
 * journal and Postgres should be a test failure rather than something noticed
 * in an analysis six weeks later.
 */

/**
 * A whole episode, narrated: an intent, the proposal it produced, the Gate
 * accepting it, and the change landing. Built through `recordOf` rather than by
 * hand so the suite exercises the narrowing every host will use.
 */
export const sampleEpisode = (namespace = "j"): readonly TelemetryRecord[] => {
  const ids = sequentialIdFactory(namespace)
  const tree = createTree(buildElement(ids, { type: "loom.page" }), ids)
  const intent = buildIntent(ids, { treeId: tree.treeId, baseRevision: 0 })
  const proposal = buildProposal(ids, {
    intentId: intent.intentId,
    delta: {
      deltaId: ids.deltaId(),
      treeId: tree.treeId,
      baseRevision: 0,
      operations: [
        { op: "insert", parentId: tree.root.id, index: 0, node: buildElement(ids, { type: "loom.card" }) },
      ],
    },
  })

  const envelope = (event: RuntimeEvent): TelemetryRecord =>
    recordOf({ treeId: tree.treeId, occurredAt: FIXED_INSTANT, event })

  return [
    envelope({ type: "intent-received", intent }),
    envelope({ type: "change-proposed", proposal }),
    envelope({
      type: "disposition-decided",
      proposalId: proposal.proposalId,
      disposition: {
        kind: "accepted",
        reason: { code: "within-policy", detail: "low stakes, reversible" },
        stakes: "low",
        reversible: true,
        confidence: 0.9,
      },
    }),
    envelope({ type: "change-committed", proposalId: proposal.proposalId, revision: 1 }),
  ]
}

const recordsFor = (treeId: TreeId, count: number): readonly TelemetryRecord[] =>
  Array.from({ length: count }, (_, index) => ({
    treeId,
    occurredAt: FIXED_INSTANT,
    event: {
      type: "hold-confirmed" as const,
      proposalId: sequentialIdFactory(`p${index}`).proposalId(),
    },
  }))

const typesOf = (records: readonly TelemetryRecord[]): readonly string[] =>
  records.map((record) => record.event.type)

export const describeTelemetryJournalContract = (
  name: string,
  makeJournal: () => Promise<TelemetryJournal> | TelemetryJournal
): void => {
  const freshJournal = async (): Promise<TelemetryJournal> => await makeJournal()

  describe(`${name} — TelemetryJournal contract`, () => {
    it("reads back a batch in the order it arrived", async () => {
      const journal = await freshJournal()
      const episode = sampleEpisode()

      expect(await journal.record(episode)).toEqual({ ok: true, value: undefined })

      const page = await journal.read()

      expect(page.ok && typesOf(page.value.records)).toEqual(typesOf(episode))
      expect(page.ok && page.value.older).toBeNull()
      expect(page.ok && page.value.newer).toBeNull()
    })

    /** A journal makes no claim that a tree exists, so nothing here is `not-found`. */
    it("reads a tree it has never heard of as an empty page", async () => {
      const journal = await freshJournal()

      expect(await journal.read({ treeId: treeIdSchema.parse("t_absent") })).toEqual({
        ok: true,
        value: { records: [], older: null, newer: null },
      })
    })

    it("accepts an empty batch", async () => {
      const journal = await freshJournal()

      expect(await journal.record([])).toEqual({ ok: true, value: undefined })
      expect(await journal.read()).toEqual({
        ok: true,
        value: { records: [], older: null, newer: null },
      })
    })

    it("survives the round trip with the proposal intact", async () => {
      const journal = await freshJournal()
      const episode = sampleEpisode()
      await journal.record(episode)

      const page = await journal.read()
      const proposed = page.ok
        ? page.value.records.find((record) => record.event.type === "change-proposed")
        : undefined

      expect(proposed?.event).toEqual(episode[1]?.event)
    })

    it("keeps trees apart", async () => {
      const journal = await freshJournal()
      const mine = treeIdSchema.parse("t_mine")
      const yours = treeIdSchema.parse("t_yours")

      await journal.record([...recordsFor(mine, 2), ...recordsFor(yours, 3)])

      const page = await journal.read({ treeId: yours })

      expect(page.ok && page.value.records).toHaveLength(3)
      expect(page.ok && page.value.records.every((record) => record.treeId === yours)).toBe(true)
    })

    it("increases seq across separate batches", async () => {
      const journal = await freshJournal()
      const treeId = treeIdSchema.parse("t_seq")

      await journal.record(recordsFor(treeId, 2))
      await journal.record(recordsFor(treeId, 2))

      const page = await journal.read()
      const seqs = page.ok ? page.value.records.map((record) => record.seq) : []

      expect(seqs).toHaveLength(4)
      expect(seqs.every((seq, index) => index === 0 || seq > (seqs[index - 1] ?? 0))).toBe(true)
    })

    describe("paging", () => {
      it("hands back a cursor and resumes after it", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_paged")
        await journal.record(recordsFor(treeId, 5))

        const first = await journal.read({ limit: 2 })
        expect(first.ok && first.value.records).toHaveLength(2)
        expect(first.ok && first.value.newer).not.toBeNull()

        const second = await journal.read({
          limit: 2,
          ...(first.ok && first.value.newer ? { cursor: first.value.newer } : {}),
        })

        expect(second.ok && second.value.records).toHaveLength(2)
        expect(
          first.ok && second.ok && first.value.records[0]?.seq !== second.value.records[0]?.seq
        ).toBe(true)
      })

      it("reports no cursor on the last page", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_last")
        await journal.record(recordsFor(treeId, 2))

        const page = await journal.read({ limit: 2 })

        expect(page.ok && page.value.records).toHaveLength(2)
        expect(page.ok && page.value.newer).toBeNull()
      })

      it("clamps a limit rather than honouring it", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_clamped")
        await journal.record(recordsFor(treeId, 3))

        const page = await journal.read({ limit: 0 })

        expect(page.ok && page.value.records).toHaveLength(1)
      })

      /** A cursor is opaque, so an unreadable one means the same to every implementation. */
      it("starts from the beginning when the cursor cannot be read", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_bad")
        await journal.record(recordsFor(treeId, 3))

        const page = await journal.read({ cursor: "not-a-position" })

        expect(page.ok && page.value.records).toHaveLength(3)
      })

      it("reads an empty page past the end", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_end")
        await journal.record(recordsFor(treeId, 2))

        const all = await journal.read()
        const last = all.ok ? all.value.records.at(-1) : undefined
        const past = await journal.read({ cursor: String(last?.seq ?? 0) })

        expect(past).toEqual({ ok: true, value: { records: [], older: null, newer: null } })
      })
    })

    /**
     * The direction a page is taken from, which is the difference between "what
     * happened recently" costing one read and costing every read.
     */
    describe("paging backwards", () => {
      const seqsOf = (page: Awaited<ReturnType<TelemetryJournal["read"]>>): readonly number[] =>
        page.ok ? page.value.records.map((record) => record.seq) : []

      it("reads the newest page when asked for older with no cursor", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_newest")
        await journal.record(recordsFor(treeId, 5))

        const all = await journal.read()
        const newest = await journal.read({ direction: "older", limit: 2 })

        expect(seqsOf(newest)).toEqual(seqsOf(all).slice(-2))
      })

      /** Ascending whichever end it came from, so a fold never has to ask which. */
      it("returns a backwards page in arrival order", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_order")
        await journal.record(recordsFor(treeId, 4))

        const page = await journal.read({ direction: "older", limit: 3 })
        const seqs = seqsOf(page)

        expect(seqs).toHaveLength(3)
        expect(seqs.every((seq, index) => index === 0 || seq > (seqs[index - 1] ?? 0))).toBe(true)
      })

      it("walks back through the whole journal one page at a time", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_walk")
        await journal.record(recordsFor(treeId, 5))

        const seen: number[] = []
        let cursor: string | null | undefined

        for (let read = 0; read < 4; read += 1) {
          const page = await journal.read({
            direction: "older",
            limit: 2,
            ...(cursor ? { cursor } : {}),
          })

          seen.unshift(...seqsOf(page))
          cursor = page.ok ? page.value.older : null
          if (cursor === null) break
        }

        expect(seen).toEqual(seqsOf(await journal.read()))
        expect(cursor).toBeNull()
      })

      it("names the newer end once a backwards page has resumed", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_both")
        await journal.record(recordsFor(treeId, 5))

        const newest = await journal.read({ direction: "older", limit: 2 })
        expect(newest.ok && newest.value.newer).toBeNull()

        const older = await journal.read({
          direction: "older",
          limit: 2,
          ...(newest.ok && newest.value.older ? { cursor: newest.value.older } : {}),
        })

        expect(older.ok && older.value.newer).not.toBeNull()

        const back = await journal.read({
          limit: 2,
          ...(older.ok && older.value.newer ? { cursor: older.value.newer } : {}),
        })

        expect(seqsOf(back)).toEqual(seqsOf(newest))
      })

      it("keeps trees apart when reading backwards", async () => {
        const journal = await freshJournal()
        const mine = treeIdSchema.parse("t_mineback")
        const yours = treeIdSchema.parse("t_yoursback")

        await journal.record([...recordsFor(mine, 3), ...recordsFor(yours, 2)])

        const page = await journal.read({ treeId: mine, direction: "older", limit: 2 })

        expect(page.ok && page.value.records.every((record) => record.treeId === mine)).toBe(true)
        expect(page.ok && page.value.records).toHaveLength(2)
      })
    })
  })
}
