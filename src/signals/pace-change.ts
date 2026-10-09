import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"

import type { PageReading } from "./parts.js"
import {
  paceStandingOf,
  readingPaceOf,
  READING_WORDS_PER_MINUTE,
  type PacedPart,
  type PagePace,
  type PaceStanding,
} from "./pace.js"

/**
 * What a change did to whether readers had time to read what a page says.
 *
 * [`pace.ts`](pace.ts) answers *readers had a third of the time this band's
 * words take* — of **one window of one revision**. The sentence a change is
 * judged by is the next one, and on a page that was cut rather than rearranged
 * it is the only one that answers: *the band readers used to skim is read
 * now.* [`change.ts`](change.ts) asks where reading stops, and
 * [`copy-change.ts`](copy-change.ts) asks how many of the page's words got
 * reached. Neither asks whether there was **time** for them, which is the one
 * question a rewrite is usually aimed at.
 *
 * It is the **eleventh** thing taken out of the server-side join of
 * [0212](../../decisions/0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)
 * rather than collected: nothing was added to a payload, a browser, a column, a
 * store or the vocabulary, and the broadcaster was not touched.
 *
 * ## The division has two sides and a change can move either
 *
 * A pace is `spentMs ÷ needMs` — the time a reader had against the time the
 * words take. So a part that stops being skimmed has moved for one of two
 * reasons, and they are opposite findings:
 *
 * - **readers stayed longer**, which is a fact about the readers; or
 * - **the page asks for less**, which is a fact about the change, and the
 *   commonest thing anybody does to a band nobody reads.
 *
 * A single before-and-after figure cannot tell them apart, and the one that
 * reads best is the one that means least: a band halved in length is *paced*
 * with no reader having given it a second more attention. So every compared
 * part carries both factors — {@link ComparedPace.timeRatio} and
 * {@link ComparedPace.needRatio}, whose quotient is
 * {@link ComparedPace.paceRatio} — and the verdict's cause is attributed
 * below.
 *
 * ## The attribution is a counterfactual and needs no threshold
 *
 * *Which of the two moved it* could be asked as *which moved more*, and that
 * needs a threshold on what counts as a move — a dial the framework would be
 * inventing. It is asked instead as **what would have happened if one side had
 * not moved**, which the rows already answer:
 *
 * - {@link ComparedPace.ifWordsHeld} is the later window's time against the
 *   earlier revision's words — the pace this part would have had if the change
 *   had left its text alone. It isolates the readers.
 * - {@link ComparedPace.ifTimeHeld} is the earlier window's time against the
 *   later revision's words — the pace it would have had if no reader had
 *   changed their behaviour. It isolates the change.
 *
 * Each is run through the published verdict rule, so {@link PaceCause} says
 * whether the change alone was sufficient, the readers alone were, either was,
 * or only the two together — and no number anywhere decides what *enough* is.
 * A floor on either side's words leaves the counterfactual `unknown` rather
 * than guessed, because the words a counterfactual divides by are the ones
 * nobody counted.
 *
 * ## What is comparable here, and what is not
 *
 * **A pace is**, which is not true of the counts it is made of. `spentMs` is
 * `dwellMs × (1 + inflation) ÷ reached` off **one side's own row**, so the
 * straddle over-count (0147) is in both of its terms and has very nearly
 * divided out before the two sides meet — which is
 * [0221](../../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)'s
 * cancellation and
 * [0224](../../decisions/0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)'s
 * rule, applied to a part's pace rather than to a fall between siblings.
 * `needMs` has no reader in it at all.
 *
 * **A standing is not, quite**: `skimmed` is a verdict about the mean reader of
 * a window, so a quiet window and a busy one judge the same part on different
 * evidence. That is why {@link PaceMovement} is named for a movement and never
 * for an improvement, and why nothing here divides one side's count by the
 * other's.
 *
 * **A position is not involved.** Nothing here reads a depth, an index or a
 * parent, so a band dragged to the top of the page is compared like any other —
 * `copy-change.ts`'s rule for a passage, for the same reason: a pair of
 * siblings is a position by construction (0224) and a part's pace is not.
 *
 * ## The sums that are therefore missing
 *
 * A part is judged against its **subtree's** words
 * ([0230](../../decisions/0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md)),
 * so the figures nest: a band and the paragraph inside it are both here and the
 * paragraph's words are in the band's count. **There is no page-wide total of
 * words, time or readers kept**, because one reader who raced past a band
 * raced past everything in it and a sum would charge them once per level. The
 * page's own figure is {@link PaceChange.whole} — the root, whose subtree is
 * the page — and it is a row rather than an addition, exactly as
 * `pace.ts` publishes it apart and as 0242 publishes the root's `engaged`
 * apart.
 *
 * Pure, linear in the parts of the two readings, and reaches no store, clock or
 * DOM. A caller checks `PageReading.orphaned` on both readings before trusting
 * either, as it must before trusting either pace reading.
 */

