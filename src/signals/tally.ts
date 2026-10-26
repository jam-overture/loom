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
 * (0284). A rollup folds one audience's window, so the counters it produces are
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
   * Absent reads every audience (0284).
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
     * The audience the delivery was served under (0284). Omitted is
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
/**
 * One fold's output, as a caller hands it over.
 *
 * Every row in it belongs to one audience, which is what keeps `ReaderTally`
 * free of the dimension (0284): a window holding two audiences is folded once
 * per audience, and each fold produces one of these.
 */
export type AppliedCounters = {
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
}

/** One audience's share of a window, which is what {@link ReaderTallyStore.applyWindow} takes a list of. */
export type AudienceCounters = AppliedCounters & {
  /** The audience this fold was taken over (0284). Omitted is `aud_everyone`. */
  readonly audience?: AudienceId
}

export interface ReaderTallyStore extends ReaderOpeningCounter {
  /**
   * Add a whole window's counters to what is already there, every audience in
   * it, in one atomic write — creating rows that do not exist yet.
   *
   * **This is the method a collection run calls, and the atomicity is the
   * reason it exists rather than a property it happens to have.**
   *
   * A window holds whatever arrived in it, so a deployment serving two forms of
   * a page holds two audiences interleaved and is folded once per audience
   * (0284). Writing those folds as separate calls leaves a state between them
   * where some are durable and the rest are not — and because counting and
   * forgetting are one operation (`collect.ts`), the buffer still holds the
   * window, so the next run folds it again and **adds the already-durable
   * audiences a second time.** Of a tally's nine counters, `views`, `reached`
   * and `engaged` are distinct counts and would move little; `dwellMs`,
   * `activations`, `opens`, `closes` and `completions` are occurrences and
   * would double, which every rate in this subsystem divides by the first kind
   * — so the damage is invisible, permanent (0158) and looks like a readership
   * twice as interested as it was (0316).
   *
   * So the window is one write or it is none. A store that cannot be atomic
   * over several audiences cannot be correct here, which is why this is a
   * required method rather than a capability a caller probes for.
   *
   * Two entries naming one audience are added together, not refused: the
   * guarantee is the same one `counters.ts` gives for two rows naming one
   * counter, and it is here so that the two shipped stores cannot disagree
   * about it.
   */
  readonly applyWindow: (
    window: readonly AudienceCounters[],
    at: string
  ) => Promise<Result<void, ReaderSignalStoreError>>
  /**
   * One audience's counters, which is {@link applyWindow} over a single entry
   * and is implemented as exactly that in both shipped stores — so the two
   * cannot drift on the half that matters.
   *
   * Kept because a caller composing counters by hand — a backfill, a fixture, a
   * migration — has one audience and no window, and should not have to wrap it
   * in a list to say so.
   */
  readonly apply: (
    counters: AppliedCounters,
    at: string,
    /**
     * The audience whose counters these are (0284). Omitted is `aud_everyone`.
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
