import { seedSitePages } from "@/app/(marketing)/_lib/stored"
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

/**
 * The unbounded handles, for the one write that must not be cut off part-way.
 *
 * Closing a project closes the applications in it (0289), and that is several
 * writes rather than one. A budget that expired in the middle would leave a
 * project closed with some of its applications still open — the partial state
 * `closeProject` is built to *report* rather than to produce. Every read a
 * screen makes still goes through the bounded pair above.
 */
export const portalProjectsForWriting = appProjectsForWriting

/** See `portalProjectsForWriting`. */
export const portalApplicationsForWriting = appApplicationsForWriting

/**
 * Put this deployment's pages in the store. **Run by `db:push`, not by a
 * request.**
 *
 * ## Why it left the request path on 13 October
 *
 * It used to run on every portal screen and every marketing page, memoised per
 * process and budgeted at two seconds. On a warm instance that is free. On this
 * deployment it was neither.
 *
 * The pool is `max: 1`, so every query on an instance is one round trip after
 * the last. Seeding is six of them — the demonstration page, the site's three,
 * the default project, the default application — and on a deployment that was
 * seeded weeks ago **all six answer "already there"**. Six round trips to learn
 * nothing, before the screen's own reads can start, on a connection that is
 * also still being established.
 *
 * What that looked like from outside, after the budgets landed: *Your
 * applications* drawing `the application store is unavailable: the store did
 * not answer within 1500ms`, while the projects read on the same line of the
 * same `Promise.all` came back fine. Two reads issued in the same instant, one
 * query apart in the queue, on opposite sides of the budget. A store that could
 * not be reached would have failed the first one.
 *
 * ## What a deployment that has not run `db:push` sees
 *
 * The same thing it sees today if it has not run `db:push`: nothing, because
 * there are no tables either. Seeding is DDL's neighbour, not a request's work
 * — *a migration that runs implicitly is a migration nobody decided to run*,
 * which is what `db-push.ts` already says about the schema it creates.
 *
 * The screens are honest about an empty store, and `(marketing)` serves the
 * pages it was authored as, so a deployment between `db:push` runs degrades
 * rather than breaks.
 *
 * ## It still never overwrites
 *
 * Every step is create-if-absent and asks before it writes, which is #615 and
 * stays true here: a page in the store has been through whatever has happened
 * to it since, and that history is the point of storing it at all.
 */
export const seedDeployment = async (): Promise<void> => {
  await placeTree(seedTree())
  await seedSitePages()
  await ensureDefaultProject()
  await ensureDefaultApplication()
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
