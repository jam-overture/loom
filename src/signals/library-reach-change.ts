import { everyMemberOf } from "../closed-set.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import { inFormOrder, type ComparedPopulations, type PageForm } from "./audiences.js"
import { atDoorScale, doorOf, type PageDoor } from "./door.js"
import { kindKeyOf, type KindKey } from "./library.js"
import { pairedWindowOf, partsByNodeIn, type PairedWindow } from "./library-change.js"
import type { UnscaledPage } from "./library-reach.js"
import { pageViewsFor, type StoredPageViews } from "./page-views.js"
import { spokenFor, type PageReading, type PartReading } from "./parts.js"
import type { ReachSilence } from "./reach.js"

/**
 * Of the readers who met a kind of part, the share that read it — before and
 * after.
 *
 * [`library-change.ts`](library-change.ts) compares a kind of part over the
 * places both windows bore, and is explicit about what that is: a share of
 * **places**, with no reader in the denominator, which is what lets a verdict be
 * the sign of a subtraction of two whole numbers
 * ([0266](../../decisions/0266-a-change-to-a-kind-of-part-is-read-over-the-places-both-windows-bore.md)).
 * It answers *in how many of the places this kind stands has it gained or lost
 * its reading*, which is the question an author replacing a primitive has.
 *
 * The figure everybody asks for next is the other one, and this lane filed its
 * shape the day 0266 landed rather than shipping a corrected number beside an
 * uncorrected one on the same type: *of the readers who met your testimonial
 * band, the share that read it has gone from four in ten to seven.*
 *
 * This is that figure. It is the **twentieth** thing taken out of what this
 * subsystem already knows rather than collected: **nothing is added to a
 * payload, a browser, a column, a store or the vocabulary of kinds**, and the
 * broadcaster is not touched.
 *
 * ## Two things are held still, and they are held still for different reasons
 *
 * **The places**, which is 0266's method unchanged: every figure is taken over
 * the placements that stand in both windows — the same node of the same page, of
 * the same kind on both sides — and a placement only one side bears is counted
 * in {@link KindReachChange.gained} or {@link KindReachChange.lost} and is in no
 * share. A kind whose places all moved has no comparison and says so.
 *
 * **Each side's own scale**, which is
 * [0256](../../decisions/0256-a-kinds-share-of-the-readers-who-met-it-is-a-weighted-mean-of-sound-shares-at-the-doors-scale.md)'s
 * method unchanged: a placement's share of its own page's readers is
 * `reached ÷ appearances` off that page's own row, weighted by
 * `min(appearances, opened)` — the page views a rollup folded, at the door's
 * scale. The straddle over-count (0147) is in both terms of each per-page share
 * and very nearly divides out there, which is the only place it can:
 * **the straddle rate is each page's own**, so it does not divide out across
 * pages and it does not divide out across windows either.
 *
 * So the door is needed on **both** sides, which is why this is a second unit
 * and not a field on 0266's type: one reading cannot hold a figure that needs
 * four numbers per page and one that needs none, with nothing but prose to tell
 * a surface which is which.
 *
 * ## The weights move, and that is the whole of what is hard here
 *
 * A weighted mean over the same places still moves when one page's traffic
 * grows and another's shrinks. *The testimonial band is read by seven readers in
 * ten now* can be true because readers read it more, or because the pages where
 * it is read well got busier — and the second is a fact about a deployment's
 * traffic wearing a sentence about its library. It is the counterfactual problem
 * [0251](../../decisions/0251-a-change-to-what-readers-did-is-a-ratio-of-two-shares-and-an-inside-a-change-gave-a-part-is-not-a-reader.md)
 * wrote down, one level across.
 *
 * It is answered the way a pace comparison answers which side of a division
 * moved ([0244](../../decisions/0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md)):
 * by **sufficiency** rather than by magnitude, because *which moved more* needs a
 * threshold on what counts as a move and sufficiency needs none.
 *
 * - {@link KindReachChange.ifTrafficHeld} is the later window's per-place shares
 *   at the **earlier** window's weights — the share this kind would have had if
 *   no page's traffic had moved. It isolates the readers.
 * - {@link KindReachChange.ifReadingHeld} is the earlier window's per-place
 *   shares at the **later** window's weights — the share it would have had if no
 *   reader had read differently. It isolates the mix of pages.
 *
 * Each is asked the one question that matters — *does this carry the movement's
 * own direction* — and {@link ReaderShareCause} says whether the readers alone
 * were enough, the pages alone were, either was, or only the two together.
 *
 * **The additive split is deliberately not published**, and the reason is
 * arithmetic rather than taste. `shift` is exactly
 * `(ifTrafficHeld − shareWas) + (shareNow − ifTrafficHeld)` and exactly
 * `(ifReadingHeld − shareWas) + (shareNow − ifReadingHeld)`, and the two
 * decompositions differ by the interaction term `Σ (bₚ − aₚ)(sₚⁿᵒʷ − sₚʷᵃˢ)` —
 * weight moving toward the places whose reading moved. Publishing one pair of
 * terms would put a number on *how much of this was traffic* that another
 * equally valid ordering contradicts. The two counterfactuals are published
 * instead, the cause is a sufficiency verdict over them, and
 * {@link KindReachChange.weightMoved} says how far the weights moved at all.
 *
 * ## What it refuses to publish
 *
 * **A ceiling.** A kind's share of the readers who met it is published with
 * `atMost` beside it, which is the same numerator taken of the exact openings
 * (0229, 0256). Two ceilings do not bound a difference — subtracting them gives
 * a number that is not a bound on anything — and a surface handed two of them
 * would print `atMostNow − atMostWas` as a movement nobody measured. So neither
 * is here, and the evidence behind the two estimates travels instead as each
 * side's {@link KindReachChange.pendingWas} and
 * {@link KindReachChange.driftWas}.
 *
 * **A headcount.** `met` is a count of page views at the door's scale and is
 * deliberately not rounded into people (0256), so neither is
 * {@link KindReachChange.readersMoved}: it is the movement stated at the later
 * window's scale, which is the number a surface ranks by and never a number of
 * humans.
 *
 * **A share over a subset.** A kind standing on one page the door cannot scale,
 * on either side, has no share at all — not a share over the pages that could be
 * scaled, which is 0256's refusal for the reason 0256 gives: *of the places we
 * could price* is not a sentence a surface prints, it prints the number. The
 * pages that caused it are published once for the reading with the side they are
 * on and **their own** vocabulary's reason on them.
 *
 * **Anything added across kinds.** No reading-wide share and no reading-wide
 * movement, for the reason a census has none (0257): a figure over every kind at
 * once counts a page once per element node, so it measures how finely the pages
 * were written as much as how they are read.
 *
 * ## What it inherits without restating
 *
 * The two keys answer differently about one change and both are published, which
 * is 0266's point: a node whose **type** changed is a place one kind left and
 * another took, while the role rows hold it still wherever the two types play
 * the same part. A tree held at two revisions in one window is excluded and
 * named, because a comparison pairs by page. The same reading handed in twice is
 * the ordinary double count and is dropped (0158). And the role rows are thin
 * today for the reason every role figure in this subsystem is thin — nothing in
 * `src/primitives/` declares one (0114) — so the join being at read time (0212)
 * is what makes them start answering with no migration.
 *
 * Pure. It reaches no store, no clock and no DOM, it is linear in the parts of
 * the readings times the rows handed in, and nothing in it survives into a
 * browser bundle.
 */

