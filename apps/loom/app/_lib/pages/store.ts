import { after } from "next/server"

import { err, ok } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import { describeApplicationStoreError, type ApplicationId } from "@jam-overture/loom/store"

import { portalDatabase } from "@/app/(portal)/_lib/database"
import { followSite } from "@/app/(portal)/_lib/proposing/follow-site"
import { livePages } from "@/app/(portal)/_lib/proposing/live"
import { followsItsSite, pageCopiesFor } from "@/app/(portal)/_lib/proposing/stores"
import { audienceRulesFor } from "@/app/(portal)/_lib/segments/rules"
import { governedPagesFor } from "@/app/(portal)/_lib/write"
import { appApplications } from "@/app/_lib/app/store"
import { appIngestKeys } from "@/app/_lib/reader-signals/key-store"

import { readPageOverlays } from "./overlays"
import type { PublishKeyStore } from "./publish-keys"
import { memoryPublishKeyStore } from "./publish-keys-memory"
import { postgresPublishKeyStore } from "./publish-keys-postgres"
import type { PublishedPageStore } from "./published"
import type { ReaderWindowStore } from "./reader-windows"
import { memoryReaderWindowStore } from "./reader-windows-memory"
import { postgresReaderWindowStore } from "./reader-windows-postgres"
import type { SitePullStore } from "./pulls"
import { memorySitePullStore } from "./pulls-memory"
import { postgresSitePullStore } from "./pulls-postgres"
import { memoryPublishedPageStore } from "./published-memory"
import { postgresPublishedPageStore } from "./published-postgres"
import type { ReadDoor } from "./live"
import type { PublishDoor } from "./receive"

/**
 * This deployment's publish keys, published pages, the pulls of its read
 * door and each project's reader window: Postgres when one is
 * configured and memory when not, on the handle the store already uses.
 *
 * Memoised on a global carrier for `key-store.ts`'s reason: the door and the
 * portal must be reading the same stores, and in memory a second construction
 * is a second, empty map.
 */
type Held = {
  readonly keys: PublishKeyStore
  readonly pagesFor: (application: ApplicationId) => PublishedPageStore
  readonly pulls: SitePullStore
  readonly windows: ReaderWindowStore
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
    pulls: memorySitePullStore(),
    windows: memoryReaderWindowStore(),
  }
}

const postgresHeld = (db: LoomDatabase): Held => ({
  keys: postgresPublishKeyStore(db),
  pagesFor: (application) => postgresPublishedPageStore(db, { application }),
  pulls: postgresSitePullStore(db),
  windows: postgresReaderWindowStore(db),
})

const CARRIER_KEY = Symbol.for("loom.app.pages")

const held: Held = ((globalThis as unknown as { [CARRIER_KEY]?: Held })[CARRIER_KEY] ??=
  portalDatabase === undefined ? memoryHeld() : postgresHeld(portalDatabase))

export const appPublishKeys: PublishKeyStore = held.keys

/** When each project's site took its live pages, for *Connect your site* to say whether it pulls. */
export const appSitePulls: SitePullStore = held.pulls

/** How long each project's readers keep the pages they first saw (0383), as *Settings* sets it. */
export const appReaderWindows: ReaderWindowStore = held.windows

export const publishedPagesFor = (application: ApplicationId): PublishedPageStore =>
  held.pagesFor(application)

/** The application a key named, for both doors to ask whether it is still open. */
const applicationOf: PublishDoor["applicationOf"] = async (application) => {
  const found = await appApplications.get(application)

  if (found.ok) return ok(found.value)

  /** A key naming an application that is not there names nobody. */
  return found.error.code === "not-found"
    ? ok(null)
    : err({ detail: describeApplicationStoreError(found.error) })
}

export const appPublishDoor: PublishDoor = {
  keys: appPublishKeys,
  applicationOf,
  pagesFor: publishedPagesFor,
  /** After the build is answered, inside the same invocation, so the platform does not cut it off. */
  kept: (application, trees) => {
    after(() => followSite(application, trees))
  },
  now: () => Date.now(),
}

/**
 * The read door's stores (0358 clause 3): the project's key, what its site
 * published, the copies Loom's accepted changes are on, and each page's
 * audience rules and segment forms (0371 clauses 4 and 5), read with the
 * screens' budget, since a pull is a read and must answer even when a store is
 * slow.
 */
export const appReadDoor: ReadDoor = {
  keys: appIngestKeys,
  applicationOf,
  livePagesOf: async (application) => {
    const [published, copies] = await Promise.all([
      publishedPagesFor(application).list(),
      pageCopiesFor(application).list(),
    ])

    if (!published.ok) return err({ detail: published.error.detail })
    if (!copies.ok) return err({ detail: copies.error.detail })

    const live = await livePages(
      {
        trees: governedPagesFor(application),
        copies: copies.value,
        follows: followsItsSite(application),
      },
      published.value.map((page) => page.tree)
    )

    return live.ok ? live : err({ detail: live.error.detail })
  },
  /** Through the store the *Segments* screen writes, so the site gets what a person saved (0371 clause 3). */
  overlaysOf: (application, pages) => readPageOverlays(audienceRulesFor(application), pages),
  /**
   * After the answer, inside the same invocation. A record that fails is not
   * retried: the next pull records the same fact.
   */
  pulled: (pull) => {
    after(() => appSitePulls.record(pull))
  },
  now: () => Date.now(),
}
