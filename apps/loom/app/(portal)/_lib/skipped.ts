import type { LoomTree, NodeId, PrimitiveType, TreeId } from "@jam-overture/loom"
import {
  pageReadingOf,
  type PageReading,
  type PartDeclarations,
  type PartStanding,
  type ReaderTally,
} from "@jam-overture/loom/signals"

import { namesInTree, nounOf, type PartName } from "./part-name"
import type { PlainLine } from "./vocabulary"

/**
 * Which parts of a page nobody ever got to.
 *
 * ## The question `/portal/readers` could not ask
 *
 * Every sentence on that screen is arithmetic over the counters, and the
 * counters are **rows about parts something reported**. A part nobody reached
 * produces no row, so the strongest thing the screen could say was *"fewest
 * people got as far as the pricing band"* — picked from among the parts that
 * did report — and the sentence a page's author actually wants, *"nobody got to
 * the pricing band at all"*, was unsayable. Not hard to phrase: unsayable, because
 * nothing on the screen knew which parts there were.
 *
 * `pageReadingOf` (0212) is what knows. It joins a window of counters to the
 * page the window was filed against, so the parts come from the page and the
 * numbers come from the counters — and **absence becomes a measurement.** That
 * is the whole of this module's reason to exist, and it is also the reason it
 * is a read of two things rather than one: a counter alone cannot be short of
 * anything.
 *
 * ## Why it is only ever asked about the version being served
 *
 * The join is keyed by page **and** version, deliberately: laying one version's
 * counters over another version's page makes most parts read *nobody got to it*
 * while every number stays plausible. So this is built from the page in the
 * store, which is one version, and the screen says plainly when the newest
 * counted version is not that one rather than drawing a reading it cannot
 * stand behind.
 *
 * Asking it of an older version needs that version's page, and nothing can ask
 * a store for one — `Loom signals` filed that on 1 October for the lane that
 * owns the store, before any screen needed it. One does now, and
 * `skippingComparable` is the one function in this lane that returns `false`
 * because of it.
 *
 * ## What it refuses to turn into
 *
 * A heat map. The shape of this answer is **top to bottom**, because *which
 * parts were read* is a question about a page in reading order — where the
 * reading stops is the finding, and a grid keyed by identifier cannot show it.
 * Parts come back in reading order with their depth, exactly as the runtime
 * hands them over, and nothing here sorts them by how badly they did.
 */

/** One part of the page being served, and what the window said about it. */
export type SkippedPart = {
  readonly nodeId: NodeId
  readonly name: PartName
  /** The registered type, for the technical record. Never on the surface. */
  readonly type: PrimitiveType
  /** 0 at the root of the page, so a list can show the shape it was read in. */
  readonly depth: number
  readonly standing: PartStanding
  /**
   * Visits that reported this part coming onto the screen.
   *
   * `0` for a part nobody got to **and** for a part nothing was reported about,
   * which is why the standing is carried beside it rather than derived from it
   * here. A screen that read this number alone would call a quiet page a
   * skipped one.
   */
  readonly reached: number
}

/**
 * Where the reading stops, which is the finding this whole module is for.
 *
 * **A trailing run, not the first gap.** A part in the middle of a page that
 * nobody got to is a fact about that part; a run of them from some point to the
 * bottom is a fact about the page, and it is the one somebody can act on — the
 * thing above it is where the page loses people. So this is the first part of
 * the longest run of skipped parts that reaches the end of the page, and it is
 * `undefined` when the last part of the page was seen, however many gaps sit
 * above it. The gaps are still every one of them in the list.
 */
export type StopsAt = {
  readonly part: SkippedPart
  /** Parts from it to the bottom of the page, it included. Never 0. */
  readonly parts: number
}

export type PageSkipping = {
  readonly treeId: TreeId
  readonly revision: number
  /** The floor on visits the window holds, as the runtime computes it. */
  readonly views: number
  /** Every part of the page, in reading order. */
  readonly parts: readonly SkippedPart[]
  readonly counts: Readonly<Record<PartStanding, number>>
  readonly stops: StopsAt | undefined
  /**
   * Counters naming a part the page does not have.
   *
   * **The alarm, and the reason nothing else here may be believed when it is
   * non-empty.** A page and a window that do not belong together produce a
   * reading in which most parts read *nobody got to it* and every number stays
   * plausible — so the runtime reports the rows that prove the pair is wrong,
   * and this screen leads with that rather than with the reading.
   */
  readonly mismatched: readonly NodeId[]
  /** Rows filed under another page or another version, which were dropped. */
  readonly foreign: number
  /** Parts handed in more than once, where every row after the first was dropped. */
  readonly duplicated: readonly NodeId[]
}

