import { ensureSiteSeeded } from "@/app/(marketing)/_lib/stored"
import { DEFAULT_APPLICATION_ID, DEFAULT_PROJECT_ID } from "@jam-overture/loom/store"

import {
  appApplications,
  appApplicationsForWriting,
  appProjects,
  appProjectsForWriting,
  appStore,
  appStoreForWriting,
} from "@/app/_lib/app/store"

import { seedTree } from "./seed"
import { waitForSeeding } from "@/app/_lib/app/bounded"
import { absent } from "@/app/_lib/app/bounded-store"

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
export const portalApplications = appApplications

/** The projects those applications are grouped under. */
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
  const work = (carrier[SEEDING_KEY] ??= (async () => {
    await placeTree(seedTree())
    await ensureSiteSeeded()
    await ensureDefaultProject()
    await ensureDefaultApplication()
  })())

  const outcome = await waitForSeeding(work)

  /**
   * A seed that failed is forgotten, so the next request tries again rather
   * than inheriting a rejected promise forever. One that is still going is
   * kept: it is doing the work, and starting a second would be two.
   */
  if (outcome === "failed") delete carrier[SEEDING_KEY]
}

/**
 * The project every row written before projects existed belongs to.
 *
 * `DEFAULT_APPLICATION_ID` is the value five tables already default their
 * `application_id` to, so this does not assign anything — it gives a name to what is
 * already true, which is the one thing DDL could not do. A migration that
 * invented the name would be guessing, and 0260 refuses that.
 *
 * Create-if-absent on the same terms as everything else here: a deployment that
 * has renamed it keeps its name, because `create` refuses rather than
 * overwrites.
 */
/**
 * Put a tree in the store if it is not there, by **asking first**.
 *
 * `create` refuses a tree that exists, which is correct and was being used as
 * the question: the seed inserted blindly and let the primary key answer. That
 * works on one machine and falls over on a serverless host, and it took
 * production down on 12 October — `/portal` and `/` returning 504 after five
 * minutes, with `duplicate key value violates unique constraint` six times in
 * one second in the database log and `canceling statement due to statement
 * timeout` behind it.
 *
 * **A failing INSERT is not free.** It takes a lock on the conflicting key
 * until its transaction ends, so concurrent instances inserting the same six
 * keys queue behind each other — and with `max: 1` on the pool, everything else
 * that instance wanted queues behind that. A `SELECT` on a primary key takes no
 * lock and answers in a millisecond.
 *
 * The write is still guarded by the constraint, so two instances that both find
 * it absent are still safe: one wins, the other is refused, and neither
 * overwrites. What changed is that the steady state — the row is already there,
 * which is every request after the first — no longer writes at all.
 */
const placeTree = async (tree: ReturnType<typeof seedTree>): Promise<void> => {
  const existing = await appStoreForWriting.head(tree.treeId)
  if (!absent(existing)) return

  await appStoreForWriting.create(tree)
}

const ensureDefaultProject = async (): Promise<void> => {
  const existing = await appProjectsForWriting.get(DEFAULT_PROJECT_ID)
  if (!absent(existing)) return

  await appProjectsForWriting.create({
    projectId: DEFAULT_PROJECT_ID,
    name: "Your projects",
    createdAt: new Date(0).toISOString(),
  })
}

/**
 * The application every row written before applications existed belongs to.
 *
 * `DEFAULT_APPLICATION_ID` is the value five tables default their
 * `application_id` to, so this does not assign anything — it gives a name to
 * what is already true, which is the one thing DDL could not do.
 *
 * Create-if-absent on the same terms as everything else here: a deployment that
 * has renamed it keeps its name, because `create` refuses rather than
 * overwrites.
 */
const ensureDefaultApplication = async (): Promise<void> => {
  const existing = await appApplicationsForWriting.get(DEFAULT_APPLICATION_ID)
  if (!absent(existing)) return

  await appApplicationsForWriting.create({
    applicationId: DEFAULT_APPLICATION_ID,
    projectId: DEFAULT_PROJECT_ID,
    name: "Your application",
    createdAt: new Date(0).toISOString(),
  })
}

export { storeIsDurable } from "./database"
