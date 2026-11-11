import { err, ok, sequentialIdFactory, type LoomTree, type Result } from "@jam-overture/loom"
import type { TreeStore } from "@jam-overture/loom/store"

import { currentCopyOf, type PageCopy } from "./copies"
import { acceptedOn, samePage, standsOn, type FollowError } from "./following"

/**
 * What a site serves for each page it published, once Loom's accepted changes
 * are on it (0358 clause 5): the read door's answer.
 *
 * A page Loom never made a copy of is live as the site published it. A page
 * with a copy is live as the copy, under the page's own id, but only while the
 * copy stands on the version the site last published. A snapshot of a newer
 * version starts the copy again (clause 6), and until that has happened the
 * newer version is what is live: an older copy served over it would undo the
 * site's own change, which is the ground clause 6 says the site keeps.
 *
 * Read only. Starting a copy again is the snapshot's work (`follow-site.ts`),
 * never a pull's.
 */
export type LiveReading = {
  readonly trees: Pick<TreeStore, "head" | "revisions">
  /** Every copy the application has started, as `PageCopyStore.list` answers. */
  readonly copies: readonly PageCopy[]
  /** False for this deployment's own site, whose copy is the page whatever it published (0259). */
  readonly follows: boolean
}

const storeFailure = (detail: string): FollowError => ({ code: "store", detail })

/** The copy, named as the page it is a copy of, which is the id the site asks for. */
const asPage = (copy: LoomTree, published: LoomTree): LoomTree => ({
  ...copy,
  treeId: published.treeId,
})

/** The live version of one published page. */
export const liveTreeOf = async (
  given: LiveReading,
  published: LoomTree
): Promise<Result<LoomTree, FollowError>> => {
  const current = currentCopyOf(given.copies, published.treeId)
  const head = await given.trees.head(current.copyId)

  if (!head.ok) {
    return head.error.code === "not-found" ? ok(published) : err(storeFailure(head.error.code))
  }

  if (!given.follows || samePage(head.value, published)) return ok(asPage(head.value, published))

  const accepted = await acceptedOn(given.trees, current.copyId)

  if (!accepted.ok) return err(storeFailure(accepted.error.code))

  /** Delta ids minted to check a replay are thrown away with it, so any factory will do. */
  return ok(
    standsOn(head.value, accepted.value, published, sequentialIdFactory("live"))
      ? asPage(head.value, published)
      : published
  )
}

/** Every published page's live version, by page id, or the first that could not be read. */
export const livePages = async (
  given: LiveReading,
  published: readonly LoomTree[]
): Promise<Result<readonly LoomTree[], FollowError>> => {
  const read = await Promise.all(published.map((tree) => liveTreeOf(given, tree)))
  const failed = read.find((tree) => !tree.ok)

  if (failed !== undefined && !failed.ok) return failed

  return ok(
    read
      .flatMap((tree) => (tree.ok ? [tree.value] : []))
      .sort((left, right) => left.treeId.localeCompare(right.treeId))
  )
}
