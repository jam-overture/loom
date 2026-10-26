/**
 * The fourth contract suite both reader-signal stores are run against, and the
 * one property the three in `src/testing/reader-signal-contract.ts` do not
 * reach: **a whole window, every audience in it, written once**
 * (0316).
 *
 * It is here rather than beside those three because `src/testing/` is another
 * lane's and this is reader-signal work. The finding filed with 0316 asks for
 * it to be moved beside them, which is one import away, and asking is this
 * lane's to do rather than the move.
 *
 * The half that needs two implementations to be worth asserting is not the
 * atomicity — a store in memory cannot fail part-way and has it for nothing,
 * so the rollback is asserted in `postgres.test.ts` against a real database.
 * It is that **two entries naming one audience are added rather than refused**:
 * `ON CONFLICT … DO UPDATE` will not affect one row twice inside one command,
 * so Postgres has to be written to have that and a `Map` has it by
 * construction. A disagreement of exactly that shape is why `counters.ts`
 * exists.
 */

import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID, type AudienceId } from "../audience/audience.js"

import { nodeId, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"

import type { ReaderSignalStoreError } from "./journal.js"
import type { FunnelAnswer, FunnelPair, ReaderTally } from "./rollup.js"
import type { ReaderTallyStore, StoredTally } from "./tally.js"

const AT = "2026-10-26T00:00:00.000Z"
const LATER = "2026-10-26T01:00:00.000Z"

const unwrap = <TValue>(result: { ok: true; value: TValue } | { ok: false; error: ReaderSignalStoreError }): TValue => {
  if (!result.ok) throw new Error(result.error.detail)

  return result.value
}

const tallyOf = (overrides: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: TREE,
  revision: 1,
  nodeId: nodeId("pricing"),
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

const answerOf = (overrides: Partial<FunnelAnswer> = {}): FunnelAnswer => ({
  treeId: TREE,
  revision: 1,
  pair: PAIR,
  reached: 2,
  converted: 1,
  ...overrides,
})

/** The counters of one audience, read back by the dimension they were filed under. */
const dwellBy = (rows: readonly StoredTally[]): Record<string, number> =>
  Object.fromEntries(rows.map((row) => [row.audienceId, row.dwellMs]))

export const describeWindowApplyContract = (
  name: string,
  make: () => ReaderTallyStore | Promise<ReaderTallyStore>
): void => {
  describe(`${name} — applyWindow contract`, () => {
    it("writes every audience the window held, each against its own row", async () => {
      const store = await make()

      await store.applyWindow(
        [
          { audience: SKIERS, tallies: [tallyOf({ dwellMs: 400 })], funnels: [] },
          { audience: RIDERS, tallies: [tallyOf({ dwellMs: 600 })], funnels: [] },
        ],
        AT
      )

      const rows = unwrap(await store.tallies())

      expect(rows).toHaveLength(2)
      expect(dwellBy(rows)).toEqual({ [SKIERS]: 400, [RIDERS]: 600 })
    })

    /**
     * Additive across windows, like `apply` is: what one run writes is *what
     * this window added*, never *what is true so far*.
     */
    it("adds a second window to the first rather than replacing it", async () => {
      const store = await make()
      await store.applyWindow([{ audience: SKIERS, tallies: [tallyOf({ views: 2 })], funnels: [] }], AT)

      await store.applyWindow([{ audience: SKIERS, tallies: [tallyOf({ views: 5 })], funnels: [] }], LATER)

      expect(unwrap(await store.tallies())[0]).toMatchObject({ views: 7, updatedAt: LATER })
    })

    /**
     * The one a caller can produce and neither store may refuse. A window
     * folded per audience cannot hand over two entries for one audience, but
     * the interface is public and the two implementations must not differ about
     * what happens when something does.
     */
    it("adds two entries naming one audience rather than refusing the write", async () => {
      const store = await make()

      const applied = await store.applyWindow(
        [
          { audience: SKIERS, tallies: [tallyOf({ dwellMs: 300, views: 1 })], funnels: [] },
          { audience: SKIERS, tallies: [tallyOf({ dwellMs: 200, views: 2 })], funnels: [] },
        ],
        AT
      )

      expect(applied.ok).toBe(true)

      const rows = unwrap(await store.tallies())

      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ dwellMs: 500, views: 3 })
    })

    it("writes the funnels and the appearances of each audience too", async () => {
      const store = await make()

      await store.applyWindow(
        [
          {
            audience: SKIERS,
            tallies: [],
            funnels: [answerOf({ reached: 4, converted: 1 })],
            appearances: [{ treeId: TREE, revision: 1, views: 4 }],
          },
          {
            audience: RIDERS,
            tallies: [],
            funnels: [answerOf({ reached: 9, converted: 3 })],
            appearances: [{ treeId: TREE, revision: 1, views: 9 }],
          },
        ],
        AT
      )

      const funnels = unwrap(await store.funnels())
      const views = unwrap(await store.pageViews())

      expect(Object.fromEntries(funnels.map((row) => [row.audienceId, row.reached]))).toEqual({
        [SKIERS]: 4,
        [RIDERS]: 9,
      })
      expect(Object.fromEntries(views.map((row) => [row.audienceId, row.appearances]))).toEqual({
        [SKIERS]: 4,
        [RIDERS]: 9,
      })
    })

    /** Omitted is `aud_everyone`, on the same terms as `apply`'s third argument. */
    it("files an entry that names no audience under the default one", async () => {
      const store = await make()

      await store.applyWindow([{ tallies: [tallyOf()], funnels: [] }], AT)

      expect(unwrap(await store.tallies())[0]).toMatchObject({ audienceId: DEFAULT_AUDIENCE_ID })
    })

    it("takes an empty window, and a window of empty entries, without writing anything", async () => {
      const store = await make()

      expect(unwrap(await store.applyWindow([], AT))).toBeUndefined()
      expect(
        unwrap(await store.applyWindow([{ audience: SKIERS, tallies: [], funnels: [] }], AT))
      ).toBeUndefined()
      expect(unwrap(await store.tallies())).toEqual([])
      expect(unwrap(await store.pageViews())).toEqual([])
    })

    /**
     * `apply` is this method over a single entry, and both stores implement it
     * as exactly that — so the assertion is that the two routes are the same
     * write rather than two spellings of one.
     */
    it("writes through `apply` what one entry through `applyWindow` writes", async () => {
      const [viaApply, viaWindow] = [await make(), await make()]
      const counters = {
        tallies: [tallyOf({ dwellMs: 700, engaged: 1 })],
        funnels: [answerOf()],
        appearances: [{ treeId: TREE, revision: 1, views: 3 }],
      }
      const audience: AudienceId = SKIERS

      await viaApply.apply(counters, AT, audience)
      await viaWindow.applyWindow([{ audience, ...counters }], AT)

      expect(unwrap(await viaApply.tallies())).toEqual(unwrap(await viaWindow.tallies()))
      expect(unwrap(await viaApply.funnels())).toEqual(unwrap(await viaWindow.funnels()))
      expect(unwrap(await viaApply.pageViews())).toEqual(unwrap(await viaWindow.pageViews()))
    })
  })
}
