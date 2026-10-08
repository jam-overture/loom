import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"

import type { PageReading, PartReading } from "./parts.js"
import { countWords } from "./words.js"

/**
 * Whether a part was read or scrolled past.
 *
 * [`parts.ts`](parts.ts) answers *which parts came into view*, and it has
 * always been careful to say only that: `read` there means **a row says this
 * part was on a reader's screen**. A band a reader scrolled through at speed is
 * `read` by that definition and was not read by any other, and a page of them
 * reports as a page that was read from top to bottom. That is the
 * plausible-false-number failure this subsystem keeps finding in new places —
 * the figure is the right shape, it is on the screen, and nobody can tell it is
 * wrong.
 *
 * The missing half was already in the rows. A tally carries `dwellMs` beside
 * `reached`, and since [0223](../../decisions/0223-a-prop-is-copy-when-a-reader-could-quote-it.md)
 * the tree carries the words a part says. **Time on screen against the time its
 * words take to read** is the question, and both sides of it are already held:
 * nothing is added to a payload, a browser, a column, a store or the
 * vocabulary. It is the fifth thing taken out of the server-side join of
 * [0212](../../decisions/0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)
 * rather than collected.
 *
 * ## A verdict in one direction only
 *
 * Three things bias the comparison, and all three bias it the same way.
 *
 * - **Dwell is time on screen, not time reading.** `READABLE_VISIBLE_FRACTION`
 *   says half of an element showing is enough ([0218](../../decisions/0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md)),
 *   so a part sits accumulating dwell while a reader reads its neighbour, and
 *   an ancestor accumulates dwell for the whole time any of its children was up.
 * - **A word count can be a floor.** A type that declares no `copy` has words
 *   nothing can see (0122), and a declared prop holding something other than a
 *   string is a word owed and not given. Either way the part says *at least*
 *   this much.
 * - **The reader count is generous.** `reached` is a distinct view count summed
 *   across rollup windows (0147), so a reader who straddled a boundary is two,
 *   and the mean time per reader is short by that much. This is the one of the
 *   three that is measured rather than argued, and {@link PaceOptions.inflation}
 *   is where a deployment hands the measurement in (0219).
 *
 * So the time a reader is credited with is generous, the words they had to get
 * through are a floor, and **`skimmed` is the only verdict that survives all
 * three**: it says the time on screen was short *even after* every doubt has
 * been resolved in the page's favour. `paced` and `lingered` are the weaker
 * claims, and where the words are a floor they are not made at all — the part
 * goes back to `unknown`, with {@link PaceSilence} saying why.
 *
 * That asymmetry is the whole design and it is deliberate. *Readers are not
 * reading this* is worth being sure of. *Readers read this* is a thing nobody
 * acts on.
 *
 * ## Nesting, and the sums that are therefore missing
 *
 * A part is judged against its own subtree's words, because the words on screen
 * while a band was up are the band's and its children's. So figures nest: a
 * band and the paragraph inside it are both here, and the paragraph's words are
 * in the band's count. Nothing on a page total adds them, and there is no
 * page-wide word figure at all — one reader who scrolled past a band scrolled
 * past everything in it, and a sum would charge them for it once per level.
 *
 * Pure, linear in the parts, and reaches no store, clock or DOM — it adds
 * nothing to the broadcaster's import graph.
 */

/**
 * The rate a page's words are costed at, in words per minute.
 *
 * Published for the reason the readable fractions are (0218): a number that
 * decides what a counter **means** should be quotable by the page explaining
 * it, rather than retyped beside the noun it qualifies. 240 is the middle of
 * the range usually reported for adult silent reading of ordinary prose, and it
 * is a costing rate rather than a claim about any reader — the verdicts are
 * built to survive being wrong about it by a wide margin in either direction.
 *
 * **Unlike the readable fractions, this one may be overridden**, and the
 * difference is which side of the wire it lives on. Those two are applied in a
 * browser and are baked into every counter already written. This is applied
 * when the rows are read (0212), so a deployment that changes it reinterprets
 * its whole history and invalidates nothing. What it may change is the rate,
 * which is a fact about its own text and its own language that the framework
 * cannot know; the thresholds below are the framework's statement of how much
 * margin a claim needs, and are not a dial.
 */
export const READING_WORDS_PER_MINUTE = 240

/**
 * Below this much of the time its words take, a part was not read.
 *
 * Half. Low enough that the verdict holds through all three biases above, which
 * is what makes it the claim worth putting on a screen.
 */
export const SKIMMED_BELOW = 0.5

