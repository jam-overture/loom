import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import { copyReadingOf, type Passage } from "./copy.js"
import { copyChangeOf, type ComparedPassage } from "./copy-change.js"
import { kindKeyOf, type KindKey } from "./library.js"
import type { PageReading, PartReading, PartStanding } from "./parts.js"

/**
 * What a change did to the words a kind of part says, everywhere it stands.
 *
 * A comparison of two windows of one library answers *the band you rewrote was
 * read in three of its nine places and is read in seven now*
 * ([`library-change.ts`](library-change.ts)), and is explicit about the one
 * thing it refuses: words. A paired placement is paired by **node**, so the
 * page's revision may have moved underneath it — the two sides' words are then
 * two different sentences and a share of one against a share of the other is
 * not a before and an after.
 *
 * This is the other half, and it is the sentence closest to what an author
 * changing copy inside a primitive actually did: *you rewrote the testimonial
 * band and readers now reach two thirds of the words it kept.* The method is
 * the one a change to one page is already read by (0239), taken per placement
 * and then added across the placements of one kind: **the carried words**, the
 * words both revisions say word for word, with what the change wrote counted
 * beside them rather than inside them.
 *
 * It is the **eighteenth** thing taken out of what this subsystem already knows
 * rather than collected: nothing is added to a payload, a browser, a column, a
 * store or the vocabulary of kinds, and the broadcaster is not touched. What
 * decides the shape below is
 * [0270](../../decisions/0270-a-change-to-the-words-a-kind-of-part-says-is-read-over-the-words-both-windows-say-and-a-floor-costs-the-signed-figure.md).
 *
 * ## Why the words are the sounder denominator and not the harder one
 *
 * Every comparison here has to answer what its denominator moved with. A count
 * of readers moves with the straddle (0147) and with the window's traffic; a
 * count of **places** is held still by pairing them, which is what lets a
 * change to a library be published as places changing hands (0266). A count of
 * **words** is held still by something stronger than pairing: the carried words
 * are *the same words on both sides*, so the denominator is not merely the same
 * size in both terms — it is the same text, and the subtraction is over it.
 *
 * That buys the one thing no other reading of a library has. A figure added
 * across kinds is refused in all four of them (0257), because a figure over
 * every kind at once counts a page once per element node and so measures how
 * finely the pages were written. **Words do not do that**: a part's own words
 * partition the page exactly once (0212, 0235), so the rows here add, and the
 * whole-library figure is the type rows added up rather than a second
 * computation that could disagree with them.
 *
 * ## What it is confounded by, said before the figure is read
 *
 * A passage counts as read where **at least one** reader reached the part
 * saying it (0212, 0235), so a quiet window leaves more words unread with
 * nobody behaving differently. That is 0266's confound at another unit and it
 * is handled the same way: the two windows' page views travel on the reading as
 * {@link LibraryCopyChange.viewsWas} and {@link LibraryCopyChange.viewsNow},
 * they are floors rather than counts, and nothing is scaled by them. A floor on
 * a window's views is not a correction, and a threshold on how much traffic
 * counts as comparable would be a threshold on a deployment's own schedule.
 *
 * The reader-weighted figure — *of the readers who met it, the share that
 * reached its words* — needs the door on both sides and is a weighted mean
 * whose weights move when traffic does. It is 0256's refusal in a third place
 * and it is filed rather than shipped with a caveat.
 *
 * ## The one figure a floor can lie about, and it is the only one withheld
 *
 * A type that declares no `copy` leaves a passage short of words nothing here
 * can see (0122), and 0239 drew the line exactly where it has to be drawn: a
 * single passage's movement survives a floor, and a **signed sum** over
 * passages does not. The sum here is `tookUp − fellAway`, and a floored
 * passage that gained reading beside an exact one that lost it can carry the
 * wrong sign — a hundred true words counted as ten against fifty counted as
 * fifty is an improvement published as a regression.
 *
 * So the signed figure is withheld where any carried word of the row is a
 * floor, with `floored` as the reason, and every unsigned figure stays: the two
 * shares are each short in numerator and denominator together and say so, as a
 * copy reading's own share does under the same floor. **The places answer is
 * not withheld anywhere** — a placement that took up its reading is exact
 * whatever its words are, and that reading is `library-change.ts`'s.
 *
 * ## What is counted beside the carried words rather than inside them
 *
 * **The rewriting.** A placement both windows bear whose text changed is in
 * {@link KindCopyChange.rewritten} and in no share. It is the half of the
 * answer an author most needs beside the other half: a band whose words are
 * nine tenths rewritten has a carried share about the tenth it kept, and a
 * surface that drew the share without the rewriting would be reporting a
 * sentence about a tenth of a component as a sentence about the component.
 *
 * **The places that changed hands.** Words of placements only one window bears
 * are in {@link KindCopyChange.wordsGained} and
 * {@link KindCopyChange.wordsLost}, each with the mass of them that was read on
 * the side that had them — *you took two hundred words away and nobody had
 * reached a hundred and eighty of them* is a change that was right, and the
 * opposite reading of the same row is the one worth stopping for.
 *
 * A node whose type changed is a place one kind left and another took (0266),
 * so its words are lost by the old type and gained by the new, and
 * {@link LibraryCopyChange.recast} is the size of that. The role rows hold such
 * a node still wherever the two types play the same part, which is why the role
 * rows can carry words the type rows report as having changed hands, and why
 * the whole-library figure follows the **types**: a type is the thing an author
 * replaces.
 *
 * Pure. It reaches no store, no clock and no DOM, it is linear in the parts of
 * the readings handed to it, and nothing in it survives into a browser bundle.
 */

