import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"

import { copyReadingOf, passageOf, type CopyReading, type Passage } from "./copy.js"
import type { PageReading, PartStanding } from "./parts.js"

/**
 * What a change did to what a page says, and to how much of it gets read.
 *
 * [`copy.ts`](copy.ts) answers *this page says twelve hundred words, the average
 * reader got to two hundred and sixty, and the three hundred nobody saw are
 * these* — of **one window of one revision**. The sentence a change is judged
 * by is the next one: *the words nobody read last week are read now*, or the
 * worse one, *the three hundred words this change added are words nobody has
 * reached.* That is the question [`change.ts`](change.ts) asks of where reading
 * stops, asked of text instead.
 *
 * It is the **ninth** thing taken out of the server-side join rather than
 * collected: nothing was added to a payload, a browser, a column, a store or
 * the vocabulary, and the broadcaster was not touched.
 *
 * ## The figure that looks like the answer and is not
 *
 * `now.wordsByStanding.read − was.wordsByStanding.read`. It is the subtraction
 * anybody would write first and it answers two questions at once: a change that
 * adds four hundred words readers all reach raises it by four hundred while
 * making the page **less** read as a share of itself. The page got longer and
 * the reading got worse, and one number says *better*.
 *
 * So the unit here is **the words both revisions say**, which this calls the
 * *carried* words. Identical text on both sides means the only thing that can
 * differ is the reading of it, and every reader figure below is of those words
 * alone. What the change wrote — {@link WordsWritten.added},
 * {@link WordsWritten.removed}, {@link WordsWritten.reworded} — is reported
 * beside them as a census of the page rather than of its readers, because it is
 * exact: no reader is in it, so neither is any of the error every count in this
 * subsystem carries.
 *
 * That census is the half worth having on its own. *The change took two hundred
 * words away and readers had never got to a hundred and eighty of them* is the
 * sentence that says a change was right, and
 * {@link WordsWritten.removedByStanding} is the whole of it.
 *
 * ## Two reader figures, and only one of them is comparable
 *
 * **A standing is not.** `read` means *at least one reader reached this*
 * (0212), so a quiet window marks parts `skipped` that a busy one marks `read`,
 * and {@link PassageMovement} therefore moves with traffic as well as with
 * reading. It is still the sentence a person wants — *these words were never
 * seen and now they are* — so it is reported, named as a movement rather than
 * as an improvement, and never divided by anything.
 *
 * **A share of a side's own views is.** {@link PassageSide.reach} is
 * `readers ÷ views` off one side's own rows, so each side's straddle
 * over-count (0147) has very nearly divided out before the two sides meet —
 * which is [0221](../../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)'s
 * cancellation and
 * [0224](../../decisions/0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)'s
 * rule for comparing two revisions, applied to a passage rather than to a pair
 * of siblings. {@link ComparedPassage.gain} weights that difference by the
 * passage's words, so it reads *this passage put forty more words in front of
 * the average reader*, and the gains add up across passages for the one reason
 * 0235 published: a part's own words partition the page exactly once.
 *
 * ## Where a position matters and here it does not
 *
 * A passage the change **moved** is compared like any other. Nothing here
 * divides by a depth, an index or a parent, so a band dragged to the top of the
 * page keeps its identity and its words and the comparison is about reading
 * them. That is the one place this reading is more forgiving than 0224's, where
 * a sibling that moved dissolves the pair it was half of — a pair is a position
 * by construction and a passage is not.
 *
 * ## What a floor can and cannot do to this
 *
 * A type that declares no `copy` (0122) leaves a passage short of words nothing
 * here can see, and
 * [0235](../../decisions/0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)
 * refused to publish a mean of floored words at all. One half of that refusal
 * does not reach a comparison and the other half does, and the difference is
 * worth being exact about:
 *
 * - **A single passage's {@link ComparedPassage.gain} survives a floor.** The
 *   same words are on both sides, so an understated word count scales the gain
 *   toward zero and cannot flip its sign. *At least this many words moved* is a
 *   safe claim, which is more than 0235 could say of one window.
 * - **The page's total does not.** {@link CopyChange.typical} adds signed terms
 *   that floors scale by **different** factors, so a floored passage that
 *   gained and an exact one that lost can sum to a regression where the truth
 *   is an improvement. So it is withheld under a floor, exactly as 0235
 *   withholds `typical`, and the per-passage gains are left standing.
 *
 * Pure, linear in the parts of the two readings, and reaches no store, clock or
 * DOM. A caller checks `PageReading.orphaned` on both readings before trusting
 * either, as it must before trusting either copy reading.
 */

