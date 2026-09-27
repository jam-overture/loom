import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import type { LoomDatabase } from "@jam-overture/loom/postgres"

import { resolveConnectionString } from "./connection"

/**
 * One database handle for the process, or none.
 *
 * The store and the telemetry journal are separate contracts that happen to be
 * backed by the same database, and each opening its own client would double this
 * deployment's connection count for no benefit — on a serverless host, where
 * every instance holds its own pool, that is the difference between fitting
 * inside a pooler's limit and not.
 *
 * `prepare: false` is load-bearing on Supabase: serverless connects through the
 * transaction-mode pooler, and transaction-mode pooling does not support
 * prepared statements.
 *
 * Constructing this is cheap — postgres.js does not connect until the first
 * query — so nothing here reaches the network at import time.
 */
const connectionString = resolveConnectionString()

const CARRIER_KEY = Symbol.for("loom.portal.database")

type Carrier = { [CARRIER_KEY]?: LoomDatabase }

const carrier = globalThis as unknown as Carrier

const build = (): LoomDatabase | undefined => {
  const existing = carrier[CARRIER_KEY]
  if (existing) return existing

  if (connectionString === undefined) return undefined

  const db = drizzle(postgres(connectionString, { prepare: false, max: 1 }))
  carrier[CARRIER_KEY] = db

  return db
}

export const portalDatabase: LoomDatabase | undefined = build()

/** Whether writes outlive this process. The trees page states it rather than implying it. */
export const storeIsDurable = portalDatabase !== undefined