/** Why a kind of part has no before and after of its words. */
export type KindCopyChangeSilence =
  /**
   * Nothing in the pages read, in either window, is of this kind.
   *
   * Only ever a role row, and the reason a role row exists for every member of
   * the vocabulary: *nothing in this library is a heading* is a fact about the
   * library rather than a missing row.
   */
  | "unplaced"
  /**
   * It stands in both windows and no place of it kept a word.
   *
   * Every placement was gained, lost, recast, or rewritten end to end. There is
   * no text held still, so there is nothing to read a change in — and that is
   * an answer about the **library** rather than about its readers, which
   * {@link KindCopyChange.rewritten}, `gained` and `lost` are the size of.
   *
   * A kind whose every word was rewritten is in this state, which is the
   * commonest way to reach it and the one worth naming: a change that left no
   * sentence standing cannot be read against the sentences it left standing.
   */
  | "unpaired"
  /**
   * The places it keeps say nothing that could have been read.
   *
   * A placement is kept where it says something on one side or hides something
   * on one side (0122), so a row can hold places whose visible words are none:
   * a part whose type declares no `copy` says nothing this reading can see and
   * may say a great deal. There is no denominator, and the floor is why.
   */
  | "wordless"
  /**
   * It keeps words and none of them can be spoken for on both sides.
   *
   * Every carried word is in a window that measured nothing of its page, or in
   * a part that reported something other than coming into view — so `skipped`
   * would be a claim nobody made (0212). The words are still counted; what is
   * withheld is the comparison.
   */
  | "unread"
  /**
   * Some of its carried words are a floor, so the signed movement could have
   * the wrong sign.
   *
   * The two shares survive this and the subtraction does not, which is the line
   * a change to one page's words is already read along (0239). The places
   * version of this comparison is unaffected and is the one to read instead
   * (0266).
   */
  | "floored"

export const KIND_COPY_CHANGE_SILENCES: readonly KindCopyChangeSilence[] =
  everyMemberOf<KindCopyChangeSilence>()([
    "unplaced",
    "unpaired",
    "wordless",
    "unread",
    "floored",
  ])

/** One line per silence, for a surface saying why a kind has no before and after. */
export const describeKindCopyChangeSilence = (silence: KindCopyChangeSilence): string => {
  switch (silence) {
    case "unplaced":
      return "nothing in the pages read, in either window, is of this kind"
    case "unpaired":
      return "no place this kind of part stands kept a word between the two windows"
    case "wordless":
      return "the places it keeps say nothing this reading can see"
    case "unread":
      return "no carried word of it can be spoken for in both windows"
    case "floored":
      return "some of its carried words are a floor, so a signed movement in them could have the wrong sign"
  }
}

/**
 * What happened to the reading of the words a kind of part kept.
 *
 * The verdict is the sign of `tookUp − fellAway`, which is a subtraction over
 * one set of words rather than over two shares — the carried words are the same
 * text on both sides, so nothing in the denominator moved and no threshold
 * decides anything.
 */
export type KindWordMovement =
  /** More of the words it kept are read now than were. */
  | "taken-up"
  /** Fewer are. */
  | "abandoned"
  /**
   * As many are, which includes words trading places: a passage taken up and
   * another of the same length fallen away is `held`, and both masses are
   * published so a surface can say so.
   */
  | "held"
  /**
   * No word it kept was read in either window.
   *
   * Kept apart from `held` for the reason a comparison of places keeps it
   * apart (0266): *unread everywhere, and still unread everywhere* is the one
   * state here that is an instruction. There is deliberately no sibling for
   * *read everywhere and still read everywhere* — that is `held` at a share of
   * one, and it asks nobody to do anything.
   */
  | "still-unread"
  /** {@link KindCopyChange.silence} says why nothing can be said. */
  | "unknown"

export const KIND_WORD_MOVEMENTS: readonly KindWordMovement[] =
  everyMemberOf<KindWordMovement>()(["taken-up", "abandoned", "held", "still-unread", "unknown"])

