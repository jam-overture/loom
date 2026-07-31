import { memoryTreeStore, type TreeStore } from "@loom/runtime/store"
import { postgresTreeStore } from "@loom/runtime/postgres"

import { portalDatabase } from "./database"
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
 * The connection itself belongs to `database.ts`, which the telemetry journal
 * shares: two contracts, one handle, one pool.
 *
 * The store handle is also the scope of what the portal may see (0020) — here
 * everything, because there is one tenant. A deployment with more would hand the
 * portal a narrower handle rather than teach the portal about tenants.
 */
const build = (): TreeStore =>
  portalDatabase === undefined ? memoryTreeStore() : postgresTreeStore(portalDatabase)

const CARRIER_KEY = Symbol.for("loom.portal.store")
const SEEDING_KEY = Symbol.for("loom.portal.seeding")

type Carrier = {
  [CARRIER_KEY]?: TreeStore
  [SEEDING_KEY]?: Promise<void>
}

const carrier = globalThis as unknown as Carrier

/**
 * Constructing the store is cheap: postgres.js does not connect until the first
 * query, so nothing here reaches the network.
 */
export const portalStore: TreeStore = (carrier[CARRIER_KEY] ??= build())

/**
 * Seeding is deferred to the first request that needs it, and never happens at
 * module scope.
 *
 * Importing a module must not perform IO. `next build` evaluates route modules
 * while collecting page data, so a query at import time makes the *build* depend
 * on the database being reachable and correctly migrated — which is exactly
 * backwards, since the build is what produces the code that runs the migration's
 * consumers. A deployment should fail because the app is broken, not because a
 * table did not exist yet at build time.
 *
 * Memoised on the same carrier as the store, so concurrent requests on one
 * instance share a single attempt and a re-evaluated module does not re-seed.
 * `already-exists` is ignored by design: a second instance, or a restart against
 * a populated database, must not replace a tree that has since been edited.
 */
export const ensureSeeded = async (): Promise<void> => {
  carrier[SEEDING_KEY] ??= portalStore.create(seedTree()).then(() => undefined)

  await carrier[SEEDING_KEY]
}

export { storeIsDurable } from "./database"