/**
 * The reading, from the page being served and the counters filed against it.
 *
 * `tallies` may be the whole window for the page — rows for other versions are
 * dropped and counted by the join, which is what `foreign` reports — so a
 * caller does not have to filter correctly for the answer to be right.
 *
 * **A screen that wants a second reading of the same window should join once and
 * call {@link skippingFrom}.** `_lib/stopping.ts` is the second reading, and two
 * joins of one window to one page is how two sections of one card come to
 * disagree about how many visits there were.
 */
export const skippingOf = (
  tree: LoomTree,
  tallies: readonly ReaderTally[],
  declarations: PartDeclarations
): PageSkipping =>
  /*
   * Named from the page being served, so a part is called what it says rather
   * than what it is.
   */
  skippingFrom(pageReadingOf(tree, tallies, declarations), namesInTree(tree))

/**
 * The same reading, from a join somebody else already made.
 *
 * Split out of `skippingOf` on the run `stopping.ts` arrived, which needed the
 * other half of the same `PageReading`. The join is linear in the parts of the
 * page and pure, so calling it twice was not expensive — it was *divergent*: two
 * `pageReadingOf` calls are two chances for a screen to pass a different window
 * or a different registry to one of them, and a card that drew one section's
 * visit floor above another's would be wrong in the way nobody checks.
 *
 * The names are the caller's for the same reason they are a map: the screen has
 * already walked the page to name its parts for every other sentence on the
 * card, and walking it again per reading would be a quadratic read of one tree.
 */
export const skippingFrom = (
  reading: PageReading,
  names: ReadonlyMap<string, PartName>
): PageSkipping => {
  /*
   * The fallback cannot fire — every part of the reading is an element of the
   * page the reading was joined to — and it is written anyway, to the noun in
   * the registered type, which is the arm `reading-view.ts` uses for a part the
   * page has since lost. A fallback that threw, or that printed an identifier,
   * would turn a naming miss into either a failed screen or a row a reader
   * cannot read; this one costs a name and nothing else.
   */
  const parts = reading.parts.map((part): SkippedPart => ({
    nodeId: part.nodeId,
    name: names.get(part.nodeId) ?? { name: `the ${nounOf(part.type)}`, nodeId: part.nodeId },
    type: part.type,
    depth: part.depth,
    standing: part.standing,
    reached: part.counters?.reached ?? 0,
  }))

  return {
    treeId: reading.treeId,
    revision: reading.revision,
    views: reading.views,
    parts,
    counts: reading.standings,
    stops: stopsAt(parts),
    mismatched: reading.orphaned,
    foreign: reading.foreign,
    duplicated: reading.duplicated,
  }
}

/**
 * The trailing run of unseen parts, walked from the bottom up.
 *
 * From the bottom because the question is where the page stops holding people,
 * and a walk from the top would have to look ahead to every part after each gap
 * to know whether the gap it found was the one.
 */
const stopsAt = (parts: readonly SkippedPart[]): StopsAt | undefined => {
  if (parts.length === 0) return undefined
  if (parts.at(-1)?.standing !== "skipped") return undefined

  let first = parts.length - 1
  while (first > 0 && parts[first - 1]!.standing === "skipped") first -= 1

  return { part: parts[first]!, parts: parts.length - first }
}

/**
 * Whether the counters and the page in hand are about the same version.
 *
 * The one guard the screen cannot do without, and the only reason it is a
 * function rather than an `if` at the point of use: a reading built from a
 * mismatched pair is wrong in a way that looks exactly like a reading built
 * from a matched one, so the check belongs where a test can reach it.
 */
export const skippingComparable = (counted: number, live: number | undefined): boolean =>
  live !== undefined && live === counted

/** `1 part` and never `1 parts`, which is the first thing a reader distrusts. */
export const partsCount = (count: number): string =>
  count === 1 ? "1 part" : `${count} parts`

