import { describeProjectStoreContract } from "../testing/project-contract.js"

import { memoryProjectStore } from "./memory.js"

/** The same suite Postgres runs. */
describeProjectStoreContract("memoryProjectStore", () => memoryProjectStore())