/** Why a comparison of two windows' pace answered nothing. */
export type PaceChangeSilence =
  /**
   * The two readings are of different trees.
   *
   * Nothing is comparable and nothing is countable. Spelled as `ChangeSilence`
   * and `CopyChangeSilence` spell it, because a surface drawing three
   * comparisons of one change should not meet three names for one state
   * (0240).
   */
  | "different-trees"
  /**
   * Neither revision says anything that takes time to read.
   *
   * No words on either side and nothing undeclared either, so there is no
   * `needMs` to divide by anywhere on the page.
   */
  | "wordless"
  /**
   * One of the two windows held no page views.
   *
   * Every part on that side is `unreached` (`pace.ts`), so there is no time to
   * compare. **The word side still answers**: what the change did to the time
   * the page asks for is a fact about the two trees, and *this band asks for
   * two hundred words less than it did, and nothing has been measured since* is
   * true and worth saying.
   */
  | "nothing-measured"
  /**
   * No part of the page is in both revisions, so there is nothing to compare.
   *
   * The same state `CopyChangeSilence.dissolved` reports of words, said of
   * parts: a page that carries no part carries no word either, so this is that
   * condition and not a neighbouring one (0240). The census of what was added
   * and removed answers in full and is the whole of what can be said.
   */
  | "dissolved"

/** The closed set, for a surface that has to account for every absent figure. */
export const PACE_CHANGE_SILENCES: readonly PaceChangeSilence[] =
  everyMemberOf<PaceChangeSilence>()([
    "different-trees",
    "wordless",
    "nothing-measured",
    "dissolved",
  ])

/** One line per silence, for a surface saying why a figure is not there. */
export const describePaceChangeSilence = (silence: PaceChangeSilence): string => {
  switch (silence) {
    case "different-trees":
      return "the two readings are of different pages"
    case "wordless":
      return "neither revision says anything that takes time to read"
    case "nothing-measured":
      return "one of the two windows held no page views"
    case "dissolved":
      return "the change left no part of the page as it was, so there is nothing to compare"
  }
}

/**
 * What happened to the verdict on one part between two windows.
 *
 * Five states out of two verdicts either side, and the asymmetry of 0230 is why
 * they are not nine: `skimmed` is the claim that survives every bias, and
 * `paced` and `lingered` are the weaker ones. So a part moving between those
 * two has not moved in any way worth a name, and the set is *did it stop being
 * skimmed, did it start, or neither*.
 *
 * Named for a movement rather than for an improvement, because a verdict is
 * about the mean reader of its own window: a part can ease because the page got
 * shorter, because readers slowed down, or because a quieter window had a
 * different set of readers in it. {@link ComparedPace.cause} separates the
 * first two and nothing can separate the third.
 */
