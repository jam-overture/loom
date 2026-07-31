import { describeTelemetryJournalContract } from "../testing/journal-contract.js"

import { memoryTelemetryJournal } from "./memory.js"

/**
 * The same suite Postgres runs. `memory.ts` calls itself the reference
 * implementation; this is the file that makes the claim checkable.
 */
describeTelemetryJournalContract("memoryTelemetryJournal", () => memoryTelemetryJournal())
