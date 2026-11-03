import { describe, expect, it } from "vitest"

import { proposalIdSchema, treeIdSchema, type Result } from "@jam-overture/loom"

import type { TurnedDown, TurnedDownStore } from "./turned-down"

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

      unwrap(await store.record(entry("a", 1)))
      unwrap(await store.record(entry("b", 3)))
      unwrap(await store.record(entry("c", 2)))
      unwrap(await store.record(entry("d", 4, PRICING)))

      expect(unwrap(await store.forPage(HOME, 2))).toEqual([entry("b", 3), entry("c", 2)])
      expect(unwrap(await store.forPage(HOME, 10))).toContainEqual(entry("a", 1))
    })

    it("keeps the first record of a change turned down twice", async () => {
      const store = await make()

      unwrap(await store.record(entry("b", 1)))
      unwrap(await store.record({ ...entry("b", 2), reason: "Changed my mind." }))

      expect(unwrap(await store.forPage(HOME, 10))).toEqual([entry("b", 1)])
    })
  })
}
