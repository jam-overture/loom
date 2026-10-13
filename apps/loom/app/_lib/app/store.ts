import {
  memoryApplicationStore,
  memoryProjectStore,
  memoryTreeStore,
  type ApplicationStore,
  type ProjectStore,
  type TreeStore,
} from "@jam-overture/loom/store"
import {
  postgresApplicationStore,
  postgresProjectStore,
  postgresTreeStore,
} from "@jam-overture/loom/postgres"

import {
  boundedApplicationStore,
  boundedProjectStore,
  boundedTreeStore,
} from "./bounded-store"
import { portalDatabase } from "./database"

/**
 * The pages this deployment holds — **the app's store, not a surface's**.
 *
 * ## Why it is here rather than in a route group
 *
 * [0220](../../../../../decisions/0220-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md)
 * says an app is a registry, a policy source and a store, and that Loom has one
 * of each per deployment.
 * [0259](../../../../../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
 * condition 1 makes a second surface render from that store — so the store is
 * now read by `(marketing)` as well as `(portal)`, and leaving it inside one
 * route group would have the other reaching into its neighbour's internals to
 * find the thing they are both built on.
 *
 * It lived at `(portal)/_lib/store.ts` until 12 October. That file is still
 * there and re-exports this one, so nothing in that lane changed its imports
 * for a move that is not about it.
 *
 * ## What is *not* here, and why
 *
 * The **seeding** is each surface's own. A store with nothing in it is not a
 * fault and no module here decides what should be in it: the portal writes its
 * demonstration page, `(marketing)` writes the three pages it serves, and each
 * does it where the thing being written is authored. A shared seeder would be
 * this file deciding what the deployment is for.
 *
 * Constructing the store is cheap and reaches no network — postgres.js does not
 * connect until the first query — so importing this costs nothing at module
 * scope, which is the rule the portal's copy stated at length and this one
 * inherits.
 */
const build = (): TreeStore =>
  portalDatabase === undefined ? memoryTreeStore() : postgresTreeStore(portalDatabase)

const CARRIER_KEY = Symbol.for("loom.portal.store")
const APPLICATIONS_KEY = Symbol.for("loom.app.applications")
const PROJECTS_KEY = Symbol.for("loom.app.projects")

type Carrier = {
  [CARRIER_KEY]?: TreeStore
  [APPLICATIONS_KEY]?: ApplicationStore
  [PROJECTS_KEY]?: ProjectStore
}

const carrier = globalThis as unknown as Carrier

/**
 * The handle the **write path and the seeding** take, with no budget on reads.
 *
 * Two callers, one reason. A read made inside a write is not a screen waiting
 * for a page — it is `append` checking the head it is applying to, and giving
 * up on it would turn a slow database into a refused change rather than a slow
 * one.
 *
 * The seeding's reason is sharper, and it is the trap this split exists to
 * avoid. A seed asks `head` before it writes (that is #615, and it is why a
 * request no longer inserts blindly). Hand it a *bounded* handle and a slow
 * store makes that question answer `unavailable` — on which the seed correctly
 * declines to write, **and then finishes**, so `waitForSeeding` records it as
 * done and the deployment never seeds at all. Unbounded, the seed is cut off by
 * its own budget one level up, which reports *still going*, keeps the promise,
 * and lets the work land in the background. `./bounded-store.ts` has the rest
 * of the argument.
 */
export const appStoreForWriting: TreeStore = (carrier[CARRIER_KEY] ??= build())

/**
 * The handle every **screen** takes, whose reads answer within a budget.
 *
 * Bounded here rather than at each call site, because ten portal screens
 * awaited this store with no budget until 13 October and the eleventh did not —
 * which is a rule that has to hold everywhere held in the one place it can be.
 */
export const appStore: TreeStore = boundedTreeStore(appStoreForWriting)

/**
 * The projects this deployment has.
 *
 * Composed here beside the tree store and for the same reasons — one database
 * handle, one decision about durability, and no surface reaching into another's
 * internals to find it. It is the one store whose rows are not scoped by a
 * project, because they are the projects.
 *
 * The seeding is still each surface's, as above: this module says a project
 * store exists, not what is in it.
 */
const buildApplications = (): ApplicationStore =>
  portalDatabase === undefined ? memoryApplicationStore() : postgresApplicationStore(portalDatabase)

/** Unbounded, for the seeding — `appStoreForWriting` has the reason. */
export const appApplicationsForWriting: ApplicationStore = (carrier[APPLICATIONS_KEY] ??=
  buildApplications())

export const appApplications: ApplicationStore =
  boundedApplicationStore(appApplicationsForWriting)

/**
 * The projects those applications are grouped under.
 *
 * The third store composed here, and the one that owns nothing yet: a project
 * has an identity and a name, and the applications in it carry its id. Nothing
 * is scoped by it, so it needs no handle per project the way the tree store
 * needs one per application.
 */
const buildProjects = (): ProjectStore =>
  portalDatabase === undefined ? memoryProjectStore() : postgresProjectStore(portalDatabase)

/** Unbounded, for the seeding — `appStoreForWriting` has the reason. */
export const appProjectsForWriting: ProjectStore = (carrier[PROJECTS_KEY] ??= buildProjects())

export const appProjects: ProjectStore = boundedProjectStore(appProjectsForWriting)

export { storeIsDurable } from "./database"
