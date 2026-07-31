import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { memoryTreeStore, type TreeStore } from "@loom/runtime/store"
import { postgresTreeStore } from "@loom/runtime/postgres"

import { seedTree } from "./seed"

/**
 * The store: Postgres when one is configured, memory when not.
 *
 * Both are supported states rather than a real one and a broken one — the same
 * shape as the interpreter, where absence degrades honestly instead of failing
 * obscurely. Memory is right for `pnpm dev`, where one process makes the log
 * durable for as long as you are looking at it. It is wrong for a serverless
 * deployment, where an append lands on the instance that served the request and is
 * absent from the next, which is the whole reason 0022 exists.
 *
 * `prepare: false` is load-bearing on Supabase: serverless connects through the
 * transaction-mode pooler, and transaction-mode pooling does not support prepared
 * statements. Omitting it produces confusing runtime errors rather than a clear
 * refusal.
 *
 * The store handle is also the scope of what the portal may see (0020) — here
 * everything, because there is one tenant. A deployment with more would hand the
 * portal a narrower handle rather than teach the portal about tenants.
 */
const connectionString = process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]

const build = (): TreeStore => {
  const store =
    connectionString === undefined
      ? memoryTreeStore()
      : postgresTreeStore(drizzle(postgres(connectionString, { prepare: false, max: 1 })))

  /**
   * `already-exists` is ignored by design: a re-evaluated module, a second
   * serverless instance, or a restart against a populated database must not
   * replace a tree that has since been edited.
   */
  void store.create(seedTree())

  return store
}

const CARRIER_KEY = Symbol.for("loom.portal.store")

type Carrier = { [CARRIER_KEY]?: TreeStore }

const carrier = globalThis as unknown as Carrier

export const portalStore: TreeStore = (carrier[CARRIER_KEY] ??= build())

/** Whether writes outlive this process. The trees page states it rather than implying it. */
export const storeIsDurable = connectionString !== undefined