/** Why a comparison of two windows' words answered nothing. */
export type CopyChangeSilence =
  /**
   * The two readings are of different trees.
   *
   * Nothing is comparable and nothing is countable: two pages are two pages,
   * and the plausible-false-number failure here is a screen reporting that a
   * change deleted every word of a page it was never about. Spelled as
   * `ChangeSilence` spells it, because a surface drawing both comparisons of
   * one change should not meet two names for one state.
   */
  | "different-trees"
  /** Neither revision says anything that could have been read. */
  | "wordless"
  /**
   * One of the two windows held no page views.
   *
   * Every standing on that side is `unknown` (`parts.ts`) and that side has no
   * `reach`, so there is nothing to compare a share against. **The census still
   * answers**, because what a change did to the words is a fact about the two
   * trees: *this change added three hundred words and took two hundred away,
   * and nothing has been measured since* is true and is worth saying.
   */
  | "nothing-measured"
  /**
   * A passage reports more readers than its side of the page has views.
   *
   * Carried through from whichever reading said it (0235), where it is the
   * alarm for a reading assembled by hand or by a sender that is not one. The
   * per-passage figures are left in place rather than hidden, because a `reach`
   * above 1 is the visible evidence and withholding it would hide the fault
   * while leaving the screen drawable.
   */
  | "inconsistent"
  /**
   * The change left no word of the page as it was.
   *
   * Every word is added, removed or reworded, so there is no carried text for a
   * reader figure to be about. The census answers in full and is the whole of
   * what can be said: a page rewritten end to end has no before and after of
   * its own words, only a before and an after.
   */
  | "dissolved"
  /**
   * Some carried passage's words are a floor, so a page-wide mean of them is
   * neither a count nor a ceiling.
   *
   * The reason is in the module documentation, and it is not the reason one
   * window has for withholding the same figure (0235): the floors scale the
   * signed terms of the sum unequally, so the total can read as a regression
   * where the truth is an improvement. Each passage's own
   * {@link ComparedPassage.gain} is unaffected in sign and stays published.
   */
  | "floored"

/** The closed set, for a surface that has to account for every reason a figure is absent. */
export const COPY_CHANGE_SILENCES: readonly CopyChangeSilence[] =
  everyMemberOf<CopyChangeSilence>()([
    "different-trees",
    "wordless",
    "nothing-measured",
    "inconsistent",
    "dissolved",
    "floored",
  ])

/** One line per silence, for a surface saying why a figure is not there. */
export const describeCopyChangeSilence = (silence: CopyChangeSilence): string => {
  switch (silence) {
    case "different-trees":
      return "the two readings are of different pages"
    case "wordless":
      return "neither revision says anything that could be read"
    case "nothing-measured":
      return "one of the two windows held no page views"
    case "inconsistent":
      return "a passage reports more readers than its page has views, which no rollup produces"
    case "dissolved":
      return "the change left no word of the page as it was, so there is nothing to compare"
    case "floored":
      return "some carried passage declares no copy, so a page-wide mean of its words would not be a ceiling"
  }
}

/**
 * What happened to the reading of one passage whose words did not change.
 *
 * A standing and not a rate, so it moves with how many readers there were as
 * well as with how far they got — which is why it is named for the movement and
 * not for the verdict. {@link ComparedPassage.gain} is the figure that is a
 * rate.
 */
