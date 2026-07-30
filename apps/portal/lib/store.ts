import { memoryTreeStore, type TreeStore } from "@loom/runtime/store"

import { seedTree } from "./seed"

/**
 * One store per server process, seeded once.
 *
 * In-memory means the log does not survive a restart, which is the honest state
 * of §5: `TreeStore` exists so this is a swap, and choosing a backing store needs
 * to know where Loom runs. A portal that silently lost its history on reload
 * would be a lie about persistence, so this says plainly that it is a process
 * store.
 *
 * The store handle is also the scope of what the portal may see (0020) — here
 * everything, because there is one process and one tenant. A deployment with more
 * would hand the portal a narrower handle rather than teach the portal about
 * tenants.
 */
const build = (): TreeStore => {
  const store = memoryTreeStore()

  /** `already-exists` is ignored by design: a re-evaluated module must not
   *  replace a tree that has since been edited. */
  void store.create(seedTree())

  return store
}

const CARRIER_KEY = Symbol.for("loom.portal.store")

type Carrier = { [CARRIER_KEY]?: TreeStore }

const carrier = globalThis as unknown as Carrier

export const portalStore: TreeStore = (carrier[CARRIER_KEY] ??= build())
