import type { AudienceId } from "../audience/audience.js"
import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"

import {
  describeFormPairRefusal,
  formPairOf,
  FORM_PAIR_REFUSALS,
  type FormPairRefusal,
} from "./audiences.js"
import { passageSideOf, type PassageSide } from "./copy-change.js"
import { copyReadingOf, passageOf, type CopyReading, type Passage } from "./copy.js"
import { spokenFor, type PageReading, type PartStanding } from "./parts.js"

/**
 * What two forms of one page *say*, and how much of what each says gets read.
 *
 * The third and last of the readings over a pair of forms. The first holds two
 * forms against each other on each part's reach — did this audience's readers
 * get here (0302). The second asks what they did once they had (0303). This one
 * asks the question the deltas answer most directly: **what does each form say,
 * and of the words the two forms share, which audience's readers reach more of
 * them.** *The pro form says four hundred words in this band and the free form
 * says ninety, and the words both of them say are read twice as far by the
 * riders.*
 *
 * Nothing is collected for it. Two readings go in and a comparison comes out,
 * which makes it the thirty-sixth thing taken out of the server-side join
 * rather than added to a payload, a browser, a column or the vocabulary of
 * kinds.
 *
 * ## What it borrows, which is everything about the pair
 *
 * `FormPairRefusal` and `formPairOf` in [`audiences.ts`](audiences.ts) settle
 * which side is {@link FormCopyComparison.one} and refuse the five pairs that
 * are not two forms of one page. They are imported here exactly as
 * [`form-action.ts`](form-action.ts) imports them, for the reason
 * [0303](../../decisions/0303-what-two-forms-readers-do-is-the-same-pair-at-a-different-counter-and-the-page-has-one-honest-figure.md)
 * published them: every clause of 0302 is about the **pair** — one page, one
 * revision, two provable populations, neither of them earlier — and a third
 * spelling of them would be a third thing for two of them to disagree with.
 * {@link PassageSide} and `passageSideOf` come from
 * [`copy-change.ts`](copy-change.ts) by the same argument, one level down: a
 * passage read by one window is one projection and not two.
 *
 * So what is this module's own is one unit of comparison, one figure over it,
 * and a census.
 *
 * ## The unit: the words both forms say the same way
 *
 * Two forms differ in their text **by construction**, because a form is a base
 * tree plus the deltas an audience earns
 * ([0263](../../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)),
 * so this reading cannot do what its two siblings do and compare every shared
 * part. A band the deltas reworded is two different pieces of text with two
 * different word counts, and a word-weighted figure over it would be reading
 * two populations and two passages at once.
 *
 * So the comparable unit is the **shared** passage — a node both forms have,
 * saying the same words in the same order — which is `copyChangeOf`'s *carried*
 * text with the tree held still and the readership varied instead of the other
 * way round. Identical text on both sides means the only thing that can differ
 * is the reading of it. Everything else is reported rather than compared:
 * {@link FormCopyComparison.reworded} is every shared node the two forms word
 * differently, with both word counts and the form that says more, and
 * {@link FormCopyComparison.onlyIn} is every passage exactly one form has.
 *
 * That census is the half worth having on its own, and unlike every reader
 * figure here it is **exact**: no reader is in it, so neither is the straddle
 * ([0147](../../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)),
 * the view floor or anything a sender could get wrong. *The pro form says three
 * hundred words the free form never sees* is read off two composed trees and no
 * counter at all, which is why it survives a window nobody read.
 *
 * ## The figure, and the direction that is not read off it
 *
 * {@link ComparedFormPassage.gap} is `words × |one.reach − other.reach|` — the
 * words this passage puts in front of one form's average reader over and above
 * the other's. Each side's `reach` is `readers ÷ views` off that side's own
 * rows, so each form's straddle has very nearly divided out before the two
 * populations meet (0221, 0224), and the weighting by words is `copyChangeOf`'s:
 * a long passage a tenth of readers newly reach is worth more than a three-word
 * label all of them do.
 *
 * **The direction is read off the two reaches and not off the gap**, which is
 * this module's one departure from its siblings and is about floors rather than
 * about readers. A type that declares no `copy` leaves a passage short of words
 * nothing here can see
 * ([0122](../../decisions/0122-a-primitive-says-which-of-its-props-a-reader-reads.md)),
 * so {@link ComparedFormPassage.words} is a floor and the gap is a floor with
 * it: the same understatement is on both sides, so it scales the gap toward
 * nought and can report nought where the hidden words differ. The two reaches
 * are exact whatever a library has declared. So *which* form's readers get more
 * of a passage is answered from them, and *how much more* from the words — and
 * {@link ComparedFormPassage.favours} is therefore the field a surface under a
 * floor should trust.
 *
 * ## The page figure, which is a third argument and not either sibling's
 *
 * There are three readings of one pair of forms now and each has a different
 * answer about whether the page as a whole has a figure, which is worth being
 * exact about because the three look alike and are not.
 *
 * - **Reach refuses one** (0302 clause 5). A mean over parts charges one reader
 *   once per part they got through, and two forms do not have the same parts.
 * - **What readers did has one from a single row** (0303). Every action
 *   anywhere is strictly inside the root
 *   ([0242](../../decisions/0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md)),
 *   so the root's own row is one division per side and no addition at all.
 * - **Words have one because words partition the page**
 *   ([0235](../../decisions/0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)).
 *   A passage's words are its own and never its subtree's, so summing over
 *   passages counts each word exactly once and no reader more than the words
 *   they reached. {@link FormCopyComparison.typical} is each side's
 *   `Σ(readers × words) ÷ views` over the shared passages **both** windows can
 *   speak for — one set of words, so the two means are of the same page.
 *
 * **The page's gap is not the sum of the rows' gaps**, and nothing here pretends
 * otherwise. Every row's gap is unsigned, so two passages that favour opposite
 * forms both add to the total of the rows and cancel in the difference of the
 * means. The sum of the rows is *how far apart the two forms are read, passage
 * by passage*; the page figure is *how much of the shared page each form's
 * reader gets to*. A screen that adds the rows up and calls it the page would be
 * reporting the first and labelling it the second.
 *
 * Pure, linear in the parts of the two readings, and reaches no store, clock or
 * DOM. A caller checks `PageReading.orphaned` on both readings before trusting
 * either, exactly as it must before trusting either on its own.
 */