/**
 * Above this much, readers stayed longer than the words account for.
 *
 * A weak signal by construction, because dwell counts a part that was merely up
 * while something else was being read. It is a question — *is this where people
 * get stuck, or is it just the tall thing at the bottom of the page* — and not
 * an answer.
 */
export const LINGERED_ABOVE = 3

/** What the time readers spent says about the words a part puts in front of them. */
export type PaceStanding =
  /**
   * Readers had less than {@link SKIMMED_BELOW} of the time the words take.
   *
   * The one verdict here that is safe against every bias in the module
   * documentation, and the one a screen should lead with.
   */
  | "skimmed"
  /** Time enough for the words, and not conspicuously more. */
  | "paced"
  /** More than {@link LINGERED_ABOVE} times the time the words take. */
  | "lingered"
  /** Nothing can be said, and {@link PacedPart.silence} says which nothing. */
  | "unknown"

export const PACE_STANDINGS: readonly PaceStanding[] = everyMemberOf<PaceStanding>()([
  "skimmed",
  "paced",
  "lingered",
  "unknown",
])

/** Why a part has no pace. */
export type PaceSilence =
  /**
   * No view reported it coming into view, so there is no time to divide and no
   * reader to divide it between.
   *
   * On a window with no views at all, this is every part — which is the same
   * refusal `parts.ts` makes one level down, arrived at rather than special-cased.
   */
  | "unreached"
  /**
   * Its words are a floor, and the verdict that floor would support is not the
   * safe one.
   *
   * Some type in its subtree declares no `copy`, or declared a prop holding
   * something that is not a string. `skimmed` is still reported where it is
   * reached, because more words only make a part more skimmed; anything else
   * would be a claim resting on words nobody counted.
   */
  | "unreadable"
  /**
   * It says nothing, as far as anything can tell: no words, and nothing
   * undeclared either.
   *
   * A spacer, a rule, an image with no caption. There is no time its words take,
   * so there is no ratio — and this is kept apart from `unreadable` because
   * *there are none* and *nobody said* are different answers (0122).
   */
  | "wordless"

export const PACE_SILENCES: readonly PaceSilence[] = everyMemberOf<PaceSilence>()([
  "unreached",
  "unreadable",
  "wordless",
])

/** One line per standing, for a surface putting the reading in front of a person. */
export const describePaceStanding = (standing: PaceStanding): string => {
  switch (standing) {
    case "skimmed":
      return "readers had too little time on it to have read its words"
    case "paced":
      return "readers had time enough for its words"
    case "lingered":
      return "readers stayed well past what its words account for"
    case "unknown":
      return "nothing could be compared"
  }
}

/** One line per silence, for the same surface. */
export const describePaceSilence = (silence: PaceSilence): string => {
  switch (silence) {
    case "unreached":
      return "no view reported it coming into view"
    case "unreadable":
      return "some of its words could not be read, so only a skim could be claimed"
    case "wordless":
      return "it says nothing that takes time to read"
  }
}

/** One part, with the time its readers had against the time its words take. */
export type PacedPart = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** What part it plays (0114), or `null` where its type declared none. */
  readonly role: PrimitiveRole | null
  /** 0 at the root. */
  readonly depth: number
  /** null at the root. */
  readonly parentId: NodeId | null
  /** Distinct page views that reported it coming into view; `0` where no row named it. */
  readonly readers: number
  /** The words this part says itself, counted. Its own, never its subtree's. */
  readonly words: number
  /**
   * The words of this part and everything under it.
   *
   * The denominator, because the text on screen while a band was up is the
   * band's and its children's. Nests, and is therefore never added across parts.
   */
  readonly wordsWithin: number
  /**
   * Whether {@link wordsWithin} is a floor rather than a count.
   *
   * True when anything in the subtree declared no `copy`, or declared a prop
   * holding something other than a string.
   */
  readonly floored: boolean
  /** Time on screen, summed across every view in the window. */
  readonly dwellMs: number
  /**
   * The same time per reader, after {@link PaceOptions.inflation}.
   *
   * `null` where nobody reached it. Generous by the two biases nothing measures:
   * dwell counts a part that was merely up, and an ancestor's dwell covers its
   * children's reading.
   */
  readonly spentMs: number | null
  /** What {@link wordsWithin} takes at the costing rate. `0` where it says nothing. */
  readonly needMs: number
  /**
   * Time spent for every unit of time the words take. `1` is exactly enough.
   *
   * `null` where there is nothing to divide: no reader, or no words.
   */
  readonly pace: number | null
  readonly standing: PaceStanding
  /** Why there is no verdict, and `null` where there is one. */
  readonly silence: PaceSilence | null
  /**
   * Readers times the words they were shown here — the ranking key, and a
   * magnitude rather than a census.
   *
   * Nests like {@link wordsWithin} does, so it ranks and is never summed.
   */
  readonly wordsPassed: number
}

