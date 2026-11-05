import { ok, type IntentId } from "@jam-overture/loom"

import type { ProposalGoal, ProposalGoalStore } from "./serving"

/** One application's proposal goals in the process: the reference implementation. */
export const memoryProposalGoalStore = (): ProposalGoalStore => {
  const held = new Map<IntentId, ProposalGoal>()

  return {
    record: (served) => {
      if (!held.has(served.intentId)) held.set(served.intentId, served)

      return Promise.resolve(ok(undefined))
    },

    forIntents: (intentIds) =>
      Promise.resolve(
        ok(
          new Map(
            intentIds.flatMap((intentId) => {
              const served = held.get(intentId)

              return served === undefined ? [] : [[intentId, served] as const]
            })
          )
        )
      ),
  }
}
