import type { Result, TreeId } from "@jam-overture/loom"

/**
 * Which governed tree carries a page's copy, and since when (0340).
 *
 * A page's copy starts as the version its site published (0329 clause 2). When
 * the site publishes a newer version of the page, the copy starts again from
 * the newer one, under a tree id of its own, with the changes accepted on the
 * old copy applied to it again (0358 clause 6): the store has no way to reset
 * a tree, and the site's own version is a fact Loom records rather than a
 * change the Gate weighs. Each start is a row here.
 *
 * The first copy of a page is the page's own id and has no row, which is what
 * every copy made before this record is.
 */
export type PageCopy = {
  readonly pageId: TreeId
  readonly copyId: TreeId
  /** When this copy started, in milliseconds; a change proposed before it was proposed for an older version. */
  readonly startedAt: number
}

export type PageCopyStoreError = { readonly code: "unavailable"; readonly detail: string }

/** One application's page copies, scoped at construction like every store a proposal writes to. */
export interface PageCopyStore {
  /** Every copy started, oldest first. */
  readonly list: () => Promise<Result<readonly PageCopy[], PageCopyStoreError>>
  readonly start: (copy: PageCopy) => Promise<Result<void, PageCopyStoreError>>
}

/** The order `list` promises, for every implementation to share. */
export const oldestFirst = (copies: readonly PageCopy[]): readonly PageCopy[] =>
  [...copies].sort(
    (left, right) => left.startedAt - right.startedAt || left.copyId.localeCompare(right.copyId)
  )

/** A page's first copy: the page's own id, started before anything was proposed for it. */
export const firstCopyOf = (pageId: TreeId): PageCopy => ({ pageId, copyId: pageId, startedAt: 0 })

/** Every copy a page has had, the first one included, oldest first. */
export const copiesOfPage = (copies: readonly PageCopy[], pageId: TreeId): readonly PageCopy[] => [
  firstCopyOf(pageId),
  ...copies.filter((copy) => copy.pageId === pageId),
]

/** The copy proposals for a page are made against now: the newest it has. */
export const currentCopyOf = (copies: readonly PageCopy[], pageId: TreeId): PageCopy =>
  copiesOfPage(copies, pageId).at(-1) ?? firstCopyOf(pageId)

/** The page a governed tree is a copy of; a tree no row names is a first copy, so its own page. */
export const pageOfCopy = (copies: readonly PageCopy[], copyId: TreeId): TreeId =>
  copies.find((copy) => copy.copyId === copyId)?.pageId ?? copyId
