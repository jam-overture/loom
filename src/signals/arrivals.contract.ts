/**
 * The sixth contract suite both reader-signal tally stores are run against:
 * **page views are counted under the hour they began in, and the hours of a
 * revision sum to its total** (`arrivals.ts`).
 *
 * It is here rather than beside the three in `src/testing/reader-signal-contract.ts`
 * for the reason `applied-window.contract.ts` and `kept.contract.ts` are: that
 * directory is another lane's and this is reader-signal work. The finding filed
 * with 0316 asks for the set to be moved together, which is one import away.
 *
 * **Every property here needs two implementations to be worth asserting.** The
 * hour is a `timestamptz` in one store and a number in the other, so a bucket
 * is a `Date` that has to come back as the instant it went in as; the pair of
 * writes is a transaction in one and two map writes in the other; and two
 * counts of one hour in a single call are an `ON CONFLICT` Postgres **raises**
 * on and a `Map` silently overwrites. Each of those is a way for a chart to
 * stop summing to the counter it is drawn beside, which is permanent (0158).
 */

import { describe, expect, it } from "vitest"

import { OTHER_TREE, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"

import { ARRIVAL_HOUR_MS } from "./arrivals.js"
import type { ReaderSignalStoreError } from "./journal.js"
import type { RevisionViews } from "./page-views.js"
import type { ReaderTallyStore } from "./tally.js"

const HOUR = ARRIVAL_HOUR_MS
const MIDNIGHT = Date.parse("2026-11-06T00:00:00.000Z")

const at = (hour: number, minutes = 0): string =>
  new Date(MIDNIGHT + hour * HOUR + minutes * 60_000).toISOString()

const opening = (views: number, overrides: Partial<RevisionViews> = {}): RevisionViews => ({
  treeId: TREE,
  revision: 1,
  views,
  ...overrides,
})

const unwrap = <TValue>(
  result: { ok: true; value: TValue } | { ok: false; error: ReaderSignalStoreError }
): TValue => {
  if (!result.ok) throw new Error(result.error.detail)

  return result.value
}

export const describeArrivalHourContract = (
  name: string,
  make: () => Promise<ReaderTallyStore> | ReaderTallyStore
): void => {
  describe(`${name} — page views by the hour they began in`, () => {
    const counted = async (): Promise<ReaderTallyStore> => {
      const store = await make()
      unwrap(await store.opened([opening(2)], at(9, 15), SKIERS))

      return store
    }

    it("files an arrival under the hour of the instant it was counted at", async () => {
      const store = await counted()
      const { hours } = unwrap(await store.arrivals())

      expect(hours).toEqual([
        {
          audienceId: SKIERS,
          treeId: TREE,
          revision: 1,
          hour: MIDNIGHT + 9 * HOUR,
          views: 2,
          updatedAt: at(9, 15),
        },
      ])
    })

    it("adds a second delivery in the same hour to the same row", async () => {
      const store = await counted()
      unwrap(await store.opened([opening(3)], at(9, 59), SKIERS))

      const { hours } = unwrap(await store.arrivals())

      expect(hours).toHaveLength(1)
      expect(hours[0]?.views).toBe(5)
    })

    it("puts a delivery one minute later in the next hour", async () => {
      const store = await counted()
      unwrap(await store.opened([opening(3)], at(10, 0), SKIERS))

      const { hours } = unwrap(await store.arrivals())

      expect(hours.map((row) => [row.hour, row.views])).toEqual(
        expect.arrayContaining([
          [MIDNIGHT + 9 * HOUR, 2],
          [MIDNIGHT + 10 * HOUR, 3],
        ])
      )
    })

    /**
     * Two entries naming one hour inside a single call are added, which is the
     * guarantee `counters.ts` gives in front of the driver: Postgres refuses to
     * affect one row twice in one command and a `Map` would keep the last.
     */
    it("adds two openings of one revision handed over together", async () => {
      const store = await make()
      unwrap(await store.opened([opening(2), opening(3)], at(9), SKIERS))

      const { hours } = unwrap(await store.arrivals())

      expect(hours).toHaveLength(1)
      expect(hours[0]?.views).toBe(5)
    })

    it("keeps an hour of two audiences apart (0284)", async () => {
      const store = await counted()
      unwrap(await store.opened([opening(4)], at(9, 30), RIDERS))

      const { hours } = unwrap(await store.arrivals())

      expect(hours).toHaveLength(2)
      expect(unwrap(await store.arrivals({ audience: RIDERS })).hours[0]?.views).toBe(4)
    })

    it("keeps an hour of two trees apart", async () => {
      const store = await counted()
      unwrap(await store.opened([opening(4, { treeId: OTHER_TREE })], at(9, 30), SKIERS))

      expect(unwrap(await store.arrivals()).hours).toHaveLength(2)
      expect(unwrap(await store.arrivals({ treeId: TREE })).hours).toHaveLength(1)
    })

    it("keeps an hour of two revisions apart", async () => {
      const store = await counted()
      unwrap(await store.opened([opening(4, { revision: 2 })], at(9, 30), SKIERS))

      expect(unwrap(await store.arrivals()).hours).toHaveLength(2)
      expect(unwrap(await store.arrivals({ revision: 2 })).hours[0]?.views).toBe(4)
    })

    /**
     * The invariant the pair of writes exists for: every arrival is in both
     * counters, so a chart drawn off the hours sums to the total drawn beside
     * it.
     */
    it("counts every arrival into the revision's total as well", async () => {
      const store = await counted()
      unwrap(await store.opened([opening(3)], at(13, 5), SKIERS))

      const { hours } = unwrap(await store.arrivals())
      const [total] = unwrap(await store.pageViews())

      expect(hours.reduce((sum, row) => sum + row.views, 0)).toBe(total?.opened)
      expect(total?.opened).toBe(5)
    })

    it("counts nothing at all where the instant is not one", async () => {
      const store = await make()
      const written = await store.opened([opening(2)], "whenever", SKIERS)

      expect(written.ok).toBe(false)
      expect(unwrap(await store.arrivals()).hours).toEqual([])
      expect(unwrap(await store.pageViews())).toEqual([])
    })

    it("writes nothing for a delivery that opened nothing", async () => {
      const store = await make()
      unwrap(await store.opened([], at(9), SKIERS))

      expect(unwrap(await store.arrivals()).hours).toEqual([])
    })

    describe("over a range", () => {
      const spread = async (): Promise<ReaderTallyStore> => {
        const store = await make()

        for (const hour of [1, 5, 9]) {
          unwrap(await store.opened([opening(hour)], at(hour), SKIERS))
        }

        return store
      }

      it("holds the hours from the start of the range to the end, and not the ends' neighbours", async () => {
        const store = await spread()
        const { hours } = unwrap(
          await store.arrivals({ from: MIDNIGHT + 5 * HOUR, to: MIDNIGHT + 9 * HOUR })
        )

        expect(hours.map((row) => row.views)).toEqual([5])
      })

      it("is unbounded on a side the request leaves out", async () => {
        const store = await spread()

        expect(unwrap(await store.arrivals({ to: MIDNIGHT + 9 * HOUR })).hours).toHaveLength(2)
        expect(unwrap(await store.arrivals({ from: MIDNIGHT + 5 * HOUR })).hours).toHaveLength(2)
      })

      it("answers an empty range with no hours and the beginning still named", async () => {
        const store = await spread()
        const read = unwrap(
          await store.arrivals({ from: MIDNIGHT + 20 * HOUR, to: MIDNIGHT + 21 * HOUR })
        )

        expect(read.hours).toEqual([])
        expect(read.begins).toBe(MIDNIGHT + HOUR)
      })
    })

    describe("the hour counting began", () => {
      it("is the earliest hour the scope has, whatever range was asked for", async () => {
        const store = await make()
        unwrap(await store.opened([opening(1)], at(9), SKIERS))
        unwrap(await store.opened([opening(1)], at(2), SKIERS))

        const read = unwrap(
          await store.arrivals({ from: MIDNIGHT + 9 * HOUR, to: MIDNIGHT + 10 * HOUR })
        )

        expect(read.begins).toBe(MIDNIGHT + 2 * HOUR)
      })

      it("is absent where nothing has ever been counted", async () => {
        const store = await make()

        expect(unwrap(await store.arrivals()).begins).toBeUndefined()
      })

      it("narrows with the request, so a page says when it began rather than when the deployment did", async () => {
        const store = await make()
        unwrap(await store.opened([opening(1)], at(2), SKIERS))
        unwrap(await store.opened([opening(1, { treeId: OTHER_TREE })], at(9), SKIERS))

        expect(unwrap(await store.arrivals({ treeId: OTHER_TREE })).begins).toBe(
          MIDNIGHT + 9 * HOUR
        )
      })
    })

    it("is not changed by being read", async () => {
      const store = await counted()

      expect(unwrap(await store.arrivals()).hours[0]?.views).toBe(2)
      expect(unwrap(await store.arrivals()).hours[0]?.views).toBe(2)
    })
  })
}