/** One window of a library: the pages read, and the door rows to put them on one scale. */
export type LibraryWindow = {
  readonly readings: readonly PageReading[]
  /**
   * The whole window of page-view rows a deployment holds.
   *
   * Each page's own row is picked out of them by the published matching rule
   * (`pageViewsFor`) rather than by a hand-written copy of it, because the
   * pairing is the part of every join here that fails quietly when it is got
   * wrong.
   */
  readonly rows: readonly StoredPageViews[]
}

/** Which of the two windows a fact is about. */
export type ReadingSide = "was" | "now"

export const READING_SIDES: readonly ReadingSide[] = everyMemberOf<ReadingSide>()(["was", "now"])

/** One line per side, for a surface naming the window a page's reason came from. */
export const describeReadingSide = (side: ReadingSide): string =>
  side === "was" ? "the earlier window" : "the later window"

/**
 * A page bearing a comparable placement that the door could not scale, with the
 * side it is on and the reason in the vocabulary a page's own reading
 * publishes.
 *
 * The side is the field 0256's version could not have: one page can be scalable
 * in one window and not in the other, and *which window* is the whole of the
 * remedy — a missing row in the earlier window is retention, and a missing row
 * in the later one is a collection that has stopped.
 */
export type UnscaledSide = UnscaledPage & {
  readonly side: ReadingSide
  /** The revision read on the other side, which is the page this one is paired with. */
  readonly against: number
}

/** Why a kind of part has no before and after among the readers who met it. */
export type KindReachChangeSilence =
  /**
   * Nothing in the pages read, on either side, is of this kind.
   *
   * Only ever a role row, and the census's own reason (0257): *nothing in this
   * library is a heading* is a fact about the library rather than a missing row.
   */
  | "unplaced"
  /**
   * It stands in both windows and in no place that is in both.
   *
   * Every placement was gained or lost, so there is nothing held still to
   * compare — which is an answer about the **library** rather than about its
   * readers, and the places comparison's own reason (0266).
   */
  | "unpaired"
  /**
   * No place of it that stands in both windows can be spoken for in both.
   *
   * Every paired placement is `unknown` in one window or the other, and a
   * standing of `unknown` is *nothing can be said* and never *nobody read it*
   * (0212).
   */
  | "unread"
  /**
   * A page bearing a comparable place of it has no page-view row at the door, on
   * one of the two sides.
   *
   * The page's own reading stands whole; what is missing is the one number that
   * makes two pages' shares comparable. {@link LibraryReachChange.unscaled}
   * says which page and which side.
   */
  | "unscaled"
  /**
   * A page bearing a comparable place of it has a row and nothing in it says a
   * page view began.
   *
   * Kept apart from `unscaled` because the remedy is the opposite: a missing row
   * is retention or an upgrade, and this is **senders that are not marking their
   * openings**.
   */
  | "unopened"
  /**
   * A page bearing a comparable place of it has openings and no rollup has
   * folded a window of them yet.
   *
   * The one reason here that resolves itself, and on a comparison it is the
   * commonest honest state of the later window: a window whose readers have
   * arrived and whose reading has not been counted.
   */
  | "uncounted"

export const KIND_REACH_CHANGE_SILENCES: readonly KindReachChangeSilence[] =
  everyMemberOf<KindReachChangeSilence>()([
    "unplaced",
    "unpaired",
    "unread",
    "unscaled",
    "unopened",
    "uncounted",
  ])

/** One line per silence, for a surface saying why a kind has no before and after. */
export const describeKindReachChangeSilence = (silence: KindReachChangeSilence): string => {
  switch (silence) {
    case "unplaced":
      return "nothing in the pages read, in either window, is of this kind"
    case "unpaired":
      return "no place this kind of part stands is in both windows"
    case "unread":
      return "no place it stands in both windows can be spoken for in both"
    case "unscaled":
      return "a page it stands on has no page views counted at the door in one of the two windows"
    case "unopened":
      return "a page it stands on has a row and nothing has said a page view began"
    case "uncounted":
      return "a page it stands on has readers in one window whose reading has not been counted yet"
  }
}