export type PaceMovement =
  /**
   * Skimmed before, and not now — the sentence a rewrite is made for.
   *
   * Check {@link ComparedPace.cause} before reading it as readers having
   * slowed: a band cut in half eases with nobody having given it a moment more.
   */
  | "eased"
  /** Read before, and skimmed now. */
  | "rushed"
  /**
   * Skimmed before and skimmed now — the parts a change did not fix.
   *
   * Kept apart from `held` because the two are opposite findings about a page
   * and both are *the verdict did not move*.
   */
  | "still-skimmed"
  /** Read on both sides, whether paced or lingered. */
  | "held"
  /**
   * One side has no verdict, so there is nothing to compare.
   *
   * Nobody reached it in that window, or its words are a floor and the verdict
   * the floor would support is not the safe one (0230). Which it is, is on that
   * side's own `silence`.
   */
  | "unknown"

/** The closed set, for a surface accounting for every part it was handed. */
export const PACE_MOVEMENTS: readonly PaceMovement[] = everyMemberOf<PaceMovement>()([
  "eased",
  "rushed",
  "still-skimmed",
  "held",
  "unknown",
])

/** One line per movement, for a surface putting a part in front of a person. */
export const describePaceMovement = (movement: PaceMovement): string => {
  switch (movement) {
    case "eased":
      return "readers had too little time for its words and now they have enough"
    case "rushed":
      return "readers had time enough for its words and now they do not"
    case "still-skimmed":
      return "readers had too little time for its words before and after"
    case "held":
      return "readers had time enough for its words before and after"
    case "unknown":
      return "one of the two windows cannot say whether there was time for it"
  }
}

/**
 * Which side of the division the verdict moved with.
 *
 * Answered by sufficiency rather than by magnitude: *would this verdict have
 * arrived anyway, if only one of the two had moved*. `null` on a part whose
 * verdict did not move, because there is nothing to attribute.
 */
export type PaceCause =
  /**
   * The change alone was enough: the words the later revision asks for would
   * have produced today's verdict at the earlier window's reading time.
   *
   * The attribution worth leading with, and the one a single pace figure hides.
   * *This band is paced because it is shorter, and not because anybody is
   * reading it.*
   */
  | "words"
  /**
   * The readers alone were enough: the later window's time would have produced
   * today's verdict against the words the page used to say.
   */
  | "time"
  /** Either alone would have been enough, so the move is over-determined. */
  | "either"
  /** Neither alone would have been enough and the two together were. */
  | "together"
  /**
   * A counterfactual has no verdict, so neither question can be answered.
   *
   * One side's words are a floor, which the mixed pace of a counterfactual
   * inherits from both sides: the words it divides by are the ones nobody
   * counted (0122).
   */
  | "unknown"

/** The closed set, for a surface accounting for every verdict that moved. */
export const PACE_CAUSES: readonly PaceCause[] = everyMemberOf<PaceCause>()([
  "words",
  "time",
  "either",
  "together",
  "unknown",
])

/** One line per cause, for a surface saying what moved a verdict. */
export const describePaceCause = (cause: PaceCause): string => {
  switch (cause) {
    case "words":
      return "the words the change wrote would have moved it on their own"
    case "time":
      return "the time readers now spend would have moved it on its own"
    case "either":
      return "either would have moved it on its own"
    case "together":
      return "neither would have moved it alone and the two together did"
    case "unknown":
      return "some of the words are a floor, so the question cannot be answered"
  }
}

/**
 * A pace neither window reported, and the verdict it would have carried.
 *
 * One side's time against the other side's words. It is not a measurement of
 * anything that happened — it is the measurement of what did not — and it
 * exists so that {@link PaceCause} can be answered without a threshold.
 */
export type PaceHeld = {
  /** `null` where there is nothing to divide: no reader on the side the time came from, or no words on the side the words came from. */
  readonly pace: number | null
  /**
   * The verdict that pace carries, under **either** side's floor.
   *
   * A floor is taken from both sides because a counterfactual's two terms come
   * from two revisions, and words nobody counted on either one are words
   * missing from this ratio. The conservative reading, which leaves it
   * `unknown` rather than claiming the weaker verdicts.
   */
  readonly standing: PaceStanding
}

/**
 * One part both revisions have, as two windows paced it.
 *
 * Matched by node, which is what makes the comparison about the part rather
 * than about its position.
 */