/** Why a comparison of what two forms say answered nothing, or less than all of it. */
export type FormCopySilence =
  /**
   * The five states in which two readings are not two forms of one page.
   *
   * Imported from {@link FormPairRefusal} rather than restated, for the reason
   * the module documentation gives: every one of them is a fact about the pair
   * and none of them is about the counter.
   */
  | FormPairRefusal
  /**
   * Neither form says anything that could have been read.
   *
   * Checked before the view floor, as the comparison of two windows checks it
   * (0235): a page that says nothing goes on saying nothing after a sender is
   * fixed, so reporting it first loses nothing and names the half somebody can
   * do something about. A single pair can be in both states and this is the
   * sharper of the two.
   */
  | "wordless"
  /**
   * One of the two windows held no page views.
   *
   * Every standing on that side is `unknown` and that side has no `reach`
   * (`parts.ts`), so there is nothing to compare. **The census still answers**,
   * which is what this member has in common with its spelling everywhere else:
   * *the pro form says three hundred words the free form does not, and nothing
   * has been measured on either* is true and is worth saying.
   */
  | "nothing-measured"
  /**
   * A passage reports more readers than its side of the page has views.
   *
   * Carried through from whichever copy reading said it (0235), where it is the
   * alarm for a reading assembled by hand or by a sender that is not one. The
   * per-passage figures are left in place rather than hidden, because a `reach`
   * above 1 is the visible evidence and withholding it would hide the fault
   * while leaving the screen drawable.
   */
  | "inconsistent"
  /**
   * The two forms say no passage the same way.
   *
   * Every passage is reworded, or is in one form only, so there is no shared
   * text for a reader figure to be about. The census answers in full and is the
   * whole of what can be said: two forms that share a tree and no sentence are
   * two pages the deltas made, and *that* is the answer rather than a silence
   * about readers.
   *
   * Checked before {@link FormCopySilence.unspoken}, which it implies — no
   * shared word at all is no shared word either window can speak for — because
   * a fact about the deltas is the stronger thing to say and the only one of the
   * two with a remedy a deployment holds.
   */
  | "unshared"
  /**
   * No shared word of the page can be spoken for in both windows.
   *
   * Every shared passage is `unknown` on one side or the other, so not one of
   * them has two reaches that are both a measurement. `unknown` is *nothing can
   * be said* and never *nobody reached it* (0212), so a figure over nought
   * spoken-for words would publish two forms reading alike where the honest
   * answer is that the pair cannot say.
   *
   * The words are in {@link FormCopyComparison.wordsCounted} under `unknown`,
   * which is where a surface sees how much of the shared page is in this state
   * without acting on it.
   */
  | "unspoken"
  /**
   * Some shared passage's words are a floor, so the page figures are neither
   * counts nor ceilings.
   *
   * The reason is the module documentation's and it is about the **page** and
   * not the rows: each side's mean is understated by the hidden words of each
   * passage weighted by that side's own readers, which is a different amount per
   * side, so the difference between the two means can read the wrong way round.
   * Each row's own gap and the form it favours are unaffected and stay
   * published, which is the same split `copyChangeOf` makes under a floor and
   * for the same arithmetic.
   */
  | "floored"