/** One line per movement, for a surface putting a kind's words in front of a person. */
export const describeKindWordMovement = (movement: KindWordMovement): string => {
  switch (movement) {
    case "taken-up":
      return "more of the words it kept are read now"
    case "abandoned":
      return "fewer of the words it kept are read now"
    case "held":
      return "as many of the words it kept are read now as were"
    case "still-unread":
      return "no word it kept was read in either window"
    case "unknown":
      return "nothing can be said about what changed"
  }
}

/**
 * The words two windows say identically, and what happened to the reading of
 * them.
 *
 * One shape at two scales — a kind of part, and the whole library — because the
 * whole library is the type rows added up. That identity is the thing words buy
 * and places cannot: a part's own words partition its page exactly once (0212,
 * 0235), so adding the rows counts no word twice, where adding a count of
 * places counts a page once per part of it (0257).
 */
export type CarriedWords = {
  /**
   * Words both windows say, word for word, in the places both windows bear.
   *
   * The universe every figure below is about. A floor where
   * {@link floored} is anything but nought: the words are there and there may
   * be more (0122).
   */
  readonly carried: number
  /**
   * Of {@link carried}, the words with a verdict on **both** sides, which is
   * the denominator of both shares.
   *
   * One number and not two, which is the whole of why the two shares are
   * comparable: a word nothing can be said about in either window is in neither
   * term, so the two sides are read over exactly the same text.
   */
  readonly comparable: number
  /**
   * Carried words one window or the other cannot be spoken for.
   *
   * A window that measured nothing of their page, or a part that reported
   * something other than coming into view. Counted and never read as unread,
   * which is the one direction a reading of a quiet window must not be wrong in
   * (0212).
   */
  readonly unspoken: number
  /** Comparable words read in both windows. */
  readonly keptRead: number
  /** Comparable words read in neither — the words a change did not fix. */
  readonly keptSkipped: number
  /** Comparable words nobody reached before and somebody reaches now. */
  readonly tookUp: number
  /** Comparable words somebody reached before and nobody reaches now. */
  readonly fellAway: number
  /**
   * The share of {@link comparable} words that was read in the earlier window;
   * `null` where there are none.
   *
   * *At least one reader reached the part saying them*, which is what read
   * means here and not what a person reads the word as (0235). Short in both
   * terms together under a floor, as a copy reading's own share is, and
   * {@link floored} is the size of that.
   */
  readonly readShareWas: number | null
  /** The same share in the later window, over the same words. */
  readonly readShareNow: number | null
  /**
   * `tookUp − fellAway`: the words that changed hands, signed. `null` where a
   * floor could have given it the wrong sign.
   *
   * It is exactly the movement in the two shares, since they have one
   * denominator by construction — taken from the two masses so that no division
   * is in a verdict.
   */
  readonly change: number | null
  /**
   * Carried words that are a floor, because the type of the part saying them
   * declares no `copy` (0122).
   *
   * The direction the figures above are wrong in, handed over rather than
   * summarised, as a copy reading hands over its own floored passages.
   */
  readonly floored: number
}

/**
 * One kind of part's words, held against themselves across two windows.
 *
 * The same shape for a type row and a role row, because they are one comparison
 * asked of two keys — and the two give different answers about a node whose type
 * changed, which is the point of asking both. See the module documentation.
 */
export type KindCopyChange = {
  readonly kind: KindKey
  /**
   * What part a type plays (0114), or `null`. Always `null` on a role row,
   * which carries it as its key.
   *
   * The later window's answer where it stands there, so that a surface reading
   * a row and the role beside it is reading today's library.
   */
  readonly role: PrimitiveRole | null
  /** Places of this kind, in both windows, that say the same words in both. */
  readonly placements: number
  /**
   * Places of it in both windows whose words the change rewrote.
   *
   * In no share and in no word total above: two word counts cannot be a before
   * and an after of one text. Published because it is the measure of how much
   * of this kind the carried share is actually about.
   */
  readonly rewritten: number
  /** The words of those places, which is two numbers for the reason there are two texts. */
  readonly rewrittenWords: { readonly was: number; readonly now: number }
  /** Places of it the later window bears and the earlier did not. */
  readonly gained: number
  /** Places of it the earlier window bore and the later does not. */
  readonly lost: number
  /** Words of the places it gained, as the later window says them. */
  readonly wordsGained: number
  /**
   * Of {@link wordsGained}, the words read in the window that has them.
   *
   * *Of the three hundred words this change put here, forty have been reached*
   * — the one figure in this reading with no before, because the words did not
   * exist to be read.
   */
  readonly wordsGainedRead: number
  /** Words of the places it lost, as the earlier window said them. */
  readonly wordsLost: number
  /** Of {@link wordsLost}, the words that had been read in the window that had them. */
  readonly wordsLostRead: number
  /** Places it keeps whose words are a floor, which the row's own words count. */
  readonly flooredPlacements: number
  /** The carried words and what happened to the reading of them. */
  readonly words: CarriedWords
  readonly movement: KindWordMovement
  /**
   * Why there is no verdict, and `null` where there is one.
   *
   * About the comparison and not about the row: every count above is a count of
   * parts of trees and of the words they say, and those are true whatever any
   * window measured — which is how a census publishes a standing beside a
   * withheld share (0212).
   */
  readonly silence: KindCopyChangeSilence | null
}

