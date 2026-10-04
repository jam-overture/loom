import Link from "next/link"

import type { TreeId } from "@jam-overture/loom"
import { auditSnapshot, describeStoreError } from "@jam-overture/loom/store"

import { Measured, Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { describeAudit } from "@/app/(portal)/_lib/audit-view"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { standingOf, sweepReading, type PageCheck } from "@/app/(portal)/_lib/checkup-sweep"
import { namesOf } from "@/app/(portal)/_lib/page-name"
import { seedFor } from "@/app/(portal)/_lib/seeds"
import { ensureSeeded, portalStore, storeIsDurable } from "@/app/(portal)/_lib/store"

import { SweepRows } from "../_components/sweep-rows"
import { SweepVerdict } from "../_components/sweep-verdict"

/**
 * Every page, checked in one press.
 *
 * ## Why this is a screen of its own and not the checkup's landing state
 *
 * A checkup folds a page's whole log. 0016 made the snapshot a materialised view
 * precisely so that nothing on a request path has to do that, and
 * `/portal/checkup` has said since it was written that the fold "runs when a
 * reviewer asks and never as a side effect of opening a page". Running a sweep
 * because somebody clicked `Checkup` in the rail would break that rule once per
 * page per visit.
 *
 * So the landing screen offers the press and this address is what the press
 * leads to. That also makes a sweep a URL somebody can be sent, which is the
 * same reason a single checkup puts its tree in the query string.
 *
 * ## Why the folds run one after another
 *
 * A fan-out would be faster and this lane uses one everywhere else — `headsOf`
 * and `namesOf` on this very screen. Those are one bounded read per page. A
 * fold is a *paged walk* of a log whose length is the number of changes ever
 * accepted, so twenty-five of them in flight at once is an unbounded number of
 * concurrent reads against a connection pool sized for a request. A reviewer
 * who has pressed a button marked *check every page* is expecting to wait;
 * nobody else on the deployment should have to.
 *
 * ## What the screen refuses to do
 *
 * Report a page it did not check as a page that passed. There are four ways
 * that could happen and `_lib/checkup-sweep.ts` keeps all four apart — the
 * argument is there, because the wording is the part worth testing and a screen
 * that both ran the folds and chose the words could only be checked by standing
 * up a store.
 */

/**
 * How many pages one press covers.
 *
 * Half the store's own default listing page, because each entry here costs a
 * whole replay rather than a row. The remainder is not hidden: `everyPage`
 * below is false whenever the listing has more, and the headline then refuses
 * the word *everything* and says how far it got.
 */
const SWEEP_LIMIT = 25

/** One page's standing, at the cost of one replay. */
const checkOne = async (treeId: TreeId): Promise<PageCheck> => {
  const seed = seedFor(treeId)

  if (seed === undefined) return { treeId, standing: { state: "nothing-to-check-against" } }

  const audit = await auditSnapshot(portalStore, treeId, seed)

  return audit.ok
    ? { treeId, standing: standingOf(describeAudit(audit.value)) }
    : { treeId, standing: { state: "could-not-be-read", error: audit.error } }
}

const EverythingPage = async () => {
  await requireActor("/portal/checkup/everything")
  await ensureSeeded()

  const listing = await portalStore.list({ limit: SWEEP_LIMIT })

  if (!listing.ok) {
    return (
      <Screen>
        <h1 className="text-2xl tracking-tight">Every page, checked</h1>
        <StateNotice tone="failure" title="We couldn&rsquo;t list your pages.">
          <p>
            Nothing has been checked and nothing has passed. A screen that cannot list your pages
            has checked none of them, which is a different thing from finding none to check.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeStoreError(listing.error)}</p>
          </TechnicalDetail>
        </StateNotice>
        <Link href="/portal/checkup" className="text-xs">
          Back to the checkup →
        </Link>
      </Screen>
    )
  }

  const trees = listing.value.trees

  /*
   * One after another, deliberately — see above. `reduce` over a promise rather
   * than a loop with a mutable array, so the sequence is the shape of the code
   * and a later edit cannot turn it into a fan-out by accident.
   */
  const checks = await trees.reduce<Promise<readonly PageCheck[]>>(
    async (sofar, tree) => [...(await sofar), await checkOne(tree.treeId)],
    Promise.resolve([])
  )

  /*
   * Names are read after the folds and in one fan-out, because this one really
   * is a bounded read per page. A page whose name could not be read still gets
   * a row, by id: a missing name costs the words and never the verdict.
   */
  const names = await namesOf(
    portalStore,
    trees.map((tree) => tree.treeId)
  )

  const reading = sweepReading(checks, { everyPage: listing.value.cursor === null })

  return (
    <Screen>
      <Measured as="header" className="gap-1">
        <h1 className="text-2xl tracking-tight">Every page, checked</h1>
        <p className="text-ink-muted text-sm">
          Loom replayed the changes it has recorded for each of your pages and compared the result
          with the page people are being served.
        </p>
      </Measured>

      <SweepVerdict reading={reading} />

      {trees.length === 0 ? (
        <StateNotice
          tone="empty"
          title="There is nothing here to check yet."
          action={
            <Link
              href="/portal/pages"
              className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-3 py-1.5 no-underline"
            >
              Your pages →
            </Link>
          }
        >
          <p>
            This screen fills itself as soon as Loom is looking after a page. There is nothing to
            set up.
          </p>
        </StateNotice>
      ) : (
        <SweepRows checks={checks} names={names} />
      )}

      <div className="flex gap-4">
        <Link href="/portal/checkup/everything" className="text-xs">
          Check them all again →
        </Link>
        <Link href="/portal/checkup" className="text-xs">
          Check one page →
        </Link>
      </div>

      {storeIsDurable ? null : (
        <StateNotice tone="notice">
          <p>
            <strong className="font-medium">This checked a temporary copy.</strong> No database is
            set up, so the history it read lives in the server process and holds only what this
            instance has accepted.
          </p>
          <TechnicalDetail summary="What to set">
            <p>
              Set <span className="font-mono">DATABASE_URL</span> to check what is actually
              stored. Until then a restart is a fresh start, and a verdict here is a verdict over
              whatever this one instance happens to have seen.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}
    </Screen>
  )
}

export default EverythingPage