/** The closed set, for a surface that has to account for every absent figure. */
export const FORM_COPY_SILENCES: readonly FormCopySilence[] =
  everyMemberOf<FormCopySilence>()([
    ...FORM_PAIR_REFUSALS,
    "wordless",
    "nothing-measured",
    "inconsistent",
    "unshared",
    "unspoken",
    "floored",
  ])

/** One line per silence, for a surface saying why a figure is not there. */
export const describeFormCopySilence = (silence: FormCopySilence): string => {
  switch (silence) {
    case "wordless":
      return "neither form says anything that could be read"
    case "nothing-measured":
      return "one of the two windows held no page views"
    case "inconsistent":
      return "a passage reports more readers than its form has views, which no rollup produces"
    case "unshared":
      return "the two forms say no passage the same way, so there is no shared text to compare"
    case "unspoken":
      return "no shared word of the page can be spoken for in both windows"
    case "floored":
      return "some shared passage declares no copy, so a page-wide mean of its words would not be a ceiling"
    default:
      return describeFormPairRefusal(silence)
  }
}

/** One side of the comparison, as the copy reading of that form leaves it. */
export type FormCopySide = {
  readonly treeId: TreeId
  readonly revision: number
  /** `null` where the window named none, or named two with neither asked for. */
  readonly audienceId: AudienceId | null
  /**
   * That side's page-view floor, which is the denominator of every reach below.
   *
   * A floor rather than a count, for the reason `parts.ts` gives: distinct view
   * counts cannot be added across rows (0147), so the largest row is the most
   * that can be said from counters alone.
   */
  readonly views: number
  /**
   * Every word this form says, counted once.
   *
   * {@link WordsOfForms} accounts for all of them: this side's share of
   * `shared`, of `only` and of `reworded` add to it exactly, which is the
   * property that makes the census a census rather than three lists.
   */
  readonly words: number
  /** Passages this form has that say something, which two forms need not share. */
  readonly passages: number
  /** Words this form says in parts its own window can speak for (0287). */
  readonly spoken: number
}

/** A passage exactly one of the two forms has, with the form that has it named. */
export type PassageOfForm = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  readonly role: PrimitiveRole | null
  /** The form this passage is in. The other form does not have this node at all. */
  readonly audienceId: AudienceId
  /** The passage itself, as that form's own window read it. */
  readonly passage: Passage
  /** What that form's window said about reaching it. */
  readonly side: PassageSide
}

/**
 * One passage both forms say, word for word, as each form's own readers read it.
 *
 * The comparable unit of this module. The text is identical on both sides, so
 * nothing here is about the deltas having said something different and
 * everything is about which readership gets to it.
 */