export type ComparedPace = {
  readonly nodeId: NodeId
  /** The later revision's type, which is the page somebody is looking at. */
  readonly type: PrimitiveType
  /** The later revision's role (0114), or `null` where its type declared none. */
  readonly role: PrimitiveRole | null
  /** The whole of what the earlier window said about it. */
  readonly was: PacedPart
  /** The whole of what the later window said about it. */
  readonly now: PacedPart
  readonly movement: PaceMovement
  /**
   * `now.pace ÷ was.pace`, and `null` where either side has none or the earlier
   * one is nought.
   *
   * Exactly {@link timeRatio} ÷ {@link needRatio}, which is the identity this
   * module is built on: a pace moves because readers' time moved, because the
   * words moved, or both.
   */
  readonly paceRatio: number | null
  /**
   * `now.spentMs ÷ was.spentMs` — the readers' side of the division.
   *
   * Each term is a mean off one side's own row, so each side's straddle has
   * very nearly divided out before they meet. `null` where either side had no
   * reader, or the earlier one no time at all.
   */
  readonly timeRatio: number | null
  /**
   * `now.needMs ÷ was.needMs` — the page's side of the division.
   *
   * Exact and reader-free: it is what the change did to the time this part's
   * words ask for. Below 1 is a part the change shortened. `null` where the
   * earlier revision's part said nothing.
   */
  readonly needRatio: number | null
  /** The later window's time against the earlier revision's words — the readers alone. */
  readonly ifWordsHeld: PaceHeld
  /** The earlier window's time against the later revision's words — the change alone. */
  readonly ifTimeHeld: PaceHeld
  /** Which side the verdict moved with, and `null` where it did not move. */
  readonly cause: PaceCause | null
}

/** A time total, before and after, with the subtraction done once. */
export type TimeCount = {
  readonly was: number
  readonly now: number
  readonly change: number
}

/**
 * What a change did to the time a page's words ask of its readers, and to
 * whether they had it.
 *
 * Two readings in, one comparison out. The two {@link PagePace}s it derives are
 * returned, so nothing downstream computes them twice and every whole-page
 * figure either side is one field away without a second join.
 */
export type PaceChange = {
  /** The earlier reading's tree. The two agree unless `silence` is `different-trees`. */
  readonly treeId: TreeId
  readonly revisions: { readonly was: number; readonly now: number }
  /** The two pace readings this comparison is made of. */
  readonly readings: { readonly was: PagePace; readonly now: PagePace }
  /**
   * Every part both revisions have that says something on either side, in the
   * **later** reading order.
   *
   * The later order because that is the page somebody is looking at. A part
   * whose subtree says nothing on both sides and hides nothing on either is
   * left out altogether: it has no pace in any window, so a row for it would
   * only ever read `unknown` and would make {@link movements} a count of
   * spacers.
   */
  readonly compared: readonly ComparedPace[]
  /**
   * Parts only the later revision has, as it paced them, in its reading order.
   *
   * A census with readers in it rather than an exact one, unlike the census of
   * the words a change wrote (0239): a part nobody could have read before still
   * has to be read now for anything to be said about it. *The change added a
   * band and readers are skimming it* is the row worth looking at.
   */
  readonly added: readonly PacedPart[]
  /** Parts only the earlier revision had, as it paced them, in its reading order. */
  readonly removed: readonly PacedPart[]
  /** Compared parts by what happened to the verdict. The five add to {@link compared}'s length. */
  readonly movements: Readonly<Record<PaceMovement, number>>
  /**
   * The parts whose verdict moved, by what moved it. The five add to
   * `movements.eased + movements.rushed`.
   */
  readonly causes: Readonly<Record<PaceCause, number>>
  /**
   * The root, compared against itself across the two revisions.
   *
   * *Readers had a third of the time this page's words take and now they have
   * half* — the page's one figure, and a row rather than an addition for the
   * reason the module documentation gives. Kept out of the rankings below,
   * because its subtree is every part it would outrank.
   *
   * `null` where either revision's root is not an element, or where the root
   * says nothing on both sides.
   */
  readonly whole: ComparedPace | null
  /**
   * The part the change made most room to read: `eased`, most words passed
   * now, then first in the later reading order.
   *
   * By words passed — readers times the words they were shown — rather than by
   * the change in pace, which is the ranking rule a fall between two siblings
   * and a skimmed part already use (0221, 0230): a caption two readers now have
   * time for is a better ratio and a smaller gain than a band four hundred of
   * them do.
   */
  readonly mostEased: ComparedPace | null
  /** The part it cost most, on the same terms. */
  readonly mostRushed: ComparedPace | null
  /**
   * The parts readers skimmed before and skim now, most words passed first,
   * then in the later reading order.
   *
   * The list a person can act on without reading anything else, and the one
   * ranking here that is about where a change did **not** land. The root is
   * left out, as it is left out of every ranking here, because its subtree is
   * every part it would outrank; {@link whole} carries it. `still-skimmed`
   * only: a part whose verdict is `unknown` on either side is in
   * {@link movements} where it can be seen and not acted on, because putting it
   * here would turn *nothing can be said* into *readers are not reading this*.
   */
  readonly stillSkimmed: readonly ComparedPace[]
  /**
   * What the two revisions ask of a reader who reads every word of them, before
   * and after.
   *
   * The root's `needMs` on each side, which is the page's whole text costed
   * once — not a sum over the parts, which would charge a reader once per level
   * (0230). `null` where there is no {@link whole} to read it off.
   */
  readonly need: TimeCount | null
  /** Why there is no comparison of the reading, or `null` where there is one. */
  readonly silence: PaceChangeSilence | null
  /** The costing rate both sides were read at, which is the published default unless one was given. */
  readonly wordsPerMinute: number
  /** The straddle correction applied to each side; `0` where none was given. */
  readonly inflation: { readonly was: number; readonly now: number }
}

