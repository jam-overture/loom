import { describePolicyLogContract } from "../testing/policy-log-contract.js"

import { memoryPolicyLog } from "./policy-log.js"

/**
 * The same suite Postgres runs. `policy-log.ts` calls this the reference
 * implementation; this is the file that makes the claim checkable.
 */
describePolicyLogContract("memoryPolicyLog", () => memoryPolicyLog())