export type ComparedFormPassage = {
  readonly nodeId: NodeId
  /** The type {@link FormCopyComparison.one} gives it; `disagreed` names the pair if the other differs. */
  readonly type: PrimitiveType
  readonly role: PrimitiveRole | null
  /** The words, the same number on both sides because they are the same words. */
  readonly words: number
  /** The text itself, so a passage can be quoted back without a second join. */
  readonly text: readonly string[]
  /**
   * Whether either form's part declares no `copy`, so {@link words} is a floor.
   *
   * The visible words are the same on both sides; what a floor withholds is
   * whether there are more. A form may be floored where the other is not, when
   * a prop no type declares holds something for one audience and nothing for
   * the other — so this is either side, and the figures it qualifies are
   * qualified for both.
   */
  readonly floored: boolean
  readonly one: PassageSide
  readonly other: PassageSide
  /**
   * The form whose readers reached this passage more often, or `null` where no
   * claim stands.
   *
   * **Read off the two reaches rather than off {@link gap}**, which is the
   * module documentation's one departure from the two sibling comparisons: a
   * reach is exact where a word count is a floor (0122), so the direction
   * survives an undeclared `copy` prop and the magnitude does not.
   *
   * `null` with a `gap` of nought is the two forms reaching it alike; `null`
   * with a `gap` of `null` is nothing being sayable. The two are a long way
   * apart and are deliberately not one value.
   */
  readonly favours: AudienceId | null
  /**
   * The words this passage puts in front of one form's average reader over and
   * above the other's: `words × |one.reach − other.reach|`.
   *
   * Never signed — the direction is in {@link favours}, because a sign is read
   * against an order and the order here is the alphabet of two audience names
   * and means nothing (0302).
   *
   * `null` where either side held no views **or** either side's standing is
   * `unknown` (0282): a reach of nought that is a missing counter is not a
   * reader who did not arrive, and subtracting against it would publish the
   * other form's whole reach as a difference between two populations.
   *
   * A floor on {@link words} scales it toward nought and cannot change the form
   * it is about, so it is published where the page figures are withheld.
   */
  readonly gap: number | null
}

/**
 * One passage both forms have and neither says the same way.
 *
 * Kept and reported rather than dropped, for the reason `copyChangeOf` keeps a
 * reworded passage: *the two forms say different things here* is the answer
 * somebody most needs, and a comparison that silently kept only the text the
 * deltas left alone would be quietest about the passages the deltas were
 * actually aimed at.
 *
 * No {@link ComparedFormPassage.gap}, because a word-weighted figure needs one
 * word count and there are two. The standings and the reaches are each true of
 * their own form and are carried, with the rewording as the confound a reader
 * of them has to hold: a passage that is shorter for one audience is easier for
 * that audience to finish, so a difference here is not attributable the way a
 * shared passage's is.
 */
export type RewordedFormPassage = {
  readonly nodeId: NodeId
  /** The type {@link FormCopyComparison.one} gives it. */
  readonly type: PrimitiveType
  readonly role: PrimitiveRole | null
  /** The two word counts, which is why there is no single one. */
  readonly words: { readonly one: number; readonly other: number }
  /** Whether either form declares no `copy`, so its word count is a floor. */
  readonly floored: boolean
  readonly one: PassageSide
  readonly other: PassageSide
  /**
   * The form that says more words here, or `null` where the two say as many
   * words differently.
   *
   * The sentence this whole reading was asked for — *the pro form says four
   * hundred words in this band and the free form says ninety* — published
   * rather than left to a surface to subtract, so that two screens cannot
   * disagree about which way round it is. It is a fact about the deltas and
   * about no reader, and under a floor it is the one claim here that can be
   * wrong: an undeclared `copy` prop understates one side only.
   */
  readonly wordier: AudienceId | null
}

/**
 * What the two forms say, and what the deltas gave only one of them.
 *
 * **Exact.** No reader is in any of these figures, so none of them carries the
 * straddle (0147), the view floor (0212) or the traffic sensitivity a standing
 * has. The two composed trees say this between them, and a window with no views
 * at all reports it in full.
 *
 * Deliberately not spelled as a change's census: there is no `added` and no
 * `removed`, because neither form is earlier and one audience's extra band is
 * not a band anybody wrote last. What a change wrote is `CopyChange.wrote`, and
 * the two are different questions with the same arithmetic underneath.
 */
export type WordsOfForms = {
  /** Words both forms say, word for word, in a node both forms have. */
  readonly shared: number
  /** Words of passages exactly one form has, by form. */
  readonly only: { readonly one: number; readonly other: number }
  /**
   * Those words, by what each form's own window said about reaching them. Each
   * form's three add to its own {@link only}.
   *
   * *Of the three hundred words the pro form says and the free form never sees,
   * forty have been reached.* It is the one figure here about words the other
   * form's readers could not have read, so it has no comparison and needs none.
   */
  readonly onlyByStanding: {
    readonly one: Readonly<Record<PartStanding, number>>
    readonly other: Readonly<Record<PartStanding, number>>
  }
  /** Words of passages both forms have and neither says the same way, by form. */
  readonly reworded: { readonly one: number; readonly other: number }
}

