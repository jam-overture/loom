import Link from "next/link"

import type { TreeListing } from "@loom/runtime/store"

import { PageName } from "@/app/(portal)/_components/page-name"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { nameFrom, type PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"

/**
 * The pages this deployment can check, and the ones it cannot.
 *
 * Split out of the chooser, which reads the store, so that these two states can
 * be rendered by a test. The empty one is worth the split on its own: it is what
 * a new person sees first, it is the screen most likely to be wrong, and until
 * this file it could only be reached by standing up a store with nothing in it.
 *
 * A page that cannot be checked is listed rather than hidden. Hiding it would
 * make this screen look like it had checked everything there was to check, which
 * is the one impression this page must never give. The reason is stated per row,
 * because "this deployment does not know its original shape" is a fact about the
 * deployment and not a defect in the page.
 *
 * Each row is the screen's primary action rather than a description of one.
 * There is exactly one thing to do here — pick a page and check it — so a row
 * says so in the imperative, and a row that cannot be pressed says why in the
 * same place a pressable row says what pressing it does.
 */
export const CheckupChoices = ({
  trees,
  names,
  checkable,
}: {
  readonly trees: readonly TreeListing[]
  /** What each listed page is called. A page missing from it still lists, by its id. */
  readonly names: ReadonlyMap<string, PageNameValue>
  /** Whether this host can reproduce the shape a page started as (0028). */
  readonly checkable: (treeId: TreeListing["treeId"]) => boolean
}) => {
  if (trees.length === 0) {
    return (
      <StateNotice
        tone="empty"
        title="You don&rsquo;t have any pages yet, so there is nothing to check."
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
        <TechnicalDetail summary="What a checkup needs, exactly">
          <p>
            Two things: a log, and a seed this deployment can reproduce (0028). Both arrive with
            the tree, which is why there is nothing to configure — a stored tree is a checkable
            one unless this host has no way to rebuild the shape it started as.
          </p>
        </TechnicalDetail>
      </StateNotice>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {trees.map((listing) =>
        checkable(listing.treeId) ? (
          <li key={listing.treeId}>
            <Link
              href={`/portal/checkup?tree=${encodeURIComponent(listing.treeId)}`}
              className="border-edge-subtle bg-surface-base hover:bg-surface-hover flex items-center justify-between gap-3 rounded-md border p-4 no-underline"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <PageName page={nameFrom(names, listing.treeId)} />
                <span className="text-ink-muted text-xs">
                  {listing.revision} {listing.revision === 1 ? "change" : "changes"} to replay
                </span>
              </span>
              <span className="text-affirm-ink bg-affirm border-affirm-edge shrink-0 rounded-sm border px-2 py-1 text-xs">
                Check this page →
              </span>
            </Link>
          </li>
        ) : (
          <li
            key={listing.treeId}
            className="border-edge-subtle flex flex-col gap-1 rounded-md border border-dashed p-4"
          >
            <PageName page={nameFrom(names, listing.treeId)} />
            <span className="text-ink-muted text-xs">
              This one can&rsquo;t be checked here: this deployment doesn&rsquo;t know the shape
              the page started as, and a check that started from the page being served would agree
              with itself.
            </span>
          </li>
        )
      )}
    </ul>
  )
}
