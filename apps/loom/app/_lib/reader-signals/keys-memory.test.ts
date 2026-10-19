import { memoryIngestKeyStore } from "./keys-memory"
import { describeIngestKeyStoreContract } from "./keys.contract"

describeIngestKeyStoreContract("memoryIngestKeyStore", memoryIngestKeyStore)
