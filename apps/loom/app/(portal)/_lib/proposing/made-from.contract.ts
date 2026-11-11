import { describe, expect, it } from "vitest"

import { intentIdSchema, proposalIdSchema, type Result } from "@jam-overture/loom"

import type { MadeFrom, MadeFromStore } from "./made-from"

/** Both implementations of what made changes were made from, held to the same behaviour. */

const made = (n: number, overrides: Partial<MadeFrom> = {}): MadeFrom => ({
  proposalId: proposalIdSchema.parse(`p_${n}`),
  intentId: intentIdSchema.parse(`i_${n}`),
  stakes: "low",
  at: n * 10,
  ...overrides,
})

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describeMadeFromStoreContract = (
  name: string,
  make: () => MadeFromStore | Promise<MadeFromStore>
): void => {
  describe(`${name} — MadeFromStore contract`, () => {
    it("knows nothing of proposals nothing was recorded for, and reads nothing for none", async () => {
      const store = await make()

      expect(unwrap(await store.forProposals([made(1).proposalId]))).toEqual(new Map())
      expect(unwrap(await store.forProposals([]))).toEqual(new Map())
    })

    it("reads back what was recorded, for the proposals asked about only", async () => {
      const store = await make()

      unwrap(await store.record(made(1, { stakes: "high" })))
      unwrap(await store.record(made(2)))
      unwrap(await store.record(made(3)))

      expect(unwrap(await store.forProposals([made(1).proposalId, made(3).proposalId]))).toEqual(
        new Map([
          [made(1).proposalId, made(1, { stakes: "high" })],
          [made(3).proposalId, made(3)],
        ])
      )
    })

    it("keeps the first record of a proposal, as a replay makes the same change again", async () => {
      const store = await make()

      unwrap(await store.record(made(1)))
      unwrap(
        await store.record(
          made(1, { intentId: intentIdSchema.parse("i_9"), stakes: "critical", at: 99 })
        )
      )

      expect(unwrap(await store.forProposals([made(1).proposalId]))).toEqual(
        new Map([[made(1).proposalId, made(1)]])
      )
    })
  })
}