export type PagePace = {
  readonly treeId: TreeId
  readonly revision: number
  /** The page's view floor, carried through from the reading unchanged. */
  readonly views: number
  /** Every element part of the revision, in reading order. */
  readonly parts: readonly PacedPart[]
  readonly standings: Readonly<Record<PaceStanding, number>>
  /** Why the parts with no verdict have none. Counts only the silent ones. */
  readonly silences: Readonly<Record<PaceSilence, number>>
  /**
   * The root, judged against the whole page.
   *
   * *Readers spend a third of the time this page's words take* is a true
   * sentence and the one a reader screen opens with — and it is kept out of
   * {@link mostSkimmed} because the page contains every part, so by words passed
   * it would win every ranking it was entered in.
   *
   * `null` where the revision's root is not an element, which is the one tree
   * shape with no part at depth 0.
   */
  readonly whole: PacedPart | null
  /**
   * The part of the page most words went unread in: most words passed, then
   * first in reading order.
   *
   * By words passed rather than by the lowest pace, for the same reason a stop
   * is ranked by the readers it loses (0221): a caption two readers hurried
   * past is a worse ratio and a smaller problem than a band four hundred of
   * them did.
   */
  readonly mostSkimmed: PacedPart | null
  /** The inflation that was applied; `0` when none was given. */
  readonly inflation: number
  /** The costing rate that was applied, which is the default unless one was given. */
  readonly wordsPerMinute: number
}

export type PaceOptions = {
  /**
   * How generous the reader counts are, as `drift ÷ opened` off the page-view
   * rows (0219).
   *
   * `reached` over-counts by the page views that straddled a rollup window, so
   * the mean time per reader is short by the same proportion — and short means
   * **more parts called skimmed than should be**, which is the one direction
   * this module's safe verdict cannot afford to be wrong in. A deployment that
   * has the measurement hands it over and the correction is applied; one that
   * does not gets the uncorrected figure and the bias stated here.
   *
   * Absent, zero, negative or not finite are all *no correction*: a negative
   * inflation is not a thing a rollup can produce, and silently trusting one
   * would widen the claim rather than narrow it.
   */
  readonly inflation?: number
  /**
   * The costing rate, where {@link READING_WORDS_PER_MINUTE} is wrong for this
   * deployment's text.
   *
   * Zero, negative or not finite are refused the same way, and the published
   * default applies.
   */
  readonly wordsPerMinute?: number
}

const NO_STANDINGS: Readonly<Record<PaceStanding, number>> = Object.freeze({
  skimmed: 0,
  paced: 0,
  lingered: 0,
  unknown: 0,
})

const NO_SILENCES: Readonly<Record<PaceSilence, number>> = Object.freeze({
  unreached: 0,
  unreadable: 0,
  wordless: 0,
})

const MS_PER_MINUTE = 60_000

/** What a part contributes on its own: its words, and whether any of them got away. */
const ownWords = (part: PartReading): { readonly words: number; readonly floored: boolean } => ({
  words: countWords(part.copy.words),
  floored: part.copy.unread.length > 0 || part.copy.unspoken.length > 0,
})

type Subtree = { readonly words: number; readonly floored: boolean }

/** The totals of a part that is not there to have any, which no reading produces. */
const NOTHING_SAID: Subtree = Object.freeze({ words: 0, floored: false })

/**
 * Each part's subtree totals, in one pass over the reading.
 *
 * The parts are pre-order with depths, so a part's subtree is the run of
 * following parts deeper than it — which a stack closes in constant amortised
 * time per part. **Depth rather than `parentId`**, because a slot node is not a
 * part and can hold element children: walking the parent chain would strand a
 * whole band's words on a node this reading has never heard of, and the stack
 * cannot, since it only ever asks whether the next part is deeper.
 */
const subtreesOf = (parts: readonly PartReading[]): readonly Subtree[] => {
  const totals: Subtree[] = []
  const open: { index: number; depth: number; words: number; floored: boolean }[] = []

  const close = (): void => {
    const frame = open.pop()
    if (frame === undefined) return

    totals[frame.index] = { words: frame.words, floored: frame.floored }

    const parent = open[open.length - 1]
    if (parent === undefined) return

    parent.words += frame.words
    parent.floored = parent.floored || frame.floored
  }

  parts.forEach((part, index) => {
    while ((open[open.length - 1]?.depth ?? -1) >= part.depth) close()

    const own = ownWords(part)

    open.push({ index, depth: part.depth, words: own.words, floored: own.floored })
  })

  while (open.length > 0) close()

  return totals
}

