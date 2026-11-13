import { randomIdFactory, type LoomTree } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import { rebuildSegmentFormsFor } from "../segments/kept"
import { beginWrite } from "../write"
import { currentCopyOf } from "./copies"
import { followPublished } from "./following"
import { followsItsSite, pageCopiesFor } from "./stores"

/**
 * Bring the copies of a site's pages to the version it just published (0340),
 * so a change waiting on one of them reads as stale or conflicting as soon as
 * it is, rather than at Loom's next look.
 *
 * Only pages something was proposed for have a copy, and only those are
 * followed: a page Loom never looked at has nothing to keep up to date. Pages
 * go one after another, and one that cannot be followed now is followed at
 * the next look, which runs the same step first. Each segment's form of those
 * pages is then brought up to the page as it is live (0386 clause 6).
 */
export const followSite = async (
  application: ApplicationId,
  trees: readonly LoomTree[]
): Promise<void> => {
  if (!followsItsSite(application)) return

  const copies = pageCopiesFor(application)
  const listed = await copies.list()

  if (!listed.ok) return

  const write = beginWrite(application)

  for (const tree of trees) {
    const held = await write.path.store.head(currentCopyOf(listed.value, tree.treeId).copyId)

    if (held.ok) {
      await followPublished(
        {
          trees: write.path.store,
          holds: write.path.holds,
          copies,
          ids: randomIdFactory,
          now: Date.now,
          follows: true,
        },
        tree
      )
    }
  }

  await write.finish()
  await rebuildSegmentFormsFor(application, trees)
}
