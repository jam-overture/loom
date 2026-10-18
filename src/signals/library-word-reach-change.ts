import { everyMemberOf } from "../closed-set.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import { inFormOrder, type ComparedPopulations, type PageForm } from "./audiences.js"
import { copyChangeOf, spokenForOnBothSides, type ComparedPassage } from "./copy-change.js"
import type { PageDoor } from "./door.js"
import { kindKeyOf, type KindKey } from "./library.js"
import { partsByNodeIn } from "./library-change.js"
import {
  readerShareCauseOf,
  librarySideOf,
  weightMovedOver,
  type LibraryWindow,
  type ReaderShareCause,
  type UnscaledSide,
} from "./library-reach-change.js"
import type { ReachSilence } from "./reach.js"

/**
 * The words of a kind of part the typical reader who met it reached — before
 * and after.
 *
 * Three readings already compare a kind of part across two windows, and each
 * answers a question the others cannot.
 * [`library-change.ts`](library-change.ts) compares the **places** it stands,
 * which is the one denominator here with no reader in it
 * ([0266](../../decisions/0266-a-change-to-a-kind-of-part-is-read-over-the-places-both-windows-bore.md)).
 * [`library-copy-change.ts`](library-copy-change.ts) compares the **words** it
 * kept, by standing: a word counts as read where at least one reader reached
 * the part saying it
 * ([0270](../../decisions/0270-a-change-to-the-words-a-kind-of-part-says-is-read-over-the-words-both-windows-say-and-a-floor-costs-the-signed-figure.md)).
 * [`library-reach-change.ts`](library-reach-change.ts) compares the **readers**
 * who met it against the readers who read it
 * ([0279](../../decisions/0279-a-kinds-share-of-the-readers-who-met-it-is-compared-at-each-windows-own-weights-and-a-counterfactual-says-which-side-moved.md)).
 *
 * None of the three can say *the typical reader reached two hundred of its
 * words and reaches three hundred now*, and that is the sentence an author who
 * rewrote a component is asking about: a share of words says how much of it is
 * read **somewhere**, and this says how much of it one reader gets to.
 *
 * This is that figure, and it is the **twenty-first** thing taken out of what
 * this subsystem already knows rather than collected: **nothing is added to a
 * payload, a browser, a column, a store or the vocabulary of kinds**, and the
 * broadcaster is not touched.
 *
 * ## The unit is the page, and that is the one structural difference
 *
 * A share of the readers who met a kind is a weighted mean of **per-place**
 * shares, so its weight is added once per place a kind stands (0256, 0279). A
 * count of words is not a share: a part's own words partition its page exactly
 * once (0212, 0235), so the words of two placements of one kind on one page
 * **add**, and the thing a reader reached is their sum and not either one.
 *
 * So the term is a page's whole carried word mass for that kind, and the weight
 * is added **once per page**. Adding the door once per placement would weight a
 * page by how many times the kind happens to stand on it, which is a fact about
 * how the page was written and not about how it is read.
 *
 * That difference is also what this reading can publish and a comparison of
 * readers cannot: a figure for the **whole library**. Words partition, places
 * do not, so adding every kind's words counts no word twice where adding every
 * kind's places counts a page once per element node (0257).
 *
 * ## The arithmetic, which is two rules already settled
 *
 * Per paired page and per kind, over the carried passages both windows can
 * speak for:
 *
 * - the page's reader-words, `Σ readers × words`, put on the door's scale as
 *   `mass × counted ÷ appearances` — which is the scaling a share of readers
 *   uses, in the published order (0256);
 * - the weight, `counted` — `min(appearances, opened)`, the page views a rollup
 *   folded.
 *
 * The figure is their quotient: reader-words over page views, which is **words
 * per reader at the door's scale**. The straddle over-count (0147) is in both
 * terms of each page's own mass and very nearly divides out there, which is the
 * only place it can.
 *
 * ## The weights move, and the answer is the one already written down
 *
 * A mean over the same pages still moves when one page's traffic grows and
 * another's shrinks. The remedy is sufficiency rather than magnitude (0244,
 * 0279): {@link ReaderWords.ifTrafficHeld} is the later window's per-page rates
 * at the earlier window's weights and isolates the readers,
 * {@link ReaderWords.ifReadingHeld} is the earlier window's rates at the later
 * window's weights and isolates the mix of pages, and each is asked only
 * whether it carries the movement's own direction. No threshold decides
 * anything and no additive split is published, because there are two of them
 * and they differ by the interaction term.
 *
 * ## What a floor costs, which is the question this reading had to answer
 *
 * A part whose type declares no `copy` says more words than can be counted
 * (0122), so a floored passage's word count is a floor. A comparison of one
 * page's words already found what that costs and withheld exactly one figure
 * for it (0239): a **single** passage's gain survives a floor, because one
 * factor scales it and a scaling toward zero cannot change a sign — and the
 * page's total does not, because it adds signed terms that floors scale by
 * **different** factors.
 *
 * Every figure here is a sum over passages, so the same rule falls the same
 * way and it is stated as the rule rather than as a list:
 *
 * - **A level survives a floor and is published as one.** Every term of
 *   {@link ReaderWords.typicalWas} and {@link ReaderWords.typicalNow} is
 *   non-negative, so a floor can only scale it down: each side is a floor on
 *   what the typical reader really reached, and {@link ReaderWords.floored}
 *   says how much of the mass is in doubt.
 * - **A difference does not, and is withheld.** {@link ReaderWords.shift},
 *   {@link ReaderWords.wordsMoved}, the two counterfactuals and
 *   {@link KindWordReachChange.cause} all answer by subtraction, so all five go.
 *   The counterfactuals are levels on their face and are withheld with the
 *   rest, because the only thing anybody does with one is subtract a level from
 *   it.
 * - **The weights survive whole**, because there is no word in them:
 *   {@link ReaderWords.weightMoved} is published under a floor like any other.
 *
 * ## What it refuses to publish
 *
 * **A word nothing can be said about, counted as nought.** A carried passage
 * whose standing is `unknown` on either side is in no term: a press delegated
 * to a band that no view ever named is a reader who plainly had it in front of
 * them and a counter that is missing, and reading that as nought reader-words
 * would understate the figure in the direction nobody checks. The words are
 * published as {@link ReaderWords.unspoken} instead, and every figure is taken
 * over {@link ReaderWords.spoken}, which is one set of passages and therefore
 * the same set on both sides.
 *
 * **A figure over the pages that could be scaled.** A kind standing on one page
 * the door cannot scale, in either window, has no figure at all — *of the pages
 * we could price* is not a sentence a surface prints, it prints the number
 * (0256). The pages that caused it are published once, with the side they are
 * on and their own vocabulary's reason.
 *
 * **A rewritten passage.** A word-weighted figure needs one word count and a
 * reworded passage has two, so it is counted in
 * {@link KindWordReachChange.rewritten} and is in no mass, which is the rule a
 * comparison of one page's words already applies (0239).
 *
 * Pure. It reaches no store, no clock and no DOM, it is linear in the parts of
 * the readings times the rows handed in, and nothing in it survives into a
 * browser bundle.
 */