export type PassageMovement =
  /** Reached on both sides. */
  | "held"
  /** Nobody reached it and now somebody does, which is the sentence a change is made for. */
  | "gained"
  /** Somebody reached it and now nobody does. */
  | "lost"
  /** Nobody reached it on either side — the words a change did not fix. */
  | "unread"
  /**
   * One side cannot be spoken for.
   *
   * Its window held no views at all, or the passage reported something other
   * than coming into view, so `skipped` would be a claim nobody made (0212).
   */
  | "unknown"

/** The closed set, for a surface accounting for every passage it was handed. */
export const PASSAGE_MOVEMENTS: readonly PassageMovement[] = everyMemberOf<PassageMovement>()([
  "held",
  "gained",
  "lost",
  "unread",
  "unknown",
])

/** One line per movement, for a surface putting a passage in front of a person. */
export const describePassageMovement = (movement: PassageMovement): string => {
  switch (movement) {
    case "held":
      return "readers reached it before and reach it now"
    case "gained":
      return "nobody reached it before and somebody does now"
    case "lost":
      return "somebody reached it before and nobody does now"
    case "unread":
      return "nobody reached it before or now"
    case "unknown":
      return "one of the two windows cannot say whether it was reached"
  }
}

/** What one window said about one passage. */
export type PassageSide = {
  readonly standing: PartStanding
  /** Distinct page views that reported the part coming into view; `0` where no row named it. */
  readonly readers: number
  /** That side's page-view floor, carried through so the share below can be checked. */
  readonly views: number
  /**
   * {@link readers} over {@link views}, and `null` where the window held none.
   *
   * A ceiling on the share of that window's readers who reached the passage:
   * `reached` is generous by the page views that straddled a rollup window
   * (0147) and `views` is a floor on the page views there were (0212), so the
   * numerator leans up and the denominator leans down. It is the figure the two
   * sides are compared on, because the same inflation is in both terms of each
   * side and has very nearly divided out before the sides meet.
   *
   * Above 1 is the input `inconsistent` names. It is not clamped: a figure cut
   * to fit its own ceiling is a fault made undrawable rather than visible.
   */
  readonly reach: number | null
}

/**
 * One passage both revisions say, word for word, as two windows read it.
 *
 * The comparable unit of this module. The text is identical on both sides, so
 * nothing here is about the page having changed and everything is about the
 * reading of it.
 */
export type ComparedPassage = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  readonly role: PrimitiveRole | null
  /** The words, the same number on both sides because they are the same words. */
  readonly words: number
  /** The text itself, so a passage can be quoted back without a second join. */
  readonly text: readonly string[]
  /**
   * Whether either side's part declares no `copy`, so {@link words} is a floor.
   *
   * The visible words are the same on both sides; what a floor withholds is
   * whether there are more. A side may be floored where the other is not, when
   * a prop a type does not declare holds something on one revision and nothing
   * on the other — so this is either side, and the figures it qualifies are
   * qualified for both.
   */
  readonly floored: boolean
  readonly was: PassageSide
  readonly now: PassageSide
  readonly movement: PassageMovement
  /**
   * The words this passage newly put in front of the average reader:
   * `words × (now.reach − was.reach)`.
   *
   * Negative where readers lost ground, and `null` where either side held no
   * views. It adds across passages — a part's own words partition the page
   * exactly once (0235) — and the sum is {@link CopyChange.typical}'s `change`.
   *
   * A floor on {@link words} scales it toward zero and cannot change its sign,
   * which is why it is published where the page total is withheld.
   */
  readonly gain: number | null
}

/**
 * One passage the change rewrote, as two windows read it.
 *
 * Kept and reported rather than dropped, for 0224's reason at the level of
 * text: *the words were changed and readers still do not reach them* is the
 * answer somebody most needs, and a comparison that silently kept only
 * untouched text would be quietest about the passages a change was actually
 * aimed at.
 *
 * No {@link ComparedPassage.gain}, because a word-weighted figure needs one
 * word count and there are two. The standings and the reaches are each true of
 * their own side and are carried, with the rewording as the confound a reader of
 * them has to hold: a passage that got shorter is easier to finish, so a
 * movement here is not attributable the way a carried passage's is.
 */
