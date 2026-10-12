import { describeApplicationStoreContract } from "../testing/application-contract.js"

import { memoryApplicationStore } from "./memory.js"

/** The same suite Postgres runs. */
describeApplicationStoreContract("memoryApplicationStore", () => memoryApplicationStore())
