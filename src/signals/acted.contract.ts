/**
 * The seventh contract suite both reader-signal tally stores are run against:
 * **what readers did to a part, filed under the hour they did it in, and the
 * hours of a part summing to the part's own counters** (`acted.ts`).
 *
 * Here rather than beside the three in `src/testing/reader-signal-contract.ts`
 * for the reason `arrivals.contract.ts` is: that directory is another lane's
 * and this is reader-signal work.
 *
 * **Every property here needs two implementations to be worth asserting**, and
 * they are the same three hazards the arrivals suite names, one table deeper.
 * The hour is a `timestamptz` in one store and a number in the other; a part's
 * row is written in the same transaction as the tally it slices in one and
 * through two maps in the other; and two rows naming one part-hour inside a
 * single call are an `ON CONFLICT` Postgres **raises** on and a `Map` silently
 * overwrites. Each is a way for a goal's chart to stop summing to the goal's
 * own figure, which is permanent (0158).
 */

import { describe, expect, it } from "vitest"

import { nodeId, OTHER_TREE, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"

import type { ActedHourCount } from "./acted.js"
import { ARRIVAL_HOUR_MS } from "./arrivals.js"
import type { ReaderSignalStoreError } from "./journal.js"
import type { ReaderTallyStore } from "./tally.js"

const HOUR = ARRIVAL_HOUR_MS
const MIDNIGHT = Date.parse("2026-11-06T00:00:00.000Z")

const at = (hour: number, minutes = 0): string =>
  new Date(MIDNIGHT + hour * HOUR + minutes * 60_000).toISOString()

const hourOf = (hour: number): number => MIDNIGHT + hour * HOUR

const pressed = (hour: number, overrides: Partial<ActedHourCount> = {}): ActedHourCount => ({
  treeId: TREE,
  revision: 1,
  nodeId: nodeId("buy"),
  type: primitiveType("loom.button"),
  hour: hourOf(hour),
  activations: 1,
  opens: 0,
  closes: 0,
  completions: 0,
  ...overrides,
})

const unwrap = <TValue>(
  result: { ok: true; value: TValue } | { ok: false; error: ReaderSignalStoreError }
): TValue => {
  if (!result.ok) throw new Error(result.error.detail)

  return result.value
}

export const describeActedHourContract = (
  name: string,
  make: () => Promise<ReaderTallyStore> | ReaderTallyStore
): void => {
  describe(`${name} — what readers did, by the hour they did it in`, () => {
    const counted = async (): Promise<ReaderTallyStore> => {
      const store = await make()
      unwrap(
        await store.apply(
          { tallies: [], funnels: [], acted: [pressed(9, { activations: 2 })] },
          at(9, 30),
          SKIERS
        )
      )

      return store
    }

    it("files what readers did under the hour it was folded with", async () => {
      const store = await counted()
      const { hours } = unwrap(await store.acted())

      expect(hours).toEqual([
        {
          audienceId: SKIERS,
          treeId: TREE,
          revision: 1,
          nodeId: nodeId("buy"),
          type: primitiveType("loom.button"),
          hour: hourOf(9),
          activations: 2,
          opens: 0,
          closes: 0,
          completions: 0,
          updatedAt: at(9, 30),
        },
      ])
    })

    it("adds a second window's rows to the same part-hour", async () => {
      const store = await counted()
      unwrap(
        await store.apply({ tallies: [], funnels: [], acted: [pressed(9)] }, at(9, 55), SKIERS)
      )

      const { hours } = unwrap(await store.acted())

      expect(hours).toHaveLength(1)
      expect(hours[0]?.activations).toBe(3)
    })

    it("keeps the next hour's presses in their own row", async () => {
      const store = await counted()
      unwrap(await store.apply({ tallies: [], funnels: [], acted: [pressed(10)] }, at(10), SKIERS))

      const { hours } = unwrap(await store.acted())

      expect(hours.map((row) => [row.hour, row.activations])).toEqual(
        expect.arrayContaining([
          [hourOf(9), 2],
          [hourOf(10), 1],
        ])
      )
    })

    /**
     * Two rows naming one part-hour inside a single call are added, which is
     * the guarantee `counters.ts` gives in front of the driver: Postgres
     * refuses to affect one row twice in one command and a `Map` would keep
     * the last.
     */
    it("adds two rows of one part-hour handed over together", async () => {
      const store = await make()
      unwrap(
        await store.apply(
          { tallies: [], funnels: [], acted: [pressed(9), pressed(9, { activations: 4 })] },
          at(9),
          SKIERS
        )
      )

      const { hours } = unwrap(await store.acted())

      expect(hours).toHaveLength(1)
      expect(hours[0]?.activations).toBe(5)
    })

    it("counts the four kinds of doing apart", async () => {
      const store = await make()
      unwrap(
        await store.apply(
          {
            tallies: [],
            funnels: [],
            acted: [pressed(9, { activations: 0, opens: 3, closes: 2, completions: 1 })],
          },
          at(9),
          SKIERS
        )
      )

      expect(unwrap(await store.acted()).hours[0]).toMatchObject({
        activations: 0,
        opens: 3,
        closes: 2,
        completions: 1,
      })
    })

    it("takes the later window's word for what a part is", async () => {
      const store = await counted()
      unwrap(
        await store.apply(
          { tallies: [], funnels: [], acted: [pressed(9, { type: primitiveType("loom.link") })] },
          at(9, 40),
          SKIERS
        )
      )

      expect(unwrap(await store.acted()).hours[0]?.type).toBe(primitiveType("loom.link"))
    })

    it("keeps two parts of one hour apart, and sums them when neither is named", async () => {
      const store = await counted()
      unwrap(
        await store.apply(
          { tallies: [], funnels: [], acted: [pressed(9, { nodeId: nodeId("signup") })] },
          at(9, 45),
          SKIERS
        )
      )

      expect(unwrap(await store.acted()).hours).toHaveLength(2)
      expect(unwrap(await store.acted({ nodeId: nodeId("buy") })).hours).toHaveLength(1)
      expect(unwrap(await store.acted({ nodeId: nodeId("buy") })).hours[0]?.activations).toBe(2)
    })

    it("keeps an hour of two audiences apart (0284)", async () => {
      const store = await counted()
      unwrap(await store.apply({ tallies: [], funnels: [], acted: [pressed(9)] }, at(9), RIDERS))

      expect(unwrap(await store.acted()).hours).toHaveLength(2)
      expect(unwrap(await store.acted({ audience: RIDERS })).hours[0]?.activations).toBe(1)
    })

    it("keeps an hour of two trees apart", async () => {
      const store = await counted()
      unwrap(
        await store.apply(
          { tallies: [], funnels: [], acted: [pressed(9, { treeId: OTHER_TREE })] },
          at(9),
          SKIERS
        )
      )

      expect(unwrap(await store.acted()).hours).toHaveLength(2)
      expect(unwrap(await store.acted({ treeId: TREE })).hours).toHaveLength(1)
    })

    it("keeps an hour of two revisions apart, so a change can be read across one", async () => {
      const store = await counted()
      unwrap(
        await store.apply(
          { tallies: [], funnels: [], acted: [pressed(9, { revision: 2 })] },
          at(9),
          SKIERS
        )
      )

      expect(unwrap(await store.acted()).hours).toHaveLength(2)
      expect(unwrap(await store.acted({ revision: 2 })).hours[0]?.activations).toBe(1)
    })

    it("writes nothing for a window in which readers did nothing", async () => {
      const store = await make()
      unwrap(await store.apply({ tallies: [], funnels: [], acted: [] }, at(9), SKIERS))

      expect(unwrap(await store.acted()).hours).toEqual([])
      expect(unwrap(await store.acted()).begins).toBeUndefined()
    })

    describe("over a range", () => {
      const spread = async (): Promise<ReaderTallyStore> => {
        const store = await make()

        for (const hour of [1, 5, 9]) {
          unwrap(
            await store.apply(
              { tallies: [], funnels: [], acted: [pressed(hour, { activations: hour })] },
              at(hour),
              SKIERS
            )
          )
        }

        return store
      }

      it("holds the hours from the start of the range to the end, and not the ends' neighbours", async () => {
        const store = await spread()
        const { hours } = unwrap(await store.acted({ from: hourOf(5), to: hourOf(9) }))

        expect(hours.map((row) => row.activations)).toEqual([5])
      })

      it("is unbounded on a side the request leaves out", async () => {
        const store = await spread()

        expect(unwrap(await store.acted({ to: hourOf(9) })).hours).toHaveLength(2)
        expect(unwrap(await store.acted({ from: hourOf(5) })).hours).toHaveLength(2)
      })

      it("answers an empty range with no hours and the beginning still named", async () => {
        const store = await spread()
        const read = unwrap(await store.acted({ from: hourOf(20), to: hourOf(21) }))

        expect(read.hours).toEqual([])
        expect(read.begins).toBe(hourOf(1))
      })
    })

    describe("the hour counting began", () => {
      it("is the earliest hour the scope has, whatever range was asked for", async () => {
        const store = await make()
        unwrap(await store.apply({ tallies: [], funnels: [], acted: [pressed(9)] }, at(9), SKIERS))
        unwrap(await store.apply({ tallies: [], funnels: [], acted: [pressed(2)] }, at(2), SKIERS))

        expect(unwrap(await store.acted({ from: hourOf(9), to: hourOf(10) })).begins).toBe(hourOf(2))
      })

      /**
       * The clause a goal depends on: a goal made this afternoon on a part
       * nobody pressed until this afternoon has been measurable since this
       * afternoon, and a beginning taken over the deployment would draw a year
       * of noughts behind it.
       */
      it("narrows to the part, so a goal says when its own part was first acted in", async () => {
        const store = await make()
        unwrap(await store.apply({ tallies: [], funnels: [], acted: [pressed(2)] }, at(2), SKIERS))
        unwrap(
          await store.apply(
            { tallies: [], funnels: [], acted: [pressed(9, { nodeId: nodeId("signup") })] },
            at(9),
            SKIERS
          )
        )

        expect(unwrap(await store.acted({ nodeId: nodeId("signup") })).begins).toBe(hourOf(9))
      })

      it("is absent where nothing has ever been counted", async () => {
        const store = await make()

        expect(unwrap(await store.acted()).begins).toBeUndefined()
      })
    })

    /**
     * The invariant the whole design rests on: the hourly rows are a slice of
     * the tallies, so a window's hours add up to the same occurrences its
     * tallies carry. Both are written here by one call, which is what the fold
     * does.
     */
    it("holds the same occurrences as the tally it slices", async () => {
      const store = await make()
      unwrap(
        await store.apply(
          {
            tallies: [
              {
                treeId: TREE,
                revision: 1,
                nodeId: nodeId("buy"),
                type: primitiveType("loom.button"),
                views: 4,
                reached: 4,
                engaged: 0,
                dwellMs: 9_000,
                activations: 5,
                opens: 0,
                closes: 0,
                completions: 0,
              },
            ],
            funnels: [],
            acted: [pressed(9, { activations: 2 }), pressed(10, { activations: 3 })],
          },
          at(10),
          SKIERS
        )
      )

      const { hours } = unwrap(await store.acted())
      const [tally] = unwrap(await store.tallies())

      expect(hours.reduce((sum, row) => sum + row.activations, 0)).toBe(tally?.activations)
    })

    it("is not changed by being read", async () => {
      const store = await counted()

      expect(unwrap(await store.acted()).hours[0]?.activations).toBe(2)
      expect(unwrap(await store.acted()).hours[0]?.activations).toBe(2)
    })
  })
}