/** Why there is no before and after for the words a kind of part puts in front of a reader. */
export type KindWordReachChangeSilence =
  /**
   * Nothing in the pages read, in either window, is of this kind.
   *
   * Only ever a role row, and the census's own reason (0257): *nothing in this
   * library is a heading* is a fact about the library rather than a missing row.
   */
  | "unplaced"
  /**
   * It stands in both windows and in no place that is in both.
   *
   * Every placement was gained or lost, so there is no text to hold still —
   * which is an answer about the library rather than about its readers, and the
   * places comparison's own reason (0266).
   */
  | "unpaired"
  /**
   * No place of it that stands in both windows carries a passage both revisions
   * say the same way.
   *
   * Either it says nothing at all, or every passage of it was rewritten. Both
   * are facts about the change, and a reading that called them *nobody read it*
   * would be answering a question nobody asked (0270). Counted in passages and
   * not in words, so that a kind which says only what it hides is `floored`
   * rather than silent for the wrong reason.
   */
  | "wordless"
  /**
   * No carried word of it can be spoken for in both windows.
   *
   * Every carried passage is `unknown` in one window or the other, and
   * `unknown` is *nothing can be said* and never *nobody read it* (0212).
   */
  | "unread"
  /**
   * A page bearing a comparable word of it has no page-view row at the door, on
   * one of the two sides.
   *
   * The page's own reading stands whole; what is missing is the one number that
   * makes two pages' masses comparable. {@link LibraryWordReachChange.unscaled}
   * says which page and which side.
   */
  | "unscaled"
  /**
   * A page bearing a comparable word of it has a row and nothing in it says a
   * page view began.
   *
   * Kept apart from `unscaled` because the remedy is the opposite: a missing
   * row is retention or an upgrade, and this is **senders that are not marking
   * their openings**.
   */
  | "unopened"
  /**
   * A page bearing a comparable word of it has openings and no rollup has
   * folded a window of them yet.
   *
   * The one reason here that resolves itself, and on a comparison it is the
   * commonest honest state of the later window.
   */
  | "uncounted"
  /**
   * Some comparable word of it is a floor, so the movement cannot be signed.
   *
   * The only member here that withholds some figures while the rest of the row
   * stands, which is what a reading whose unit is a count of words rather than
   * a share of readers can do (0239, 0270). The two levels are published as
   * floors and every difference is withheld.
   */
  | "floored"

export const KIND_WORD_REACH_CHANGE_SILENCES: readonly KindWordReachChangeSilence[] =
  everyMemberOf<KindWordReachChangeSilence>()([
    "unplaced",
    "unpaired",
    "wordless",
    "unread",
    "unscaled",
    "unopened",
    "uncounted",
    "floored",
  ])

/** One line per silence, for a surface saying why a kind has no before and after. */
export const describeKindWordReachChangeSilence = (
  silence: KindWordReachChangeSilence
): string => {
  switch (silence) {
    case "unplaced":
      return "nothing in the pages read, in either window, is of this kind"
    case "unpaired":
      return "no place this kind of part stands is in both windows"
    case "wordless":
      return "no place it stands in both windows carries a passage both revisions say alike"
    case "unread":
      return "no word it kept can be spoken for in both windows"
    case "unscaled":
      return "a page it stands on has no page views counted at the door in one of the two windows"
    case "unopened":
      return "a page it stands on has a row and nothing has said a page view began"
    case "uncounted":
      return "a page it stands on has readers in one window whose reading has not been counted yet"
    case "floored":
      return "some word it kept is a floor, so the movement cannot be signed"
  }
}