export type RewordedPassage = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  readonly role: PrimitiveRole | null
  /** The two word counts, which is why there is no single one. */
  readonly words: { readonly was: number; readonly now: number }
  /** Whether either side declares no `copy`, so its word count is a floor. */
  readonly floored: boolean
  readonly was: PassageSide
  readonly now: PassageSide
  readonly movement: PassageMovement
}

/**
 * What the change did to the words themselves.
 *
 * **Exact.** No reader is in any of these figures, so none of them carries the
 * straddle (0147), the view floor (0212) or the traffic sensitivity a standing
 * has. The two trees say this between them, and a window with no views at all
 * reports it in full.
 */
export type WordsWritten = {
  /**
   * Words both revisions say, word for word — the universe every reader figure
   * here is about.
   */
  readonly carried: number
  /** Words only the later revision says. */
  readonly added: number
  /**
   * {@link added}, by what the later window said about reaching them. The three
   * add to {@link added}.
   *
   * *Of the three hundred words this change wrote, forty have been reached.* It
   * is the one figure here that is about words nobody could have read before,
   * so it has no comparison and needs none.
   */
  readonly addedByStanding: Readonly<Record<PartStanding, number>>
  /** Words only the earlier revision says. */
  readonly removed: number
  /**
   * {@link removed}, by what the earlier window said about reaching them. The
   * three add to {@link removed}.
   *
   * *The change took two hundred words away and nobody had reached a hundred and
   * eighty of them* is a change that was right, and the opposite reading of the
   * same row is the one worth stopping for.
   */
  readonly removedByStanding: Readonly<Record<PartStanding, number>>
  /** Words of passages both revisions have and neither says the same way. */
  readonly reworded: { readonly was: number; readonly now: number }
}

/** A word total, before and after, with the subtraction done once. */
export type WordCount = {
  readonly was: number
  readonly now: number
  readonly change: number
}

/**
 * What a change did to what a page says and to how much of it is read.
 *
 * Two readings in, one comparison out. The two {@link CopyReading}s it derives
 * are returned, so nothing downstream computes them twice and every whole-page
 * figure — including each side's own `share` and `typical` — is one field away
 * without a second join.
 */