/**
 * How the two sides were read.
 *
 * **One rate and two inflations**, and the asymmetry is the point. A costing
 * rate is a fact about the page's text and its language (0230), so it is the
 * same fact on both sides of a change and a comparison whose two sides were
 * costed differently would be a comparison of the rates. A straddle inflation
 * is a fact about **one window** — `drift ÷ opened` off that window's
 * page-view row (0219) — and the two windows can honestly differ, which is
 * exactly why a rollup window a deployment shortened shows up here as the
 * correction changing and not as readers changing.
 */
export type PaceChangeOptions = {
  readonly inflation?: { readonly was?: number; readonly now?: number }
  readonly wordsPerMinute?: number
}

const ZERO_BY_MOVEMENT: Readonly<Record<PaceMovement, number>> = Object.freeze({
  eased: 0,
  rushed: 0,
  "still-skimmed": 0,
  held: 0,
  unknown: 0,
})

const ZERO_BY_CAUSE: Readonly<Record<PaceCause, number>> = Object.freeze({
  words: 0,
  time: 0,
  either: 0,
  together: 0,
  unknown: 0,
})

/**
 * Whether a part is worth a row at all.
 *
 * `pace.ts`'s own distinction between *there are none* and *nobody said*
 * (0122), applied to the pair: a part with no words in its subtree on either
 * side and no floor on either side can never have a pace, so a row for it would
 * say `unknown` for ever. A floored part is kept, because *this may ask for
 * time nothing here can see* is not *this asks for none*.
 */
const takesTime = (sides: readonly PacedPart[]): boolean =>
  sides.some((part) => part.wordsWithin > 0 || part.floored)

/** Whether a verdict is one of the two that say readers had time enough. */
const hadTime = (standing: PaceStanding): boolean =>
  standing === "paced" || standing === "lingered"

/**
 * What happened between two verdicts.
 *
 * `unknown` first and on either side, because it is the one answer that is not
 * about the part: a window with no view of it, or words that are a floor, cannot
 * be read as readers having had time or not having had it (0230).
 */
const movementOf = (was: PaceStanding, now: PaceStanding): PaceMovement => {
  if (was === "unknown" || now === "unknown") return "unknown"
  if (was === "skimmed") return now === "skimmed" ? "still-skimmed" : "eased"

  return hadTime(now) ? "held" : "rushed"
}

