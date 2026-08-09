import Link from "next/link"

import type { TreeId } from "@loom/runtime"

import { revisionHref } from "@/lib/history-link"

/**
 * A revision, as somewhere to go.
 *
 * Every page that names a revision names the same kind of thing — an entry in
 * the log, identified by a number that is public and stable — so every page
 * should reach it the same way. This started inside the node credit, where 0043
 * first made a revision linkable; it is here now because `/audit` and
 * `/activity` name revisions too, and three components building the same href
 * would be three places for the fragment to stop matching the row id.
 *
 * Monospaced everywhere, because the number is an identifier rather than a
 * quantity and reads as one beside the ids it sits next to.
 */
export const RevisionLink = ({
  treeId,
  revision,
}: {
  readonly treeId: TreeId
  readonly revision: number
}) => (
  <Link href={revisionHref(treeId, revision)} className="font-mono">
    revision {revision}
  </Link>
)
