import type { AudienceId } from "../audience/audience.js"
import type { TreeId } from "../ids.js"

import { audiencesIn } from "./audiences.js"
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
 * **One of the two numbers now says when it was written, and the other
 * deliberately does not.** `appearances` carries `foldedAt`, stamped by the
 * rollup and by nothing else, because the subtraction above has a second sign:
 * `opened − appearances` is the openings no fold has reached, which is the
 * buffer as a number *and* what a collection that has stopped looks like. The
 * row's `updatedAt` cannot tell those apart — the door writes it on every
 * delivery — so the fold's own timestamp is the one thing that can, and a
 * reading judges a lag against the schedule its deployment hands in
 * ([0274](../../decisions/0274-a-page-view-row-says-when-the-fold-last-touched-it-and-a-stall-is-judged-against-a-schedule-the-deployment-hands-in.md)).
 *
 * **There is no floor here, and that is not an oversight.** A region bucket is
 * floored because a country with four views in it is a person
 * ([0214](../../decisions/0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md));
 * a count of page views of a revision names nowhere and nobody, so there is
 * nothing in it to withhold. Four page views of revision 3 is four page views
 * of revision 3.
 *
 * **A page served in two forms has two doors, and a deployment-wide reading
 * adds them.** The store keeps one row per revision per audience (0284), so a
 * revision served to two audiences (0263) is counted twice over — and a reading
 * that named no audience used to take whichever row came first and report the
 * other as a row handed in twice, which published one form's arrivals and
 * called the rest a duplicate. They add because **arrivals are people**: a
 * reader who arrived arrived once whichever form they were served, so the sum
 * is one deployment's arrivals and the census beside it says what it was a sum
 * over (0297, 0299). It is the opposite of a page reading, where adding two
 * forms' node counters would be one number about two pages (0290) — and the
 * asymmetry is not a special case for arrivals but the plainest instance of the
 * rule that what may be added is whatever was counted once.
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

/**
 * A page-view row as the store keeps it, which is the pair, when it last moved,
 * and when the fold last touched it.
 */