/** How the shared passages fell, as a count over one set and never a mean. */
export type FormCopyCounted = {
  /** Passages {@link FormCopyComparison.one}'s readers reached more often. */
  readonly one: number
  /** Passages {@link FormCopyComparison.other}'s readers reached more often. */
  readonly other: number
  /** Passages the two forms reached alike. */
  readonly alike: number
  /** Passages where one form or the other cannot say. */
  readonly unknown: number
}

/**
 * The shared words each form's average reader got to, and the distance between
 * them.
 *
 * The one page-level claim this reading makes, sound because a passage's words
 * are its own and partition the page exactly once (0235). Both sides are over
 * **one** set of passages — the shared ones both windows can speak for — so the
 * two means are of the same words and are comparable in the way two whole-page
 * means over two forms' own parts would not be.
 */
export type SharedWordsRead = {
  /** `Σ(readers × words) ÷ views` for {@link FormCopyComparison.one}. */
  readonly one: number
  /** The same for {@link FormCopyComparison.other}. */
  readonly other: number
  /**
   * `|one − other|`, with the direction in {@link favours}.
   *
   * **Not the sum of the rows' gaps**, and the difference is the module
   * documentation's: a row's gap is unsigned, so two passages favouring opposite
   * forms add there and cancel here.
   */
  readonly gap: number
  /** The form whose average reader got to more of the shared words. */
  readonly favours: AudienceId | null
}

/**
 * What two forms of one page say, and how much of the shared text each one's
 * readers reach.
 *
 * There is no `treeId` or `revision` at the top, where every reading of one
 * page has one, for the reason 0302 gives: this is a reading of two sides
 * rather than of one page, and the two refusals that matter most are exactly
 * the two where picking one side's would be picking one of two answers.
 */
export type FormCopyComparison = {
  /** The side whose audience id sorts lower, or the first argument where no pair of names stands. */
  readonly one: FormCopySide
  readonly other: FormCopySide
  /** The two copy readings this comparison was taken from, so nothing downstream derives them twice. */
  readonly readings: { readonly one: CopyReading; readonly other: CopyReading }
  /** The census of what each form says, with no reader in it. */
  readonly says: WordsOfForms
  /** Passages both forms say the same way, in the reading order of {@link one}. */
  readonly compared: readonly ComparedFormPassage[]
  /** Passages both forms have and neither says the same way, in the same order. */
  readonly reworded: readonly RewordedFormPassage[]
  /** Passages exactly one form has, by audience and then by node. */
  readonly onlyIn: readonly PassageOfForm[]
  /**
   * Shared nodes the two forms give different primitive types.
   *
   * Reported and not dropped, as both sibling comparisons report it: the two
   * reaches are each their own form's and stay comparable, while a node that is
   * a band on one side and a card on the other is a fact about the deltas
   * nobody would otherwise see.
   */
  readonly disagreed: readonly NodeId[]
  /** Shared passages by which form's readers reached them more often. */
  readonly counted: FormCopyCounted
  /**
   * The words those passages say, falling the same way. The four add to
   * {@link WordsOfForms.shared}.
   *
   * Published beside {@link counted} because the two survive different things:
   * a count of passages is right under a floor — a part that declares no `copy`
   * is one part whatever it is hiding — and a count of words is not. A surface
   * that has to be right about mass reads this row and a surface that has to be
   * right under a floor reads the other.
   */
  readonly wordsCounted: FormCopyCounted
  /** Shared passages whose words are a floor. */
  readonly floored: number
  /**
   * The shared passages neither form's readers reached, most words first and
   * then in reading order.
   *
   * The words the deltas have not managed to put in front of anybody, which is
   * the list a person can act on without reading anything else. Ranked by words
   * for the reason one window's reading ranks them (0235): the passage nobody
   * saw that costs the page most is the long one, not the first one.
   *
   * `skipped` on **both** sides only. A passage `unknown` on either side is in
   * {@link wordsCounted} where it can be seen and not acted on, because putting
   * it here would turn *nothing can be said* into *nobody read this*.
   */
  readonly unseenByEither: readonly ComparedFormPassage[]
  /** The shared words each form's average reader got to; `null` where {@link silence} says why not. */
  readonly typical: SharedWordsRead | null
  /**
   * The shared passage the two forms read most differently, by node id where
   * two tie.
   *
   * By {@link ComparedFormPassage.gap} — words weighted by readers — rather than
   * by the difference in reach, which is the ranking rule a fall between two
   * siblings already uses (0221). There is no page row to exclude here, which
   * both siblings have: a passage's words are its own and never its subtree's,
   * so the root's passage is one row among the others and contains none of them.
   */
  readonly sharpest: ComparedFormPassage | null
  readonly silence: FormCopySilence | null
}

