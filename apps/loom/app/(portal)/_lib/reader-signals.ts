import {
  memoryReaderSignalJournal,
  memoryReaderTallyStore,
  type ReaderSignalJournal,
  type ReaderTallyStore,
} from "@jam-overture/loom/signals"
import {
  postgresReaderSignalJournal,
  postgresReaderTallyStore,
} from "@jam-overture/loom/signals/postgres"

import { portalDatabase } from "./database"

/**
 * Where this portal reads what readers did.
 *
 * Postgres when one is configured, memory when not — the same two supported
 * states as the store and the telemetry journal, on the same handle and the
 * same pool. Nothing here is new about the deployment; it is the third contract
 * `database.ts` was written to share.
 *
 * ## Two contracts, and why the portal reads both
 *
 * `docs/signals.md` rule 5 makes the **tallies** the durable artefact: raw
 * batches are a short-lived buffer, rolled up into per-node-per-revision
 * counters and expired. So the counters are what a reading screen is built on,
 * and the journal is not a second source for the same numbers.
 *
 * It is read anyway, for one sentence: **a window with batches in it and no
 * counters yet is a different state from a deployment nothing has ever
 * reported to**, and without the journal those two arrive as the same empty
 * screen. A reader who cannot tell them apart concludes their page is not
 * broadcasting when in fact nothing has rolled up. That is the same
 * distinction `/portal/trust` draws between *nothing scored* and *nothing
 * happened*, and it is worth one bounded read.
 *
 * The journal read is bounded and its failure is survivable: the screen loses
 * that sentence and keeps everything else. A counter read that fails is the
 * screen failing, and is reported as one.
 *
 * ## The portal is a consumer (0018)
 *
 * Both implementations come through published entry points — `@jam-overture/loom/signals`
 * for the memory pair and `@jam-overture/loom/signals/postgres` for the durable one,
 * exactly as the tree store and the telemetry journal pick theirs up. Nothing
 * here reaches into `src/`, and a gap in what those entry points expose is a
 * finding rather than a deep import.
 */
const CARRIER_JOURNAL = Symbol.for("loom.portal.readerSignals")
const CARRIER_TALLIES = Symbol.for("loom.portal.readerTallies")

type Carrier = {
  [CARRIER_JOURNAL]?: ReaderSignalJournal
  [CARRIER_TALLIES]?: ReaderTallyStore
}

const carrier = globalThis as unknown as Carrier

/**
 * Constructing either is cheap — postgres.js does not connect until the first
 * query — so nothing here reaches the network at import time, which is the rule
 * `store.ts` states at length and this module inherits.
 */
export const portalReaderSignals: ReaderSignalJournal = (carrier[CARRIER_JOURNAL] ??=
  portalDatabase === undefined
    ? memoryReaderSignalJournal()
    : postgresReaderSignalJournal(portalDatabase))

export const portalReaderTallies: ReaderTallyStore = (carrier[CARRIER_TALLIES] ??=
  portalDatabase === undefined
    ? memoryReaderTallyStore()
    : postgresReaderTallyStore(portalDatabase))

/**
 * Whether what readers did outlives this process.
 *
 * Separate from `storeIsDurable` in name only — it is the same handle — but the
 * sentence a screen prints is different enough to be worth its own word. A
 * memory tree store loses pages, which is obvious. A memory tally store loses
 * *measurements*, and a reading screen that came back empty after a restart
 * would otherwise look exactly like a page nobody visited.
 */
export { storeIsDurable as signalsAreDurable } from "./database"