/**
 * What happened to the share of the readers who met a kind of part.
 *
 * The same five names 0266 publishes over the places a kind stands, because
 * they are the same five states at a different unit — and the unit is the
 * difference worth knowing: these are readers and those are places, so a kind
 * can be `taken-up` here and `held` there, which is a kind read better by the
 * readers it already had.
 */
export type KindReachMovement =
  /** A larger share of the readers who met it read it now. */
  | "taken-up"
  /** A smaller share does. */
  | "abandoned"
  /**
   * Exactly the same share does.
   *
   * Two weighted means that are the same number, which is the state a window
   * compared against itself is in. A movement smaller than the last bit of a
   * float is reported as a movement rather than as this, and no threshold is
   * invented to prevent it: {@link KindReachChange.shift} is the number, and the
   * comparison with no division in it is the count of places (0266).
   */
  | "held"
  /**
   * No reader reached any comparable place of it in either window.
   *
   * Kept apart from `held` for the reason the comparison of places and the
   * comparison of what readers did keep their own version of it apart
   * (0266, 0251): *met everywhere and read nowhere, and still read nowhere* is
   * the one state here that is an instruction.
   */
  | "still-unread"
  /** {@link KindReachChange.silence} says why nothing can be said. */
  | "unknown"

export const KIND_REACH_MOVEMENTS: readonly KindReachMovement[] =
  everyMemberOf<KindReachMovement>()([
    "taken-up",
    "abandoned",
    "held",
    "still-unread",
    "unknown",
  ])

/** One line per movement, for a surface putting a kind's before and after in front of a person. */
export const describeKindReachMovement = (movement: KindReachMovement): string => {
  switch (movement) {
    case "taken-up":
      return "a larger share of the readers who met it read it now"
    case "abandoned":
      return "a smaller share of the readers who met it read it now"
    case "held":
      return "the same share of the readers who met it reads it now"
    case "still-unread":
      return "no reader reached any place it stands, in either window"
    case "unknown":
      return "nothing can be said about what changed"
  }
}

/**
 * Which side of the weighted mean the movement came from.
 *
 * Answered by sufficiency rather than by magnitude: *would this movement have
 * arrived anyway, if only one of the two had moved*. `null` on a kind whose
 * share did not move, because there is nothing to attribute.
 */
export type ReaderShareCause =
  /**
   * The readers alone were enough: the later window's per-place shares at the
   * earlier window's traffic would have moved it the same way.
   */
  | "readers"
  /**
   * The pages alone were enough: the earlier window's per-place shares at the
   * later window's traffic would have moved it the same way.
   *
   * The attribution worth leading with, and the one a single weighted figure
   * hides. *This kind is read better because the pages it is read well on got
   * busier, and not because anybody read it differently.*
   */
  | "pages"
  /** Either alone would have been enough, so the movement is over-determined. */
  | "either"
  /**
   * Neither alone would have been enough and the two together were.
   *
   * The interaction: traffic moved toward the places whose reading moved. It is
   * reachable rather than theoretical — two pages swapping their traffic, where
   * the busy one is the one now read — and it is why no additive split is
   * published.
   */
  | "together"

export const READER_SHARE_CAUSES: readonly ReaderShareCause[] =
  everyMemberOf<ReaderShareCause>()(["readers", "pages", "either", "together"])

/** One line per cause, for a surface saying what moved a share of readers. */
export const describeReaderShareCause = (cause: ReaderShareCause): string => {
  switch (cause) {
    case "readers":
      return "the way readers read it would have moved it on its own"
    case "pages":
      return "the traffic the pages it stands on had would have moved it on its own"
    case "either":
      return "either would have moved it on its own"
    case "together":
      return "neither would have moved it alone and the two together did"
  }
}

/**
 * One kind of part, held against itself across two windows, among the readers
 * who met it.
 *
 * The same shape for a type row and a role row, because they are one comparison
 * asked of two keys. The place counts are 0266's and are repeated here rather
 * than fetched, so that a surface drawing this row never holds two lists side by
 * side to find out how much is behind a share.
 */
