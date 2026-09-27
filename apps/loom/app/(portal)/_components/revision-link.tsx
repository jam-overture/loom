import Link from "next/link"

import type { TreeId } from "@jam-overture/loom"

import { isReachableRevision, revisionHref } from "@/app/(portal)/_lib/history-link"
import { versionMention } from "@/app/(portal)/_lib/version"

/**
 * A revision, as somewhere to go.
 *
 * Every page that names a revision names the same kind of thing — an entry in
 * the log, identified by a number that is public and stable — so every page
 * should reach it the same way. This started inside the node credit, where 0043
 * first made a revision linkable; it is here now because `/portal/checkup` and
 * `/portal/activity` name revisions too, and three components building the same href
 * would be three places for the fragment to stop matching the row id.
 *
 * Monospaced everywhere, because the number is an identifier rather than a
 * quantity and reads as one beside the ids it sits next to.
 *
 * It says *version 12* rather than *revision 12*, which is the portal's word
 * for the same number and not a different number — see `_lib/version.ts`. The
 * href, the fragment and the row it lands on are unchanged, so every link
 * anybody has ever been sent still arrives exactly where it did.
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
      {versionMention(revision)}
    </Link>
  ) : (
    <span className="font-mono">{versionMention(revision)}</span>
  )