/** What a change did to the words of a deployment's library, by kind of part. */
export type LibraryCopyChange = {
  /**
   * Every type that stands in either window, most words fallen away first.
   *
   * Then the lower read share in the later window, then by type, so two kinds
   * that lost the same words do not reorder on a refresh.
   */
  readonly byType: readonly KindCopyChange[]
  /**
   * Every role in the vocabulary that stands in either window, then the row for
   * parts whose type declared none, in the same order as {@link byType}.
   *
   * Thin today for the reason every role figure in this subsystem is thin:
   * nothing in `src/primitives/` declares one, so nearly every part is in the
   * `null` row — and in this reading that row is also the one that keeps the
   * words of a node whose type changed. The join is at read time (0212), so the
   * day a role is declared these rows start answering without a migration.
   */
  readonly byRole: readonly KindCopyChange[]
  /**
   * The whole library's carried words, which is {@link byType} added up.
   *
   * The one whole-library figure in any reading of a library, and the reason is
   * in the module documentation: words partition a page and places do not. It
   * follows the **type** rows rather than the role rows, because the two
   * disagree about a node whose type changed and a type is the thing an author
   * replaces.
   *
   * No verdict and no silence of its own. Every reason this reading has to
   * withhold something is a reason about one kind of part, and inventing a
   * second subject for a figure that is a sum of rows would put *there is none
   * of this in your library* over a number about all of it (0240).
   */
  readonly words: CarriedWords
  /** Pages read in both windows, which is trees and not revisions. */
  readonly pages: number
  /** Pages read in the later window only. */
  readonly pagesGained: number
  /** Pages read in the earlier window only. */
  readonly pagesLost: number
  /**
   * Paired pages whose revision moved between the windows.
   *
   * What makes this reading worth more than the places one: a republished page
   * is exactly where a paired placement's words may be two different sentences,
   * and holding the **text** still rather than the node is what this module
   * does about it. A reading where this is nought is two windows of one library
   * and every placement's words are carried by construction.
   */
  readonly republished: number
  /** Places that say the same words in both windows, over every kind. */
  readonly placements: number
  /** Places both windows bear whose words the change rewrote. */
  readonly rewritten: number
  /** Places the later window bears and the earlier did not, counting a recast node once. */
  readonly gained: number
  /** Places the earlier window bore and the later does not, counting a recast node once. */
  readonly lost: number
  /**
   * Paired nodes whose primitive type changed.
   *
   * A place one kind left and another took (0266), so its words are in
   * {@link wordsGained} and {@link wordsLost} both — the page did not gain or
   * lose them and the two kinds did, which is what this number is here to say.
   * Not an alarm: it is the commonest change an author makes to a library.
   */
  readonly recast: number
  /** Words of the places the library gained, as the later window says them. */
  readonly wordsGained: number
  /** Of {@link wordsGained}, the words read in the window that has them. */
  readonly wordsGainedRead: number
  /** Words of the places it lost, as the earlier window said them. */
  readonly wordsLost: number
  /** Of {@link wordsLost}, the words that had been read in the window that had them. */
  readonly wordsLostRead: number
  /**
   * A floor on the page views of the earlier window, added over the paired
   * pages.
   *
   * `PageReading.views` is the largest `views` any one part of a page reports,
   * which is a floor and not a count (0147). Published because every transition
   * in this reading is confounded by it: a quieter window leaves more words
   * unread with no reader behaving differently, and these two numbers are what
   * let somebody see that before reading a movement as a finding.
   *
   * Not a count of readers, and not addable into one: a reader who read two
   * pages is two page views here.
   */
  readonly viewsWas: number
  /** The same floor for the later window, over the same pages. */
  readonly viewsNow: number
  /**
   * The type whose kept words lost the most reading, which is the kind to look
   * at first.
   *
   * By the **mass** of words and not by the share, for the reason a page's
   * falls are ranked by the readers they lose (0221) and a library's kinds by
   * the places they are skipped in (0257): a label that lost its one reader is
   * a perfect rate and a smaller problem than a band of four hundred words that
   * lost half of them. `null` where nothing anywhere fell away.
   *
   * A type and never a role, because a type is the thing an author can replace.
   */
  readonly mostAbandoned: KindCopyChange | null
  /** The type whose kept words gained the most reading, by the same rule. */
  readonly mostTakenUp: KindCopyChange | null
  /**
   * Trees read at two revisions in one window, which are in nothing above.
   *
   * A page that is two live revisions in one window has no single counterpart
   * in the other, and the comparison pairs by page: picking one would be a
   * number nobody could account for (0266).
   */
  readonly ambiguous: readonly TreeId[]
  /**
   * Readings of a revision beyond the first, on either side, which were
   * dropped.
   *
   * A caller that concatenated two reads of one window holds a page twice, and
   * a page twice is the one way a comparison of two libraries can lie about how
   * much of one there is (0158).
   */
  readonly duplicated: number
  /**
   * Types the two windows disagree about the role of, where the later window's
   * answer stands.
   *
   * A type plays one part (0114), so a disagreement is not a change a
   * deployment made: it is two readings joined against two different
   * registries, held against each other. Every role row above is then about
   * neither.
   */
  readonly roleDisagreed: readonly PrimitiveType[]
}