export type StoredPageViews = ReaderPageViews & {
  /** The audience these page views were served under. See `StoredTally.audienceId` (0284). */
  readonly audienceId: AudienceId
  /**
   * When either writer last moved this row.
   *
   * Written by the door on every delivery that opened a page view *and* by
   * every rollup that folded one, which is what makes it useless for telling a
   * stalled collection from a quiet one: a busy page whose rollup has stopped
   * keeps a fresh timestamp while its appearances never move again.
   */
  readonly updatedAt: string
  /**
   * When a rollup last folded a window holding page views of this revision, or
   * absent where nothing attests a fold.
   *
   * **Absent is not *never folded*.** It is *nothing here can say*: a row
   * written before the column existed, a store a caller built by hand, a
   * fixture. The two cases are one state, no reading claims anything from it,
   * and the first fold after an upgrade fills it in (0274).
   *
   * Where it *is* there, it is the one timestamp in this subsystem written by a
   * single writer, and therefore the only thing that can say an opening has
   * been pending longer than it should be.
   */
  readonly foldedAt?: string
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
export type RevisionPageViews = ReaderPageViews & {
  /**
   * The audience this reading is of, or `null` where it is of every form the
   * window held.
   *
   * The same three-valued field `RegionReading.audienceId` is, and the
   * same rule: it is what the *asking* named and never what the rows turned out
   * to say. One row naming one form is not a reading of one form — a window may
   * simply hold one today — so a single-membered census does not fill this in
   * (0297, 0299).
   */
  readonly audienceId: AudienceId | null
  /**
   * The audiences whose rows were added into this reading, deduplicated and in
   * a stable order.
   *
   * `[]` where the rows named none, one name where this is one form's door, and
   * **more than one where it is a sum over forms, which is a measurement rather
   * than a fault**: a page served in two forms (0263) has two door rows (0284),
   * and a reader who arrived arrived once whichever form they were served, so
   * the sum is one deployment's arrivals (0297, 0299). Compare a page reading,
   * where adding two forms' node counters is one number about two pages and
   * `PageHealth` calls it `audiences-mixed` (0290).
   */
  readonly audiences: readonly AudienceId[]
  /**
   * When either writer last moved a row behind this reading — the newest of
   * them where it is a sum, because the question is when the number last
   * changed and the busiest form is what last changed it.
   *
   * See {@link StoredPageViews.updatedAt} for why it cannot tell a stalled
   * collection from a quiet one.
   */
  readonly updatedAt: string
  /**
   * The fold this reading is waiting on: the oldest fold attested by a row that
   * still has openings pending, or the oldest attested of them all where none
   * has, and absent where nothing attests one.
   *
   * For one form's door that is simply {@link StoredPageViews.foldedAt}. For a
   * sum over forms it is the only choice that keeps a fault from hiding behind
   * a busier form — a fold that ran a minute ago on one form cannot vouch for a
   * form whose openings have been waiting a day — and it is *the oldest of the
   * rows still waiting* rather than the oldest of all of them so that a quiet
   * form with nothing pending cannot invent a stall. A summed door is therefore
   * stalled exactly when one of its forms is (0299).
   */
  readonly foldedAt?: string
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
   * It is the other sign of the same subtraction, so **one form's door never
   * has both** — and a door summed over two forms can, because the two are
   * added per row rather than taken from the two sums (0299): one form
   * mid-collection and one form with straddles is a revision with six of each,
   * and netting them would report it as exactly measured, which neither form
   * is. A reading that showed neither would make a deployment whose collection
   * has stopped look like a deployment whose readers had left.
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

const readingOf = (row: StoredPageViews): RevisionPageViews => {
  const audiences = audiencesIn([row])

  return {
    ...row,
    /** One row's own form, and `null` where the row named none (0299). */
    audienceId: audiences[0] ?? null,
    audiences,
    drift: Math.max(0, row.appearances - row.opened),
    pending: Math.max(0, row.opened - row.appearances),
    inflation: row.opened === 0 ? null : Math.max(0, row.appearances - row.opened) / row.opened,
  }
}

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
   * This revision's door, read through {@link pageViewReadingOf}, or `null`
   * where this revision has none.
   *
   * Read through the reading rather than subtracted again, because one
   * definition of drift, pending and inflation is the point: a second would be
   * a second place for them to disagree with the counter they describe.
   *
   * **Where the asking names no audience this is the sum of every form's
   * door**, and it was once whichever form came first in the caller's array
   * (0299). A page served in two forms has two door rows (0263, 0284), so a
   * deployment-wide asking was answered with one form's openings and the other
   * form's reported as a row handed in twice — the same quiet undercount found
   * in the reading beside it (0297). Arrivals add because arrivals are people:
   * a reader who arrived arrived once whichever form they were served.
   * {@link RevisionPageViews.audiences} is what the sum was over.
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
   * Rows for this tree and revision, in another audience, and ignored.
   *
   * A page is served in as many forms as it has audiences (0263) and the door
   * counts each one's arrivals on its own row (0284), so a window holding two
   * of them is a deployment doing what it was built to do. It is `foreign` to
   * nothing and `duplicated` to nothing: the other form's readers are real and
   * are simply not the ones this reading is of.
   */
  readonly otherAudience: number
  /**
   * Rows for this tree, revision **and audience** beyond the first of that
   * audience, where every one after it was ignored.
   *
   * A store keeps one row per revision per audience, so this cannot happen from
   * one read — it happens when a caller concatenates two. Adding them is wrong,
   * because the openings are already a running total and would double (0158);
   * taking the last is wrong, because it is not the truer one. So the first row
   * of each form stands and the fact is reported.
   *
   * **The audience is part of what makes two rows two rows**, and leaving it
   * out was an undercount (0299): two forms' doors keyed by nothing at all made
   * the second form a repeat of the first, so a deployment-wide reading
   * published one form's arrivals and called the rest a duplicate. A form's own
   * door was never affected — the audience is picked before this, so one form's
   * rows key the same either way.
   */
  readonly duplicated: number
}

/**
 * A revision of a tree, and the audience the asking is about.
 *
 * The audience is optional and `null` means the same as absent: *this caller
 * did not say*, which reads every form of the page and is what a window
 * written before 0284 and every reading taken before this rule has always
 * done. A caller that names one — which `PageReading` now does for itself —
 * gets that form's door row and nothing else.
 */
export type RevisionOf = {
  readonly treeId: TreeId
  readonly revision: number
  readonly audienceId?: AudienceId | null
}

/**
 * The newest instant either writer moved one of these rows.
 *
 * A reading's own figure is as fresh as the freshest row under it, so this is a
 * maximum. Compared by parsed instant rather than by string order, because two
 * stores may write the same instant in two spellings and only one of them sorts.
 */
const movedLast = (rows: readonly StoredPageViews[]): string => {
  let latest = rows[0]?.updatedAt ?? ""

  for (const row of rows) {
    if (Date.parse(row.updatedAt) > Date.parse(latest)) latest = row.updatedAt
  }

  return latest
}

/**
 * The oldest fold attested by one of these rows, or absent where none attests
 * one.
 *
 * A `folded_at` nothing can read attests no fold, which is how a stall reading
 * already treats one (0274): it is skipped rather than kept as the oldest, so
 * one unreadable instant cannot make a deployment's whole collection look
 * unattested.
 */
const foldWaitedOn = (rows: readonly StoredPageViews[]): string | undefined => {
  let oldest: string | undefined

  for (const row of rows) {
    const at = row.foldedAt

    if (at === undefined || Number.isNaN(Date.parse(at))) continue
    if (oldest === undefined || Date.parse(at) < Date.parse(oldest)) oldest = at
  }

  return oldest
}

/**
 * One revision's door rows, added into one reading.
 *
 * **The arithmetic is the reading's own, taken over the rows rather than
 * written again.** `opened` and `appearances` are counts and add; `drift` and
 * `pending` are added *per row and never taken from the two sums*, because a
 * form mid-collection has openings no fold has reached and subtracting in the
 * aggregate would let that cancel another form's straddles — which is the rule
 * {@link pageViewReadingOf} already states for revisions and holds for forms of
 * one revision for the same reason; and `inflation` is a ratio, so it is
 * recomputed from the summed drift and the summed openings rather than averaged
 * over the forms. Handing the rows to {@link pageViewReadingOf} is what keeps
 * those four from being a second spelling of one rule.
 */
const summedOf = (
  where: RevisionOf,
  audience: AudienceId | null,
  rows: readonly StoredPageViews[]
): RevisionPageViews | null => {
  if (rows.length === 0) return null

  const { opened, appearances, drift, pending, inflation } = pageViewReadingOf(rows)
  const waiting = rows.filter((row) => row.opened > row.appearances)
  const folded = foldWaitedOn(waiting.length > 0 ? waiting : rows)

  return {
    treeId: where.treeId,
    revision: where.revision,
    audienceId: audience,
    audiences: audiencesIn(rows),
    opened,
    appearances,
    drift,
    pending,
    inflation,
    updatedAt: movedLast(rows),
    ...(folded === undefined ? {} : { foldedAt: folded }),
  }
}

/**
 * Read one revision's door out of a window of rows.
 *
 * Linear in the rows, with one pass and one map.
 */
export const pageViewsFor = (
  where: RevisionOf,
  rows: readonly StoredPageViews[]
): PageViewsFor => {
  const here = rows.filter(
    (row) => row.treeId === where.treeId && row.revision === where.revision
  )
  const audience = where.audienceId ?? null
  const matching =
    audience === null ? here : here.filter((row) => row.audienceId === audience)
  /**
   * Keyed by the audience, which is what the store keeps one row per (0284):
   * two forms' doors are two rows and one arrival count, and keying them by the
   * revision alone dropped the second as a repeat of the first (0299).
   */
  const first = new Map<AudienceId, StoredPageViews>()

  for (const row of matching) {
    if (!first.has(row.audienceId)) first.set(row.audienceId, row)
  }

  return {
    measured: summedOf(where, audience, [...first.values()]),
    foreign: rows.length - here.length,
    otherAudience: here.length - matching.length,
    duplicated: matching.length - first.size,
  }
}

/**
 * The straddle correction for one revision of one page: `drift ÷ opened` off
 * that page's own door — its own form's row where the asking names an audience,
 * and the sum of every form's where it names none (0299).
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
