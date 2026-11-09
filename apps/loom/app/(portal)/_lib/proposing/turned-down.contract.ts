import { describe, expect, it } from "vitest"

import { intentIdSchema, proposalIdSchema, treeIdSchema, type Result } from "@jam-overture/loom"

import type { TurnedDown, TurnedDownChange, TurnedDownStore } from "./turned-down"

/** Both implementations of the turned-down changes, held to the same behaviour. */

const HOME = treeIdSchema.parse("t_home")
const PRICING = treeIdSchema.parse("t_pricing")

const entry = (id: string, at: number, page = HOME): TurnedDown => ({
  proposalId: proposalIdSchema.parse(`p_${id}`),
  pageId: page,
  request: `Change ${id}.`,
  reason: id === "a" ? null : `Not ${id}.`,
  by: id === "a" ? null : "jonathan",
  at,
})

/** The same change as it is turned down: with the intent it was made from. */
const change = (id: string, at: number, page = HOME): TurnedDownChange => ({
  ...entry(id, at, page),
  intentId: intentIdSchema.parse(`i_${id}`),
})

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describeTurnedDownStoreContract = (
  name: string,
  make: () => TurnedDownStore | Promise<TurnedDownStore>
): void => {
  describe(`${name} — TurnedDownStore contract`, () => {
    it("remembers nothing for a page nothing was turned down on", async () => {
      expect(unwrap(await (await make()).forPage(HOME, 10))).toEqual([])
    })

    it("reads one page's, newest first, at most as many as asked", async () => {
      const store = await make()

      unwrap(await store.record(change("a", 1)))
      unwrap(await store.record(change("b", 3)))
      unwrap(await store.record(change("c", 2)))
      unwrap(await store.record(change("d", 4, PRICING)))

      expect(unwrap(await store.forPage(HOME, 2))).toEqual([entry("b", 3), entry("c", 2)])
      expect(unwrap(await store.forPage(HOME, 10))).toContainEqual(entry("a", 1))
    })

    it("keeps the first record of a change turned down twice", async () => {
      const store = await make()

      unwrap(await store.record(change("b", 1)))
      unwrap(await store.record({ ...change("b", 2), reason: "Changed my mind." }))

      expect(unwrap(await store.forPage(HOME, 10))).toEqual([entry("b", 1)])
    })

    it("reads every page's since a moment, newest first, at most as many as asked", async () => {
      const store = await make()

      unwrap(await store.record(change("a", 1)))
      unwrap(await store.record(change("b", 3)))
      unwrap(await store.record(change("c", 2, PRICING)))
      unwrap(await store.record(change("d", 4, PRICING)))

      expect(unwrap(await store.since(2, 10))).toEqual([
        entry("d", 4, PRICING),
        entry("b", 3),
        entry("c", 2, PRICING),
      ])
      expect(unwrap(await store.since(2, 2))).toEqual([entry("d", 4, PRICING), entry("b", 3)])
      expect(unwrap(await store.since(5, 10))).toEqual([])
    })

    it("says which intent each change was made from, and leaves out what it does not hold", async () => {
      const store = await make()

      unwrap(await store.record(change("a", 1)))
      unwrap(await store.record(change("b", 2, PRICING)))

      expect(
        unwrap(
          await store.intentsOf([
            proposalIdSchema.parse("p_a"),
            proposalIdSchema.parse("p_b"),
            proposalIdSchema.parse("p_unknown"),
          ])
        )
      ).toEqual(
        new Map([
          [proposalIdSchema.parse("p_a"), intentIdSchema.parse("i_a")],
          [proposalIdSchema.parse("p_b"), intentIdSchema.parse("i_b")],
        ])
      )
      expect(unwrap(await store.intentsOf([]))).toEqual(new Map())
    })

    it("keeps the intent of the first record of a change turned down twice", async () => {
      const store = await make()

      unwrap(await store.record(change("b", 1)))
      unwrap(await store.record({ ...change("b", 2), intentId: intentIdSchema.parse("i_other") }))

      expect(unwrap(await store.intentsOf([proposalIdSchema.parse("p_b")]))).toEqual(
        new Map([[proposalIdSchema.parse("p_b"), intentIdSchema.parse("i_b")]])
      )
    })
  })
}