/**
 * One kind's row before it is a row.
 *
 * A mutable accumulator and not a fold, for the reason the census's is: a
 * library of forty pages is tens of thousands of placements and a fold would
 * copy a row per one. Nothing escapes this module.
 */
type Counting = {
  placements: number
  rewritten: number
  rewrittenWas: number
  rewrittenNow: number
  gained: number
  lost: number
  wordsGained: number
  wordsGainedRead: number
  wordsLost: number
  wordsLostRead: number
  flooredPlacements: number
  carried: number
  unspoken: number
  keptRead: number
  keptSkipped: number
  tookUp: number
  fellAway: number
  flooredWords: number
}

/** One kind's row, which is a count of words with a key on it. */
type Tallying = Counting & {
  readonly kind: KindKey
  role: PrimitiveRole | null
}

const counting = (): Counting => ({
  placements: 0,
  rewritten: 0,
  rewrittenWas: 0,
  rewrittenNow: 0,
  gained: 0,
  lost: 0,
  wordsGained: 0,
  wordsGainedRead: 0,
  wordsLost: 0,
  wordsLostRead: 0,
  flooredPlacements: 0,
  carried: 0,
  unspoken: 0,
  keptRead: 0,
  keptSkipped: 0,
  tookUp: 0,
  fellAway: 0,
  flooredWords: 0,
})

const tallying = (kind: KindKey): Tallying => ({ kind, role: null, ...counting() })

/** The two keys one placement is counted under, which is the pair of questions this answers. */
const keysOf = (of: { readonly type: PrimitiveType; readonly role: PrimitiveRole | null }): readonly KindKey[] => [
  { by: "type", type: of.type },
  { by: "role", role: of.role },
]

const rowFor = (rows: Map<string, Tallying>, kind: KindKey): Tallying => {
  const key = kindKeyOf(kind)
  const row = rows.get(key) ?? tallying(kind)

  rows.set(key, row)

  return row
}

const shareOf = (read: number, comparable: number): number | null =>
  comparable === 0 ? null : read / comparable

/**
 * The silence, with the reasons tried in the order they have to be tried in.
 *
 * Nothing of the kind first, because *there is no such part in this library* is
 * a better answer than anything said about its words. Then nothing held still,
 * because a kind whose every word was rewritten is a fact about the change and
 * would otherwise be reported as nobody having read it. Then the floor, last,
 * because it is the only one of the five that withholds a single figure rather
 * than the comparison.
 *
 * The floor is tried on the **placements** and not on their words. A part that
 * declares no `copy` at all says nought visible words and hides all of them,
 * which is the commonest floor there is — so a trigger counted in words would
 * stay nought for exactly the case it exists for and publish a signed figure
 * nobody can stand behind (0122, 0239).
 */
const silenceOf = (of: Counting, comparable: number): KindCopyChangeSilence | null => {
  if (of.placements + of.rewritten + of.gained + of.lost === 0) return "unplaced"
  if (of.placements === 0) return "unpaired"
  if (of.carried === 0) return "wordless"
  if (comparable === 0) return "unread"

  return of.flooredPlacements > 0 ? "floored" : null
}

/**
 * The verdict, off the two masses and never off the two shares.
 *
 * The shares have one denominator by construction, so their difference has the
 * sign of `tookUp − fellAway` exactly; taking it from the masses keeps a
 * division out of a verdict.
 */
const movementOf = (of: Counting, silence: KindCopyChangeSilence | null): KindWordMovement => {
  if (silence !== null) return "unknown"
  if (of.tookUp > of.fellAway) return "taken-up"
  if (of.fellAway > of.tookUp) return "abandoned"

  return of.keptRead === 0 && of.tookUp === 0 ? "still-unread" : "held"
}

