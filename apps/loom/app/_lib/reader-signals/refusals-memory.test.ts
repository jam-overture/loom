import type { ApplicationId } from "@jam-overture/loom/store"

import type { RefusalCounter } from "./refusals"
import { memoryRefusalCounter } from "./refusals-memory"
import { describeRefusalCounterContract } from "./refusals.contract"

/** Scoped the way `intake.ts` scopes the memory stores: one counter per application, in a map. */
describeRefusalCounterContract("memoryRefusalCounter", () => {
  const counters = new Map<ApplicationId, RefusalCounter>()

  return Promise.resolve((application) => {
    const known = counters.get(application) ?? memoryRefusalCounter()
    counters.set(application, known)

    return known
  })
})