const ZERO_BY_STANDING: Readonly<Record<PartStanding, number>> = Object.freeze({
  read: 0,
  skipped: 0,
  unknown: 0,
})

const NOTHING_COUNTED: FormCopyCounted = Object.freeze({
  one: 0,
  other: 0,
  alike: 0,
  unknown: 0,
})

const NOTHING_SAID: WordsOfForms = Object.freeze({
  shared: 0,
  only: Object.freeze({ one: 0, other: 0 }),
  onlyByStanding: Object.freeze({ one: ZERO_BY_STANDING, other: ZERO_BY_STANDING }),
  reworded: Object.freeze({ one: 0, other: 0 }),
})

const sideOf = (reading: CopyReading, audienceId: AudienceId | null): FormCopySide => ({
  treeId: reading.treeId,
  revision: reading.revision,
  audienceId,
  views: reading.views,
  words: reading.words,
  passages: reading.passages.length,
  spoken: reading.spoken,
})

/**
 * Whether two passages say the same thing, in order.
 *
 * The visible words, which is what every figure here divides by. A part may be
 * floored in one form and not the other while these agree — a prop no type
 * declares holding something for one audience and nothing for the next — and
 * that is what {@link ComparedFormPassage.floored} carries rather than a third
 * category.
 */
const sameText = (one: readonly string[], other: readonly string[]): boolean =>
  one.length === other.length && one.every((value, at) => value === other[at])

/**
 * Whether a passage is worth a row at all.
 *
 * The rule `copyReadingOf` applies to one side, applied to the pair: a part
 * that says nothing in either form and is hiding nothing in either form has no
 * words for this module to be about. A floored part is kept because *this may
 * say something nothing here can see* is not *this says nothing* (0122).
 */
const saysSomething = (sides: readonly Passage[]): boolean =>
  sides.some((passage) => passage.words > 0 || passage.floored)

/**
 * The gap, and the rule that withholds it.
 *
 * Both sides have to be spoken for before a difference between them is a
 * difference between two populations rather than between a measurement and a
 * missing row (0282) — which is `formComparisonOf`'s own check, needed here for
 * the same reason it is needed there: a passage's standing and its reach are two
 * fields, where `PartAction.share` is absent in exactly the states its standing
 * calls unknown and so needs one check (0303, 0304).
 */
const gapOf = (words: number, one: PassageSide, other: PassageSide): number | null =>
  one.reach === null ||
  other.reach === null ||
  !spokenFor(one.standing) ||
  !spokenFor(other.standing)
    ? null
    : words * Math.abs(one.reach - other.reach)

/** The two names, in the order the pair settled on, which every direction is read against. */
type Forms = { readonly one: AudienceId; readonly other: AudienceId }

/**
 * The form with the larger of two figures, or `null` where the two are equal.
 *
 * Spelled once because this reading points at a form four times — a passage's
 * readers, a passage's words, the page's readers and the page's own census —
 * and four spellings of *larger* is four chances to read the pair backwards.
 */
const favouring = (one: number, other: number, forms: Forms): AudienceId | null => {
  if (one === other) return null

  return one > other ? forms.one : forms.other
}

/**
 * The form whose readers reached a passage more often.
 *
 * Off the two reaches and not off the gap, for the reason
 * {@link ComparedFormPassage.favours} gives: a floored passage of no visible
 * words has a gap of nought and a direction that is still a measurement.
 */
const favouredBy = (
  gap: number | null,
  one: PassageSide,
  other: PassageSide,
  forms: Forms
): AudienceId | null =>
  gap === null ? null : favouring(one.reach ?? 0, other.reach ?? 0, forms)

/**
 * Which column of the census a shared passage falls in, spelled once because it
 * is counted twice — over passages and over the words they say.
 */
const fallOf = (
  gap: number | null,
  favours: AudienceId | null,
  forms: Forms
): keyof FormCopyCounted => {
  if (gap === null) return "unknown"
  if (favours === null) return "alike"

  return favours === forms.one ? "one" : "other"
}

