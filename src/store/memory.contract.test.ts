import { describeTreeStoreContract } from "../testing/store-contract.js"

import { memoryTreeStore } from "./memory.js"

/**
 * The same suite Postgres runs. `memory.ts` has called itself the reference
 * implementation since it was written; this is the file that makes the claim
 * checkable rather than aspirational.
 */
describeTreeStoreContract("memoryTreeStore", () => memoryTreeStore())
