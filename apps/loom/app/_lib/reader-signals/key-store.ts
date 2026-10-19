import { portalDatabase } from "@/app/(portal)/_lib/database"

import type { IngestKeyStore } from "./keys"
import { memoryIngestKeyStore } from "./keys-memory"
import { postgresIngestKeyStore } from "./keys-postgres"

/**
 * This deployment's ingest keys: Postgres when one is configured, memory when
 * not, from the same handle as the store and the buffer.
 *
 * One instance for the two things that read it — the door, asking whose a key
 * is, and this deployment's own pages, asking what to post with — because on
 * the memory side two instances are two maps, and a key the one was given
 * would be a key the other had never heard of.
 *
 * Memoised on a global carrier for `attempt-log.ts`'s reason: a module
 * re-evaluated between requests would hand out a fresh, empty map.
 */
const CARRIER_KEY = Symbol.for("loom.app.ingest-keys")

type Carrier = { [CARRIER_KEY]?: IngestKeyStore }

const carrier = globalThis as unknown as Carrier

export const appIngestKeys: IngestKeyStore = (carrier[CARRIER_KEY] ??=
  portalDatabase === undefined ? memoryIngestKeyStore() : postgresIngestKeyStore(portalDatabase))
