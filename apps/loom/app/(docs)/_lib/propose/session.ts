import { type LoomTree, type TreeId } from "@jam-overture/loom"
import { memoryTreeStore, type TreeStore } from "@jam-overture/loom/store"
import { memoryHoldStore, type HoldStore } from "@jam-overture/loom/write"

/**
 * Where an example's history lives while a reader is reading.
 *
 * Until now this site ran the pipeline and kept the tree it got back in React
 * state. That worked and it was a half-truth: `composeChange` decides whether a
 * change may happen, and a deployment goes through `commitIntent`, which decides
 * that it *did* — appending the delta and its provenance to a log that is the
 * truth about the page (0016, 0017). A site that skipped the second half could
 * not show a reader the log, could not attribute anything, and could not offer
 * an undo, because an undo in Loom is a proposal against a stored history
 * (0032) and there was no history to propose against.
 *
 * So each example opens one of these: the reference `TreeStore`, the reference
 * `HoldStore`, and the tree at revision 0 to replay from. Both are the
 * in-memory implementations the runtime ships for tests, and they are the same
 * two interfaces `@jam-overture/loom/postgres` implements — a deployment swaps the
 * pair and nothing above this line changes.
 *
 * **It is memory in a browser tab, and it is gone on reload.** That is a real
 * limit and the pages say so rather than implying a database. What it is not is
 * a mock: every field a reader sees in the log was written by the runtime's own
 * write path, and the tree rendered on the page is the one the store handed
 * back rather than the one the pipeline applied in passing.
 */

export type DocsSession = {
  readonly store: TreeStore
  readonly holds: HoldStore
  /**
   * Revision 0, kept because planning an undo replays the log from a tree older
   * than the target (0028): the inverse of a delta depends on the tree that
   * delta observed, and nothing but a replay can recover it.
   */
  readonly seed: LoomTree
  readonly treeId: TreeId
}

/**
 * Opens a session on a tree, which means putting it in the store.
 *
 * A throw rather than a `Result`, and it is the one place on this site that is
 * right: `create` can only fail here by being called twice for one tree id, and
 * a caller that did that has a bug rather than a condition to handle. Every
 * failure a *reader* can cause — a stale intent, a refused change, an undo of
 * something built on since — is a value that reaches the page.
 */
export const openDocsSession = async (seed: LoomTree): Promise<DocsSession> => {
  const store = memoryTreeStore()
  const created = await store.create(seed)

  if (!created.ok) {
    throw new Error(`loom: the documented example's store refused it — ${created.error.code}`)
  }

  return { store, holds: memoryHoldStore(), seed, treeId: seed.treeId }
}
