import type { ApplicationId } from "@jam-overture/loom/store"

import type { PublishedPageStore } from "./published"
import { describePublishedPageStoreContract } from "./published.contract"
import { memoryPublishedPageStore } from "./published-memory"

/** Scoped the way `store.ts` scopes the memory stores: one per application, in a map. */
describePublishedPageStoreContract("memoryPublishedPageStore", () => {
  const stores = new Map<ApplicationId, PublishedPageStore>()

  return Promise.resolve((application) => {
    const known = stores.get(application) ?? memoryPublishedPageStore()
    stores.set(application, known)

    return known
  })
})
