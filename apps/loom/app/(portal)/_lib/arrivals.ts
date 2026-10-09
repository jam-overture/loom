import type { NodeId, PrimitiveType, TreeId } from "@jam-overture/loom"
import type { PageReach, PartReach, ReachSilence } from "@jam-overture/loom/signals"

import { nounOf, type PartName } from "./part-name"
import type { PlainLine } from "./vocabulary"
import { versionMention } from "./version"

/**
 * How many people were actually there, and how many of them got each part of
 * the way down.
 *
 * ## The number this screen has never had
 *
 * Every figure on `/portal/readers` is a rate, and until today every one of
 * them was divided by the same thing: **the largest visit count any single row
 * of the window reported.** That is a floor rather than a count. It cannot be
 * added across rows, it is inflated by every visit that was still being read
 * when a counting window closed, and nothing on the screen could say by how
 * much — so *9 of the 36 visits* was a true sentence about a denominator nobody
 * could stand behind, printed in a position that reads as a census.
 *
 * The exact number was one row away the whole time. A visit is counted once as
 * it begins, which is a count of arrivals that no window boundary can inflate
 * and that adds across windows, versions and months (0219). `pageReachOf`
 * (0229) is the join that divides one by the other, and what it buys is the
 * sentence this surface could not say:
 *
 * > *About 200 of the 320 readers who arrived got as far as the pricing band.*
 *
 * Nothing was collected for it. The arrivals were already in the rows this
 * screen reads to correct the pace reading, and the reach was already in the
 * join every other section is taken off — it is the fifth reading off that
 * join and the fourth this card draws.
 *
 * ## Which figure goes on the surface, and it is not the exact-looking one
 *
 * `Loom signals` filed the answer with the join and it is worth keeping,
 * because the instinct runs the other way: the counts look exact and the share
 * looks rounded, and **the share is the honest one.** A part's reach and the
 * appearances it is divided by are counted out of the same windows, so the
 * straddle over-count is in the numerator and the denominator and very nearly
 * divides out. The raw counts carry it undivided.
 *
 * So {@link ArrivingPart.readers} — the share applied back to the exact
 * arrivals — is what a sentence says, {@link PageArrivals.arrived} is the
 * denominator it says it against, and the raw counts stay one click down with
 * the straddle measured beside them. Nothing is removed; what changes is which
 * of them a person meets first.
 *
 * ## Three nothings and one refusal
 *
 * A share of readers cannot always be given, and the four reasons want four
 * different sentences rather than one blank:
 *
 * - **Nothing has counted the arrivals** for this version, so the floor is all
 *   there is and the card says which figure it is showing.
 * - **Nothing is marking when a visit begins**, which is the one worth a screen
 *   of its own: every rate here has no denominator while the counters look
 *   perfectly healthy, and nothing else in this subsystem can tell a
 *   deployment that.
 * - **Readers have arrived and no window has been counted yet**, which is the
 *   first minutes of a deployment and also what a stalled collection looks like
 *   for ever.
 * - **More reach than there were arrivals**, which rows written by the same
 *   roll-ups cannot produce. It is counters older than the arrival count, it
 *   clears itself, and the figure is refused rather than drawn above 1.
 *
 * ## What it refuses to add
 *
 * **There is no total of the readers who got anywhere.** One reader who reached
 * four parts is in four rows, and adding them counts that reader four times.
 * Every figure here is about one part against the whole page's arrivals, which
 * is the only division this data supports — and the ranking question *where
 * does the page lose people* belongs to `_lib/stopping.ts`, between two
 * siblings, where it is answerable.
 *
 * It takes nothing and proposes nothing, like every other reading on this
 * screen (0031).
 */