export type KindReachChange = {
  readonly kind: KindKey
  /**
   * What part a type plays (0114), or `null`. Always `null` on a role row, which
   * carries it as its key.
   *
   * The later window's answer where it stands there, so that a surface reading a
   * row and the role beside it is reading today's library.
   */
  readonly role: PrimitiveRole | null
  /** Places of this kind that stand in both windows: the same node of the same page, of this kind on both sides. */
  readonly places: number
  /** Places of it in the later window with no counterpart in the earlier one. */
  readonly gained: number
  /** Places of it in the earlier window with no counterpart in the later one. */
  readonly lost: number
  /**
   * Of {@link places}, those with a verdict on **both** sides, which is the set
   * every figure below is taken over.
   *
   * One number and not two, which is what makes the two shares comparable: a
   * place nothing can be said about in either window is in neither term, so the
   * two sides are read over exactly the same set of places.
   */
  readonly comparable: number
  /**
   * Pages bearing a comparable place of it, which is **forms** and not
   * revisions.
   *
   * A page served in two forms (0263) is two of them, for the reason the
   * pairing counts it as two: the two have separate counters, separate doors
   * and separate readers, and a kind standing in both stands in both.
   */
  readonly pages: number
  /**
   * Page views that met a page bearing a comparable place of it in the earlier
   * window, at the door's scale, counted once per place it stands there.
   *
   * The denominator of {@link shareWas} and the weight behind it.
   */
  readonly countedWas: number | null
  /** The same for the later window. */
  readonly countedNow: number | null
  /**
   * Page views that reached a comparable place of it in the earlier window, at
   * the door's scale: `reached × counted ÷ appearances`, added over the places.
   *
   * **Not a count of people and deliberately not rounded into one** (0256).
   */
  readonly metWas: number | null
  /** The same for the later window. */
  readonly metNow: number | null
  /**
   * `metWas ÷ countedWas` — the share of the readers who met it that read it, in
   * the earlier window.
   *
   * A weighted mean of each page's own sound share with that page's folded
   * arrivals behind it. `null` where {@link silence} says why not.
   */
  readonly shareWas: number | null
  /** The same share in the later window, over the same places. */
  readonly shareNow: number | null
  /** `shareNow − shareWas`, and `null` with the two shares. */
  readonly shift: number | null
  /**
   * The movement stated at the later window's scale: `shift × countedNow`.
   *
   * What the movement is worth in page views — the number this reading ranks by,
   * for the reason a page's falls are ranked by the readers they lose (0221).
   * Page views at the door's scale and never people, exactly as {@link metNow}
   * is.
   */
  readonly readersMoved: number | null
  /**
   * The later window's per-place shares at the earlier window's weights: the
   * share there would have been if no page's traffic had moved.
   *
   * Isolates the readers. See the module documentation.
   */
  readonly ifTrafficHeld: number | null
  /**
   * The earlier window's per-place shares at the later window's weights: the
   * share there would have been if no reader had read differently.
   *
   * Isolates the mix of pages.
   */
  readonly ifReadingHeld: number | null
  readonly movement: KindReachMovement
  /** Which side was sufficient, or `null` where the share did not move. */
  readonly cause: ReaderShareCause | null
  /**
   * How far the weights moved: half the sum of the absolute movements in each
   * comparable place's share of its side's total weight, in `[0, 1]`.
   *
   * The share of the weight that would have to be somewhere else for the two
   * sides to be weighted alike — the arithmetic a comparison of two readerships
   * uses (0247), over places rather than regions. 0 is a comparison weighted
   * identically on both sides, and 1 is two sides with no weight in common.
   *
   * **Published and never judged.** A weighted mean whose weights barely moved
   * is a comparison of readers; one whose weights moved a long way may still be
   * a comparison of readers, and {@link cause} is what says so without a
   * threshold.
   */
  readonly weightMoved: number | null
  /** Appearances in excess of openings in the earlier window, over the comparable places: the straddle that divided out of each page's share. */
  readonly driftWas: number
  /** The same for the later window. */
  readonly driftNow: number
  /** Openings in the earlier window, over the comparable places, whose reading no rollup has folded. */
  readonly pendingWas: number
  /** The same for the later window. */
  readonly pendingNow: number
  /**
   * Comparable places reporting more reach than their page had appearances, on
   * either side, which no rollup produces.
   *
   * Node counters older than the page-view column, or a caller that
   * concatenated two reads. It is the one thing that can put a share above 1,
   * and a surface should show the places comparison (0266) instead where it is
   * non-nought.
   */
  readonly unreconciled: number
  /**
   * Nobody's visit spanned a window on either side, nothing is waiting to be
   * folded, and nothing is unreconciled — so both shares are exact.
   *
   * False under a silence. It says nothing about the weights: a comparison can
   * be exact on both sides and still be weighted differently, which is what
   * {@link weightMoved} is for.
   */
  readonly exact: boolean
  /**
   * Why the figures are not there, and `null` where they are.
   *
   * About the comparison and not about the row: {@link places}, {@link gained}
   * and {@link lost} are counts of parts of trees and are true whatever any
   * window measured, which is how a census publishes a standing beside a
   * withheld share (0212).
   */
  readonly silence: KindReachChangeSilence | null
}

/** What a change did to a deployment's library among the readers who met it, by kind of part. */
export type LibraryReachChange = {
  /**
   * Every type that stands in either window, most readers lost first.
   *
   * Then the lower share in the later window, then by type, so two kinds that
   * lost the same do not reorder on a refresh.
   */
  readonly byType: readonly KindReachChange[]
  /**
   * Every role in the vocabulary, then the row for parts whose type declared
   * none, in the same order as {@link byType}.
   */
  readonly byRole: readonly KindReachChange[]
  /** Forms read in both windows: a page in one of its forms, never a revision. */
  readonly pages: number
  /** Forms read in the later window only, which is not pages published. */
  readonly pagesGained: number
  /** Of {@link pagesGained}, forms whose page the earlier window already held. */
  readonly formsGained: number
  /** Forms read in the earlier window only, which is not pages withdrawn. */
  readonly pagesLost: number
  /** Of {@link pagesLost}, forms whose page the later window still holds. */
  readonly formsLost: number
  /** The audiences each window's forms named, published and never refused. */
  readonly audiences: ComparedPopulations
  /**
   * Paired pages whose revision moved between the windows.
   *
   * The comparison still stands — a placement is paired by node — but it says
   * the pages changed as well as the window, which is the difference between
   * *your readers behave differently* and *you changed your pages*.
   */
  readonly republished: number
  /** Places that stand in both windows, which is the sum of every type row's {@link KindReachChange.places}. */
  readonly placements: number
  /** Places in the later window only. */
  readonly gained: number
  /** Places in the earlier window only. */
  readonly lost: number
  /** Paired nodes whose primitive type changed: a place one kind left and another took (0266). */
  readonly recast: number
  /**
   * Page views counted at the door across the paired pages in the earlier
   * window, added **once per page**.
   *
   * Addable for the reason no other count here is: a page view began on one
   * revision of one tree and was counted once (0219). It is the weight behind
   * the whole comparison — *this moved among six hundred readers rather than
   * six* — and is the denominator of nothing.
   */
  readonly arrivalsWas: number
  /** The same for the later window. */
  readonly arrivalsNow: number
  /** Paired pages the door could scale in **both** windows, which is where every share here comes from. */
  readonly scaled: number
  /**
   * The paired pages bearing a comparable placement that the door could not
   * scale, by tree, newest revision first, with the side they are on.
   *
   * The actionable half of every door silence on a row above: one of these pages
   * is why. Empty is the healthy state.
   */
  readonly unscaled: readonly UnscaledSide[]
  /**
   * The type that lost the most readers, which is the kind to look at first.
   *
   * By {@link KindReachChange.readersMoved} and not by the share, which is this
   * subsystem's ranking rule everywhere (0221, 0257): a kind abandoned by two
   * readers out of three is a worse rate and a smaller problem than one
   * abandoned by four hundred out of a thousand. A type and never a role,
   * because a type is the thing an author can replace.
   */
  readonly mostAbandoned: KindReachChange | null
  /** The type that gained the most readers, by the same rule. */
  readonly mostTakenUp: KindReachChange | null
  /**
   * Forms read at two revisions in one window, which are in nothing above.
   *
   * A page that is two live revisions in one window has no single counterpart in
   * the other, and the comparison pairs by page in its form (0266): excluded and
   * named rather than picked between. A form and not a tree, because two forms
   * of a page (0263) are two paired pages and one of them being ambiguous says
   * nothing about the other.
   */
  readonly ambiguous: readonly PageForm[]
  /** Readings of a revision beyond the first, on either side, which were dropped (0158). */
  readonly duplicated: number
  /**
   * Door rows for one revision beyond the first, across the pages of both
   * windows, which were ignored.
   *
   * A store keeps one row per revision, so this is a caller's two reads — and
   * adding them would double a page's arrivals and halve every share taken
   * against it. Counted over every page read rather than only the paired ones,
   * because it is an alarm about the caller and not a term in any figure.
   */
  readonly duplicatedRows: number
  /** Types the two windows disagree about the role of, where the later window's answer stands (0114). */
  readonly roleDisagreed: readonly PrimitiveType[]
}

