import type { LoomTree, TreeId } from "@jam-overture/loom"

import { waitForSeeding, within } from "@/app/_lib/app/bounded"

import { appStore } from "@/app/_lib/app/store"

import { SITE_PAGES, treeFor } from "./builders"
import { readersCountedHere } from "./readers/counting"
import { SITE_ROUTES, type SiteRoute } from "./site"

/**
 * The pages this site serves, as rows in the app's store.
 *
 * ## What changed on 12 October
 *
 * These three pages were built from code on every request and thrown away:
 * `homePageTree(context)` and its two siblings, real `LoomTree`s with no row
 * behind them. That made them unreachable by everything Loom is for — no
 * revision, no log, no inverse, nothing for a proposal to be held against, and
 * nothing for the portal to list
 * ([0259](../../../../../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
 * condition 1).
 *
 * Now the builders are a **seed** and the store is what gets served.
 *
 * ## The one rule, and it is the whole of the risk
 *
 * **Seeding never overwrites.** A page in the store has been through whatever
 * has happened to it since — a change somebody accepted in the portal, an
 * adaptation the Gate let through — and that history is the point of storing it
 * at all. So this creates a page that is absent and leaves alone a page that is
 * present, and there is no path through this module that writes over one.
 *
 * It follows that **editing a builder stops changing the site** once that page
 * exists. That is the trade 0259 names and the maintainer took: a page is a
 * thing you govern rather than code you edit, and the way to change it is to
 * ask for a change.
 *
 * **There is no way back from that today**, and it is worth saying plainly
 * rather than implying otherwise: `TreeStore` is `create`, `head`, `revisions`,
 * `list` and `append`. Nothing deletes. So a deployment that decides it wants
 * the authored page back cannot drop the row and re-seed — it can only append
 * its way there, or go to the database by hand. Filed for `Loom framework`
 * rather than worked around here, because a store contract is not this lane's
 * to extend.
 *
 * ## The ids are the builders' own
 *
 * `sequentialIdFactory("home")` gives the same `treeId` every time it is run,
 * so the id a page is stored under is the id its builder produces — read off a
 * build rather than written down here. Nothing has to stay in step with
 * anything, and a builder that changes its prefix changes the id it looks for,
 * which is a page that appears unseeded rather than a page served under
 * somebody else's name.
 */

/** A route, and the id its builder gives the page it builds. */
export type SitePage = {
  readonly route: SiteRoute
  readonly treeId: TreeId
}

/**
 * Built with a neutral context, purely to read the id off.
 *
 * The tree is discarded. Every builder is pure and none of them reaches
 * anything, so this costs a few objects and no IO — and it is the only way to
 * learn the id without writing it down a second time.
 */
/**
 * The context a page is **stored** under.
 *
 * No origin and no palette, because one row is served from every host this
 * deployment answers on and the palette is what a reader asked for —
 * `./requested.ts` puts both back.
 *
 * ## `counting` is the exception, and it is a known limitation
 *
 * It is not a property of the request; it is a property of the deployment, read
 * from an environment variable. The footer carries a disclosure when it is on —
 * *this page counts which of its parts you reach* — and that sentence has to be
 * true of the deployment serving it.
 *
 * Seeding reads the live setting so the stored page matches the deployment that
 * wrote it. **What that does not survive is the setting changing afterwards**:
 * a deployment that turns counting on after its pages are stored will count
 * readers without the footer saying so, because seeding never overwrites a
 * stored page and nothing re-runs the builder.
 *
 * That is a disclosure going quietly stale, which is worse than a layout going
 * stale, so it is filed rather than lived with — the fix is to take the
 * disclosure out of the tree altogether, since a statement the deployment makes
 * about itself is not a thing a page should be able to have governed away. Not
 * done here because it moves a visible band on somebody's site and this change
 * is already large.
 */
const storedContext = () => ({ origin: "", theme: "minimal", counting: readersCountedHere() }) as const

const idFor = (route: SiteRoute): TreeId => treeFor(route, storedContext()).treeId

/**
 * Every page this site serves, with the id it is stored under.
 *
 * Computed on first use rather than at module scope. Building three pages is
 * pure and reaches nothing, but doing it while the module graph is still
 * loading is the kind of work that turns an import order into a crash, and
 * nothing here needs the answer before somebody asks for a page.
 */
let table: readonly SitePage[] | undefined

export const sitePagesStored = (): readonly SitePage[] =>
  (table ??= [...SITE_ROUTES]
    .filter((route) => SITE_PAGES.has(route.path))
    .map((route) => ({ route, treeId: idFor(route) })))

export const storedIdFor = (route: SiteRoute): TreeId | undefined =>
  sitePagesStored().find((page) => page.route.path === route.path)?.treeId

const SEEDING_KEY = Symbol.for("loom.site.seeding")

type Carrier = { [SEEDING_KEY]?: Promise<void> }

const carrier = globalThis as unknown as Carrier

/**
 * Write any of this site's pages the store does not have, once per process.
 *
 * `create` is the whole of it: a store that already holds the id refuses, and
 * being refused is the correct outcome rather than an error to report. The
 * result is deliberately not read for that reason.
 */
export const ensureSiteSeeded = async (): Promise<void> => {
  const work = (carrier[SEEDING_KEY] ??= (async () => {
    for (const { route } of sitePagesStored()) {
      const tree = treeFor(route, storedContext())
      const existing = await appStore.head(tree.treeId)
      if (existing.ok) continue

      await appStore.create(tree)
    }
  })())

  /** Budgeted and forgotten on failure, for the reason `seeding-wait.ts` gives. */
  if ((await waitForSeeding(work)) === "failed") delete carrier[SEEDING_KEY]
}

/**
 * The stored page, or nothing.
 *
 * **Nothing is a working answer**, not a failure: a store that has not been
 * seeded yet, or one that cannot be read, leaves the caller to build the page
 * from code — which is what this site did for its whole life until today. A
 * site that will not serve because a database is down would be a worse product
 * than one that serves the authored page, and the portal is where somebody
 * finds out the store is unreachable.
 */
export const storedPageFor = async (route: SiteRoute): Promise<LoomTree | undefined> => {
  const treeId = storedIdFor(route)

  if (treeId === undefined) return undefined

  await ensureSiteSeeded()

  /**
   * Bounded, because the fallback this feeds was only ever reachable when the
   * store *refused*. A store that does not answer returns no `Result` at all,
   * so the authored page — the thing 0262 promises a reader when the control
   * plane is unreachable — was unreachable itself. `within` turns a hang into
   * the absence the caller already knows how to handle.
   */
  const head = await within(appStore.head(treeId))

  return head?.ok === true ? head.value : undefined
}