const carriedOf = (of: Counting, signed: boolean): CarriedWords => {
  const comparable = of.keptRead + of.keptSkipped + of.tookUp + of.fellAway

  return {
    carried: of.carried,
    comparable,
    unspoken: of.unspoken,
    keptRead: of.keptRead,
    keptSkipped: of.keptSkipped,
    tookUp: of.tookUp,
    fellAway: of.fellAway,
    readShareWas: shareOf(of.keptRead + of.fellAway, comparable),
    readShareNow: shareOf(of.keptRead + of.tookUp, comparable),
    change: signed ? of.tookUp - of.fellAway : null,
    floored: of.flooredWords,
  }
}

const rowOf = (of: Tallying): KindCopyChange => {
  const comparable = of.keptRead + of.keptSkipped + of.tookUp + of.fellAway
  const silence = silenceOf(of, comparable)

  return {
    kind: of.kind,
    role: of.kind.by === "type" ? of.role : null,
    placements: of.placements,
    rewritten: of.rewritten,
    rewrittenWords: { was: of.rewrittenWas, now: of.rewrittenNow },
    gained: of.gained,
    lost: of.lost,
    wordsGained: of.wordsGained,
    wordsGainedRead: of.wordsGainedRead,
    wordsLost: of.wordsLost,
    wordsLostRead: of.wordsLostRead,
    flooredPlacements: of.flooredPlacements,
    words: carriedOf(of, of.flooredPlacements === 0 && comparable > 0),
    movement: movementOf(of, silence),
    silence,
  }
}

/** The name a row is ordered by, which is the key's own and never the row's position. */
const nameOf = (kind: KindKey): string => (kind.by === "type" ? kind.type : (kind.role ?? ""))

/**
 * The kind to look at first, which is the ranking rule spelled once.
 *
 * Most words fallen away, then the lower read share now, then by name — so a
 * kind with no share at all sorts after one with a share of nought rather than
 * above it, because `null` is *nothing can be said* and not *nobody read it*.
 */
const worseOf = (one: KindCopyChange, other: KindCopyChange): number =>
  other.words.fellAway - one.words.fellAway ||
  (one.words.readShareNow ?? 2) - (other.words.readShareNow ?? 2) ||
  nameOf(one.kind).localeCompare(nameOf(other.kind))

/** One window's pages, by tree, with the two ways a window can hold a page twice counted apart. */
type Window = {
  readonly byTree: ReadonlyMap<TreeId, PageReading>
  /** Trees held at two revisions, which have no single counterpart in the other window. */
  readonly ambiguous: ReadonlySet<TreeId>
  /** The same revision of the same tree handed in again. */
  readonly duplicated: number
}

const windowOf = (readings: readonly PageReading[]): Window => {
  const byTree = new Map<TreeId, PageReading>()
  const ambiguous = new Set<TreeId>()
  let duplicated = 0

  for (const reading of readings) {
    const standing = byTree.get(reading.treeId)

    if (standing === undefined) {
      byTree.set(reading.treeId, reading)
      continue
    }

    if (standing.revision === reading.revision) duplicated += 1
    else ambiguous.add(reading.treeId)
  }

  return { byTree, ambiguous, duplicated }
}

const partsByNode = (reading: PageReading): ReadonlyMap<NodeId, PartReading> =>
  new Map(reading.parts.map((part) => [part.nodeId, part]))

/**
 * The passages of a page only one window holds, by the published rule for
 * whether a part says anything at all.
 *
 * `copyReadingOf`'s own list rather than a second spelling of its filter: a
 * part that says nothing and hides nothing is in neither reading, and two
 * spellings of that rule that agree today are how two screens come to disagree
 * (0122).
 */
const passagesOf = (reading: PageReading): readonly Passage[] =>
  copyReadingOf(reading).passages

/** A word mass and the part of it that was read, which is the pair every changed-hands figure is. */
const readOf = (passage: { readonly words: number; readonly standing: PartStanding }): number =>
  passage.standing === "read" ? passage.words : 0

/** One side of a kind key, which is what decides whether a placement is held still under it. */
type Keyed = { readonly type: PrimitiveType; readonly role: PrimitiveRole | null }

/**
 * The keys a paired placement is held still under, and the keys it changed
 * hands between.
 *
 * A placement is carried under a key only where it is of that kind on **both**
 * sides, which is where the two keys answer differently: a node recast into
 * another type is a place one type left and another took, while the role rows
 * hold it still wherever the two types play the same part (0266).
 */
const pairingOf = (
  before: Keyed,
  after: Keyed
): {
  readonly held: readonly KindKey[]
  readonly left: readonly KindKey[]
  readonly took: readonly KindKey[]
} => {
  const sameType = before.type === after.type
  const sameRole = before.role === after.role

  return {
    held: [
      ...(sameType ? [{ by: "type", type: after.type } as const] : []),
      ...(sameRole ? [{ by: "role", role: after.role } as const] : []),
    ],
    left: [
      ...(sameType ? [] : [{ by: "type", type: before.type } as const]),
      ...(sameRole ? [] : [{ by: "role", role: before.role } as const]),
    ],
    took: [
      ...(sameType ? [] : [{ by: "type", type: after.type } as const]),
      ...(sameRole ? [] : [{ by: "role", role: after.role } as const]),
    ],
  }
}

