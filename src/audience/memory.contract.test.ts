import { describeAudienceOverlayStoreContract } from "../testing/audience-overlay-contract.js"

import { memoryAudienceOverlayStore } from "./memory.js"

/**
 * The same suite Postgres runs. `memory.ts` calls itself the reference
 * implementation; this is the file that makes the claim checkable rather than
 * aspirational.
 */
describeAudienceOverlayStoreContract("memoryAudienceOverlayStore", () =>
  memoryAudienceOverlayStore()
)