/**
 * The verdict, which is the asymmetry of the module documentation written once.
 *
 * `skimmed` is reached before the floor is consulted, because words nobody
 * counted can only make a part more skimmed than it already reads. Everything
 * after that point is a claim the floor could overturn.
 *
 * **Published** because a comparison of two windows asks it of a pace neither
 * window reported — the pace a part would have had if the change had not
 * touched its words ([`pace-change.ts`](pace-change.ts)) — and a second
 * spelling of this rule is the thing this subsystem has already been bitten by
 * twice: two counter keys that agreed until they did not, and two word counts
 * that agreed until one of them learned about slots.
 */
export const paceStandingOf = (pace: number | null, floored: boolean): PaceStanding => {
  if (pace === null) return "unknown"
  if (pace < SKIMMED_BELOW) return "skimmed"
  if (floored) return "unknown"

  return pace > LINGERED_ABOVE ? "lingered" : "paced"
}

const silenceOf = (readers: number, wordsWithin: number, floored: boolean): PaceSilence => {
  if (readers === 0) return "unreached"

  return wordsWithin === 0 && !floored ? "wordless" : "unreadable"
}

/** A positive, finite option, or the fallback. Everything else is refused. */
const positive = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback

const pacedPart = (
  part: PartReading,
  subtree: Subtree,
  inflation: number,
  msPerWord: number
): PacedPart => {
  const own = ownWords(part)
  const readers = part.counters?.reached ?? 0
  const dwellMs = part.counters?.dwellMs ?? 0
  const needMs = subtree.words * msPerWord

  /**
   * A page view that straddled a rollup window is one reader counted twice
   * carrying one reader's dwell (0147), so the mean is short by the same
   * proportion the inflation names.
   * Multiplying the time is the same correction as dividing the readers and
   * keeps `readers` the integer the rows actually hold.
   */
  const spentMs = readers === 0 ? null : (dwellMs * (1 + inflation)) / readers
  const pace = spentMs === null || needMs === 0 ? null : spentMs / needMs
  const standing = paceStandingOf(pace, subtree.floored)

  return {
    nodeId: part.nodeId,
    type: part.type,
    role: part.role,
    depth: part.depth,
    parentId: part.parentId,
    readers,
    words: own.words,
    wordsWithin: subtree.words,
    floored: subtree.floored,
    dwellMs,
    spentMs,
    needMs,
    pace,
    standing,
    silence: standing === "unknown" ? silenceOf(readers, subtree.words, subtree.floored) : null,
    wordsPassed: readers * subtree.words,
  }
}

/**
 * The more skimmed of two, which is the ranking rule spelled once.
 *
 * `>` rather than `>=` is what makes *first in reading order* hold without a
 * second comparison: an equal candidate never displaces the one already
 * standing, and the parts arrive in reading order.
 */
const worseOf = (standing: PacedPart | null, next: PacedPart): PacedPart =>
  standing === null || next.wordsPassed > standing.wordsPassed ? next : standing

/**
 * Whether readers had time to read what each part of a page says.
 *
 * Handed the output of `pageReadingOf`, because the words, the counters and the
 * reading order are all already joined there and deriving them a second time is
 * how two screens come to disagree.
 */
export const readingPaceOf = (reading: PageReading, options: PaceOptions = {}): PagePace => {
  const inflation = positive(options.inflation, 0)
  const wordsPerMinute = positive(options.wordsPerMinute, READING_WORDS_PER_MINUTE)
  const msPerWord = MS_PER_MINUTE / wordsPerMinute

  const subtrees = subtreesOf(reading.parts)

  const parts = reading.parts.map((part, index) =>
    pacedPart(part, subtrees[index] ?? NOTHING_SAID, inflation, msPerWord)
  )

  const standings = parts.reduce(
    (counted, part) => ({ ...counted, [part.standing]: counted[part.standing] + 1 }),
    { ...NO_STANDINGS }
  )

  const silences = parts.reduce(
    (counted, part) =>
      part.silence === null ? counted : { ...counted, [part.silence]: counted[part.silence] + 1 },
    { ...NO_SILENCES }
  )

  const whole = parts.find((part) => part.depth === 0) ?? null

  const mostSkimmed = parts.reduce<PacedPart | null>(
    (standing, next) =>
      next.standing === "skimmed" && next !== whole ? worseOf(standing, next) : standing,
    null
  )

  return {
    treeId: reading.treeId,
    revision: reading.revision,
    views: reading.views,
    parts,
    standings,
    silences,
    whole,
    mostSkimmed,
    inflation,
    wordsPerMinute,
  }
}