/** One part of the page, against the readers who arrived at it. */
export type ArrivingPart = {
  readonly nodeId: NodeId
  readonly name: PartName
  /** The registered type, for the technical record. Never on the surface. */
  readonly type: PrimitiveType
  /** 0 at the top of the page, so a list can keep the shape it was read in. */
  readonly depth: number
  /**
   * Distinct visits that reported this part coming onto the screen, exactly as
   * stored and therefore generous.
   *
   * Kept beside the shares rather than behind them: it is the only figure here
   * that is not a division, and it is what a card falls back to when the pair
   * cannot be reconciled.
   */
  readonly reached: number
  /** The estimate — reach against appearances. `undefined` under a nothing. */
  readonly share: number | undefined
  /** The ceiling — reach against arrivals, never above 1. `undefined` likewise. */
  readonly atMost: number | undefined
  /**
   * The share applied to the exact arrivals: **the figure a sentence says.**
   *
   * Unrounded, deliberately, and rounded by whoever draws it — a view that
   * rounds is saying how precise it thinks this is, and that is the view's call.
   * `undefined` under a nothing, while any arrival is still waiting to be
   * counted, and wherever the two counters cannot be reconciled.
   */
  readonly readers: number | undefined
  /** The most readers who could have got here. A whole number of real visits. */
  readonly atMostReaders: number | undefined
  /** More reach than there were arrivals, so no share here may be drawn. */
  readonly unreconciled: boolean
}

export type PageArrivals = {
  readonly treeId: TreeId
  readonly revision: number
  /**
   * Readers who arrived at this version of the page. Exact, and addable.
   *
   * This is the number the screen was missing. It is counted once as a visit
   * begins rather than per window, so nothing about a roll-up boundary can
   * inflate it.
   */
  readonly arrived: number
  /** The same visits as the roll-ups counted them — once per window each was in. */
  readonly counted: number
  /** Arrivals no window of reading has been counted for yet. */
  readonly pending: number
  /** Appearances in excess of arrivals: the straddle, measured. */
  readonly drift: number
  /** How generous every raw count here is, as a fraction. `undefined` when nothing arrived. */
  readonly inflation: number | undefined
  /** Nobody's visit spanned two windows, so the shares are exact rather than estimates. */
  readonly exact: boolean
  /**
   * The denominator every other section of this card divides by: the largest
   * visit count any one row of this window reports.
   *
   * Carried so that the two figures can be named side by side instead of a
   * reader having to notice that one section's totals do not reconcile with
   * another's. It is the floor this reading exists to replace on the surface.
   */
  readonly floor: number
  /** Why no share can be given at all, and `undefined` where one can. */
  readonly silence: ReachSilence | undefined
  /** Every part of the page, in reading order. */
  readonly parts: readonly ArrivingPart[]
  /**
   * The part fewest of the arrivals got to, among the parts anybody got to at
   * all.
   *
   * Smallest share, ties going to the first in reading order — which is the
   * same part the smallest raw count names, because the denominator is the
   * page's and is the same for every row. The point is not a different answer;
   * it is the same answer in people.
   *
   * **A part nobody reached is excluded, and it is not an oversight.** Its
   * share is nought, so it would win this on every page that has one — and
   * *nobody got to the small print* is the sentence `_lib/skipped.ts` already
   * says, in a section of its own, with the run of parts below it. Two
   * sections saying one thing in two registers is how a card comes to read as
   * four ways of saying the same thing.
   *
   * `undefined` when no reached part below the top has a reading, and never the
   * page itself: the top of a page is in every visit that drew it, so it would
   * win this every time and say nothing.
   */
  readonly fewestGotTo: ArrivingPart | undefined
  /** Parts whose reach could not be reconciled with the arrivals. Empty is healthy. */
  readonly unreconciled: readonly NodeId[]
  /** Rows handed in for another page or another version, which the join dropped. */
  readonly foreign: number
  /** Rows for this version beyond the first, where every one after it was dropped. */
  readonly duplicated: number
  /** When the arrival count last moved, or `undefined` where there is no row. */
  readonly countedAt: string | undefined
}

/**
 * The reading, from the runtime's own and the names the page gives its parts.
 *
 * Handed a `PageReach` rather than a page and a window, for the reason
 * `stopping.ts` and `pacing.ts` are handed theirs: the join happens once on the
 * screen and every reading is taken off the one result. Two joins of the same
 * counters to the same page is how two sections of one card come to disagree
 * about how many visits there were — which is the exact failure this section is
 * about, so taking it off a second join would be the joke writing itself.
 */