/**
 * A ratio of two figures from the two sides, or `null` where there is none.
 *
 * Nought on the earlier side is `null` rather than infinity: *it was nothing
 * and now it is something* is a movement the standings already report, and a
 * ratio is a figure a surface divides and ranks by.
 */
const ratioOf = (was: number | null, now: number | null): number | null =>
  was === null || now === null || was === 0 ? null : now / was

/** One side's time against the other side's words, under either side's floor. */
const heldOf = (spentMs: number | null, needMs: number, floored: boolean): PaceHeld => {
  const pace = spentMs === null || needMs === 0 ? null : spentMs / needMs

  return { pace, standing: paceStandingOf(pace, floored) }
}

/**
 * Which side the verdict moved with, by sufficiency.
 *
 * Each counterfactual is asked the one question that matters — *does this carry
 * today's verdict* — so the answer never depends on how much anything moved.
 * `unknown` wherever a counterfactual has no verdict, because the alternative
 * is reading a floor's silence as a no.
 */
const causeOf = (now: PaceStanding, ifWordsHeld: PaceHeld, ifTimeHeld: PaceHeld): PaceCause => {
  if (ifWordsHeld.standing === "unknown" || ifTimeHeld.standing === "unknown") return "unknown"

  const wordsSuffice = ifTimeHeld.standing === now
  const timeSuffice = ifWordsHeld.standing === now

  if (wordsSuffice && timeSuffice) return "either"
  if (wordsSuffice) return "words"

  return timeSuffice ? "time" : "together"
}

/** Every part of a pace reading, keyed by node. */
const partsOf = (pace: PagePace): ReadonlyMap<NodeId, PacedPart> => {
  const byNode = new Map<NodeId, PacedPart>()

  for (const part of pace.parts) byNode.set(part.nodeId, part)

  return byNode
}

/**
 * The one with more words passed, `>` keeping the first in the later reading
 * order on a tie.
 */
const moreOf = (standing: ComparedPace | null, next: ComparedPace): ComparedPace =>
  standing === null || next.now.wordsPassed > standing.now.wordsPassed ? next : standing

/** Descending by the words readers were shown now, strictly, so equals keep their order. */
const byWordsPassed = (one: ComparedPace, other: ComparedPace): number =>
  other.now.wordsPassed - one.now.wordsPassed

/**
 * Whether a revision says anything that takes time to read.
 *
 * Over each part's **own** words rather than the root's subtree, because a part's
 * own words partition the page exactly once (0235) and a tree whose root is not
 * an element has no part at depth 0 to read a page total off. A floor anywhere
 * counts as something said, for `takesTime`'s reason.
 */
const saysAnything = (pace: PagePace): boolean =>
  pace.parts.some((part) => part.words > 0 || part.floored)

const silenceOf = (
  readings: { readonly was: PagePace; readonly now: PagePace },
  compared: readonly ComparedPace[]
): PaceChangeSilence | null => {
  if (!saysAnything(readings.was) && !saysAnything(readings.now)) return "wordless"
  if (readings.was.views === 0 || readings.now.views === 0) return "nothing-measured"

  return compared.length === 0 ? "dissolved" : null
}

/** A positive, finite option, or the fallback — `pace.ts`'s rule, applied per side. */
const positive = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback

/**
 * What a change did to whether readers had time for what a page says.
 *
 * Handed two `PageReading`s rather than two `PagePace`s, for the reason
 * `copyChangeOf` is handed two: one input per side cannot be a mismatched pair.
 * Here it buys a second guarantee that matters more — **the two sides cannot
 * have been costed at different rates**, which no caller holding two finished
 * pace readings could be stopped from doing and which would make every ratio
 * below a comparison of the rates. The two pace readings it derives are
 * returned.
 *
 * The labels `was` and `now` are the caller's. Nothing here checks which
 * reading is older, so a caller holding them backwards gets a comparison with
 * every movement reversed rather than a refusal — the same bargain 0224 struck,
 * for the same reason: *this week against last week* is the same question with
 * the tree held still, and refusing one order would refuse that too.
 */
