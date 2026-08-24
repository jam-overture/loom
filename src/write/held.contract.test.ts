import { describeHoldStoreContract } from "../testing/hold-contract.js"

import { memoryHoldStore } from "./held.js"

/**
 * The same suite Postgres runs. `held.ts` has called this the reference
 * implementation since it was written; this is the file that makes the claim
 * checkable rather than aspirational.
 */
describeHoldStoreContract("memoryHoldStore", () => memoryHoldStore())