/**
 * What happened to the words of a kind of part the typical reader reached.
 *
 * The same five names three other comparisons of a library publish, because
 * they are the same five states at a different unit — and the unit is the
 * difference worth knowing: these are words one reader got to, so a kind can be
 * `taken-up` here and `held` everywhere else, which is a kind whose readers
 * read further into it without any new place or any new word being read at all.
 */
export type KindWordReachMovement =
  /** The typical reader who met it reaches more of its words now. */
  | "taken-up"
  /** They reach fewer. */
  | "abandoned"
  /**
   * They reach exactly as many.
   *
   * Two means that are the same number, which is the state a window compared
   * against itself is in. A movement smaller than the last bit of a float is
   * reported as a movement rather than as this, and no threshold is invented to
   * prevent it.
   */
  | "held"
  /**
   * No reader reached a word it kept, in either window.
   *
   * Kept apart from `held` for the reason every comparison here keeps it apart
   * (0266, 0270): *read by nobody, and still read by nobody* is the one state
   * that is an instruction.
   */
  | "still-unread"
  /** {@link KindWordReachChange.silence} says why nothing can be said. */
  | "unknown"

export const KIND_WORD_REACH_MOVEMENTS: readonly KindWordReachMovement[] =
  everyMemberOf<KindWordReachMovement>()([
    "taken-up",
    "abandoned",
    "held",
    "still-unread",
    "unknown",
  ])

/** One line per movement, for a surface putting a kind's words in front of a person. */
export const describeKindWordReachMovement = (movement: KindWordReachMovement): string => {
  switch (movement) {
    case "taken-up":
      return "the typical reader who met it reaches more of its words now"
    case "abandoned":
      return "the typical reader who met it reaches fewer of its words now"
    case "held":
      return "the typical reader who met it reaches exactly as many of its words"
    case "still-unread":
      return "no reader reached a word it kept, in either window"
    case "unknown":
      return "nothing can be said about what changed"
  }
}

/**
 * The words one reader got to, before and after, with the evidence behind both
 * sides.
 *
 * One shape at two scales — a kind of part, and the whole library — because the
 * whole library is the kinds added up. That identity is the thing words buy and
 * places cannot: a part's own words partition its page exactly once (0212,
 * 0235), so adding the rows reads no sentence twice.
 */
export type ReaderWords = {
  /**
   * Passages both revisions say word for word, across the places of this kind
   * that stand in both windows.
   *
   * The count and not the word total is what says whether there is anything to
   * compare, because a passage may hide every word it has (0122).
   */
  readonly passages: number
  /** The words those passages say, which is the mass this reading is about. */
  readonly carried: number
  /**
   * Of {@link passages}, those with a verdict on **both** sides, which is the
   * set every figure below is taken over.
   *
   * One number and not two, which is what makes the two levels comparable: a
   * passage nothing can be said about in either window is in neither mass, so
   * the two sides are read over exactly the same text.
   */
  readonly spoken: number
  /** The words those passages say: the universe of both masses. */
  readonly comparable: number
  /** Carried words `unknown` on one side or the other, which are in no mass. */
  readonly unspoken: number
  /**
   * Comparable passages whose word count is a floor, because the part saying
   * them declares no `copy` (0122).
   *
   * Non-nought is what withholds every difference here and leaves the two
   * levels standing as floors. **A count of passages and not of words**,
   * because the commonest floor of all is a part that declares no `copy` at
   * all and whose visible words are therefore nought: a trigger counted in
   * words would miss exactly the case it exists for.
   */
  readonly floored: number
  /** The visible words in those passages, which is the part of the mass that is certain. */
  readonly flooredWords: number
  /**
   * Page views at the door's scale across the pages bearing a comparable word
   * of it, in the earlier window, added **once per page**.
   *
   * The denominator of {@link typicalWas} and the weight behind it.
   */
  readonly countedWas: number | null
  /** The same for the later window. */
  readonly countedNow: number | null
  /**
   * Reader-words in the earlier window at the door's scale:
   * `Σ readers × words` per page, scaled by `counted ÷ appearances`.
   *
   * **Not a count of people and deliberately not rounded into one** (0256).
   */
  readonly reachedWas: number | null
  /** The same for the later window. */
  readonly reachedNow: number | null
  /**
   * `reachedWas ÷ countedWas` — the carried words the typical reader who met it
   * reached, in the earlier window.
   *
   * A floor under a floor, and exact otherwise. `null` where a silence says why
   * there is none.
   */
  readonly typicalWas: number | null
  /** The same in the later window, over the same words. */
  readonly typicalNow: number | null
  /** `typicalNow − typicalWas`, in words per reader. Withheld under a floor. */
  readonly shift: number | null
  /**
   * The movement stated at the later window's scale: `shift × countedNow`.
   *
   * Reader-words and never people, exactly as {@link reachedNow} is — the
   * figure this reading ranks by, for the reason a page's falls are ranked by
   * the readers they lose (0221).
   */
  readonly wordsMoved: number | null
  /**
   * The later window's per-page rates at the earlier window's weights: the
   * words there would have been if no page's traffic had moved.
   *
   * Isolates the readers. Withheld under a floor, because the only use of a
   * counterfactual is a subtraction.
   */
  readonly ifTrafficHeld: number | null
  /**
   * The earlier window's per-page rates at the later window's weights: the
   * words there would have been if no reader had read differently.
   *
   * Isolates the mix of pages.
   */
  readonly ifReadingHeld: number | null
  /**
   * How far the weights moved: half the sum of the absolute movements in each
   * page's share of its side's total weight, in `[0, 1]`.
   *
   * The arithmetic a comparison of two readerships uses (0247), over pages
   * rather than regions. **Published and never judged**, and published under a
   * floor as well, because there is no word in it.
   */
  readonly weightMoved: number | null
  /** Appearances in excess of openings in the earlier window, over the weighted pages. */
  readonly driftWas: number
  /** The same for the later window. */
  readonly driftNow: number
  /** Openings in the earlier window, over the weighted pages, whose reading no rollup has folded. */
  readonly pendingWas: number
  /** The same for the later window. */
  readonly pendingNow: number
  /**
   * Comparable passages reporting more readers than their page had appearances,
   * on either side, which no rollup produces.
   *
   * Node counters older than the page-view column, or a caller that
   * concatenated two reads. A surface should show the words comparison (0270)
   * instead where it is non-nought.
   */
  readonly unreconciled: number
  /**
   * Nobody's visit spanned a window on either side, nothing is waiting to be
   * folded, nothing is unreconciled and no word is a floor — so both levels are
   * exact.
   *
   * False under any silence. It says nothing about the weights: a comparison
   * can be exact on both sides and still be weighted differently, which is what
   * {@link weightMoved} is for.
   */
  readonly exact: boolean
}

