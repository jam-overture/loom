import Link from "next/link"

import type { TreeId } from "@loom/runtime"

import { isReachableRevision, revisionHref } from "@/lib/history-link"

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
 *
 * Total over every revision a tree can be at, including revision 0, which is not
 * one an entry produced. That case only appears now that the preview names a
 * tree's current revision — a freshly created tree is at 0 — and it is the
 * component's job rather than each caller's: a rule three callers have to
 * remember is a rule one of them will forget, and the failure is a link that
 * lands on a page saying the log has not reached it.
 */
export const RevisionLink = ({
  treeId,
  revision,
}: {
  readonly treeId: TreeId
  readonly revision: number
}) =>
  isReachableRevision(revision) ? (
    <Link href={revisionHref(treeId, revision)} className="font-mono">
      revision {revision}
    </Link>
  ) : (
    <span className="font-mono">revision {revision}</span>
  )
