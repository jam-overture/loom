import { ensureSiteSeeded } from "@/app/(marketing)/_lib/stored"
import { DEFAULT_PROJECT_ID } from "@jam-overture/loom/store"

import { appProjects, appStore } from "@/app/_lib/app/store"

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
 * a property of the store. The demonstration page is this lane's and is
 * authored next door in `./seed.ts`; the three pages the site serves are
 * `(marketing)`'s and are authored there. This module seeds both, and the
 * reason is below.
 */
export const portalStore = appStore

/** The deployment's projects, under the name this lane uses for the other one. */
export const portalProjects = appProjects

const SEEDING_KEY = Symbol.for("loom.portal.seeding")

type Carrier = { [SEEDING_KEY]?: Promise<void> }

const carrier = globalThis as unknown as Carrier

/**
 * Put this deployment's pages in the store, once per process.
 *
 * ## Why the site's pages are seeded from here
 *
 * `(marketing)` seeds its three pages when one of them is requested, which is
 * correct and is not sufficient: **it means the portal shows an empty shelf
 * until somebody visits the public site.** A maintainer who deploys, signs in
 * and looks at *Your pages* is doing the one thing most likely to come first,
 * and what they would have seen is the demonstration page alone — which reads
 * as *the site is not hooked up*, not as *nobody has been to the site yet*.
 *
 * That was found by photographing this screen rather than by reasoning about
 * it: every test passed, the site served from the store, and the portal
 * listing was still wrong, because no test and no type knows the order a
 * person does things in.
 *
 * So both seeds run here, and `(marketing)` keeps its own call: whichever
 * surface is reached first seeds the store, and the other finds it done.
 * Neither overwrites anything — both are create-if-absent — so running both on
 * every portal screen costs one refused write per process and buys an order
 * nobody has to know about.
 */
export const ensureSeeded = async (): Promise<void> => {
  carrier[SEEDING_KEY] ??= Promise.all([
    portalStore.create(seedTree()),
    ensureSiteSeeded(),
    ensureDefaultProject(),
  ]).then(() => undefined)

  await carrier[SEEDING_KEY]
}

/**
 * The project every row written before projects existed belongs to.
 *
 * `DEFAULT_PROJECT_ID` is the value five tables already default their
 * `project_id` to, so this does not assign anything — it gives a name to what is
 * already true, which is the one thing DDL could not do. A migration that
 * invented the name would be guessing, and 0260 refuses that.
 *
 * Create-if-absent on the same terms as everything else here: a deployment that
 * has renamed it keeps its name, because `create` refuses rather than
 * overwrites.
 */
const ensureDefaultProject = async (): Promise<void> => {
  await appProjects.create({
    projectId: DEFAULT_PROJECT_ID,
    name: "Your application",
    createdAt: new Date(0).toISOString(),
  })
}

export { storeIsDurable } from "./database"