/**
 * One kind of part, held against itself across two windows, by the words one
 * reader got to.
 *
 * The same shape for a type row and a role row, because they are one comparison
 * asked of two keys.
 */
export type KindWordReachChange = {
  readonly kind: KindKey
  /**
   * What part a type plays (0114), or `null`. Always `null` on a role row,
   * which carries it as its key.
   *
   * The later window's answer where it stands there, so that a surface reading
   * a row and the role beside it is reading today's library.
   */
  readonly role: PrimitiveRole | null
  /** Places of this kind that stand in both windows: the same node of the same page, of this kind on both sides. */
  readonly places: number
  /** Places of it in the later window with no counterpart in the earlier one. */
  readonly gained: number
  /** Places of it in the earlier window with no counterpart in the later one. */
  readonly lost: number
  /**
   * Places of it held still whose text the change rewrote, which are in no mass.
   *
   * A word-weighted figure needs one word count and these have two. Published
   * rather than dropped, because *this kind was rewritten everywhere* is why a
   * row is `wordless` and is the answer somebody most needs (0239, 0270).
   */
  readonly rewritten: number
  /**
   * Pages bearing a comparable word of it, which is **forms** and not
   * revisions.
   *
   * A page served in two forms (0263) is two of them, for the reason the
   * pairing counts it as two: two forms have two doors, two sets of readers and
   * two masses, and a kind whose words are carried in both is carried in both.
   */
  readonly pages: number
  readonly words: ReaderWords
  readonly movement: KindWordReachMovement
  /** Which side was sufficient, or `null` where the figure did not move or is withheld. */
  readonly cause: ReaderShareCause | null
  /**
   * Why the figures are not there, and `null` where they are.
   *
   * About the comparison and not about the row: {@link places},
   * {@link gained} and {@link lost} are counts of parts of trees and are true
   * whatever any window measured, which is how a census publishes a standing
   * beside a withheld share (0212).
   */
  readonly silence: KindWordReachChangeSilence | null
}

