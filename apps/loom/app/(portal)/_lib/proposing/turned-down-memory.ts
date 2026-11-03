import { ok } from "@jam-overture/loom"

import { newestFirst, type TurnedDown, type TurnedDownStore } from "./turned-down"

/** One application's turned-down changes in the process: the reference implementation. */
export const memoryTurnedDownStore = (): TurnedDownStore => {
  const held = new Map<string, TurnedDown>()

  return {
    record: (entry) => {
      if (!held.has(entry.proposalId)) held.set(entry.proposalId, entry)

      return Promise.resolve(ok(undefined))
    },

    forPage: (pageId, limit) =>
      Promise.resolve(
        ok(
          newestFirst([...held.values()].filter((entry) => entry.pageId === pageId)).slice(
            0,
            Math.max(0, limit)
          )
        )
      ),
  }
}
