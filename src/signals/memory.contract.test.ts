import {
  describeReaderSignalJournalContract,
  describeReaderTallyStoreContract,
} from "../testing/reader-signal-contract.js"

import { memoryReaderSignalJournal, memoryReaderTallyStore } from "./memory.js"

/**
 * The same two suites Postgres runs. `memory.ts` calls itself the reference
 * implementation; this is the file that makes the claim checkable.
 */
describeReaderSignalJournalContract("memoryReaderSignalJournal", () => memoryReaderSignalJournal())

describeReaderTallyStoreContract("memoryReaderTallyStore", () => memoryReaderTallyStore())