/** What a change did to the words a deployment's library puts in front of one reader. */
export type LibraryWordReachChange = {
  /**
   * Every type that stands in either window, most reader-words lost first.
   *
   * Then the lower figure in the later window, then by type, so two kinds that
   * lost the same do not reorder on a refresh.
   */
  readonly byType: readonly KindWordReachChange[]
  /**
   * Every role in the vocabulary, then the row for parts whose type declared
   * none, in the same order as {@link byType}.
   */
  readonly byRole: readonly KindWordReachChange[]
  /**
   * The whole library's carried words, added across every kind exactly once.
   *
   * The figure a comparison of readers cannot have (0279): a page's words
   * partition across its parts exactly once, so adding every kind's words reads
   * no sentence twice, while adding every kind's places would count a page once
   * per element node. A recast place is in no kind's carried words and is in
   * none of these either — it is a place one kind left and another took.
   *
   * There is no movement and no silence here on purpose. Every reason published
   * by this reading is about one kind of part, and a reason about the whole
   * would be a second subject on one vocabulary.
   */
  readonly words: ReaderWords
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
   * The comparison still stands — a placement is paired by node and a passage
   * by its text — but it says the pages changed as well as the window.
   */
  readonly republished: number
  /** Places that stand in both windows, of the same type on both sides. */
  readonly placements: number
  /** Places in the later window only. */
  readonly gained: number
  /** Places in the earlier window only. */
  readonly lost: number
  /** Paired nodes whose primitive type changed: a place one kind left and another took (0266). */
  readonly recast: number
  /** Places held still whose text the change rewrote, across every kind once. */
  readonly rewritten: number
  /**
   * Page views counted at the door across the paired pages in the earlier
   * window, added once per page.
   *
   * The weight behind the whole comparison — *this moved among six hundred
   * readers rather than six* — and the denominator of nothing.
   */
  readonly arrivalsWas: number
  /** The same for the later window. */
  readonly arrivalsNow: number
  /** Paired pages the door could scale in **both** windows, which is where every figure here comes from. */
  readonly scaled: number
  /**
   * The paired pages bearing a comparable word that the door could not scale,
   * by tree, newest revision first, with the side they are on.
   *
   * The actionable half of every door silence on a row above. Empty is the
   * healthy state.
   */
  readonly unscaled: readonly UnscaledSide[]
  /**
   * The type that lost the most reader-words, which is the kind to look at
   * first.
   *
   * By {@link ReaderWords.wordsMoved} and not by the figure, which is this
   * subsystem's ranking rule everywhere (0221, 0257): a kind the typical reader
   * reads two words less of across a thousand readers is a bigger fact than one
   * they read fifty words less of across three. A type and never a role,
   * because a type is the thing an author can replace.
   */
  readonly mostAbandoned: KindWordReachChange | null
  /** The type that gained the most reader-words, by the same rule. */
  readonly mostTakenUp: KindWordReachChange | null
  /**
   * Forms read at two revisions in one window, which are in nothing above.
   *
   * A page that is two live revisions in one window has no single counterpart
   * in the other, and the comparison pairs by page in its form (0266). A form
   * and not a tree, because two forms of a page (0263) are two paired pages and
   * one of them being ambiguous says nothing about the other.
   */
  readonly ambiguous: readonly PageForm[]
  /** Readings of a revision beyond the first, on either side, which were dropped (0158). */
  readonly duplicated: number
  /**
   * Door rows for one revision beyond the first, across the pages of both
   * windows, which were ignored.
   *
   * A store keeps one row per revision, so this is a caller's two reads — and
   * adding them would double a page's arrivals and halve every figure taken
   * against it.
   */
  readonly duplicatedRows: number
  /** Types the two windows disagree about the role of, where the later window's answer stands (0114). */
  readonly roleDisagreed: readonly PrimitiveType[]
}

/**
 * One kind's words before they are a row.
 *
 * A mutable accumulator and not a fold, for the reason the census's is: a
 * library of forty pages is tens of thousands of placements and a fold would
 * copy a row per one. Nothing escapes this module.
 */
type Counting = {
  passages: number
  carried: number
  spoken: number
  comparable: number
  unspoken: number
  floored: number
  flooredWords: number
  countedWas: number
  countedNow: number
  reachedWas: number
  reachedNow: number
  /** `Σ massⁿᵒʷ × wᵖᵃˢᵗ`: the numerator of the figure with the traffic held still. */
  heldTraffic: number
  /** `Σ massʷᵃˢ × wⁿᵒʷ`: the numerator of the figure with the reading held still. */
  heldReading: number
  /** Each weighted page's two weights, which `weightMoved` needs after the totals are known. */
  readonly weights: { was: number; now: number }[]
  driftWas: number
  driftNow: number
  pendingWas: number
  pendingNow: number
  unreconciled: number
  /** The first door reason either side gave about a page bearing a comparable word. */
  blocked: ReachSilence | null
}

