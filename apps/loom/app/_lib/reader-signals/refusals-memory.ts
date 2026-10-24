import { ok } from "@jam-overture/loom"

import {
  inReasonOrder,
  type RefusalCounter,
  type RefusalReason,
  type RefusalTally,
} from "./refusals"

/** One application's refusals in the process: the reference implementation. */
export const memoryRefusalCounter = (): RefusalCounter => {
  const held = new Map<RefusalReason, RefusalTally>()

  return {
    record: (reason, origin, at) => {
      const before = held.get(reason)

      held.set(reason, {
        reason,
        refused: (before?.refused ?? 0) + 1,
        /** The newest wins, so a delivery that arrives late cannot move the clock back. */
        ...(before !== undefined && before.lastAt > at
          ? { lastAt: before.lastAt, lastOrigin: before.lastOrigin }
          : { lastAt: at, lastOrigin: origin }),
      })

      return Promise.resolve(ok(undefined))
    },

    read: () => Promise.resolve(ok(inReasonOrder([...held.values()]))),
  }
}