/**
 * One kind's row before it is a row.
 *
 * A mutable accumulator and not a fold, for the reason the census's is: a
 * library of forty pages is tens of thousands of placements and a fold would
 * copy a row per one. Nothing escapes this module.
 */
type Tallying = {
  readonly kind: KindKey
  role: PrimitiveRole | null
  places: number
  gained: number
  lost: number
  comparable: number
  readonly pages: Set<string>
  countedWas: number
  countedNow: number
  metWas: number
  metNow: number
  /** `Σ sₚⁿᵒʷ × wₚʷᵃˢ`: the numerator of the share with the traffic held still. */
  heldTraffic: number
  /** `Σ sₚʷᵃˢ × wₚⁿᵒʷ`: the numerator of the share with the reading held still. */
  heldReading: number
  /** Each comparable place's two weights, which `weightMoved` needs after the totals are known. */
  readonly weights: { was: number; now: number }[]
  driftWas: number
  driftNow: number
  pendingWas: number
  pendingNow: number
  unreconciled: number
  /** The first door reason either side gave about a page bearing a comparable place. */
  blocked: ReachSilence | null
}

const tallying = (kind: KindKey): Tallying => ({
  kind,
  role: null,
  places: 0,
  gained: 0,
  lost: 0,
  comparable: 0,
  pages: new Set(),
  countedWas: 0,
  countedNow: 0,
  metWas: 0,
  metNow: 0,
  heldTraffic: 0,
  heldReading: 0,
  weights: [],
  driftWas: 0,
  driftNow: 0,
  pendingWas: 0,
  pendingNow: 0,
  unreconciled: 0,
  blocked: null,
})

/** The two keys one placement is counted under, which is the pair of questions this answers. */
const keysOf = (part: PartReading): readonly KindKey[] => [
  { by: "type", type: part.type },
  { by: "role", role: part.role },
]

const rowFor = (rows: Map<string, Tallying>, kind: KindKey): Tallying => {
  const key = kindKeyOf(kind)
  const row = rows.get(key) ?? tallying(kind)

  rows.set(key, row)

  return row
}

/** The kind-level reason a page's reason causes, which is the same state at the other subject. */
const KIND_REACH_CHANGE_OF_REACH: Readonly<Record<ReachSilence, KindReachChangeSilence>> =
  Object.freeze({
    unmeasured: "unscaled",
    unopened: "unopened",
    uncounted: "uncounted",
  })

/**
 * The silence, with the reasons tried in the order they have to be tried in.
 *
 * Nothing of the kind first, because *there is no such part in this library* is
 * a better answer than anything said about its places. Then nothing held still,
 * because a kind whose places all moved is a fact about the library and would
 * otherwise be reported as nobody having been seen reading it. Then nothing
 * spoken for, because a kind no window can speak for has no share whether or not
 * its pages could be scaled.
 */
const silenceOf = (of: Tallying): KindReachChangeSilence | null => {
  if (of.places + of.gained + of.lost === 0) return "unplaced"
  if (of.places === 0) return "unpaired"
  if (of.comparable === 0) return "unread"

  return of.blocked === null ? null : KIND_REACH_CHANGE_OF_REACH[of.blocked]
}

/**
 * The verdict, off the two shares and never off the two counts.
 *
 * The opposite of 0266's rule, and for the opposite reason: there the
 * denominator is the same count of places on both sides, so the sign of a
 * subtraction of two whole numbers is the whole answer. Here the two
 * denominators are two windows' traffic, so the shares are the only comparable
 * pair and the subtraction has to be done on them.
 */
const movementOf = (
  of: Tallying,
  silence: KindReachChangeSilence | null,
  shareWas: number,
  shareNow: number
): KindReachMovement => {
  if (silence !== null) return "unknown"
  if (of.metWas === 0 && of.metNow === 0) return "still-unread"
  if (shareNow > shareWas) return "taken-up"
  if (shareNow < shareWas) return "abandoned"

  return "held"
}