const counting = (): Counting => ({
  passages: 0,
  carried: 0,
  spoken: 0,
  comparable: 0,
  unspoken: 0,
  floored: 0,
  flooredWords: 0,
  countedWas: 0,
  countedNow: 0,
  reachedWas: 0,
  reachedNow: 0,
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

/** One kind's row, which is a count of reader-words with a key on it. */
type Tallying = Counting & {
  readonly kind: KindKey
  role: PrimitiveRole | null
  places: number
  gained: number
  lost: number
  rewritten: number
  readonly pages: Set<string>
}

const tallying = (kind: KindKey): Tallying => ({
  kind,
  role: null,
  places: 0,
  gained: 0,
  lost: 0,
  rewritten: 0,
  pages: new Set(),
  ...counting(),
})

/** The two keys one placement is counted under, which is the pair of questions this answers. */
const keysOf = (of: {
  readonly type: PrimitiveType
  readonly role: PrimitiveRole | null
}): readonly KindKey[] => [
  { by: "type", type: of.type },
  { by: "role", role: of.role },
]

/**
 * The keys a paired placement is held still under.
 *
 * A placement is carried under a key only where it is of that kind on **both**
 * sides, which is where the two keys answer differently: a node recast into
 * another type is a place one type left and another took, while the role rows
 * hold it still wherever the two types play the same part (0266).
 */
const heldKeysOf = (
  before: { readonly type: PrimitiveType; readonly role: PrimitiveRole | null },
  after: { readonly type: PrimitiveType; readonly role: PrimitiveRole | null }
): readonly KindKey[] => [
  ...(before.type === after.type ? [{ by: "type", type: after.type } as const] : []),
  ...(before.role === after.role ? [{ by: "role", role: after.role } as const] : []),
]

const rowFor = (rows: Map<string, Tallying>, kind: KindKey): Tallying => {
  const key = kindKeyOf(kind)
  const row = rows.get(key) ?? tallying(kind)

  rows.set(key, row)

  return row
}

/** The kind-level reason a page's reason causes, which is the same state at the other subject. */
const KIND_WORD_REACH_CHANGE_OF_REACH: Readonly<
  Record<ReachSilence, KindWordReachChangeSilence>
> = Object.freeze({
  unmeasured: "unscaled",
  unopened: "unopened",
  uncounted: "uncounted",
})

/**
 * The silence, with the reasons tried in the order they have to be tried in.
 *
 * Nothing of the kind first, because *there is no such part in this library* is
 * a better answer than anything said about its words. Then nothing held still,
 * then nothing carried, because a kind whose every word was rewritten is a fact
 * about the change and would otherwise be reported as nobody having read it.
 * Then nothing spoken for, because a kind no window can speak for has no figure
 * whether or not its pages could be scaled. The door next, and the floor last,
 * because it is the only one of the eight that withholds some figures rather
 * than the whole row.
 */
const silenceOf = (of: Tallying): KindWordReachChangeSilence | null => {
  if (of.places + of.gained + of.lost === 0) return "unplaced"
  if (of.places === 0) return "unpaired"
  if (of.passages === 0) return "wordless"
  if (of.spoken === 0) return "unread"
  if (of.blocked !== null) return KIND_WORD_REACH_CHANGE_OF_REACH[of.blocked]

  return of.floored > 0 ? "floored" : null
}

/**
 * The two levels and whether a difference of them may be taken, worked out once.
 *
 * `measured` is the invariant this module rests on: a passage is spoken for
 * only where it was banked against a page, and it is banked only where both
 * doors spoke, so a spoken passage with no door reason has a weight behind it
 * and the four quotients below are divisions by a positive number.
 */
type Figures = {
  readonly measured: boolean
  readonly signed: boolean
  readonly typicalWas: number
  readonly typicalNow: number
  readonly ifTrafficHeld: number
  readonly ifReadingHeld: number
}

const figuresOf = (of: Counting): Figures => {
  const measured = of.spoken > 0 && of.blocked === null

  return {
    measured,
    signed: measured && of.floored === 0,
    typicalWas: of.reachedWas / of.countedWas,
    typicalNow: of.reachedNow / of.countedNow,
    ifTrafficHeld: of.heldTraffic / of.countedWas,
    ifReadingHeld: of.heldReading / of.countedNow,
  }
}

const wordsOf = (of: Counting, figures: Figures): ReaderWords => ({
  passages: of.passages,
  carried: of.carried,
  spoken: of.spoken,
  comparable: of.comparable,
  unspoken: of.unspoken,
  floored: of.floored,
  flooredWords: of.flooredWords,
  countedWas: figures.measured ? of.countedWas : null,
  countedNow: figures.measured ? of.countedNow : null,
  reachedWas: figures.measured ? of.reachedWas : null,
  reachedNow: figures.measured ? of.reachedNow : null,
  typicalWas: figures.measured ? figures.typicalWas : null,
  typicalNow: figures.measured ? figures.typicalNow : null,
  shift: figures.signed ? figures.typicalNow - figures.typicalWas : null,
  wordsMoved: figures.signed ? (figures.typicalNow - figures.typicalWas) * of.countedNow : null,
  ifTrafficHeld: figures.signed ? figures.ifTrafficHeld : null,
  ifReadingHeld: figures.signed ? figures.ifReadingHeld : null,
  weightMoved: figures.measured
    ? weightMovedOver(of.weights, { was: of.countedWas, now: of.countedNow })
    : null,
  driftWas: of.driftWas,
  driftNow: of.driftNow,
  pendingWas: of.pendingWas,
  pendingNow: of.pendingNow,
  unreconciled: of.unreconciled,
  exact:
    figures.signed &&
    of.driftWas === 0 &&
    of.driftNow === 0 &&
    of.pendingWas === 0 &&
    of.pendingNow === 0 &&
    of.unreconciled === 0,
})

/**
 * The verdict, off the two levels and never off the two masses.
 *
 * The opposite of the places comparison's rule and for the opposite reason
 * (0266): there the denominator is the same count of places on both sides, so
 * the sign of a subtraction of two whole numbers is the whole answer. Here the
 * two denominators are two windows' traffic, so the levels are the only
 * comparable pair and the subtraction has to be done on them.
 */
const movementOf = (of: Counting, figures: Figures): KindWordReachMovement => {
  if (!figures.signed) return "unknown"
  if (of.reachedWas === 0 && of.reachedNow === 0) return "still-unread"
  if (figures.typicalNow > figures.typicalWas) return "taken-up"
  if (figures.typicalNow < figures.typicalWas) return "abandoned"

  return "held"
}

const rowOf = (of: Tallying): KindWordReachChange => {
  const figures = figuresOf(of)

  return {
    kind: of.kind,
    role: of.kind.by === "type" ? of.role : null,
    places: of.places,
    gained: of.gained,
    lost: of.lost,
    rewritten: of.rewritten,
    pages: of.pages.size,
    words: wordsOf(of, figures),
    movement: movementOf(of, figures),
    cause: figures.signed
      ? readerShareCauseOf(
          figures.typicalWas,
          figures.typicalNow,
          figures.ifTrafficHeld,
          figures.ifReadingHeld
        )
      : null,
    silence: silenceOf(of),
  }
}

/** The name a row is ordered by, which is the key's own and never the row's position. */
const nameOf = (kind: KindKey): string => (kind.by === "type" ? kind.type : (kind.role ?? ""))

/**
 * The worse of two, which is the ranking rule spelled once.
 *
 * Most reader-words lost, then the lower figure now, then by name. A kind with
 * no figures at all sorts after every kind that has them — infinity rather than
 * a nought, because `null` is *nothing can be said* and a nought would rank a
 * withheld row among the kinds that merely held.
 */
const worseOf = (one: KindWordReachChange, other: KindWordReachChange): number =>
  (one.words.wordsMoved ?? Number.POSITIVE_INFINITY) -
    (other.words.wordsMoved ?? Number.POSITIVE_INFINITY) ||
  (one.words.typicalNow ?? Number.POSITIVE_INFINITY) -
    (other.words.typicalNow ?? Number.POSITIVE_INFINITY) ||
  nameOf(one.kind).localeCompare(nameOf(other.kind))

/** Tree id, then newest revision first, which is the order the page-view rows are read in. */
const bySide = (one: UnscaledSide, other: UnscaledSide): number =>
  one.treeId.localeCompare(other.treeId) ||
  other.revision - one.revision ||
  one.side.localeCompare(other.side)

/** One page's two doors, which every term of that page is put on. */
type Doors = { readonly was: PageDoor; readonly now: PageDoor }

/** One page's reader-words for one kind, before the door has scaled them. */
type PageMass = { was: number; now: number }

/**
 * One carried passage's words, filed under what can be said about them.
 *
 * Returns whether the passage's readers belong in a mass, which is true only
 * where both windows can speak for it and both doors can scale its page.
 */
const bank = (
  into: Counting,
  passage: ComparedPassage,
  spoken: boolean,
  doors: Doors,
  unreconciled: boolean
): boolean => {
  into.passages += 1
  into.carried += passage.words

  if (!spoken) {
    into.unspoken += passage.words

    return false
  }

  into.spoken += 1
  into.comparable += passage.words

  if (passage.floored) {
    into.floored += 1
    into.flooredWords += passage.words
  }

  if (doors.was.silence !== null || doors.now.silence !== null) {
    into.blocked ??= doors.was.silence ?? doors.now.silence

    return false
  }

  if (unreconciled) into.unreconciled += 1

  return true
}

/**
 * One page's mass put on the door's scale, added once per page.
 *
 * `mass × counted ÷ appearances`, in that order, because it is the published
 * order of a share of readers (0256): a surface drawing this beside a figure
 * taken the other way round is drawing the same number, and three floats
 * multiplied and divided in two orders agree to fifteen places and not to
 * sixteen.
 */
const weigh = (into: Counting, mass: PageMass, doors: Doors): void => {
  into.countedWas += doors.was.counted
  into.countedNow += doors.now.counted
  into.reachedWas += (mass.was * doors.was.counted) / doors.was.appearances
  into.reachedNow += (mass.now * doors.now.counted) / doors.now.appearances
  /** The same term with the other side's weight, which is the whole of a counterfactual. */
  into.heldTraffic += (mass.now * doors.was.counted) / doors.now.appearances
  into.heldReading += (mass.was * doors.now.counted) / doors.was.appearances
  into.weights.push({ was: doors.was.counted, now: doors.now.counted })
  into.driftWas += doors.was.drift
  into.driftNow += doors.now.drift
  into.pendingWas += doors.was.pending
  into.pendingNow += doors.now.pending
}

const massFor = (masses: Map<Counting, PageMass>, into: Counting): PageMass => {
  const mass = masses.get(into) ?? { was: 0, now: 0 }

  masses.set(into, mass)

  return mass
}

/**
 * The words of a kind of part the typical reader who met it reached, before and
 * after.
 *
 * Takes each window as its readings and the whole window of door rows a
 * deployment holds for it, because the figure needs the door on both sides: the
 * pages are paired by the places comparison's rule (0266) and each page's mass
 * is put on its own door's scale by a share of readers' rule (0256).
 *
 * The labels are the caller's. Two readings of one window and one library come
 * back as every word carried, both levels identical and nothing gained, lost or
 * rewritten; a caller who holds the two sides backwards gets a comparison with
 * every movement reversed rather than a refusal, exactly as a before-and-after
 * reading of one page does.
 *
 * Linear in the parts of the readings times the rows, with one comparison per
 * paired page.
 */
export const libraryWordReachChangeOf = (
  was: LibraryWindow,
  now: LibraryWindow
): LibraryWordReachChange => {
  const earlier = librarySideOf(was)
  const later = librarySideOf(now)
  const rows = new Map<string, Tallying>()
  const roleWas = new Map<PrimitiveType, PrimitiveRole | null>()
  const roleNow = new Map<PrimitiveType, PrimitiveRole | null>()
  const ambiguous = new Map([...earlier.pages.ambiguous, ...later.pages.ambiguous])
  const unscaled: UnscaledSide[] = []
  const whole = counting()
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
  let rewritten = 0
  let arrivalsWas = 0
  let arrivalsNow = 0
  let scaled = 0

  /**
   * Every role in the vocabulary gets a row whether or not anything plays it,
   * as a census's role rows do: a role nothing in the library plays is a fact
   * about the library, and a surface that had to tell a missing row from an
   * empty one would be reading the vocabulary itself.
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
    const doors: Doors = { was: doorWas.door, now: doorNow.door }
    const masses = new Map<Counting, PageMass>()
    let spokenFor = false

    pages += 1
    republished += before.revision === after.revision ? 0 : 1
    arrivalsWas += doors.was.opened
    arrivalsNow += doors.now.opened

    if (doors.was.silence === null && doors.now.silence === null) scaled += 1

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

      for (const kind of heldKeysOf(part, counterpart)) rowFor(rows, kind).places += 1
    }

    for (const part of after.parts) {
      if (beforeParts.has(part.nodeId)) continue

      gained += 1

      for (const kind of keysOf(part)) rowFor(rows, kind).gained += 1
    }

    const change = copyChangeOf(before, after)

    for (const passage of change.reworded) {
      const part = beforeParts.get(passage.nodeId)

      /**
       * A reworded passage is a node both readings hold, so the earlier part is
       * always there. Skipped rather than thrown, as every join in this
       * subsystem is: a row that cannot be built cannot be drawn, and a reading
       * is not worth failing over.
       */
      if (part === undefined) continue
      if (part.type === passage.type) rewritten += 1

      for (const kind of heldKeysOf(part, passage)) rowFor(rows, kind).rewritten += 1
    }

    for (const passage of change.compared) {
      const part = beforeParts.get(passage.nodeId)

      if (part === undefined) continue

      const spoken = spokenForOnBothSides(passage)
      const unreconciled =
        passage.was.readers > doors.was.appearances ||
        passage.now.readers > doors.now.appearances

      spokenFor ||= spoken

      for (const kind of heldKeysOf(part, passage)) {
        const row = rowFor(rows, kind)
        const banked = bank(row, passage, spoken, doors, unreconciled)

        /**
         * A page bearing a word both windows can speak for is one of this
         * kind's pages whether or not the door could scale it, so that a
         * withheld row still says how much is behind the figure it is not
         * publishing.
         */
        /**
         * The form and not the tree, for the reason the pairing is per form:
         * counting two forms of a page as one page would understate a kind's
         * pages by exactly the pages a deployment serves twice.
         */
        if (spoken) row.pages.add(form)
        if (!banked) continue

        const mass = massFor(masses, row)

        mass.was += passage.was.readers * passage.words
        mass.now += passage.now.readers * passage.words
      }

      /**
       * The whole library takes each passage once and never once per key, and
       * takes no recast place at all: a node whose type changed is a place one
       * kind left and another took, so its words are carried by neither.
       */
      if (part.type !== passage.type) continue
      if (!bank(whole, passage, spoken, doors, unreconciled)) continue

      const mass = massFor(masses, whole)

      mass.was += passage.was.readers * passage.words
      mass.now += passage.now.readers * passage.words
    }

    for (const [into, mass] of masses) weigh(into, mass, doors)

    /**
     * A page the door cannot scale is listed once per side it is unscalable on,
     * and only where a window could speak for a word on it: a page nobody read
     * in either window is not a page whose readers could not be counted, and
     * listing it would put the commonest healthy state on the one list here
     * that is meant to be empty.
     */
    if (spokenFor) {
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
  }

  const built = [...rows.values()].map(rowOf)
  const byType = built.filter((row) => row.kind.by === "type").sort(worseOf)
  const disagreed = [...roleNow.keys()]
    .filter((type) => roleWas.has(type) && roleWas.get(type) !== roleNow.get(type))
    .sort((one, other) => one.localeCompare(other))

  return {
    byType,
    byRole: built.filter((row) => row.kind.by === "role").sort(worseOf),
    words: wordsOf(whole, figuresOf(whole)),
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
    rewritten,
    arrivalsWas,
    arrivalsNow,
    scaled,
    unscaled: [...unscaled].sort(bySide),
    mostAbandoned: byType.find((row) => (row.words.wordsMoved ?? 0) < 0) ?? null,
    mostTakenUp:
      byType
        .filter((row) => (row.words.wordsMoved ?? 0) > 0)
        .sort(
          (one, other) =>
            (other.words.wordsMoved ?? 0) - (one.words.wordsMoved ?? 0) ||
            nameOf(one.kind).localeCompare(nameOf(other.kind))
        )[0] ?? null,
    ambiguous: [...ambiguous.values()].sort(inFormOrder),
    duplicated: earlier.pages.duplicated + later.pages.duplicated,
    duplicatedRows: earlier.duplicatedRows + later.duplicatedRows,
    roleDisagreed: disagreed,
  }
}
