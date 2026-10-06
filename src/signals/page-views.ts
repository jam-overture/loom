import type { TreeId } from "../ids.js"

import type { ReaderSignalBatch } from "./signal.js"

/**
 * How many page views there were — the number every rate on a screen is taken
 * of, and the one number this subsystem could not state.
 *
 * Everything else here counts what happened *inside* a page view: time on a
 * band, presses under a region, forms let go. The denominator was the summed
 * `views` on a tally, which is a distinct count added across rollup windows and
 * therefore generous by every page view that straddled a boundary
 * ([0147](../../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)).
 * 0147 bounds that error by arithmetic nobody can evaluate from the rows —
 * *views per window × page-view duration ÷ window length* — so a portal showing
 * a rate could say it was slightly high and never how high.
 *
 * **Two numbers for the same page views, counted from opposite ends.** A batch
 * says whether it opened its page view (0214), which is a fact only a sender
 * has, so `opened` is counted at the door, once, and never recounted. A rollup
 * counts the same page views once per window they appeared in, which is
 * `appearances`. For an honest sender the two differ by exactly the straddles,
 * so **the over-count stops being a bound and becomes a measurement** — a
 * subtraction of two stored numbers, per revision, for as long as the counters
 * live.
 *
 * It costs no byte on the wire and no byte in a browser: the marker it reads
 * already ships for the region counter, and this is the second thing derived
 * from it rather than a second thing sent.
 *
 * **There is no floor here, and that is not an oversight.** A region bucket is
 * floored because a country with four views in it is a person
 * ([0214](../../decisions/0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md));
 * a count of page views of a revision names nowhere and nobody, so there is
 * nothing in it to withhold. Four page views of revision 3 is four page views
 * of revision 3.
 */

/**
 * One revision's worth of page views, as whichever side counted them.
 *
 * The same shape for both writers, because they are counting the same thing by
 * two routes and a reading subtracts them. What the number *means* is the
 * method it was handed to, which is where the two senses are named.
 */
export type RevisionViews = {
  readonly treeId: TreeId
  readonly revision: number
  readonly views: number
}

/** Page views of one revision of one tree, counted from both ends. */
export type ReaderPageViews = {
  readonly treeId: TreeId
  readonly revision: number
  /**
   * Page views that *began* on this revision.
   *
   * Exact, in the sense that matters: counted once, at the instant a page view
   * opened, never recounted, and therefore addable across windows, revisions,
   * trees and months. The two things it is not exact against are worth knowing
   * — a sender that retries an opening delivery after the first one was kept
   * counts twice, and a count cannot be uncounted (0158); and a sender is what
   * says it opened at all, so a page that lies inflates this the way it could
   * already inflate a region bucket. The rate limiter is what bounds both.
   */
  readonly opened: number
  /**
   * The same page views as the rollups saw them: once per window each appeared
   * in.
   *
   * Which is why it is kept at all. On its own it is the count a rollup can
   * only approximate (0147); beside `opened` it is the measurement of that
   * approximation, because the only way the two can differ for an honest sender
   * is a page view whose batches landed in more than one window.
   */
  readonly appearances: number
}

/** A page-view row as the store keeps it, which is the pair plus when it last moved. */
export type StoredPageViews = ReaderPageViews & {
  readonly updatedAt: string
}

/**
 * The page views a delivery opened, per revision, deduplicated by view key.
 *
 * The dedup inside the delivery is load-bearing rather than defensive: a sender
 * draining a queue after an outage posts what it has, which may include an
 * opening batch it already sent and could not confirm, and a page view counted
 * twice cannot be uncounted
 * ([0158](../../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
 * Keys are compared rather than batches, so one opening delivered twice is one
 * page view and two page views opened in one delivery are two.
 *
 * A batch that opened nothing adds nothing, and a sender that never says adds
 * nothing at all — a batch synthesised on a server or replayed from a fixture
 * is not an arrival, exactly as it is not a view (0146). The parser has already
 * refused a batch that claims an opening and names no page view, so a key is
 * always there to compare when the claim is.
 *
 * Pure, and shared: the region counter stamps a country onto these rows rather
 * than walking the delivery itself, which is what keeps the two counters from
 * disagreeing about how many readers arrived.
 */
export const openingsOf = (batches: readonly ReaderSignalBatch[]): readonly RevisionViews[] => {
  const opened = new Map<
    string,
    { readonly treeId: TreeId; readonly revision: number; readonly views: Set<string> }
  >()

  for (const batch of batches) {
    if (batch.first !== true || batch.view === undefined) continue

    const key = `${batch.treeId} ${batch.revision}`
    const existing = opened.get(key)

    if (existing === undefined) {
      opened.set(key, {
        treeId: batch.treeId,
        revision: batch.revision,
        views: new Set([batch.view]),
      })
      continue
    }

    existing.views.add(batch.view)
  }

  return [...opened.values()].map(({ treeId, revision, views }) => ({
    treeId,
    revision,
    views: views.size,
  }))
}

/**
 * One revision, as a reading reports it — the stored row, and what subtracting
 * its two numbers says.
 *
 * `updatedAt` travels with it because a page-view figure that has not moved in a
 * day is a fact about the deployment rather than about its readers, and a screen
 * showing the number should be able to say when it last did.
 */