/** Where a carried passage's words go, which is its movement read as two windows' standings. */
const bucket = (row: Counting, passage: ComparedPassage): void => {
  row.placements += 1
  row.carried += passage.words

  if (passage.floored) {
    row.flooredPlacements += 1
    row.flooredWords += passage.words
  }

  switch (passage.movement) {
    case "held":
      row.keptRead += passage.words
      return
    case "unread":
      row.keptSkipped += passage.words
      return
    case "gained":
      row.tookUp += passage.words
      return
    case "lost":
      row.fellAway += passage.words
      return
    case "unknown":
      row.unspoken += passage.words
  }
}

/** A placement that changed hands between two kinds, counted in both of them. */
const changedHands = (
  rows: Map<string, Tallying>,
  keys: { readonly left: readonly KindKey[]; readonly took: readonly KindKey[] },
  words: { readonly was: number; readonly wasRead: number; readonly now: number; readonly nowRead: number }
): void => {
  for (const kind of keys.left) {
    const row = rowFor(rows, kind)

    row.lost += 1
    row.wordsLost += words.was
    row.wordsLostRead += words.wasRead
  }

  for (const kind of keys.took) {
    const row = rowFor(rows, kind)

    row.gained += 1
    row.wordsGained += words.now
    row.wordsGainedRead += words.nowRead
  }
}

/**
 * What a change did to the words of a kind of part, across every page it stands
 * on.
 *
 * Takes the two windows' readings rather than two censuses, and the reason is
 * the method: a census publishes a kind's words added up, and the **text** has
 * to be paired before anything can be held still. Two censuses cannot be
 * subtracted, which is what this module is for.
 *
 * The labels are the caller's. Two readings of one window and one library come
 * back as every word carried and nothing gained, lost or rewritten; a caller
 * who holds the two sides backwards gets a comparison with every movement
 * reversed rather than a refusal, exactly as a before-and-after reading of one
 * page does.
 *
 * Linear in the parts handed in, with one comparison per paired page.
 */
