import type { AudienceId } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { Result } from "../result.js"

import type { ReaderSignalStoreError } from "./journal.js"
import type { RevisionViews, StoredPageViews } from "./page-views.js"
import type { FunnelAnswer, ReaderTally } from "./rollup.js"

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
 *
 * **The bound is now also a measurement, and that is the one thing here that has
 * changed since 0147.** Page views are counted a second time at the door, where
 * an opening is a single event rather than a distinct count
 * ([`page-views.ts`](page-views.ts)), so the difference between the two numbers
 * is the straddle — per revision, in the rows, for as long as the counters live.
 * It does not make a tally exact. It makes a deployment able to say by how much
 * it is not.
 */

/**
 * One node's line as the store keeps it, which is a tally plus the audience it
 * was collected under and when it last changed.
 *
 * `audienceId` is on the stored row and not on `ReaderTally` deliberately
 * (0283). A rollup folds one audience's window, so the counters it produces are
 * already all one audience's and a field on each would be the same value
 * repeated; a row read back may sit beside another audience's, so it has to say
 * which it is. It is also what lets a screen compare two without a reading
 * having to remember what it asked for.
 */
export type StoredTally = ReaderTally & {
  readonly audienceId: AudienceId
  readonly updatedAt: string
}

/** One funnel answer as the store keeps it. See `StoredTally.audienceId`. */
export type StoredFunnel = FunnelAnswer & {
  readonly audienceId: AudienceId
  readonly updatedAt: string
}

export type TallyReadRequest = {
  /** Absent reads every tree the handle can see, which is the scope rule (0020). */
  readonly treeId?: TreeId
  /**
   * Absent reads every audience (0283).
   *
   * A filter rather than a requirement, on the terms `revision` below is one:
   * comparing two audiences is the point of serving two, so a reading that
   * could not span them would make the comparison the measurement rests on
   * unreadable (0263). Each row names its own audience, so a caller that wants them
   * apart groups rather than summing — and a caller that sums two has asked
   * for one number about two populations.
   */
  readonly audience?: AudienceId
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
 * The one write the door makes into the durable counters.
 *
 * Narrow on purpose. Everything else here is written by a rollup over a window
 * of the buffer; the number of page views that *began* cannot be, because by
 * the time a window is folded nothing knows which of its views were already
 * underway (0214). So the intake writes that one counter, and it is handed an
 * interface that can do nothing else — a door that could read a deployment's
 * tallies is a public endpoint one query away from serving them.
 */
export interface ReaderOpeningCounter {
  /**
   * Add the page views a delivery opened, creating rows that do not exist yet.
   *
   * Additive like everything else in this file, and for the sharpest reason of
   * any of them: every call is one delivery's worth of arrivals, so a store
   * that replaced would report the last reader rather than the readership.
   */
  readonly opened: (
    openings: readonly RevisionViews[],
    at: string,
    /**
     * The audience the delivery was served under (0283). Omitted is
     * `aud_everyone`, so a door that serves one form of every page calls this
     * exactly as it did.
     *
     * One audience per call rather than one per opening, because a delivery is
     * one page view of one form of one page — the same reason the batch carries
     * it and a signal does not.
     */
    audience?: AudienceId
  ) => Promise<Result<void, ReaderSignalStoreError>>
}

/**
 * Counters are not paged.
 *
 * A page of a log is unbounded because a log only grows; tallies are bounded by
 * the nodes of the revisions a deployment has, which is the size of its trees.
 * Paging them would be a cursor every caller has to carry for a result that
 * fits in a response.
 */
export interface ReaderTallyStore extends ReaderOpeningCounter {
  /**
   * Add a rollup's counters to what is already there, creating rows that do not
   * exist yet. Atomic over the whole rollup where the backend can be: a partly
   * applied window is counters that disagree with each other.
   */
  readonly apply: (
    rollup: {
      readonly tallies: readonly ReaderTally[]
      readonly funnels: readonly FunnelAnswer[]
      /**
       * The window's page views, per revision, for the counter the exact count
       * is compared against.
       *
       * Optional, and absent is not none: a caller applying counters it
       * composed itself — a backfill, a fixture, a test — has no window to
       * report, and a nought written there would read as *no page views* and
       * make a reading claim the node counters were exact.
       */
      readonly appearances?: readonly RevisionViews[]
    },
    at: string,
    /**
     * The audience whose window this is (0283). Omitted is `aud_everyone`.
     *
     * One audience per call, which is what keeps `ReaderTally` free of the
     * dimension: a window holding two audiences is folded once per audience and
     * applied twice, so every row in one call belongs to one of them.
     */
    audience?: AudienceId
  ) => Promise<Result<void, ReaderSignalStoreError>>
  readonly tallies: (
    request?: TallyReadRequest
  ) => Promise<Result<readonly StoredTally[], ReaderSignalStoreError>>
  readonly funnels: (
    request?: TallyReadRequest
  ) => Promise<Result<readonly StoredFunnel[], ReaderSignalStoreError>>
  /**
   * How many page views there were, which is the denominator every rate on a
   * screen needs and the only row here written from two sides.
   */
  readonly pageViews: (
    request?: TallyReadRequest
  ) => Promise<Result<readonly StoredPageViews[], ReaderSignalStoreError>>
}
