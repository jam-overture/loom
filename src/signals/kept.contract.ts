/**
 * The fifth contract suite both reader-signal journals are run against: **a
 * counted delivery is marked rather than deleted, and the mark is what the next
 * fold reads** (0350).
 *
 * It is here rather than beside the three in `src/testing/reader-signal-contract.ts`
 * for the reason `applied-window.contract.ts` is: that directory is another
 * lane's and this is reader-signal work. The finding filed with 0316 asks for
 * the set to be moved together, which is one import away.
 *
 * **Every property here needs two implementations to be worth asserting**,
 * which is what earns it a contract rather than a test beside the memory store.
 * The stamp has to be idempotent, and in Postgres that is a clause in a `WHERE`
 * — `folded_at IS NULL` — while in memory it is a guard in a `map`. The filter
 * has to tell three states apart, and in Postgres `null` is one of them while
 * in memory the field is absent. Those are exactly the differences that make
 * two stores quietly disagree, and the disagreement here would be a window
 * counted twice (0158).
 */

import { describe, expect, it } from "vitest"

import { batchOf, nodeId, viewed } from "../testing/reader-signal-contract.js"

import type { ReaderSignalJournal, ReaderSignalStoreError } from "./journal.js"

const AT = "2026-11-05T09:00:00.000Z"
const LATER = "2026-11-05T10:00:00.000Z"

const unwrap = <TValue>(
  result: { ok: true; value: TValue } | { ok: false; error: ReaderSignalStoreError }
): TValue => {
  if (!result.ok) throw new Error(result.error.detail)

  return result.value
}

export const describeKeptDeliveryContract = (
  name: string,
  make: () => Promise<ReaderSignalJournal> | ReaderSignalJournal
): void => {
  describe(`${name} — a counted delivery`, () => {
    /** Three deliveries, oldest first, and the position above the second. */
    const three = async () => {
      const journal = await make()
      await journal.receive([
        batchOf([viewed("a")]),
        batchOf([viewed("b")]),
        batchOf([viewed("c")]),
      ])

      const seqs = unwrap(await journal.read()).batches.map((batch) => batch.seq)

      return { journal, before: seqs[2] as number }
    }

    const names = async (
      journal: ReaderSignalJournal,
      counted?: boolean
    ): Promise<readonly (string | undefined)[]> =>
      unwrap(
        await journal.read(counted === undefined ? undefined : { counted })
      ).batches.map((batch) => batch.signals[0]?.nodeId)

    it("is still there, carrying the instant the fold was taken at", async () => {
      const { journal, before } = await three()

      expect(unwrap(await journal.counted({ before, at: AT })).counted).toBe(2)
      expect(unwrap(await journal.read()).batches.map((batch) => batch.foldedAt)).toEqual([
        AT,
        AT,
        undefined,
      ])
    })

    /**
     * **The case this would double-count** (0158). The run that stamps has
     * already written the counters, so a retry of the stamp must not be worse
     * than the failure that caused it — and the second call must not move an
     * instant a reading has been taken against.
     */
    it("is stamped once, however many times the prefix is marked", async () => {
      const { journal, before } = await three()
      await journal.counted({ before, at: AT })

      expect(unwrap(await journal.counted({ before, at: LATER })).counted).toBe(0)
      expect(unwrap(await journal.read()).batches.map((batch) => batch.foldedAt)).toEqual([
        AT,
        AT,
        undefined,
      ])
    })

    /**
     * The fold's own read. It is what stops collection scanning the kept window
     * to find the handful of rows it is for, and it is what stops it folding a
     * window twice.
     */
    it("is left out of the uncounted read and in the counted one", async () => {
      const { journal, before } = await three()
      await journal.counted({ before, at: AT })

      expect(await names(journal, false)).toEqual([nodeId("c")])
      expect(await names(journal, true)).toEqual([nodeId("a"), nodeId("b")])
      expect(await names(journal)).toEqual([nodeId("a"), nodeId("b"), nodeId("c")])
    })

    it("marks nothing where nothing is below the position", async () => {
      const journal = await make()
      await journal.receive([batchOf([viewed("a")])])

      const [only] = unwrap(await journal.read()).batches

      expect(unwrap(await journal.counted({ before: only?.seq ?? 0, at: AT })).counted).toBe(0)
      expect(await names(journal, false)).toEqual([nodeId("a")])
    })

    /**
     * The expiry sweep's delete, which is the ordinary `forget` against a
     * prefix the fold has already stamped. The journal does not enforce the
     * *counted first* rule — that is `expire.ts`' plan, which is where the rule
     * can be read — so what this asserts is that the two operations compose:
     * the prefix a fold marked is a prefix retention can delete.
     */
    it("is deleted by the ordinary prefix forget once retention reaches it", async () => {
      const { journal, before } = await three()
      await journal.counted({ before, at: AT })

      expect(unwrap(await journal.forget({ before })).removed).toBe(2)
      expect(await names(journal)).toEqual([nodeId("c")])
      expect(await names(journal, true)).toEqual([])
    })

    /** A fresh delivery is uncounted, which is the state every row starts in. */
    it("starts uncounted, with nothing on the field", async () => {
      const journal = await make()
      await journal.receive([batchOf([viewed("a")])])

      const [only] = unwrap(await journal.read()).batches

      expect(only?.foldedAt).toBeUndefined()
      expect(await names(journal, true)).toEqual([])
    })
  })
}
