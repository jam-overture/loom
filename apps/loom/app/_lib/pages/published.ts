import type { LoomTree, Result } from "@jam-overture/loom"

/**
 * A site's published pages: the newest tree it sent for each page, and when
 * (0312 clauses 3 and 4).
 *
 * Kept apart from the governed tree store, whose revisions are changes Loom
 * accepted. This is what the site says it serves.
 */
export type PublishedPage = {
  readonly tree: LoomTree
  readonly receivedAt: number
}

export type PublishedPageStoreError = { readonly code: "unavailable"; readonly detail: string }

/**
 * One application's published pages, scoped at construction like every store
 * the door writes to, so a snapshot cannot land under the wrong project by
 * passing the wrong id.
 */
export interface PublishedPageStore {
  /**
   * Every tree in, or none: a site never ends up half-published. A page the
   * snapshot does not mention keeps what it had (clause 4).
   */
  readonly publish: (
    trees: readonly LoomTree[],
    at: number
  ) => Promise<Result<void, PublishedPageStoreError>>
  /** Newest first, then by page. */
  readonly list: () => Promise<Result<readonly PublishedPage[], PublishedPageStoreError>>
}

/** The order `list` promises, for every implementation to share. */
export const newestFirst = (pages: readonly PublishedPage[]): readonly PublishedPage[] =>
  [...pages].sort(
    (left, right) =>
      right.receivedAt - left.receivedAt || left.tree.treeId.localeCompare(right.tree.treeId)
  )