/**
 * Which side was sufficient, by the direction each counterfactual carries.
 *
 * `null` where nothing moved: a verdict that did not move has nothing to
 * attribute, which is `PaceCause`'s rule (0244).
 */
export const readerShareCauseOf = (
  shareWas: number,
  shareNow: number,
  ifTrafficHeld: number,
  ifReadingHeld: number
): ReaderShareCause | null => {
  const direction = Math.sign(shareNow - shareWas)

  if (direction === 0) return null

  const readers = Math.sign(ifTrafficHeld - shareWas) === direction
  const pages = Math.sign(ifReadingHeld - shareWas) === direction

  if (readers && pages) return "either"
  if (readers) return "readers"
  if (pages) return "pages"

  return "together"
}

/**
 * Half the sum of the absolute movements in each place's share of its side's
 * weight, which is the figure a comparison of two readerships publishes
 * (0247), over places rather than regions.
 *
 * **`null` where either side has no weight at all**, because there is no
 * distance between a mix and nothing to have one
 * ([0307](../../decisions/0307-a-distance-between-a-mix-and-nothing-is-withheld-and-the-invariant-both-rolls-rest-on-is-asserted.md)).
 * A nought here is the one value a surface reads as *the weights did not move*,
 * which is the opposite sentence; 0247's own reading withholds `moved` in the
 * same state for the same reason.
 *
 * **Neither roll can reach it**, and that is asserted rather than described:
 * both compute this only where their silence is `null`, and a door that can
 * scale a page has counted at least one page view at it ([`door.ts`](door.ts)),
 * so a measured row has a weight behind it. The guard is here because the
 * helper is exported and a caller outside the two rolls would otherwise divide
 * by nought.
 */
export const weightMovedOver = (
  weights: readonly { readonly was: number; readonly now: number }[],
  totals: { readonly was: number; readonly now: number }
): number | null => {
  if (totals.was === 0 || totals.now === 0) return null

  return (
    weights.reduce(
      (sum, weight) => sum + Math.abs(weight.now / totals.now - weight.was / totals.was),
      0
    ) / 2
  )
}

const rowOf = (of: Tallying): KindReachChange => {
  const silence = silenceOf(of)
  const measured = silence === null
  const shareWas = of.metWas / of.countedWas
  const shareNow = of.metNow / of.countedNow
  const ifTrafficHeld = of.heldTraffic / of.countedWas
  const ifReadingHeld = of.heldReading / of.countedNow

  return {
    kind: of.kind,
    role: of.kind.by === "type" ? of.role : null,
    places: of.places,
    gained: of.gained,
    lost: of.lost,
    comparable: of.comparable,
    pages: of.pages.size,
    countedWas: measured ? of.countedWas : null,
    countedNow: measured ? of.countedNow : null,
    metWas: measured ? of.metWas : null,
    metNow: measured ? of.metNow : null,
    shareWas: measured ? shareWas : null,
    shareNow: measured ? shareNow : null,
    shift: measured ? shareNow - shareWas : null,
    readersMoved: measured ? (shareNow - shareWas) * of.countedNow : null,
    ifTrafficHeld: measured ? ifTrafficHeld : null,
    ifReadingHeld: measured ? ifReadingHeld : null,
    movement: movementOf(of, silence, shareWas, shareNow),
    cause: measured ? readerShareCauseOf(shareWas, shareNow, ifTrafficHeld, ifReadingHeld) : null,
    weightMoved: measured
      ? weightMovedOver(of.weights, { was: of.countedWas, now: of.countedNow })
      : null,
    driftWas: of.driftWas,
    driftNow: of.driftNow,
    pendingWas: of.pendingWas,
    pendingNow: of.pendingNow,
    unreconciled: of.unreconciled,
    exact:
      measured &&
      of.driftWas === 0 &&
      of.driftNow === 0 &&
      of.pendingWas === 0 &&
      of.pendingNow === 0 &&
      of.unreconciled === 0,
    silence,
  }
}

/** The name a row is ordered by, which is the key's own and never the row's position. */
const nameOf = (kind: KindKey): string => (kind.by === "type" ? kind.type : (kind.role ?? ""))

/**
 * The worse of two, which is the ranking rule spelled once.
 *
 * Most readers lost, then the lower share now, then by name. A kind with no
 * figures at all sorts after every kind that has them — infinity rather than a
 * nought, because `null` is *nothing can be said* and a nought would rank a
 * withheld row among the kinds that merely held.
 */
const worseOf = (one: KindReachChange, other: KindReachChange): number =>
  (one.readersMoved ?? Number.POSITIVE_INFINITY) -
    (other.readersMoved ?? Number.POSITIVE_INFINITY) ||
  (one.shareNow ?? 2) - (other.shareNow ?? 2) ||
  nameOf(one.kind).localeCompare(nameOf(other.kind))

/** Tree id, then newest revision first, which is the order the page-view rows are read in. */
const bySide = (one: UnscaledSide, other: UnscaledSide): number =>
  one.treeId.localeCompare(other.treeId) ||
  other.revision - one.revision ||
  one.side.localeCompare(other.side)

/**
 * One side's pages, each with the door that scales it, worked out once per
 * page.
 *
 * Published rather than private because a second reading needs the same window
 * — the words the typical reader of a kind of part reached, which is weighted
 * by the same doors on the same pairing (0280). Two spellings of one rule that
 * agree today are what moved the door's own scale into its own module, so the
 * window is written once here, in the module whose record owns it.
 */
export type ScaledPage = {
  readonly reading: PageReading
  readonly door: PageDoor
  readonly duplicatedRows: number
}