export type RevisionPageViews = StoredPageViews & {
  /**
   * Appearances in excess of openings — the over-count in every distinct view
   * count stored against this revision, measured rather than bounded.
   *
   * Never negative: a reading taken between a door write and the next rollup
   * sees openings the counters have not met yet, and that is `pending` rather
   * than a negative drift.
   */
  readonly drift: number
  /**
   * Page views that began and whose batches no rollup has folded yet — the
   * buffer, as a number.
   *
   * It is the other sign of the same subtraction, so a revision never has both.
   * A reading that showed neither would make a deployment whose collection has
   * stopped look like a deployment whose readers had left.
   */
  readonly pending: number
  /**
   * `drift ÷ opened`: how generous the distinct counts against this revision
   * are, as a fraction. `null` when nothing has opened, because the question
   * has no answer rather than the answer nought.
   */
  readonly inflation: number | null
}

export type PageViewReading = {
  /** Page views that began, across every row read. Exact, and addable. */
  readonly opened: number
  readonly appearances: number
  readonly drift: number
  readonly pending: number
  readonly inflation: number | null
  /** Newest revision first, trees in id order, so a screen does not reorder on a refresh. */
  readonly revisions: readonly RevisionPageViews[]
}

const readingOf = (row: StoredPageViews): RevisionPageViews => ({
  ...row,
  drift: Math.max(0, row.appearances - row.opened),
  pending: Math.max(0, row.opened - row.appearances),
  inflation: row.opened === 0 ? null : Math.max(0, row.appearances - row.opened) / row.opened,
})

/**
 * Rows from the store, read as something a screen may show.
 *
 * **Totalled from the rows and never from the totals.** `drift` on the whole
 * reading is the sum of each revision's drift, not the difference of the two
 * sums: a revision mid-collection has openings the rollups have not reached,
 * and subtracting in the aggregate would let that cancel another revision's
 * straddles and report a page as more exact than any part of it is.
 *
 * Unlike a region reading this withholds nothing, groups nothing, and hides
 * nothing. Every row is already an aggregate about a revision of a tree.
 */
export const pageViewReadingOf = (rows: readonly StoredPageViews[]): PageViewReading => {
  const revisions = rows
    .map(readingOf)
    .sort((one, other) => one.treeId.localeCompare(other.treeId) || other.revision - one.revision)

  const total = (of: (row: RevisionPageViews) => number): number =>
    revisions.reduce((sum, row) => sum + of(row), 0)

  const opened = total((row) => row.opened)
  const drift = total((row) => row.drift)

  return {
    opened,
    appearances: total((row) => row.appearances),
    drift,
    pending: total((row) => row.pending),
    inflation: opened === 0 ? null : drift / opened,
    revisions,
  }
}

/**
 * The page-view row a reading of one revision should be divided by, picked out
 * of a window of rows.
 *
 * **This exists because the pairing is the part that can be got wrong, and it
 * fails quietly.** The number a correction wants belongs to *one revision of
 * one page*; the obvious thing to reach for is the aggregate
 * {@link PageViewReading.inflation} published beside it, and handing a busy
 * page's straddle rate to a quiet one is an invented correction with three
 * decimal places on it. Nothing would fail — the figures downstream would
 * simply be a little wrong, in whichever direction their own safety argument
 * needs them right. So the rule lives once, here, beside the counter it is a
 * rule about, rather than four lines in every consumer.
 *
 * **It filters rather than trusts its caller, and says what it dropped.** A
 * caller who handed in a whole store's rows and one who handed in the wrong
 * revision's look identical from the inside, so both are counted.
 */
export type PageViewsFor = {
  /**
   * The row, read through {@link pageViewReadingOf}, or `null` where this
   * revision has none.
   *
   * Read through the reading rather than subtracted again, because one
   * definition of drift, pending and inflation is the point: a second would be
   * a second place for them to disagree with the counter they describe.
   */
  readonly measured: RevisionPageViews | null
  /**
   * Rows for another tree or another revision, and ignored.
   *
   * Dividing one revision's counters by another's readers is the mistake that
   * would make every rate taken off them quietly wrong.
   */
  readonly foreign: number
  /**
   * Rows for this tree and revision beyond the first, where every one after it
   * was ignored.
   *
   * A store keeps one row per revision, so this cannot happen from one read —
   * it happens when a caller concatenates two. Adding them is wrong, because
   * the openings are already a total and would double; taking the last is
   * wrong, because it is not the truer one. So the first row stands and the
   * fact is reported.
   */
  readonly duplicated: number
}

/** A revision of a tree, which is all this rule needs to be asked. */
export type RevisionOf = {
  readonly treeId: TreeId
  readonly revision: number
}

/**
 * Pick the page-view row for one revision out of a window of rows.
 *
 * Linear in the rows, with one pass.
 */
export const pageViewsFor = (
  where: RevisionOf,
  rows: readonly StoredPageViews[]
): PageViewsFor => {
  const matching = rows.filter(
    (row) => row.treeId === where.treeId && row.revision === where.revision
  )
  const first = matching[0]

  return {
    measured: first === undefined ? null : (pageViewReadingOf([first]).revisions[0] ?? null),
    foreign: rows.length - matching.length,
    duplicated: Math.max(0, matching.length - 1),
  }
}

/**
 * The straddle correction for one revision of one page: `drift ÷ opened` off
 * that page's own door row.
 *
 * The number `PaceOptions.inflation` wants, published so that a consumer
 * holding a window of counters over several pages does not write the matching
 * itself. `null` where there is no row for the revision, or where nothing has
 * opened — which is *the question has no answer* rather than *the answer is
 * nought*, and is the reason this is not simply `0`.
 */
export const inflationFor = (
  where: RevisionOf,
  rows: readonly StoredPageViews[]
): number | null => pageViewsFor(where, rows).measured?.inflation ?? null