export type CopyChange = {
  /** The earlier reading's tree. The two agree unless `silence` is `different-trees`. */
  readonly treeId: TreeId
  readonly revisions: { readonly was: number; readonly now: number }
  /** The two copy readings this comparison is made of. */
  readonly readings: { readonly was: CopyReading; readonly now: CopyReading }
  /**
   * Every word each revision says, counted once, and the difference.
   *
   * Exact on both sides and comparable without qualification, which no other
   * pair of figures in this subsystem is: a page's words are a property of its
   * tree and no reader is in them.
   */
  readonly words: WordCount
  /** The census of what the change wrote, with no reader in it. */
  readonly wrote: WordsWritten
  /**
   * Every passage both revisions say identically, in the **later** reading's
   * reading order.
   *
   * The later order because that is the page somebody is looking at, and a
   * passage's place in it is where they would find it. A before-and-after of
   * where reading stops orders its pairs by the earlier reading instead (0224),
   * because a pair is a position by construction and cannot survive being moved;
   * a passage can, so the two modules order their rows differently on purpose.
   */
  readonly compared: readonly ComparedPassage[]
  /** Every passage both revisions have and neither says the same way, in the later order. */
  readonly reworded: readonly RewordedPassage[]
  /** Every passage only the later revision has, in its reading order. */
  readonly added: readonly Passage[]
  /** Every passage only the earlier revision had, in the earlier reading order. */
  readonly removed: readonly Passage[]
  /**
   * Carried words by what happened to the reading of them. The five add to
   * {@link WordsWritten.carried}.
   */
  readonly wordsByMovement: Readonly<Record<PassageMovement, number>>
  /**
   * Carried passages by the same. The five add to {@link compared}'s length.
   *
   * Published beside the word totals because a count of passages **survives a
   * floor** where a count of words does not: a part that declares no `copy` is
   * one part whatever it is hiding. A surface that has to be right about
   * direction under a floor reads this row.
   */
  readonly passagesByMovement: Readonly<Record<PassageMovement, number>>
  /** Carried passages whose words are a floor, which is what `floored` counts. */
  readonly floored: number
  /**
   * The carried passages nobody reached on either side, most words first and
   * then in the later reading order.
   *
   * The words a change did not fix, which is the list a person can act on
   * without reading anything else. Ranked by words for the reason one window's
   * reading ranks them (0235): the passage nobody saw that costs the page most is
   * the long one, not the first one.
   *
   * `unread` only. A passage whose standing is `unknown` on either side is in
   * {@link wordsByMovement} where it can be seen and not acted on, because
   * putting it here would turn *nothing can be said* into *nobody read this*.
   */
  readonly stillUnseen: readonly ComparedPassage[]
  /**
   * The carried words the average reader got to, before and after. `null` where
   * {@link silence} says why not.
   *
   * Each side is `Σ(readers × words) ÷ views` over the carried passages of that
   * side — the same arithmetic as `CopyReading.typical` and a ceiling for the
   * same two reasons, restricted to the words both revisions say so that the
   * page having grown or shrunk is not in it. `change` is the sum of every
   * {@link ComparedPassage.gain}.
   *
   * Each side's own whole-page figure is on `readings.was.typical` and
   * `readings.now.typical`, and those two are **not** comparable: a page that
   * lost four hundred words lowers the second without anybody having read less.
   */
  readonly typical: WordCount | null
  /**
   * The carried passage the change put most words in front of the average
   * reader, and `null` where none gained any.
   *
   * By {@link ComparedPassage.gain} — words weighted by readers — rather than by
   * the change in `reach`, which is the ranking rule a fall between two siblings
   * already uses (0221): a long passage a tenth of readers newly reach is worth
   * more than a three-word label all of them do.
   */
  readonly mostGained: ComparedPassage | null
  /** The carried passage it took most words away from, on the same terms. */
  readonly mostLost: ComparedPassage | null
  /** Why there is no reader comparison, or `null` where there is one. */
  readonly silence: CopyChangeSilence | null
}

const ZERO_BY_STANDING: Readonly<Record<PartStanding, number>> = Object.freeze({
  read: 0,
  skipped: 0,
  unknown: 0,
})

const ZERO_BY_MOVEMENT: Readonly<Record<PassageMovement, number>> = Object.freeze({
  held: 0,
  gained: 0,
  lost: 0,
  unread: 0,
  unknown: 0,
})

const NO_WORDS_WRITTEN: WordsWritten = Object.freeze({
  carried: 0,
  added: 0,
  addedByStanding: ZERO_BY_STANDING,
  removed: 0,
  removedByStanding: ZERO_BY_STANDING,
  reworded: Object.freeze({ was: 0, now: 0 }),
})

/**
 * Whether two passages say the same thing, in order.
 *
 * The visible words, which is what every figure here divides by. A part may be
 * floored on one side and not the other while these agree — a prop nobody
 * declared holding something on one revision and nothing on the next — and that
 * is what {@link ComparedPassage.floored} carries rather than a third category.
 */
const sameText = (one: readonly string[], other: readonly string[]): boolean =>
  one.length === other.length && one.every((value, at) => value === other[at])

const sideOf = (passage: Passage, views: number): PassageSide => ({
  standing: passage.standing,
  readers: passage.readers,
  views,
  reach: views === 0 ? null : passage.readers / views,
})

/**
 * What happened between two standings.
 *
 * `unknown` first and on either side, because it is the one answer that is not
 * about the passage: a window with no views, or a part that reported something
 * other than coming into view, cannot be read as nobody having reached it
 * (0212).
 */
const movementOf = (was: PartStanding, now: PartStanding): PassageMovement => {
  if (was === "unknown" || now === "unknown") return "unknown"
  if (was === "read") return now === "read" ? "held" : "lost"

  return now === "read" ? "gained" : "unread"
}

