import { ok, type ProposalId } from "@jam-overture/loom"

import type { MadeFrom, MadeFromStore } from "./made-from"

/** One application's made changes in the process: the reference implementation. */
export const memoryMadeFromStore = (): MadeFromStore => {
  const held = new Map<ProposalId, MadeFrom>()

  return {
    record: (made) => {
      if (!held.has(made.proposalId)) held.set(made.proposalId, made)

      return Promise.resolve(ok(undefined))
    },

    forProposals: (proposalIds) =>
      Promise.resolve(
        ok(
          new Map(
            proposalIds.flatMap((proposalId) => {
              const made = held.get(proposalId)

              return made === undefined ? [] : [[proposalId, made] as const]
            })
          )
        )
      ),
  }
}
