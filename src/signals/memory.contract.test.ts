import {
  describeReaderRegionStoreContract,
  describeReaderSignalJournalContract,
  describeReaderTallyStoreContract,
} from "../testing/reader-signal-contract.js"

import { describeWindowApplyContract } from "./applied-window.contract.js"
import { describeArrivalHourContract } from "./arrivals.contract.js"
import { describeCorrelatedDeliveryContract } from "./correlated.contract.js"
import { describeKeptDeliveryContract } from "./kept.contract.js"
import {
  memoryReaderRegionStore,
  memoryReaderSignalJournal,
  memoryReaderTallyStore,
} from "./memory.js"

/**
 * The same six suites Postgres runs. `memory.ts` calls itself the reference
 * implementation; this is the file that makes the claim checkable.
 */
describeReaderSignalJournalContract("memoryReaderSignalJournal", () => memoryReaderSignalJournal())

describeReaderTallyStoreContract("memoryReaderTallyStore", () => memoryReaderTallyStore())

describeReaderRegionStoreContract("memoryReaderRegionStore", () => memoryReaderRegionStore())

/** The fourth suite, and the one that is this lane's own file (0316). */
describeWindowApplyContract("memoryReaderTallyStore", () => memoryReaderTallyStore())

/** The fifth, for the same reason, over the mark the kept window asked for (0351). */
describeKeptDeliveryContract("memoryReaderSignalJournal", () => memoryReaderSignalJournal())

/** The sixth, over the one narrowing a page view is read with (0355). */
describeCorrelatedDeliveryContract("memoryReaderSignalJournal", () => memoryReaderSignalJournal())

/** The seventh, over the hour an arrival is counted under (`arrivals.ts`). */
describeArrivalHourContract("memoryReaderTallyStore", () => memoryReaderTallyStore())
