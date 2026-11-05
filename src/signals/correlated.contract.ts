/**
 * The sixth contract suite both reader-signal journals are run against: **the
 * deliveries of one page view, read on the key and on nothing else** (0355).
 *
 * It is here rather than beside the three in `src/testing/reader-signal-contract.ts`
 * for the reason `kept.contract.ts` and `applied-window.contract.ts` are: that
 * directory is another lane's and this is reader-signal work. The finding filed
 * with 0316 asks for the set to be moved together, which is one import away.
 *
 * **Every property here needs two implementations to be worth asserting.** The
 * key is a nullable column in Postgres and an absent field in memory, which is
 * exactly the shape that makes two stores quietly disagree — the same
 * difference `kept.contract.ts` exists for one column over. Two of these
 * assertions are about what the narrowing must *not* match — a delivery of
 * another page view, and a delivery that names none at all — and the second is
 * the one that goes wrong by accident: in Postgres `view = $1` cannot match a
 * null, and in memory the field is absent, so a comparison written the obvious
 * way would gather every uncorrelated delivery into whichever page view asked.
 * (The application scope is not here, because the memory store takes none; it
 * is `scoped.test.ts`'s, beside the other reads it covers.)
 */

import { describe, expect, it } from "vitest"

import { batchOf, viewed, viewKey } from "../testing/reader-signal-contract.js"

import type { ReaderSignalJournal, ReaderSignalStoreError } from "./journal.js"

const unwrap = <TValue>(
  result: { ok: true; value: TValue } | { ok: false; error: ReaderSignalStoreError }
): TValue => {
  if (!result.ok) throw new Error(result.error.detail)

  return result.value
}

export const describeCorrelatedDeliveryContract = (
  name: string,
  make: () => Promise<ReaderSignalJournal> | ReaderSignalJournal
): void => {
  describe(`${name} — the deliveries of one page view`, () => {
    const ONE = viewKey(1)
    const TWO = viewKey(2)

    /**
     * Two page views and a delivery belonging to neither, interleaved, because
     * a filter that read the newest run of rows rather than the matching ones
     * would pass against a table where each page view's deliveries are
     * adjacent.
     */
    const mixed = async () => {
      const journal = await make()
      await journal.receive([
        batchOf([viewed("a")], { view: ONE, first: true }),
        batchOf([viewed("b")], { view: TWO, first: true }),
        batchOf([viewed("c")]),
        batchOf([viewed("d")], { view: ONE }),
      ])

      return journal
    }

    const names = async (
      journal: ReaderSignalJournal,
      view?: ReturnType<typeof viewKey>
    ): Promise<readonly (string | undefined)[]> =>
      unwrap(await journal.read(view === undefined ? undefined : { view })).batches.map(
        (batch) => batch.signals[0]?.nodeId
      )

    it("is every delivery that carried the key, in arrival order", async () => {
      const journal = await mixed()

      expect(await names(journal, ONE)).toEqual(["n_a", "n_d"])
    })

    /** The narrowing is the whole correlation: another page view is another read. */
    it("is no delivery of another page view", async () => {
      const journal = await mixed()

      expect(await names(journal, TWO)).toEqual(["n_b"])
    })

    /**
     * **The one `undefined === undefined` would get wrong.** A delivery that
     * names no page view — a batch from a sender that mints no keys, or one
     * replayed from a fixture — belongs to no page view and must not be
     * gathered into somebody else's.
     */
    it("is no delivery that named no page view", async () => {
      const journal = await mixed()

      expect(await names(journal, ONE)).not.toContain("n_c")
      expect(await names(journal, TWO)).not.toContain("n_c")
    })

    /** Nothing is withheld when no key is named, which is the read every other caller makes. */
    it("is every delivery where no key is named", async () => {
      const journal = await mixed()

      expect(await names(journal)).toEqual(["n_a", "n_b", "n_c", "n_d"])
    })

    /**
     * A key nothing carries is an empty page rather than a refusal — which is
     * what a page view whose deliveries the sweep has taken looks like, and the
     * state a drawer opened on a link from last month is in.
     */
    it("is an empty page for a key nothing carries", async () => {
      const journal = await mixed()

      expect(await names(journal, viewKey(9))).toEqual([])
    })

    /** The limit still clamps and the ends still answer, because this is a page like any other. */
    it("is paged like every other read", async () => {
      const journal = await mixed()
      const page = unwrap(await journal.read({ view: ONE, limit: 1 }))

      expect(page.batches.map((batch) => batch.signals[0]?.nodeId)).toEqual(["n_a"])
      expect(page.newer).not.toBeNull()
      expect(page.older).toBeNull()
    })
  })
}
