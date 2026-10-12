import { appStore } from "@/app/_lib/app/store"

import { seedTree } from "./seed"

/**
 * The app's store, and the portal's own seeding of it.
 *
 * **The store moved to `app/_lib/app/` on 12 October** and is re-exported here
 * under the name this lane has always used, so no screen changed its import.
 * It moved because `(marketing)` now renders from it too
 * ([0259](../../../../../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
 * condition 1), which makes it the app's rather than this surface's — the
 * store module has the argument.
 *
 * **What stayed here is the seed**, because what a store should contain is not
 * a property of the store. This is the portal's demonstration page; the three
 * pages the site serves are seeded by `(marketing)`, where they are authored.
 */
export const portalStore = appStore

const SEEDING_KEY = Symbol.for("loom.portal.seeding")

type Carrier = { [SEEDING_KEY]?: Promise<void> }

const carrier = globalThis as unknown as Carrier

export const ensureSeeded = async (): Promise<void> => {
  carrier[SEEDING_KEY] ??= portalStore.create(seedTree()).then(() => undefined)

  await carrier[SEEDING_KEY]
}

export { storeIsDurable } from "./database"