/** One page with its door, picked out of the window's rows by the published matching rule. */
export const scaledPageOf = (reading: PageReading, rows: readonly StoredPageViews[]): ScaledPage => {
  const found = pageViewsFor(reading, rows)

  return { reading, door: doorOf(found.measured), duplicatedRows: found.duplicated }
}

/**
 * One placement's contribution to one kind, which is nothing at all unless both
 * windows can speak for it.
 *
 * The door's reason is taken only from a page bearing a placement both sides
 * have a verdict on: a kind nobody read in either window is `unread` and not
 * `unscaled`, because *no window can speak for it* is the better answer and the
 * door has nothing to scale either way.
 */
const add = (
  into: Tallying,
  places: { readonly was: PartReading; readonly now: PartReading },
  doors: { readonly was: PageDoor; readonly now: PageDoor },
  form: string
): void => {
  into.places += 1

  if (places.was.standing === "unknown" || places.now.standing === "unknown") return

  into.comparable += 1
  /**
   * The form and not the tree, because the pairing is per form: counting two
   * forms of a page as one page would understate the places a kind stands in
   * by exactly the pages a deployment serves twice.
   */
  into.pages.add(form)

  if (doors.was.silence !== null || doors.now.silence !== null) {
    into.blocked ??= doors.was.silence ?? doors.now.silence

    return
  }

  const reachedWas = places.was.counters?.reached ?? 0
  const reachedNow = places.now.counters?.reached ?? 0

  into.countedWas += doors.was.counted
  into.countedNow += doors.now.counted
  /**
   * `reached × counted ÷ appearances`, in that order, because it is the
   * published order (0256): a surface drawing one window's share beside this
   * one's `shareNow` is drawing the same number, and three floats multiplied
   * and divided in two orders agree to fifteen places and not to sixteen.
   */
  into.metWas += atDoorScale(reachedWas, doors.was)
  into.metNow += atDoorScale(reachedNow, doors.now)
  /** The same term with the other side's weight, which is the whole of a counterfactual. */
  into.heldTraffic += atDoorScale(reachedNow, doors.now, doors.was)
  into.heldReading += atDoorScale(reachedWas, doors.was, doors.now)
  into.weights.push({ was: doors.was.counted, now: doors.now.counted })
  into.driftWas += doors.was.drift
  into.driftNow += doors.now.drift
  into.pendingWas += doors.was.pending
  into.pendingNow += doors.now.pending
  into.unreconciled +=
    reachedWas > doors.was.appearances || reachedNow > doors.now.appearances ? 1 : 0
}

/** One whole side: its pages keyed by form, each page's door, and the rows a caller handed in twice. */
export type LibrarySide = {
  readonly pages: PairedWindow
  /**
   * Each paired page's door, under the same key the pairing uses.
   *
   * Keyed by the form rather than by the tree because the door is per form too:
   * `pageViewsFor` scopes a page-view row to the reading's own audience (0290),
   * so two forms of one page have two doors and a map keyed by the tree would
   * hold one of them and scale both sides of the other against it.
   */
  readonly scaled: ReadonlyMap<string, ScaledPage>
  readonly duplicatedRows: number
}

/** The pages of one window, keyed by form, with each page's door already worked out. */
export const librarySideOf = (window: LibraryWindow): LibrarySide => {
  const pages = pairedWindowOf(window.readings)
  const scaled = new Map(
    [...pages.byForm].map(([form, reading]): [string, ScaledPage] => [
      form,
      scaledPageOf(reading, window.rows),
    ])
  )

  return {
    pages,
    scaled,
    duplicatedRows: [...scaled.values()].reduce((sum, of) => sum + of.duplicatedRows, 0),
  }
}

/**
 * Of the readers who met a kind of part, the share that read it — before and
 * after.
 *
 * Takes each window as its readings and the whole window of door rows a
 * deployment holds for it, because the figure needs the door on both sides: the
 * pages are paired by 0266's rule and each side's terms are put on its own
 * door's scale by 0256's.
 *
 * The labels are the caller's. Two readings of one window and one library come
 * back as every place held, every share identical and nothing gained or lost; a
 * caller who holds the two sides backwards gets a comparison with every movement
 * reversed rather than a refusal, exactly as a before-and-after reading of one
 * page does.
 *
 * Linear in the parts of the readings times the rows, with one pass per window
 * that fills both groupings.
 */
