import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema, type ProposalId, type TreeId } from "../ids.js"
import type { RuntimeEvent } from "../runtime/events.js"
import {
  describeTelemetryWindowFault,
  MAX_ASSESSMENT_LOOKUP,
  MAX_TELEMETRY_LIMIT,
  recordOf,
  telemetryWindow,
  type TelemetryJournal,
  type TelemetryRecord,
  type TelemetrySpan,
  type TelemetryWindow,
} from "../telemetry/index.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { buildAssessment, buildIntent, buildProposal, FIXED_INSTANT } from "./doubles.js"

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
        policyId: "default",
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

/**
 * One `change-assessed` record, narrowed the way a host's would be.
 *
 * Through `buildAssessment` and `recordOf` rather than written out as a literal,
 * so the suite is asserting against a record a real run of Loom could produce —
 * the rule the 3 October fixture entry was filed about.
 */
const assessedRecord = (
  treeId: TreeId,
  namespace: string,
  options: { readonly removedNodeCount?: number } = {}
): { readonly record: TelemetryRecord; readonly proposalId: ProposalId } => {
  const ids = sequentialIdFactory(namespace)
  const proposal = buildProposal(ids, {
    intentId: ids.intentId(),
    delta: { deltaId: ids.deltaId(), treeId, baseRevision: 0, operations: [] },
  })
  const assessment = buildAssessment(ids, {
    proposal,
    analysis: { removedNodeCount: options.removedNodeCount ?? 0 },
  })

  return {
    record: recordOf({
      treeId,
      occurredAt: FIXED_INSTANT,
      event: { type: "change-assessed", assessment },
    }),
    proposalId: proposal.proposalId,
  }
}

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
        value: { records: [], older: null, newer: null, span: null },
      })
    })

    it("accepts an empty batch", async () => {
      const journal = await freshJournal()

      expect(await journal.record([])).toEqual({ ok: true, value: undefined })
      expect(await journal.read()).toEqual({
        ok: true,
        value: { records: [], older: null, newer: null, span: null },
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

    /**
     * Retention measures age against this, so an implementation that left it to
     * the writer would let a writer decide how long its own records live.
     */
    it("stamps an arrival instant the writer never supplied", async () => {
      const journal = await freshJournal()
      const before = new Date().toISOString()
      await journal.record(sampleEpisode())

      const page = await journal.read()
      const stamps = page.ok ? page.value.records.map((record) => record.recordedAt) : []

      expect(stamps).toHaveLength(4)
      expect(stamps.every((stamp) => stamp >= before)).toBe(true)
      expect(stamps.every((stamp) => Number.isFinite(Date.parse(stamp)))).toBe(true)
      /** `occurredAt` is the host's fixture instant, years apart from arrival. */
      expect(stamps.every((stamp) => stamp !== FIXED_INSTANT)).toBe(true)
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

        expect(past).toEqual({ ok: true, value: { records: [], older: null, newer: null, span: null } })
      })
    })

    /**
     * The join, not a page.
     *
     * A revision log holds a `proposalId` and no judgment (0016, 0225), so the
     * only way a screen can say *undoing this will not undo everything* is to
     * ask the journal about the proposals it is already holding. What a journal
     * owes is that both implementations answer the same way about an id it has
     * never heard of, about an id narrated twice, and about more ids than one
     * lookup reaches.
     */
    describe("looking an assessment up by proposal", () => {
      it("answers about the proposals it was asked about and no others", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_lookup")
        const wanted = assessedRecord(treeId, "want", { removedNodeCount: 3 })
        const other = assessedRecord(treeId, "other")
        await journal.record([wanted.record, other.record])

        const found = await journal.assessments({ proposalIds: [wanted.proposalId] })

        expect(found.ok && [...found.value.assessments.keys()]).toEqual([wanted.proposalId])
        expect(found.ok && found.value.assessments.get(wanted.proposalId)?.removedNodeCount).toBe(3)
        expect(found.ok && found.value.unasked).toEqual([])
      })

      /** The same reason there is no `not-found`: a journal claims nothing exists. */
      it("leaves a proposal it has never heard of out of the map rather than failing", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_absentlookup")
        const known = assessedRecord(treeId, "known")
        const stranger = assessedRecord(treeId, "stranger")
        await journal.record([known.record])

        const found = await journal.assessments({
          proposalIds: [known.proposalId, stranger.proposalId],
        })

        expect(found.ok && found.value.assessments.has(known.proposalId)).toBe(true)
        expect(found.ok && found.value.assessments.has(stranger.proposalId)).toBe(false)
        expect(found.ok && found.value.unasked).toEqual([])
      })

      it("asks nothing and answers emptily for an empty lookup", async () => {
        const journal = await freshJournal()

        expect(await journal.assessments({ proposalIds: [] })).toEqual({
          ok: true,
          value: { assessments: new Map(), unasked: [] },
        })
      })

      /**
       * A journal is append-only, so a proposal narrated twice is a history
       * rather than a fault — and the later record is the one that describes
       * what the Gate last read.
       */
      it("answers with the latest assessment when a proposal was narrated twice", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_twice")
        const first = assessedRecord(treeId, "twice", { removedNodeCount: 1 })
        const second = assessedRecord(treeId, "twice", { removedNodeCount: 9 })
        await journal.record([first.record, second.record])

        const found = await journal.assessments({ proposalIds: [first.proposalId] })

        expect(first.proposalId).toEqual(second.proposalId)
        expect(found.ok && found.value.assessments.get(first.proposalId)?.removedNodeCount).toBe(9)
      })

      it("counts a repeated id once rather than spending the lookup on it", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_repeat")
        const one = assessedRecord(treeId, "repeat")
        await journal.record([one.record])

        const found = await journal.assessments({
          proposalIds: Array.from({ length: MAX_ASSESSMENT_LOOKUP + 1 }, () => one.proposalId),
        })

        expect(found.ok && found.value.assessments.size).toBe(1)
        expect(found.ok && found.value.unasked).toEqual([])
      })

      /**
       * Every read in Loom is bounded. What this pins is that going over the
       * bound is *said* rather than silently dropped: on the screen this exists
       * for, "nothing was recorded" and "nobody looked" would otherwise be the
       * same blank.
       */
      it("names the ids beyond the cap instead of dropping them", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_cap")
        const asked = Array.from(
          { length: MAX_ASSESSMENT_LOOKUP + 2 },
          (_, index) => assessedRecord(treeId, `cap${index}`).proposalId
        )

        const found = await journal.assessments({ proposalIds: asked })

        expect(found.ok && found.value.unasked).toEqual(asked.slice(MAX_ASSESSMENT_LOOKUP))
      })

      it("keeps trees apart when a lookup names one", async () => {
        const journal = await freshJournal()
        const mine = treeIdSchema.parse("t_minelookup")
        const yours = treeIdSchema.parse("t_yourslookup")
        const ours = assessedRecord(yours, "ours")
        await journal.record([ours.record])

        const wrongTree = await journal.assessments({
          proposalIds: [ours.proposalId],
          treeId: mine,
        })
        const rightTree = await journal.assessments({
          proposalIds: [ours.proposalId],
          treeId: yours,
        })

        expect(wrongTree.ok && wrongTree.value.assessments.size).toBe(0)
        expect(rightTree.ok && rightTree.value.assessments.size).toBe(1)
      })

      /** A record a prune has forgotten is a record nothing can join against. */
      it("stops answering about a proposal whose record was forgotten", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_forgotten")
        const gone = assessedRecord(treeId, "gone")
        await journal.record([gone.record])

        const page = await journal.read()
        const last = page.ok ? page.value.records.at(-1) : undefined
        await journal.forget({ before: (last?.seq ?? 0) + 1 })

        const found = await journal.assessments({ proposalIds: [gone.proposalId] })

        expect(found.ok && found.value.assessments.size).toBe(0)
      })
    })

    /**
     * The destructive half. Every rule about *what* may go lives in
     * `retention.ts`; what a journal owes is that a position means the same
     * thing to both implementations, and that a prune never reshuffles what
     * survives it.
     */
    describe("forgetting", () => {
      const seqsAfter = async (journal: TelemetryJournal): Promise<readonly number[]> => {
        const page = await journal.read()

        return page.ok ? page.value.records.map((record) => record.seq) : []
      }

      it("drops the records below a position and keeps the rest", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_forget")
        await journal.record(recordsFor(treeId, 4))

        const all = await seqsAfter(journal)
        const cut = all[2] ?? 0

        expect(await journal.forget({ before: cut })).toEqual({
          ok: true,
          value: { removed: 2 },
        })
        expect(await seqsAfter(journal)).toEqual(all.slice(2))
      })

      it("forgets nothing when the position is at or below the oldest record", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_nofor")
        await journal.record(recordsFor(treeId, 3))

        const all = await seqsAfter(journal)

        expect(await journal.forget({ before: all[0] ?? 0 })).toEqual({
          ok: true,
          value: { removed: 0 },
        })
        expect(await seqsAfter(journal)).toEqual(all)
      })

      it("forgets across every tree it holds, because a position is journal-wide", async () => {
        const journal = await freshJournal()
        const mine = treeIdSchema.parse("t_fmine")
        const yours = treeIdSchema.parse("t_fyours")
        await journal.record([...recordsFor(mine, 2), ...recordsFor(yours, 2)])

        const all = await seqsAfter(journal)
        const forgotten = await journal.forget({ before: all[3] ?? 0 })

        expect(forgotten).toEqual({ ok: true, value: { removed: 3 } })
        expect(await journal.read({ treeId: mine })).toMatchObject({
          ok: true,
          value: { records: [] },
        })
      })

      /** Idempotent, so a retention run that repeats after a timeout is harmless. */
      it("is a no-op the second time", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_twice")
        await journal.record(recordsFor(treeId, 3))

        const all = await seqsAfter(journal)
        await journal.forget({ before: all[1] ?? 0 })

        expect(await journal.forget({ before: all[1] ?? 0 })).toEqual({
          ok: true,
          value: { removed: 0 },
        })
        expect(await seqsAfter(journal)).toEqual(all.slice(1))
      })

      /**
       * A forgotten position is never handed out again. A reader holding a
       * cursor across a prune would otherwise resume inside records it has
       * already read, and think the journal had gone backwards.
       */
      it("does not reuse the positions it forgot", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_reuse")
        await journal.record(recordsFor(treeId, 3))

        const all = await seqsAfter(journal)
        await journal.forget({ before: (all.at(-1) ?? 0) + 1 })
        await journal.record(recordsFor(treeId, 1))

        const after = await seqsAfter(journal)

        expect(after).toHaveLength(1)
        expect(after[0]).toBeGreaterThan(all.at(-1) ?? 0)
      })

      it("empties a journal asked to forget everything", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_empty")
        await journal.record(recordsFor(treeId, 3))

        const all = await seqsAfter(journal)

        expect(await journal.forget({ before: (all.at(-1) ?? 0) + 1 })).toEqual({
          ok: true,
          value: { removed: 3 },
        })
        expect(await journal.read()).toEqual({
          ok: true,
          value: { records: [], older: null, newer: null, span: null },
        })
      })

      it("accepts a position an empty journal has nothing below", async () => {
        const journal = await freshJournal()

        expect(await journal.forget({ before: 1 })).toEqual({ ok: true, value: { removed: 0 } })
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

    /**
     * The read a person actually asks for, and the one a journal paged by
     * arrival could not answer.
     *
     * Every bound here is taken off the journal's own stamps rather than off the
     * clock in this process. A journal in memory stamps from a clock it was
     * handed; a journal in Postgres stamps from `now()` on the database server,
     * whose reading of the hour is its own. A suite that composed a bound
     * locally would be asserting that two machines agree about the time, which
     * is the one thing a `recordedAt` exists because they do not.
     */
    describe("asking for a stretch of time", () => {
      const spanOrThrow = async (journal: TelemetryJournal): Promise<TelemetrySpan> => {
        const page = await journal.read({ limit: MAX_TELEMETRY_LIMIT })
        if (!page.ok) throw new Error("the journal could not be read")
        if (page.value.span === null) throw new Error("the journal reported no span to bound by")

        return page.value.span
      }

      const windowOrThrow = (request: Parameters<typeof telemetryWindow>[0]): TelemetryWindow => {
        const built = telemetryWindow(request)
        if (!built.ok) throw new Error(describeTelemetryWindowFault(built.error))

        return built.value
      }

      /** One millisecond past a stamp, which is the smallest exclusive upper bound that holds it. */
      const justAfter = (stamp: string): string => new Date(Date.parse(stamp) + 1).toISOString()

      it("reports the stretch a page covers, and reports nothing for a page with no records", async () => {
        const journal = await freshJournal()

        expect(await journal.read()).toMatchObject({ ok: true, value: { span: null } })

        await journal.record(sampleEpisode("span"))
        const page = await journal.read()

        if (!page.ok) throw new Error("the journal could not be read")

        const span = page.value.span
        expect(span).not.toBeNull()
        expect(
          page.value.records.every(
            (record) =>
              Date.parse(record.recordedAt) >= Date.parse(span?.from ?? "") &&
              Date.parse(record.recordedAt) <= Date.parse(span?.to ?? "")
          )
        ).toBe(true)
      })

      it("holds every record when the window spans the journal's own ends", async () => {
        const journal = await freshJournal()
        const episode = sampleEpisode("whole")
        await journal.record(episode)

        const span = await spanOrThrow(journal)
        const page = await journal.read({
          window: windowOrThrow({ since: span.from, until: justAfter(span.to) }),
        })

        expect(page.ok && typesOf(page.value.records)).toEqual(typesOf(episode))
      })

      /**
       * `since` is inclusive and `until` is not, which is what lets two
       * consecutive windows tile. The two assertions are the two ends of that
       * one claim: the earliest stamp is in a window that begins on it, and out
       * of a window that ends on it.
       */
      it("includes a record on its since and excludes one on its until", async () => {
        const journal = await freshJournal()
        await journal.record(sampleEpisode("ends"))

        const span = await spanOrThrow(journal)

        const from = await journal.read({ window: windowOrThrow({ since: span.from }) })
        const upTo = await journal.read({ window: windowOrThrow({ until: span.from }) })

        expect(from.ok && from.value.records.length).toBeGreaterThan(0)
        expect(upTo.ok && upTo.value.records).toEqual([])
        expect(upTo.ok && upTo.value.span).toBeNull()
      })

      /**
       * The property the half-open shape exists for: a boundary cuts the
       * journal in two and loses nothing and counts nothing twice. An
       * implementation that made `until` inclusive passes every other test here
       * and fails this one, because the record stamped exactly on the boundary
       * turns up on both sides.
       */
      it("tiles: a boundary splits the journal with nothing lost and nothing counted twice", async () => {
        const journal = await freshJournal()
        await journal.record(sampleEpisode("tilea"))
        await journal.record(sampleEpisode("tileb"))

        const span = await spanOrThrow(journal)
        const everything = await journal.read({ limit: MAX_TELEMETRY_LIMIT })

        const before = await journal.read({
          window: windowOrThrow({ until: span.to }),
          limit: MAX_TELEMETRY_LIMIT,
        })
        const after = await journal.read({
          window: windowOrThrow({ since: span.to }),
          limit: MAX_TELEMETRY_LIMIT,
        })

        const seqsIn = (page: typeof everything): readonly number[] =>
          page.ok ? page.value.records.map((record) => record.seq) : []

        const split = [...seqsIn(before), ...seqsIn(after)].sort((a, b) => a - b)

        expect(split).toEqual(seqsIn(everything))
        expect(new Set(split).size).toBe(split.length)
      })

      /**
       * A window is measured against `recordedAt` and never against
       * `occurredAt`, and this is the test that can tell. Every record in the
       * fixture carries an `occurredAt` months in the past, so a window bounded
       * at the journal's own stamps holds them all — and an implementation that
       * bounded on what the host said would answer with nothing at all.
       */
      it("measures the window against when it learned of a record, not against what the host said", async () => {
        const journal = await freshJournal()
        const episode = sampleEpisode("stamped")
        await journal.record(episode)

        const span = await spanOrThrow(journal)
        const page = await journal.read({ window: windowOrThrow({ since: span.from }) })

        expect(page.ok && page.value.records).toHaveLength(episode.length)
        expect(page.ok && page.value.records.every((record) => record.occurredAt === FIXED_INSTANT)).toBe(true)
        expect(Date.parse(span.from)).toBeGreaterThan(Date.parse(FIXED_INSTANT))
      })

      it("reads a window nothing landed in as an empty page rather than an error", async () => {
        const journal = await freshJournal()
        await journal.record(sampleEpisode("after"))

        const span = await spanOrThrow(journal)

        expect(
          await journal.read({ window: windowOrThrow({ since: justAfter(span.to) }) })
        ).toEqual({ ok: true, value: { records: [], older: null, newer: null, span: null } })
      })

      /**
       * The cursors a windowed page names stay inside the window. A `beyond`
       * probe that ignored the bound would hand back a cursor pointing at a
       * record the window excludes, and a reader paging to the end of *last
       * week* would walk out of it without being told.
       */
      it("pages within the window and never out of it", async () => {
        const journal = await freshJournal()
        const treeId = treeIdSchema.parse("t_windowpage")
        await journal.record(recordsFor(treeId, 5))

        const span = await spanOrThrow(journal)
        const bounded = windowOrThrow({ since: span.from, until: justAfter(span.to) })

        const collected: number[] = []
        let cursor: string | null | undefined

        do {
          const page = await journal.read({ window: bounded, limit: 2, ...(cursor ? { cursor } : {}) })
          if (!page.ok) throw new Error("the journal could not be read")

          collected.push(...page.value.records.map((record) => record.seq))
          cursor = page.value.newer
        } while (cursor)

        expect(collected).toHaveLength(5)
        expect(new Set(collected).size).toBe(5)
      })

      it("narrows by tree and by window together", async () => {
        const journal = await freshJournal()
        const mine = treeIdSchema.parse("t_wmine")
        const yours = treeIdSchema.parse("t_wyours")
        await journal.record([...recordsFor(mine, 2), ...recordsFor(yours, 3)])

        const span = await spanOrThrow(journal)
        const page = await journal.read({
          treeId: yours,
          window: windowOrThrow({ since: span.from, until: justAfter(span.to) }),
        })

        expect(page.ok && page.value.records).toHaveLength(3)
        expect(page.ok && page.value.records.every((record) => record.treeId === yours)).toBe(true)
      })
    })
  })
}