/**
 * Every part of a reading as a passage, keyed by node.
 *
 * Over **every** part rather than over the reading's own passages, because a
 * part one form's deltas emptied is a node both forms have and word a form
 * stopped saying — and a filtered map would call it a part only one form has.
 */
const passagesOf = (reading: PageReading): ReadonlyMap<NodeId, Passage> =>
  new Map(reading.parts.map((part) => [part.nodeId, passageOf(part)]))

/** A word total over anything carrying one, which is a passage or a row about one. */
const wordsOf = (counted: readonly { readonly words: number }[]): number =>
  counted.reduce((total, each) => total + each.words, 0)

const wordsByStandingOf = (
  passages: readonly Passage[]
): Readonly<Record<PartStanding, number>> =>
  passages.reduce<Record<PartStanding, number>>(
    (counted, passage) => ({
      ...counted,
      [passage.standing]: counted[passage.standing] + passage.words,
    }),
    { ...ZERO_BY_STANDING }
  )

/** Descending by words, strictly, so equal passages keep the order they arrived in. */
const byWordsUnseen = (one: ComparedFormPassage, other: ComparedFormPassage): number =>
  other.words - one.words

/**
 * Why there is no reader figure, in the order a pair is in more than one of
 * these.
 *
 * Four of the five orderings are reachable by a single pair and each has a
 * fixture: a wordless page in an empty window, an empty window whose standings
 * are all unknown, an unshared pair with no spoken-for shared word, and a
 * floored passage nothing can speak for. The rule throughout is the one 0282
 * settled: the state with a remedy a deployment holds is named before the state
 * that is a consequence of it.
 */
const silenceOf = (
  words: { readonly one: number; readonly other: number },
  readings: { readonly one: CopyReading; readonly other: CopyReading },
  shared: number,
  spoken: number,
  floored: number
): FormCopySilence | null => {
  if (words.one === 0 && words.other === 0) return "wordless"
  if (readings.one.views === 0 || readings.other.views === 0) return "nothing-measured"
  if (readings.one.silence === "inconsistent" || readings.other.silence === "inconsistent") {
    return "inconsistent"
  }
  if (shared === 0) return "unshared"
  if (spoken === 0) return "unspoken"

  return floored > 0 ? "floored" : null
}

/**
 * Hold what two forms of one page say, and the reading of what they share,
 * against each other.
 *
 * Takes two page readings, each of one audience, of one tree at one revision,
 * and derives a copy reading of each — handed two readings rather than two
 * finished `CopyReading`s for the reason `copyChangeOf` is: one input per side
 * cannot be a mismatched pair, the census needs the parts a copy reading leaves
 * out, and the two it derives travel on the comparison so nothing downstream
 * pays for them twice.
 *
 * The labels are not `was` and `now` and the order of the arguments does not
 * reach the answer: see `formPairOf`, and {@link FormCopySilence} for the eleven
 * states in which there is no figure.
 */