export const arrivalsOf = (
  reach: PageReach,
  names: ReadonlyMap<string, PartName>
): PageArrivals => {
  /*
   * Named from the page the reading was joined to, so a part is called what it
   * says rather than what it is. The fallback cannot fire — every part here is
   * an element of that same page — and is written anyway, to the noun in the
   * registered type, which is what the other three readings on this card do: a
   * naming miss should cost a name and not a screen.
   */
  const named = (part: PartReach): ArrivingPart => ({
    nodeId: part.nodeId,
    name: names.get(part.nodeId) ?? { name: `the ${nounOf(part.type)}`, nodeId: part.nodeId },
    type: part.type,
    depth: part.depth,
    reached: part.reached,
    share: part.share ?? undefined,
    atMost: part.atMost ?? undefined,
    readers: part.readers ?? undefined,
    atMostReaders: part.atMostReaders ?? undefined,
    unreconciled: part.unreconciled,
  })

  const parts = reach.parts.map(named)

  return {
    treeId: reach.treeId,
    revision: reach.revision,
    arrived: reach.opened,
    counted: reach.appearances,
    pending: reach.pending,
    drift: reach.drift,
    inflation: reach.inflation ?? undefined,
    exact: reach.exact,
    floor: reach.countedViews,
    silence: reach.silence ?? undefined,
    parts,
    fewestGotTo: fewestGotTo(parts),
    unreconciled: reach.unreconciled,
    foreign: reach.foreign,
    duplicated: reach.duplicated,
    countedAt: reach.updatedAt ?? undefined,
  }
}

/**
 * The part fewest of the arrivals reached, among those a share can be given
 * for and somebody got to.
 *
 * The top of the page is excluded by depth rather than by identity, and the
 * reason is arithmetic rather than taste: every visit that drew the page had
 * its root on screen, so the root's share is at or near 1 on every healthy
 * deployment and naming it would be a sentence that is always true and never
 * useful.
 *
 * A part with no reach is excluded for the opposite reason — it would win on
 * every page that has one, and it is another section's news.
 */
const fewestGotTo = (parts: readonly ArrivingPart[]): ArrivingPart | undefined => {
  let fewest: ArrivingPart | undefined
  let lowest = Number.POSITIVE_INFINITY

  for (const part of parts) {
    if (part.depth === 0 || part.reached === 0) continue

    const { share, readers } = part

    if (share === undefined || readers === undefined) continue
    if (share >= lowest) continue

    fewest = part
    lowest = share
  }

  return fewest
}

/**
 * A count of readers as somebody would say it out loud.
 *
 * Rounded to a whole person, because a fraction of a reader is the arithmetic
 * showing through — and *about* in front of it, because this is a share applied
 * back to a count and not a census. The unrounded figure is in the record.
 */
export const aboutReaders = (readers: number): string => {
  const whole = Math.round(readers)

  return `about ${whole} ${whole === 1 ? "reader" : "readers"}`
}

/** `1 reader` and never `1 readers`, which is the first thing a reader distrusts. */
export const readersCount = (count: number): string =>
  count === 1 ? "1 reader" : `${count} readers`

/**
 * How many people were there, in one sentence.
 *
 * Four answers, and the three that are not a count are each a different fact
 * said out loud rather than an empty section — the distinction this lane has
 * drawn since `StateNotice` gained a tone for a good result. *Nobody has
 * counted the arrivals*, *nothing is marking them* and *nothing has been
 * counted yet* render identically as silence and mean entirely different
 * things, and only one of them is about the page.
 */
export const arrivalsSummary = (arrivals: PageArrivals): string => {
  switch (arrivals.silence) {
    case "unmeasured":
      return `Nothing has counted how many people arrived at ${versionMention(arrivals.revision)} of this page, so the figures on this card are measured against ${arrivals.floor} — the most visits any one part of it reported — rather than against the readers there were.`
    case "unopened":
      return "Nothing is saying when a visit to this page begins, so there is no number of readers to measure anything against. The counts are real; they just cannot be turned into a share of the people who were here."
    case "uncounted":
      return `${readersCount(arrivals.arrived)} arrived at ${versionMention(arrivals.revision)} of this page, and no window of their reading has been counted yet. The share each part got to will appear once the first window is in.`
    case undefined:
      return `${readersCount(arrivals.arrived)} arrived at ${versionMention(arrivals.revision)} of this page.`
  }
}

