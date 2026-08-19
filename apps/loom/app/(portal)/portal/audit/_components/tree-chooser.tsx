import Link from "next/link"

import { describeStoreError } from "@loom/runtime/store"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { isAuditable } from "@/app/(portal)/_lib/seeds"
import { portalStore } from "@/app/(portal)/_lib/store"

/**
 * Which tree to audit — and, just as importantly, which ones cannot be.
 *
 * An unauditable tree is listed rather than hidden. Hiding it would make the
 * page look like it had checked everything there was to check, which is the one
 * impression an audit page must never give. The reason is stated per tree,
 * because "no seed" is a fact about this deployment, not a defect in the tree.
 */
export const AuditTreeChooser = async () => {
  const page = await portalStore.list()

  if (!page.ok) {
    return (
      <StateNotice tone="failure" title="The store could not be listed.">
        <p>{describeStoreError(page.error)}</p>
        <p>
          Nothing has been audited and nothing has passed. A page that cannot list the trees
          has checked none of them — which is a different thing from finding none to check.
        </p>
      </StateNotice>
    )
  }

  const { trees } = page.value

  if (trees.length === 0) {
    return (
      <StateNotice
        tone="empty"
        title="You don&rsquo;t have any pages yet, so there is nothing to audit."
        action={<Link href="/portal/pages">Your pages →</Link>}
      >
        <p>
          An audit needs two things: a log, and a seed this deployment can reproduce (0028).
          Both arrive with the tree, so this page fills itself as soon as one is stored.
        </p>
      </StateNotice>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-muted text-sm">
        An audit folds a tree&rsquo;s whole log from its original shape and compares the result
        with the tree being served. It is a read over every accepted change, so it runs when
        you ask for it and not before.
      </p>

      <ul className="flex flex-col gap-2">
        {trees.map((listing) =>
          isAuditable(listing.treeId) ? (
            <li key={listing.treeId}>
              <Link
                href={`/portal/audit?tree=${encodeURIComponent(listing.treeId)}`}
                className="border-edge-subtle bg-surface-base hover:bg-surface-hover block rounded-md border p-4 no-underline"
              >
                <span className="font-mono text-sm">{listing.treeId}</span>
                <span className="text-ink-muted mt-1 block text-xs">
                  fold {listing.revision}{" "}
                  {listing.revision === 1 ? "accepted change" : "accepted changes"} →
                </span>
              </Link>
            </li>
          ) : (
            <li
              key={listing.treeId}
              className="border-edge-subtle rounded-md border border-dashed p-4"
            >
              <span className="text-ink-muted font-mono text-sm">{listing.treeId}</span>
              <span className="text-ink-muted mt-1 block text-xs">
                Cannot be audited here: this deployment cannot reproduce the shape this tree
                was created with, and a fold that started from the tree being checked would
                agree with itself.
              </span>
            </li>
          )
        )}
      </ul>
    </div>
  )
}
