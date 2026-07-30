import type { TreeId } from "@loom/runtime"
import { memoryTreeStore, type MemoryTreeStore } from "@loom/runtime/store"

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
 * The seed id is exported because `TreeStore` has no `list` — see the day-11
 * report. Knowing the id of a tree this module created is not privileged access,
 * so it is not the shortcut 0018 warns about; listing trees it did not create is
 * the thing that needs a framework answer.
 */
type Seeded = {
  readonly store: MemoryTreeStore
  readonly seedTreeId: TreeId
}

const build = (): Seeded => {
  const store = memoryTreeStore()
  const tree = seedTree()

  /** `already-exists` is ignored by design: a re-evaluated module must not
   *  replace a tree that has since been edited. */
  void store.create(tree)

  return { store, seedTreeId: tree.treeId }
}

const CARRIER_KEY = Symbol.for("loom.portal.store")

type Carrier = { [CARRIER_KEY]?: Seeded }

const carrier = globalThis as unknown as Carrier

const seeded: Seeded = (carrier[CARRIER_KEY] ??= build())

export const portalStore = seeded.store
export const seedTreeId = seeded.seedTreeId