export const libraryCopyChangeOf = (
  was: readonly PageReading[],
  now: readonly PageReading[]
): LibraryCopyChange => {
  const earlier = windowOf(was)
  const later = windowOf(now)
  const rows = new Map<string, Tallying>()
  const roleWas = new Map<PrimitiveType, PrimitiveRole | null>()
  const roleNow = new Map<PrimitiveType, PrimitiveRole | null>()
  const ambiguous = new Set([...earlier.ambiguous, ...later.ambiguous])
  const whole = counting()
  let pages = 0
  let pagesGained = 0
  let pagesLost = 0
  let republished = 0
  let recast = 0
  let viewsWas = 0
  let viewsNow = 0

  /**
   * Every role in the vocabulary gets a row whether or not anything plays it,
   * as a census's role rows do: a role nothing in the library plays is a fact
   * about the library, and a surface that had to tell a missing row from an
   * empty one would be reading the vocabulary itself.
   */
  for (const role of [...PRIMITIVE_ROLES, null]) rowFor(rows, { by: "role", role })

  for (const [treeId, reading] of earlier.byTree) {
    if (ambiguous.has(treeId)) continue

    for (const part of reading.parts) {
      roleWas.set(part.type, part.role)
      rowFor(rows, { by: "type", type: part.type }).role = part.role
    }

    if (later.byTree.has(treeId)) continue

    pagesLost += 1

    for (const passage of passagesOf(reading)) {
      whole.lost += 1
      whole.wordsLost += passage.words
      whole.wordsLostRead += readOf(passage)

      for (const kind of keysOf(passage)) {
        const row = rowFor(rows, kind)

        row.lost += 1
        row.wordsLost += passage.words
        row.wordsLostRead += readOf(passage)
      }
    }
  }

  for (const [treeId, reading] of later.byTree) {
    if (ambiguous.has(treeId)) continue

    for (const part of reading.parts) {
      roleNow.set(part.type, part.role)
      rowFor(rows, { by: "type", type: part.type }).role = part.role
    }

    if (earlier.byTree.has(treeId)) continue

    pagesGained += 1

    for (const passage of passagesOf(reading)) {
      whole.gained += 1
      whole.wordsGained += passage.words
      whole.wordsGainedRead += readOf(passage)

      for (const kind of keysOf(passage)) {
        const row = rowFor(rows, kind)

        row.gained += 1
        row.wordsGained += passage.words
        row.wordsGainedRead += readOf(passage)
      }
    }
  }

  for (const [treeId, before] of earlier.byTree) {
    const after = later.byTree.get(treeId)

    if (after === undefined || ambiguous.has(treeId)) continue

    const change = copyChangeOf(before, after)
    const beforeParts = partsByNode(before)

    pages += 1
    republished += before.revision === after.revision ? 0 : 1
    viewsWas += before.views
    viewsNow += after.views

    for (const passage of change.compared) {
      const part = beforeParts.get(passage.nodeId)

      /**
       * A compared passage is a node both readings hold, so the earlier part is
       * always there. Skipped rather than thrown, as every join in this
       * subsystem is: a row that cannot be built cannot be drawn, and a reading
       * is not worth failing over.
       */
      if (part === undefined) continue

      const keys = pairingOf(part, passage)

      if (part.type === passage.type) bucket(whole, passage)
      else {
        recast += 1
        whole.lost += 1
        whole.gained += 1
        whole.wordsLost += passage.words
        whole.wordsGained += passage.words
        whole.wordsLostRead += readOf({ words: passage.words, standing: passage.was.standing })
        whole.wordsGainedRead += readOf({ words: passage.words, standing: passage.now.standing })
      }

      for (const kind of keys.held) bucket(rowFor(rows, kind), passage)

      changedHands(rows, keys, {
        was: passage.words,
        wasRead: readOf({ words: passage.words, standing: passage.was.standing }),
        now: passage.words,
        nowRead: readOf({ words: passage.words, standing: passage.now.standing }),
      })
    }

    for (const passage of change.reworded) {
      const part = beforeParts.get(passage.nodeId)

      if (part === undefined) continue

      const keys = pairingOf(part, passage)

      if (part.type === passage.type) {
        whole.rewritten += 1
        whole.rewrittenWas += passage.words.was
        whole.rewrittenNow += passage.words.now
      } else {
        recast += 1
        whole.lost += 1
        whole.gained += 1
        whole.wordsLost += passage.words.was
        whole.wordsGained += passage.words.now
        whole.wordsLostRead += readOf({ words: passage.words.was, standing: passage.was.standing })
        whole.wordsGainedRead += readOf({ words: passage.words.now, standing: passage.now.standing })
      }

      for (const kind of keys.held) {
        const row = rowFor(rows, kind)

        row.rewritten += 1
        row.rewrittenWas += passage.words.was
        row.rewrittenNow += passage.words.now
      }

      changedHands(rows, keys, {
        was: passage.words.was,
        wasRead: readOf({ words: passage.words.was, standing: passage.was.standing }),
        now: passage.words.now,
        nowRead: readOf({ words: passage.words.now, standing: passage.now.standing }),
      })
    }

    for (const passage of change.added) {
      whole.gained += 1
      whole.wordsGained += passage.words
      whole.wordsGainedRead += readOf(passage)

      for (const kind of keysOf(passage)) {
        const row = rowFor(rows, kind)

        row.gained += 1
        row.wordsGained += passage.words
        row.wordsGainedRead += readOf(passage)
      }
    }

    for (const passage of change.removed) {
      whole.lost += 1
      whole.wordsLost += passage.words
      whole.wordsLostRead += readOf(passage)

      for (const kind of keysOf(passage)) {
        const row = rowFor(rows, kind)

        row.lost += 1
        row.wordsLost += passage.words
        row.wordsLostRead += readOf(passage)
      }
    }
  }

  const built = [...rows.values()].map(rowOf)
  const byType = built.filter((row) => row.kind.by === "type").sort(worseOf)
  const disagreed = [...roleNow.keys()]
    .filter((type) => roleWas.has(type) && roleWas.get(type) !== roleNow.get(type))
    .sort((one, other) => one.localeCompare(other))
  const comparable = whole.keptRead + whole.keptSkipped + whole.tookUp + whole.fellAway

  return {
    byType,
    byRole: built.filter((row) => row.kind.by === "role").sort(worseOf),
    words: carriedOf(whole, whole.flooredPlacements === 0 && comparable > 0),
    pages,
    pagesGained,
    pagesLost,
    republished,
    placements: whole.placements,
    rewritten: whole.rewritten,
    gained: whole.gained,
    lost: whole.lost,
    recast,
    wordsGained: whole.wordsGained,
    wordsGainedRead: whole.wordsGainedRead,
    wordsLost: whole.wordsLost,
    wordsLostRead: whole.wordsLostRead,
    viewsWas,
    viewsNow,
    mostAbandoned: byType.find((row) => row.words.fellAway > 0) ?? null,
    mostTakenUp:
      byType
        .filter((row) => row.words.tookUp > 0)
        .sort(
          (one, other) =>
            other.words.tookUp - one.words.tookUp ||
            nameOf(one.kind).localeCompare(nameOf(other.kind))
        )[0] ?? null,
    ambiguous: [...ambiguous].sort((one, other) => one.localeCompare(other)),
    duplicated: earlier.duplicated + later.duplicated,
    roleDisagreed: disagreed,
  }
}
