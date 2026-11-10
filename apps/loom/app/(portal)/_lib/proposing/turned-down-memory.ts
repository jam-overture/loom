import { ok, type IntentId, type ProposalId } from "@jam-overture/loom"

import {
  newestFirst,
  type TurnedDown,
  type TurnedDownChange,
  type TurnedDownStore,
} from "./turned-down"

/** One application's turned-down changes in the process: the reference implementation. */
export const memoryTurnedDownStore = (): TurnedDownStore => {
  const held = new Map<ProposalId, TurnedDownChange>()

  const entries = (): readonly TurnedDown[] =>
    [...held.values()].map(({ proposalId, pageId, request, reason, by, at }) => ({
      proposalId,
      pageId,
      request,
      reason,
      by,
      at,
    }))

  return {
    record: (entry) => {
      if (!held.has(entry.proposalId)) held.set(entry.proposalId, entry)

      return Promise.resolve(ok(undefined))
    },

    forPage: (pageId, limit) =>
      Promise.resolve(
        ok(
          newestFirst(entries().filter((entry) => entry.pageId === pageId)).slice(
            0,
            Math.max(0, limit)
          )
        )
      ),

    since: (at, limit) =>
      Promise.resolve(
        ok(newestFirst(entries().filter((entry) => entry.at >= at)).slice(0, Math.max(0, limit)))
      ),

    intentsOf: (proposalIds) =>
      Promise.resolve(
        ok(
          new Map(
            proposalIds.flatMap((proposalId): (readonly [ProposalId, IntentId])[] => {
              const entry = held.get(proposalId)

              return entry === undefined ? [] : [[proposalId, entry.intentId]]
            })
          )
        )
      ),
  }
}