export const libraryReachChangeOf = (
  was: LibraryWindow,
  now: LibraryWindow
): LibraryReachChange => {
  const earlier = librarySideOf(was)
  const later = librarySideOf(now)
  const rows = new Map<string, Tallying>()
  const roleWas = new Map<PrimitiveType, PrimitiveRole | null>()
  const roleNow = new Map<PrimitiveType, PrimitiveRole | null>()
  const ambiguous = new Map([...earlier.pages.ambiguous, ...later.pages.ambiguous])
  const unscaled: UnscaledSide[] = []
  let pages = 0
  let pagesGained = 0
  let pagesLost = 0
  let formsGained = 0
  let formsLost = 0
  let republished = 0
  let placements = 0
  let gained = 0
  let lost = 0
  let recast = 0
  let arrivalsWas = 0
  let arrivalsNow = 0
  let scaled = 0

  /**
   * Every role in the vocabulary gets a row whether or not anything plays it, as
   * a census's role rows do: a role nothing in the library plays is a fact about
   * the library, and a surface that had to tell a missing row from an empty one
   * would be reading the vocabulary itself.
   */
  for (const role of [...PRIMITIVE_ROLES, null]) rowFor(rows, { by: "role", role })

  for (const [form, reading] of earlier.pages.byForm) {
    if (ambiguous.has(form)) continue

    for (const part of reading.parts) {
      roleWas.set(part.type, part.role)
      rowFor(rows, { by: "type", type: part.type }).role = part.role
    }

    if (later.pages.byForm.has(form)) continue

    pagesLost += 1
    /** The page is still served, in the other form: a form left the library and the page did not (0295). */
    if (later.pages.pagesHeld.has(reading.treeId)) formsLost += 1

    for (const part of reading.parts) {
      lost += 1

      for (const kind of keysOf(part)) rowFor(rows, kind).lost += 1
    }
  }

  for (const [form, reading] of later.pages.byForm) {
    if (ambiguous.has(form)) continue

    for (const part of reading.parts) {
      roleNow.set(part.type, part.role)
      rowFor(rows, { by: "type", type: part.type }).role = part.role
    }

    if (earlier.pages.byForm.has(form)) continue

    pagesGained += 1
    /** The page was already served, in the other form: a second form began rather than a page being published. */
    if (earlier.pages.pagesHeld.has(reading.treeId)) formsGained += 1

    for (const part of reading.parts) {
      gained += 1

      for (const kind of keysOf(part)) rowFor(rows, kind).gained += 1
    }
  }

  for (const [form, before] of earlier.pages.byForm) {
    const after = later.pages.byForm.get(form)
    const doorWas = earlier.scaled.get(form)
    const doorNow = later.scaled.get(form)

    if (after === undefined || doorWas === undefined || doorNow === undefined) continue
    if (ambiguous.has(form)) continue

    const beforeParts = partsByNodeIn(before)
    const afterParts = partsByNodeIn(after)
    const doors = { was: doorWas.door, now: doorNow.door }

    pages += 1
    republished += before.revision === after.revision ? 0 : 1
    arrivalsWas += doors.was.opened
    arrivalsNow += doors.now.opened

    if (doors.was.silence === null && doors.now.silence === null) scaled += 1

    /**
     * A page the door cannot scale is listed once per side it is unscalable on,
     * and only where a window could speak for something on it: a page nobody
     * read in either window is not a page whose readers could not be counted,
     * and listing it would put the commonest healthy state on the one list here
     * that is meant to be empty.
     */
    const spoken = before.parts.some((part) => {
      const counterpart = afterParts.get(part.nodeId)

      return (
        spokenFor(part.standing) && counterpart !== undefined && spokenFor(counterpart.standing)
      )
    })

    if (spoken) {
      if (doors.was.silence !== null) {
        unscaled.push({
          treeId: before.treeId,
          revision: before.revision,
          audienceId: before.audienceId,
          against: after.revision,
          side: "was",
          silence: doors.was.silence,
        })
      }
      if (doors.now.silence !== null) {
        unscaled.push({
          treeId: after.treeId,
          revision: after.revision,
          audienceId: after.audienceId,
          against: before.revision,
          side: "now",
          silence: doors.now.silence,
        })
      }
    }

    for (const part of before.parts) {
      const counterpart = afterParts.get(part.nodeId)

      if (counterpart === undefined) {
        lost += 1

        for (const kind of keysOf(part)) rowFor(rows, kind).lost += 1
        continue
      }

      if (part.type === counterpart.type) {
        placements += 1
      } else {
        recast += 1
        lost += 1
        gained += 1
        rowFor(rows, { by: "type", type: part.type }).lost += 1
        rowFor(rows, { by: "type", type: counterpart.type }).gained += 1
      }

      if (part.role !== counterpart.role) {
        rowFor(rows, { by: "role", role: part.role }).lost += 1
        rowFor(rows, { by: "role", role: counterpart.role }).gained += 1
      }

      /**
       * A placement is paired under a key only where it is of that kind on both
       * sides, which is the places comparison's rule (0266) and where the two
       * keys answer differently: a node recast into another type is a place one
       * type left and another took, while the role rows hold it still wherever
       * the two types play the same part.
       */
      const sameType: readonly KindKey[] =
        part.type === counterpart.type ? [{ by: "type", type: part.type }] : []
      const sameRole: readonly KindKey[] =
        part.role === counterpart.role ? [{ by: "role", role: part.role }] : []

      for (const kind of [...sameType, ...sameRole]) {
        add(rowFor(rows, kind), { was: part, now: counterpart }, doors, form)
      }
    }

    for (const part of after.parts) {
      if (beforeParts.has(part.nodeId)) continue

      gained += 1

      for (const kind of keysOf(part)) rowFor(rows, kind).gained += 1
    }
  }

  const built = [...rows.values()].map(rowOf)
  const byType = built.filter((row) => row.kind.by === "type").sort(worseOf)
  const disagreed = [...roleNow.keys()]
    .filter((type) => roleWas.has(type) && roleWas.get(type) !== roleNow.get(type))
    .sort((one, other) => one.localeCompare(other))

  return {
    byType,
    byRole: built.filter((row) => row.kind.by === "role").sort(worseOf),
    pages,
    pagesGained,
    formsGained,
    pagesLost,
    formsLost,
    audiences: { was: earlier.pages.audiences, now: later.pages.audiences },
    republished,
    placements,
    gained,
    lost,
    recast,
    arrivalsWas,
    arrivalsNow,
    scaled,
    unscaled: [...unscaled].sort(bySide),
    mostAbandoned: byType.find((row) => (row.readersMoved ?? 0) < 0) ?? null,
    mostTakenUp:
      byType
        .filter((row) => (row.readersMoved ?? 0) > 0)
        .sort(
          (one, other) =>
            (other.readersMoved ?? 0) - (one.readersMoved ?? 0) ||
            nameOf(one.kind).localeCompare(nameOf(other.kind))
        )[0] ?? null,
    ambiguous: [...ambiguous.values()].sort(inFormOrder),
    duplicated: earlier.pages.duplicated + later.pages.duplicated,
    duplicatedRows: earlier.duplicatedRows + later.duplicatedRows,
    roleDisagreed: disagreed,
  }
}
