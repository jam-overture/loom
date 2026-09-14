import type { TreeId } from "../ids.js"
import type { Result } from "../result.js"

import type { FunnelAnswer, ReaderTally } from "./rollup.js"
import type { ReaderSignalStoreError } from "./journal.js"

/**
 * Where the counters live once the batches they came from are gone.
 *
 * This is the durable half. The portal reads it, retention never touches it,
 * and nothing in it can be traced to a reader: a tally is a node, a revision
 * and six numbers.
 *
 * **Applying a rollup is additive, not a replacement.** Rollup runs over a
 * window of the buffer and is run again over the next window, so what it
 * produces is *what this window added* rather than *what is true so far*. A
 * store that overwrote would silently discard every window but the last, and
 * the symptom — counters that look plausible and only ever describe the last
 * few minutes — is the kind nobody notices.
 *
 * **Except the view counts, which is the one place this is lossy and the
 * reason it is written down here (0147).** `views` and `reached` count *distinct*
 * views, and distinctness cannot be added up: a reader whose page view spans
 * two windows is one view in each and two after the sum. The error is bounded
 * by how many views straddle a window boundary, it is always an over-count, and
 * the alternative is keeping view keys in durable storage — which is the thing
 * 0146 refuses. A deployment that wants the bound small makes the rollup window
 * long relative to a page view, which is the default.
 */

/** One node's line as the store keeps it, which is a tally plus when it last changed. */
export type StoredTally = ReaderTally & {
  readonly updatedAt: string
}

/** One funnel answer as the store keeps it. */
export type StoredFunnel = FunnelAnswer & {
  readonly updatedAt: string
}

export type TallyReadRequest = {
  /** Absent reads every tree the handle can see, which is the scope rule (0020). */
  readonly treeId?: TreeId
  /**
   * Absent reads every revision.
   *
   * Almost every question the portal asks is about one revision or about two
   * being compared, and *before versus after a change* is the second of those —
   * so this is a filter rather than a requirement, and a caller comparing
   * revisions reads them all and groups.
   */
  readonly revision?: number
}

/**
 * Counters are not paged.
 *
 * A page of a log is unbounded because a log only grows; tallies are bounded by
 * the nodes of the revisions a deployment has, which is the size of its trees.
 * Paging them would be a cursor every caller has to carry for a result that
 * fits in a response.
 */
export interface ReaderTallyStore {
  /**
   * Add a rollup's counters to what is already there, creating rows that do not
   * exist yet. Atomic over the whole rollup where the backend can be: a partly
   * applied window is counters that disagree with each other.
   */
  readonly apply: (
    rollup: { readonly tallies: readonly ReaderTally[]; readonly funnels: readonly FunnelAnswer[] },
    at: string
  ) => Promise<Result<void, ReaderSignalStoreError>>
  readonly tallies: (
    request?: TallyReadRequest
  ) => Promise<Result<readonly StoredTally[], ReaderSignalStoreError>>
  readonly funnels: (
    request?: TallyReadRequest
  ) => Promise<Result<readonly StoredFunnel[], ReaderSignalStoreError>>
}