export const formCopyComparisonOf = (
  one: PageReading,
  other: PageReading
): FormCopyComparison => {
  const pair = formPairOf(one, other)
  const readings = { one: copyReadingOf(pair.one), other: copyReadingOf(pair.other) }

  if (pair.pairing === "refused")
    return {
      one: sideOf(readings.one, pair.one.audienceId),
      other: sideOf(readings.other, pair.other.audienceId),
      readings,
      says: NOTHING_SAID,
      compared: [],
      reworded: [],
      onlyIn: [],
      disagreed: [],
      counted: NOTHING_COUNTED,
      wordsCounted: NOTHING_COUNTED,
      floored: 0,
      unseenByEither: [],
      typical: null,
      sharpest: null,
      silence: pair.refusal,
    }

  const audiences = pair.audiences
  const held = { one: passagesOf(pair.one), other: passagesOf(pair.other) }
  const views = { one: pair.one.views, other: pair.other.views }

  const compared: ComparedFormPassage[] = []
  const reworded: RewordedFormPassage[] = []
  const onlyIn: PassageOfForm[] = []
  const disagreed: NodeId[] = []
  const only = { one: [] as Passage[], other: [] as Passage[] }
  const counted = { ...NOTHING_COUNTED }
  const wordsCounted = { ...NOTHING_COUNTED }

  for (const [nodeId, passage] of held.one) {
    const across = held.other.get(nodeId)

    if (across === undefined) {
      if (!saysSomething([passage])) continue

      only.one.push(passage)
      onlyIn.push({
        nodeId,
        type: passage.type,
        role: passage.role,
        audienceId: audiences.one,
        passage,
        side: passageSideOf(passage, views.one),
      })
      continue
    }

    if (!saysSomething([passage, across])) continue
    if (across.type !== passage.type) disagreed.push(nodeId)

    const shared = {
      nodeId,
      type: passage.type,
      role: passage.role,
      floored: passage.floored || across.floored,
      one: passageSideOf(passage, views.one),
      other: passageSideOf(across, views.other),
    }

    if (!sameText(passage.text, across.text)) {
      const words = { one: passage.words, other: across.words }

      reworded.push({
        ...shared,
        words,
        wordier: favouring(words.one, words.other, audiences),
      })
      continue
    }

    const gap = gapOf(passage.words, shared.one, shared.other)
    const favours = favouredBy(gap, shared.one, shared.other, audiences)
    const fall = fallOf(gap, favours, audiences)

    counted[fall] += 1
    wordsCounted[fall] += passage.words

    compared.push({ ...shared, words: passage.words, text: passage.text, favours, gap })
  }

  for (const [nodeId, passage] of held.other) {
    if (held.one.has(nodeId)) continue
    if (!saysSomething([passage])) continue

    only.other.push(passage)
    onlyIn.push({
      nodeId,
      type: passage.type,
      role: passage.role,
      audienceId: audiences.other,
      passage,
      side: passageSideOf(passage, views.other),
    })
  }

  const says: WordsOfForms = {
    shared: wordsOf(compared),
    only: { one: wordsOf(only.one), other: wordsOf(only.other) },
    onlyByStanding: {
      one: wordsByStandingOf(only.one),
      other: wordsByStandingOf(only.other),
    },
    reworded: {
      one: reworded.reduce((total, passage) => total + passage.words.one, 0),
      other: reworded.reduce((total, passage) => total + passage.words.other, 0),
    },
  }

  /**
   * The shared passages both windows can speak for, which the page figures are
   * taken over.
   *
   * One set and therefore the same set on both sides, which is the property
   * that makes the two means comparable: a passage counted for one form and
   * dropped for the other would read as a difference between two populations
   * that is a difference between two sets of words.
   */
  const spoken = compared.filter((passage) => passage.gap !== null)
  const floored = compared.filter((passage) => passage.floored).length

  const silence = silenceOf(
    { one: readings.one.words, other: readings.other.words },
    readings,
    says.shared,
    wordsOf(spoken),
    floored
  )

  /**
   * Each form's own mean over the shared spoken-for passages, guarded by the
   * silence rather than clamped: a figure held back with a stated cause is one
   * somebody can act on, and one quietly cut to fit its own ceiling is not
   * (0235).
   */
  const typicalOf = (): SharedWordsRead => {
    const words = {
      one:
        spoken.reduce((total, passage) => total + passage.one.readers * passage.words, 0) /
        views.one,
      other:
        spoken.reduce((total, passage) => total + passage.other.readers * passage.words, 0) /
        views.other,
    }

    return {
      ...words,
      gap: Math.abs(words.one - words.other),
      favours: favouring(words.one, words.other, audiences),
    }
  }

  return {
    one: sideOf(readings.one, audiences.one),
    other: sideOf(readings.other, audiences.other),
    readings,
    says,
    compared,
    reworded,
    onlyIn: [...onlyIn].sort(
      (a, b) => a.audienceId.localeCompare(b.audienceId) || a.nodeId.localeCompare(b.nodeId)
    ),
    disagreed: [...disagreed].sort((a, b) => a.localeCompare(b)),
    counted,
    wordsCounted,
    floored,
    unseenByEither: compared
      .filter(
        (passage) => passage.one.standing === "skipped" && passage.other.standing === "skipped"
      )
      .sort(byWordsUnseen),
    typical: silence === null ? typicalOf() : null,
    sharpest: compared.reduce<ComparedFormPassage | null>((widest, passage) => {
      if (passage.gap === null) return widest
      if (widest === null || widest.gap === null) return passage
      if (passage.gap > widest.gap) return passage

      return passage.gap === widest.gap && passage.nodeId.localeCompare(widest.nodeId) < 0
        ? passage
        : widest
    }, null),
    silence,
  }
}