/**
 * Whether a passage is worth a row at all.
 *
 * The rule `copyReadingOf` applies to one side, applied to the pair: a part
 * that says nothing on either side and is hiding nothing on either side has no
 * words for this module to be about. A floored part is kept because *this may
 * say something nothing here can see* is not *this says nothing* (0122).
 */
const saysSomething = (sides: readonly Passage[]): boolean =>
  sides.some((passage) => passage.words > 0 || passage.floored)

const gainOf = (words: number, was: PassageSide, now: PassageSide): number | null =>
  was.reach === null || now.reach === null ? null : words * (now.reach - was.reach)

/** Descending by words, strictly, so equal passages keep the order they arrived in. */
const byWordsUnread = (one: ComparedPassage, other: ComparedPassage): number =>
  other.words - one.words

/** The larger gain of two, `>` keeping the first in reading order on a tie. */
const moreGainedOf = (
  standing: ComparedPassage | null,
  next: ComparedPassage
): ComparedPassage | null =>
  standing === null || (next.gain ?? 0) > (standing.gain ?? 0) ? next : standing

const moreLostOf = (
  standing: ComparedPassage | null,
  next: ComparedPassage
): ComparedPassage | null =>
  standing === null || (next.gain ?? 0) < (standing.gain ?? 0) ? next : standing

const wordsAdded = (passages: readonly Passage[]): number =>
  passages.reduce((total, passage) => total + passage.words, 0)

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

/**
 * Every part of a reading as a passage, keyed by node.
 *
 * Over **every** part rather than over the reading's own passages, because a
 * part that said nothing before and says something now is a word the change
 * wrote and not a part the change added — and a filtered map could not tell the
 * two apart.
 */
const passagesOf = (reading: PageReading): ReadonlyMap<NodeId, Passage> => {
  const byNode = new Map<NodeId, Passage>()

  for (const part of reading.parts) byNode.set(part.nodeId, passageOf(part))

  return byNode
}

const silenceOf = (
  words: WordCount,
  readings: { readonly was: CopyReading; readonly now: CopyReading },
  views: { readonly was: number; readonly now: number },
  carried: number,
  floored: number
): CopyChangeSilence | null => {
  if (words.was === 0 && words.now === 0) return "wordless"
  if (views.was === 0 || views.now === 0) return "nothing-measured"
  if (readings.was.silence === "inconsistent" || readings.now.silence === "inconsistent") {
    return "inconsistent"
  }
  if (carried === 0) return "dissolved"

  return floored > 0 ? "floored" : null
}

/**
 * What a change did to the words of a page and to the reading of them.
 *
 * Handed two `PageReading`s rather than two `CopyReading`s, for the reason
 * `readingChangeOf` is handed two: one input per side cannot be a mismatched
 * pair, and the census needs the parts a copy reading leaves out — a part that
 * says nothing on one side is a word the change wrote on the other, and reading
 * it off a filtered list would call the part new. The two copy readings it
 * derives are returned.
 *
 * The labels `was` and `now` are the caller's. Nothing here checks which
 * reading is older, so a caller holding them backwards gets a comparison with
 * every sign reversed rather than a refusal — the same bargain 0224 struck, for
 * the same reason: *this week against last week* is the same question with the
 * tree held still, and refusing one order would refuse that too.
 */
