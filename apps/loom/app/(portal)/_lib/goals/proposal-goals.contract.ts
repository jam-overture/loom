import { describe, expect, it } from "vitest"

import { intentIdSchema, nodeIdSchema, type Result } from "@jam-overture/loom"

import { goalIdSchema } from "./goal"
import type { ProposalGoal, ProposalGoalStore } from "./serving"

/** Both implementations of the goals proposals serve, held to the same behaviour. */

const served = (n: number, overrides: Partial<ProposalGoal> = {}): ProposalGoal => ({
  intentId: intentIdSchema.parse(`i_${n}`),
  goalId: goalIdSchema.parse(`g_${n.toString(16).padStart(32, "0")}`),
  name: `Goal ${n}`,
  kind: "activated",
  nodeId: nodeIdSchema.parse("n_start"),
  at: n * 10,
  ...overrides,
})

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describeProposalGoalStoreContract = (
  name: string,
  make: () => ProposalGoalStore | Promise<ProposalGoalStore>
): void => {
  describe(`${name} — ProposalGoalStore contract`, () => {
    it("names no goal for intents nothing was recorded for, and reads nothing for none", async () => {
      const store = await make()

      expect(unwrap(await store.forIntents([served(1).intentId]))).toEqual(new Map())
      expect(unwrap(await store.forIntents([]))).toEqual(new Map())
    })

    it("reads back what was recorded, for the intents asked about only", async () => {
      const store = await make()

      unwrap(await store.record(served(1, { kind: "completed" })))
      unwrap(await store.record(served(2)))
      unwrap(await store.record(served(3)))

      expect(unwrap(await store.forIntents([served(1).intentId, served(3).intentId]))).toEqual(
        new Map([
          [served(1).intentId, served(1, { kind: "completed" })],
          [served(3).intentId, served(3)],
        ])
      )
    })

    it("keeps the first goal recorded for an intent", async () => {
      const store = await make()

      unwrap(await store.record(served(1)))
      unwrap(await store.record(served(1, { name: "Renamed", at: 99 })))

      expect(unwrap(await store.forIntents([served(1).intentId]))).toEqual(
        new Map([[served(1).intentId, served(1)]])
      )
    })
  })
}