/**
 * The sentence this section exists for: one part of the page, in people.
 *
 * `undefined` where no part has a reading, which the summary above has already
 * accounted for in words. The part's own name is the subject, so this is a
 * `PlainLine` rather than a string — a component that spread one by hand would
 * set the words and the identifier both in monospace and undo the naming.
 */
export const gotThisFar = (arrivals: PageArrivals): PlainLine | undefined => {
  const part = arrivals.fewestGotTo

  if (part === undefined || part.readers === undefined) return undefined

  return {
    before: `Of those ${arrivals.arrived}, ${aboutReaders(part.readers)} got as far as `,
    subject: part.name,
    after: " — fewer than any other part of this page that anybody got to.",
  }
}

/**
 * How generous the raw counts are, measured rather than argued.
 *
 * `undefined` when there is nothing to warn about, which is two states and not
 * one: a deployment whose readers never span a counting window has nothing to
 * divide out and is told so by {@link countsAreExact}, and a deployment under a
 * silence has no measurement at all.
 *
 * This is the one control a deployment has over the error — the length of the
 * counting window against how long its own readers stay — and it is the first
 * time a number can be put against turning it.
 */
export const countsAreGenerous = (arrivals: PageArrivals): string | undefined => {
  if (arrivals.silence !== undefined) return undefined
  if (arrivals.inflation === undefined || arrivals.drift === 0) return undefined

  const points = Math.round(arrivals.inflation * 100)

  return `The raw visit counts on this card are about ${points}% higher than the number of people who were here, because somebody still reading when a counting window closes is counted again in the next one. Every share of your readers below divides that out; the raw counts do not.`
}

/**
 * Good news, said rather than shown as an absence.
 *
 * A deployment whose counting window is long enough that nobody's visit spans
 * two has no over-count at all, and that is the answer somebody who shortened
 * their window came here to check. It must not arrive as a blank.
 */
export const countsAreExact = (arrivals: PageArrivals): string | undefined =>
  arrivals.silence === undefined && arrivals.exact
    ? "Nobody's visit spanned two counting windows, so there is nothing to divide out: every share on this card is exact rather than an estimate."
    : undefined

/**
 * Arrivals whose reading has not been counted yet, which is why a part can have
 * a share and no number of people.
 *
 * Shown rather than absorbed. A reader who meets a share with no count beside
 * it and no reason given concludes the figure was withheld for a worse reason
 * than the real one, which is that the people it would be about have not been
 * measured.
 */
export const stillArriving = (arrivals: PageArrivals): string | undefined => {
  if (arrivals.silence !== undefined || arrivals.pending === 0) return undefined

  const who =
    arrivals.pending === 1
      ? "One reader arrived"
      : `${readersCount(arrivals.pending)} arrived`

  return `${who} whose reading has not been counted yet, so the shares here are of the people who have been counted and no number of people is put on them. Applying a rate to readers nobody has measured would be a guess with a count's precision.`
}

/**
 * More reach than there were arrivals, which is the one figure this screen must
 * never draw.
 *
 * It is not the ordinary straddle — reach above the *arrivals* is expected, and
 * it is what a ceiling of 1 means. This is counters older than the arrival
 * count, added up over windows whose appearances nobody kept, which is what the
 * first reading after an upgrade looks like. It clears itself as those windows
 * expire, and that is the sentence, because the remedy is to wait.
 */
export const cannotBeAShare = (arrivals: PageArrivals): string | undefined => {
  const stuck = arrivals.unreconciled.length

  if (stuck === 0) return undefined

  const what =
    stuck === 1
      ? "One part of this page reports more"
      : `${stuck} parts of this page report more`

  return `${what} visits than there were people to make them, so no share of your readers is given for ${stuck === 1 ? "it" : "them"} — the count is shown instead. That is counters kept from before the arrivals were being counted, and it clears itself as those older windows expire.`
}

/**
 * What a row of the list below may say about a part, in people.
 *
 * `undefined` wherever the honest figure cannot be given, which leaves the
 * caller's existing visit count in place rather than replacing a true sentence
 * with a blank. Every fallback on this card is a figure the card already drew
 * before this reading existed.
 */
export const readersAt = (part: ArrivingPart, arrivals: PageArrivals): string | undefined =>
  part.readers === undefined
    ? undefined
    : `about ${Math.round(part.readers)} of the ${readersCount(arrivals.arrived)}`