export const copyChangeOf = (was: PageReading, now: PageReading): CopyChange => {
  const readings = { was: copyReadingOf(was), now: copyReadingOf(now) }
  const words: WordCount = {
    was: readings.was.words,
    now: readings.now.words,
    change: readings.now.words - readings.was.words,
  }

  const head = {
    treeId: was.treeId,
    revisions: { was: was.revision, now: now.revision },
    readings,
    words,
  }

  if (was.treeId !== now.treeId) {
    return {
      ...head,
      wrote: NO_WORDS_WRITTEN,
      compared: [],
      reworded: [],
      added: [],
      removed: [],
      wordsByMovement: ZERO_BY_MOVEMENT,
      passagesByMovement: ZERO_BY_MOVEMENT,
      floored: 0,
      stillUnseen: [],
      typical: null,
      mostGained: null,
      mostLost: null,
      silence: "different-trees",
    }
  }

  const earlier = passagesOf(was)
  const later = passagesOf(now)

  const compared: ComparedPassage[] = []
  const reworded: RewordedPassage[] = []
  const added: Passage[] = []
  const removed: Passage[] = []

  for (const [nodeId, passage] of later) {
    const before = earlier.get(nodeId)

    if (before === undefined) {
      if (saysSomething([passage])) added.push(passage)
      continue
    }

    if (!saysSomething([before, passage])) continue

    const shared = {
      nodeId,
      type: passage.type,
      role: passage.role,
      floored: before.floored || passage.floored,
      was: sideOf(before, was.views),
      now: sideOf(passage, now.views),
      movement: movementOf(before.standing, passage.standing),
    }

    if (sameText(before.text, passage.text)) {
      compared.push({
        ...shared,
        words: passage.words,
        text: passage.text,
        gain: gainOf(passage.words, shared.was, shared.now),
      })
      continue
    }

    reworded.push({ ...shared, words: { was: before.words, now: passage.words } })
  }

  for (const [nodeId, passage] of earlier) {
    if (later.has(nodeId)) continue
    if (saysSomething([passage])) removed.push(passage)
  }

  const carried = compared.reduce((total, passage) => total + passage.words, 0)

  const wrote: WordsWritten = {
    carried,
    added: wordsAdded(added),
    addedByStanding: wordsByStandingOf(added),
    removed: wordsAdded(removed),
    removedByStanding: wordsByStandingOf(removed),
    reworded: {
      was: reworded.reduce((total, passage) => total + passage.words.was, 0),
      now: reworded.reduce((total, passage) => total + passage.words.now, 0),
    },
  }

  const wordsByMovement = compared.reduce<Record<PassageMovement, number>>(
    (counted, passage) => ({
      ...counted,
      [passage.movement]: counted[passage.movement] + passage.words,
    }),
    { ...ZERO_BY_MOVEMENT }
  )

  const passagesByMovement = compared.reduce<Record<PassageMovement, number>>(
    (counted, passage) => ({
      ...counted,
      [passage.movement]: counted[passage.movement] + 1,
    }),
    { ...ZERO_BY_MOVEMENT }
  )

  const floored = compared.filter((passage) => passage.floored).length

  const silence = silenceOf(
    words,
    readings,
    { was: was.views, now: now.views },
    carried,
    floored
  )

  /**
   * Over the carried passages only, so the page having grown or shrunk is not in
   * it. Guarded by the silence rather than clamped, for the reason a copy reading
   * guards its own mean (0235): a figure held back with a stated cause is one
   * somebody can act on.
   */
  const typicalOf = (): WordCount => {
    const wasWords =
      compared.reduce((total, passage) => total + passage.was.readers * passage.words, 0) /
      was.views
    const nowWords =
      compared.reduce((total, passage) => total + passage.now.readers * passage.words, 0) /
      now.views

    return { was: wasWords, now: nowWords, change: nowWords - wasWords }
  }

  return {
    ...head,
    wrote,
    compared,
    reworded,
    added,
    removed,
    wordsByMovement,
    passagesByMovement,
    floored,
    stillUnseen: compared
      .filter((passage) => passage.movement === "unread")
      .sort(byWordsUnread),
    typical: silence === null ? typicalOf() : null,
    mostGained: compared.reduce<ComparedPassage | null>(
      (standing, passage) =>
        (passage.gain ?? 0) > 0 ? moreGainedOf(standing, passage) : standing,
      null
    ),
    mostLost: compared.reduce<ComparedPassage | null>(
      (standing, passage) => ((passage.gain ?? 0) < 0 ? moreLostOf(standing, passage) : standing),
      null
    ),
    silence,
  }
}