/**
 * What the window says about the page as a whole, in one sentence.
 *
 * Every count carries its denominator. *5 parts went unseen* is a different
 * piece of news on a page of six and on a page of sixty, and the share alone is
 * the number this lane has refused to print on its own since 15 September.
 */
export const skippingSummary = (skipping: PageSkipping): string => {
  const total = skipping.parts.length

  if (total === 0) return "This page has no parts to read."
  if (skipping.views === 0)
    return `No visit has reported anything about this version of the page yet, so there is nothing to say about which of its ${partsCount(total)} were read.`

  const seen = skipping.counts.read
  const missed = skipping.counts.skipped
  const quiet = skipping.counts.unknown

  const opening = `${seen} of the ${partsCount(total)} of this page came onto somebody’s screen.`

  if (missed === 0 && quiet === 0) return "Every part of this page came onto somebody’s screen."
  if (missed === 0)
    return `${opening} The other ${partsCount(quiet)} reported something, and never reported being on screen.`
  if (quiet === 0) return `${opening} Nobody got to the other ${partsCount(missed)}.`

  return `${opening} Nobody got to ${partsCount(missed)}, and ${partsCount(quiet)} reported something without reporting being on screen.`
}

/**
 * Where the page loses people, as a sentence with the part's name in the middle
 * of it.
 *
 * A `PlainLine` rather than a string because the subject is a named part — the
 * words a person reads and the identifier they quote, with only the identifier
 * in monospace — and a component that spread one by hand would set both in
 * monospace and undo the naming.
 */
export const stopReading = (stop: StopsAt): PlainLine => ({
  before: "Reading stops at ",
  subject: stop.part.name,
  after: `. Nothing from there to the bottom of the page was ever on anybody’s screen — ${partsCount(stop.parts)} in all. Whatever sits just above it is where this page loses people.`,
})

/**
 * Visits reported in and not one part reported being on screen.
 *
 * ## Why this is a state of its own and not the bottom of the list
 *
 * It is the one reading on this screen that is almost certainly **about the
 * page's wiring rather than about its readers.** The root of a page is an
 * addressed part and it is on screen in every visit that draws it, so a window
 * holding visits and no reach at all is a page whose parts are not reporting —
 * a primitive that does not spread its identity attributes, or a sender that
 * was switched on halfway through a release.
 *
 * Telling a person *nobody scrolled* in that situation would send them to
 * rewrite a page that is fine.
 *
 * ## It is not the same as the whole page being skipped, and that one cannot happen
 *
 * The first shape of this module had a flag for *every part was skipped*, and
 * it is unreachable: a part is `skipped` only when no row names it, the visit
 * floor is the largest `views` any row reports, and so a page with no rows at
 * all has no visits either. Every part skipped **and** a visit counted needs a
 * row naming a part the page does not have — which is the mismatch this screen
 * refuses to draw at all. So the reachable state is this one: rows exist, and
 * none of them reports reach.
 */
export const nothingSeen = (skipping: PageSkipping): string | undefined =>
  skipping.views === 0 || skipping.counts.read > 0
    ? undefined
    : "Visits reported in, and not one part of this page reported being on screen. That is usually a page reporting its visits and not its parts, rather than a page nobody scrolled."

/**
 * What to do about a page nothing was skipped on, said out loud.
 *
 * A section that disappears when its number is zero leaves a reader unable to
 * tell *Loom looked and found nothing* from *Loom did not look*, which is the
 * distinction this surface has been keeping since `StateNotice` gained a tone
 * for a good result.
 */
export const nothingSkipped = (skipping: PageSkipping): string | undefined =>
  skipping.views === 0 || skipping.counts.skipped > 0
    ? undefined
    : "Nothing on this page is being scrolled past. Every part of it has been in front of somebody."

/**
 * The reading is not about this page, and nothing in it may be read.
 *
 * Returned as a sentence rather than a boolean because the screen's job here is
 * to refuse to draw, and a refusal with no account of itself is the empty
 * screen this surface has spent a fortnight removing.
 */
export const mismatchedReading = (skipping: PageSkipping): string | undefined =>
  skipping.mismatched.length === 0
    ? undefined
    : `The counts for this version mention ${partsCount(skipping.mismatched.length)} this page does not have, so they are not about the page we have in hand. Nothing is shown rather than a reading that would look right and be wrong.`