export const paceChangeOf = (
  was: PageReading,
  now: PageReading,
  options: PaceChangeOptions = {}
): PaceChange => {
  const inflation = {
    was: positive(options.inflation?.was, 0),
    now: positive(options.inflation?.now, 0),
  }

  /**
   * One rate, resolved once and handed to both sides, which is the whole of
   * what taking two readings rather than two paces buys.
   */
  const wordsPerMinute = positive(options.wordsPerMinute, READING_WORDS_PER_MINUTE)
  const readings = {
    was: readingPaceOf(was, { inflation: inflation.was, wordsPerMinute }),
    now: readingPaceOf(now, { inflation: inflation.now, wordsPerMinute }),
  }

  const head = {
    treeId: was.treeId,
    revisions: { was: was.revision, now: now.revision },
    readings,
    wordsPerMinute,
    inflation,
  }

  if (was.treeId !== now.treeId) {
    return {
      ...head,
      compared: [],
      added: [],
      removed: [],
      movements: ZERO_BY_MOVEMENT,
      causes: ZERO_BY_CAUSE,
      whole: null,
      mostEased: null,
      mostRushed: null,
      stillSkimmed: [],
      need: null,
      silence: "different-trees",
    }
  }

  const earlier = partsOf(readings.was)
  const later = partsOf(readings.now)

  const compared: ComparedPace[] = []
  const added: PacedPart[] = []
  const removed: PacedPart[] = []

  for (const [nodeId, part] of later) {
    const before = earlier.get(nodeId)

    if (before === undefined) {
      if (takesTime([part])) added.push(part)
      continue
    }

    if (!takesTime([before, part])) continue

    const floored = before.floored || part.floored
    const ifWordsHeld = heldOf(part.spentMs, before.needMs, floored)
    const ifTimeHeld = heldOf(before.spentMs, part.needMs, floored)
    const movement = movementOf(before.standing, part.standing)

    compared.push({
      nodeId,
      type: part.type,
      role: part.role,
      was: before,
      now: part,
      movement,
      paceRatio: ratioOf(before.pace, part.pace),
      timeRatio: ratioOf(before.spentMs, part.spentMs),
      needRatio: ratioOf(before.needMs, part.needMs),
      ifWordsHeld,
      ifTimeHeld,
      cause:
        movement === "eased" || movement === "rushed"
          ? causeOf(part.standing, ifWordsHeld, ifTimeHeld)
          : null,
    })
  }

  for (const [nodeId, part] of earlier) {
    if (later.has(nodeId)) continue
    if (takesTime([part])) removed.push(part)
  }

  const movements = compared.reduce<Record<PaceMovement, number>>(
    (counted, part) => ({ ...counted, [part.movement]: counted[part.movement] + 1 }),
    { ...ZERO_BY_MOVEMENT }
  )

  const causes = compared.reduce<Record<PaceCause, number>>(
    (counted, part) =>
      part.cause === null ? counted : { ...counted, [part.cause]: counted[part.cause] + 1 },
    { ...ZERO_BY_CAUSE }
  )

  const whole = compared.find((part) => part.now.depth === 0 && part.was.depth === 0) ?? null

  const ranked = (movement: PaceMovement): ComparedPace | null =>
    compared.reduce<ComparedPace | null>(
      (standing, next) =>
        next.movement === movement && next !== whole ? moreOf(standing, next) : standing,
      null
    )

  return {
    ...head,
    compared,
    added,
    removed,
    movements,
    causes,
    whole,
    mostEased: ranked("eased"),
    mostRushed: ranked("rushed"),
    stillSkimmed: compared
      .filter((part) => part.movement === "still-skimmed" && part !== whole)
      .sort(byWordsPassed),
    need:
      whole === null
        ? null
        : {
            was: whole.was.needMs,
            now: whole.now.needMs,
            change: whole.now.needMs - whole.was.needMs,
          },
    silence: silenceOf(readings, compared),
  }
}
