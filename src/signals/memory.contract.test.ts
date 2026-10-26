import {
  describeReaderRegionStoreContract,
  describeReaderSignalJournalContract,
  describeReaderTallyStoreContract,
} from "../testing/reader-signal-contract.js"

import { describeWindowApplyContract } from "./applied-window.contract.js"
import {
  memoryReaderRegionStore,
  memoryReaderSignalJournal,
  memoryReaderTallyStore,
} from "./memory.js"

/**
 * The same three suites Postgres runs. `memory.ts` calls itself the reference
 * implementation; this is the file that makes the claim checkable.
 */
describeReaderSignalJournalContract("memoryReaderSignalJournal", () => memoryReaderSignalJournal())

describeReaderTallyStoreContract("memoryReaderTallyStore", () => memoryReaderTallyStore())

describeReaderRegionStoreContract("memoryReaderRegionStore", () => memoryReaderRegionStore())

/** The fourth suite, and the one that is this lane's own file (0316). */
describeWindowApplyContract("memoryReaderTallyStore", () => memoryReaderTallyStore())
