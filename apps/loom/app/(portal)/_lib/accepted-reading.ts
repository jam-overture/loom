import { err, ok, type Result, type TreeId } from "@jam-overture/loom"
import type { TreeStore } from "@jam-overture/loom/store"

import { acceptedChangesOf, newestFirst, type AcceptedChange, type CopyRecord } from "./going-live"
import { copiesOfPage, type PageCopy } from "./proposing/copies"
import { acceptedOn } from "./proposing/following"

export type AcceptedReadError = { readonly code: "unavailable"; readonly detail: string }

/**
 * One copy's record, oldest first. A first copy nothing was ever proposed for
 * has no tree yet (0329 clause 2), which is a record with nothing on it, not a
 * failure.
 */
const recordOf = async (
  trees: Pick<TreeStore, "revisions">,
  copy: PageCopy
): Promise<Result<CopyRecord, AcceptedReadError>> => {
  const read = await acceptedOn(trees, copy.copyId)

  if (read.ok) return ok({ copy, revisions: read.value })
  if (read.error.code === "not-found") return ok({ copy, revisions: [] })

  return err({ code: "unavailable", detail: `could not read the changes on ${copy.copyId}` })
}

/**
 * Every change accepted on a project's pages, newest first, read from each
 * copy each page has had (`going-live.ts` says why every copy). All or
 * nothing: a list missing one page's changes would read as those changes never
 * having been made.
 */
export const acceptedOnPages = async (
  trees: Pick<TreeStore, "revisions">,
  copies: readonly PageCopy[],
  pageIds: readonly TreeId[]
): Promise<Result<readonly AcceptedChange[], AcceptedReadError>> => {
  const pages = [...new Set([...pageIds, ...copies.map((copy) => copy.pageId)])]
  const read = await Promise.all(
    pages.map(async (pageId) => {
      const records = await Promise.all(
        copiesOfPage(copies, pageId).map((copy) => recordOf(trees, copy))
      )
      const failed = records.find((record) => !record.ok)

      if (failed !== undefined && !failed.ok) return failed

      return ok(
        acceptedChangesOf(
          pageId,
          records.flatMap((record) => (record.ok ? [record.value] : []))
        )
      )
    })
  )
  const failed = read.find((page) => !page.ok)

  if (failed !== undefined && !failed.ok) return failed

  return ok(read.flatMap((page) => (page.ok ? page.value : [])).sort(newestFirst))
}
