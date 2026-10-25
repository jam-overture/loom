import { err, ok } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import { describeApplicationStoreError, type ApplicationId } from "@jam-overture/loom/store"

import { portalDatabase } from "@/app/(portal)/_lib/database"
import { appApplications } from "@/app/_lib/app/store"

import type { PublishKeyStore } from "./publish-keys"
import { memoryPublishKeyStore } from "./publish-keys-memory"
import { postgresPublishKeyStore } from "./publish-keys-postgres"
import type { PublishedPageStore } from "./published"
import { memoryPublishedPageStore } from "./published-memory"
import { postgresPublishedPageStore } from "./published-postgres"
import type { PublishDoor } from "./receive"

/**
 * This deployment's publish keys and published pages: Postgres when one is
 * configured and memory when not, on the handle the store already uses.
 *
 * Memoised on a global carrier for `key-store.ts`'s reason: the door and the
 * portal must be reading the same stores, and in memory a second construction
 * is a second, empty map.
 */
type Held = {
  readonly keys: PublishKeyStore
  readonly pagesFor: (application: ApplicationId) => PublishedPageStore
}

const memoryHeld = (): Held => {
  const pages = new Map<ApplicationId, PublishedPageStore>()

  return {
    keys: memoryPublishKeyStore(),
    pagesFor: (application) => {
      const known = pages.get(application) ?? memoryPublishedPageStore()
      pages.set(application, known)

      return known
    },
  }
}

const postgresHeld = (db: LoomDatabase): Held => ({
  keys: postgresPublishKeyStore(db),
  pagesFor: (application) => postgresPublishedPageStore(db, { application }),
})

const CARRIER_KEY = Symbol.for("loom.app.pages")

const held: Held = ((globalThis as unknown as { [CARRIER_KEY]?: Held })[CARRIER_KEY] ??=
  portalDatabase === undefined ? memoryHeld() : postgresHeld(portalDatabase))

export const appPublishKeys: PublishKeyStore = held.keys

export const publishedPagesFor = (application: ApplicationId): PublishedPageStore =>
  held.pagesFor(application)

export const appPublishDoor: PublishDoor = {
  keys: appPublishKeys,
  applicationOf: async (application) => {
    const found = await appApplications.get(application)

    if (found.ok) return ok(found.value)

    /** A key naming an application that is not there names nobody. */
    return found.error.code === "not-found"
      ? ok(null)
      : err({ detail: describeApplicationStoreError(found.error) })
  },
  pagesFor: publishedPagesFor,
  now: () => Date.now(),
}
