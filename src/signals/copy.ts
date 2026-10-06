import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import type { PageReading, PartReading, PartStanding } from "./parts.js"
import { countWords } from "./words.js"

/**
 * How much of what a page says gets read, and which of it nobody saw.
 *
 * The join of step 6 already answers *which parts came into view* and, since
 * [0223](../../decisions/0223-a-prop-is-copy-when-a-reader-could-quote-it.md),
 * holds the words each part says. `wordsReadIn` puts the two together and hands
 * back the text readers reached — which is the right answer to *which copy a
 * reader actually reached* and is not a measurement. A list of strings cannot be
 * put on a screen as a figure, cannot be compared between two windows, and
 * cannot say what is on the other side of it: **the words nobody got to**, which
 * is the half a page is changed because of.
 *
 * This counts both sides. *This page says twelve hundred words, readers reached
 * eleven hundred of them, and the three hundred nobody saw are these.*
 *
 * ## The one figure this module has that the pace reading refuses
 *
 * **A page-wide word total**, which
 * [0230](../../decisions/0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md)
 * would not have, and the difference is which word count is being added.
 *
 * A part's reading *time* is owed to its subtree — the words on screen while a
 * band was up are the band's and its children's — so those figures nest, a sum
 * charges one reader once per level, and there is deliberately no page total of
 * them anywhere in `pace.ts`. A part's **own** words nest nothing: a text node
 * and a slot node are never parts, every element descendant is a part in its own
 * right, and `PartReading.copy` is therefore a partition of the page's words
 * across its parts exactly once. That is the property 0212 published so that a
 * role row could be added up, and a page total is the same addition one level
 * further.
 *
 * So the two modules are not in disagreement about arithmetic; they are adding
 * two different quantities, one of which partitions and one of which does not.
 * Every figure here is of the partitioning one, which is also why the root needs
 * no special case: it contributes its own words like any other part, rather than
 * containing every part it would outrank.
 *
 * ## What each figure is worth
 *
 * **A share of the words is not a share of the readers.** {@link
 * CopyReading.share} is the share of the page's words that *at least one* reader
 * reached, because that is what a standing of `read` says (0212). On a page with
 * three hundred readers it will usually be near 1 and it is not a lie: somebody
 * did reach nearly all of it. {@link CopyReading.typical} is the other sentence
 * — the words the average reader got to — and the gap between the two is the
 * point of reporting both.
 *
 * **The word counts are floors and the floor is reported by standing.** A type
 * that declares no `copy` has words nothing here can see (0122). On the read
 * side that understates the numerator and on the skipped side it understates the
 * denominator, so the direction a share is wrong in depends on where the
 * undeclared parts are — which is exactly why {@link CopyReading.floored} counts
 * them per standing rather than returning one boolean a consumer would have to
 * guess the sign of.
 *
 * Pure, and derived: nothing was added to a payload, a browser, a column, a
 * store or the vocabulary to answer any of this.
 */

/** One part's own words, with what the window said about the part saying them. */
export type Passage = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** What part it plays (0114), or `null` where its type declared none. */
  readonly role: PrimitiveRole | null
  /** 0 at the root. */
  readonly depth: number
  /** Carried through from the part, so a passage and a part say the same thing. */
  readonly standing: PartStanding
  /** Distinct page views that reported the part coming into view; `0` where no row named it. */
  readonly readers: number
  /**
   * The words themselves, in reading order, exactly as the page says them.
   *
   * **Its own, never its subtree's**, so the text of two passages may be
   * concatenated and no sentence is read twice.
   */
  readonly text: readonly string[]
  /** {@link text}, counted. */
  readonly words: number
  /**
   * Whether this passage is short of words it cannot see.
   *
   * True where the part's type declared no `copy`, or declared a prop holding
   * something that is not a string (0122). The words it does hold are still its
   * own; what is not knowable is whether there are more.
   */
  readonly floored: boolean
}

/** Every part playing one role, with the words they say between them. */
export type RoleCopy = {
  /** `null` is the row for parts whose type declared no role. */
  readonly role: PrimitiveRole | null
  /** Parts of this role that say something, which is the rule {@link CopyReading.passages} applies. */
  readonly passages: number
  readonly words: number
  /**
   * Words by the standing of the part saying them. The three add to
   * {@link words}.
   */
  readonly wordsByStanding: Readonly<Record<PartStanding, number>>
  /**
   * The share of this role's words at least one reader reached. `null` where the
   * role says nothing.
   *
   * Addable across roles — unlike every view count on a `RoleReading`, which is
   * absent there because distinctness cannot be added (0147). Words can: they
   * are a property of the page rather than of the readers.
   */
  readonly share: number | null
  /** Passages of this role whose words are a floor. */
  readonly floored: number
}

/** Why there is no typical reader's figure. */
export type CopySilence =
  /** The page says nothing that could have been read. */
  | "wordless"
  /** The window held no views of this revision, so there is no reader to be typical of. */
  | "unmeasured"
  /**
   * Some part's words are a floor, so a mean of them is neither a count nor a
   * ceiling.
   *
   * The share survives a floor and says so; this does not. The numerator is
   * short by the words nobody declared and the denominator is a view floor that
   * is short the other way, so the two errors no longer both lean one way and
   * the figure cannot be published as *at most*.
   */
  | "floored"
  /**
   * A part reports more readers than the page has views, which no rollup
   * produces.
   *
   * `reached` counts the views that saw a part and `views` the views that said
   * anything about it, so a row's `reached` can never exceed its own `views` and
   * {@link CopyReading.views} is the largest `views` of any row. A reading where
   * this holds was assembled by hand or by a sender that is not one — the same
   * alarm `PageReading.orphaned` is, at the one other place a figure here would
   * stay plausible while being about nothing.
   */
  | "inconsistent"

/** The closed set, for a surface that has to account for every reason a figure is absent. */
export const COPY_SILENCES: readonly CopySilence[] = everyMemberOf<CopySilence>()([
  "wordless",
  "unmeasured",
  "floored",
  "inconsistent",
])

/** One line per silence, for a surface saying why a figure is not there. */
export const describeCopySilence = (silence: CopySilence): string => {
  switch (silence) {
    case "wordless":
      return "this revision says nothing that could be read"
    case "unmeasured":
      return "the window held no page views of this revision"
    case "floored":
      return "some part of the page declares no copy, so a mean of its words would not be a ceiling"
    case "inconsistent":
      return "a part reports more readers than the page has views, which no rollup produces"
  }
}

/**
 * What one window of one revision says about how much of the page is read.
 *
 * Two shares and a word total, each of which answers a different sentence: how
 * much of the page anybody reached, how much of it the average reader reached,
 * and which passages nobody did.
 */
export type CopyReading = {
  readonly treeId: TreeId
  readonly revision: number
  /** The page's view floor, carried through from the reading unchanged. */
  readonly views: number
  /**
   * Every word this revision says, counted once.
   *
   * The one page-wide word figure in this subsystem, sound for the one reason
   * the module documentation gives: these are the parts' own words, which
   * partition the page, rather than the subtree words a pace reading nests.
   */
  readonly words: number
  /** Words by the standing of the part saying them. The three add to {@link words}. */
  readonly wordsByStanding: Readonly<Record<PartStanding, number>>
  /**
   * The share of the page's words at least one reader reached. `null` where the
   * page says nothing.
   *
   * *At least one*, which is what a standing of `read` means and not what a
   * person reads this sentence as. {@link typical} is the per-reader figure.
   */
  readonly share: number | null
  /** Every part that says something, in reading order. */
  readonly passages: readonly Passage[]
  /**
   * Parts that say nothing at all, counted rather than listed.
   *
   * A spacer, a rule, a stack that only holds other parts. They are not in
   * {@link passages} because a passage of no words is not one, and they are
   * counted because *a page of two hundred parts, ten of which say anything* is
   * a fact about the page worth having and is otherwise invisible here.
   */
  readonly silent: number
  /**
   * The passages no reader reached, most words first and then in reading order.
   *
   * **`skipped` only.** A part whose standing is `unknown` reported something
   * other than coming into view, or was in a window with no views at all, and
   * putting its words here would turn *nothing can be said* into *nobody read
   * this* — the one direction a reading of a quiet window must not be wrong in.
   * Those words are in {@link wordsByStanding} under `unknown`, where they can
   * be seen and not acted on.
   *
   * By words rather than by depth or position, for the reason a stop is ranked
   * by the readers it loses (0221): the passage nobody saw that costs the page
   * most is the long one, not the first one.
   */
  readonly unseen: readonly Passage[]
  /** Every role in the vocabulary, then the row for parts that declared none. */
  readonly roles: readonly RoleCopy[]
  /**
   * Passages whose words are a floor, by the standing of the part saying them.
   *
   * The direction every share here is wrong in, handed over rather than
   * summarised. Undeclared words under `read` understate the numerator and the
   * denominator together; under `skipped` they understate the denominator only,
   * so a share reads high. One boolean could not have said which.
   */
  readonly floored: Readonly<Record<PartStanding, number>>
  /**
   * The words the typical reader reached, at most. `null` where {@link silence}
   * says why not.
   *
   * Every word, weighted by the readers who reached the part saying it, over the
   * page's views. Generous in both terms and therefore a ceiling: `reached` is
   * over-counted by the page views that straddled a rollup window (0147), and
   * {@link views} is a floor on the page views there were, so the numerator
   * leans up and the denominator leans down.
   *
   * The straddle very nearly divides out, which is the only reason this is worth
   * publishing at all: the same inflation is in every `reached` here and in the
   * view floor they are divided by, so what is left is a correction too small to
   * be the headline. It is the cancellation a fall between two siblings already
   * rests on (0221), taken one level up — a page against its own readers rather
   * than a part against its neighbour.
   *
   * It cannot exceed {@link words}, and `inconsistent` is the input that would
   * have made it.
   */
  readonly typical: number | null
  /** Why {@link typical} is not there, and `null` where it is. */
  readonly silence: CopySilence | null
}

/** Zero per standing, which both a word total and a count of floored passages start from. */
const ZERO_BY_STANDING: Readonly<Record<PartStanding, number>> = Object.freeze({
  read: 0,
  skipped: 0,
  unknown: 0,
})

/** The words a part says on its own, and whether it is short of some it cannot see. */
const passageOf = (part: PartReading): Passage => ({
  nodeId: part.nodeId,
  type: part.type,
  role: part.role,
  depth: part.depth,
  standing: part.standing,
  readers: part.counters?.reached ?? 0,
  text: part.copy.words,
  words: countWords(part.copy.words),
  floored: part.copy.unread.length > 0 || part.copy.unspoken.length > 0,
})

/**
 * Whether a part is saying anything at all.
 *
 * A floored part with no visible words is kept, because *this part may say
 * something and nothing here can see it* is not the same answer as *this part
 * says nothing*, and the first is the one 0122 exists to keep tellable.
 */
const saysSomething = (passage: Passage): boolean => passage.words > 0 || passage.floored

const shareOf = (read: number, words: number): number | null => (words === 0 ? null : read / words)

/**
 * Every role's row, in one pass over the passages.
 *
 * A pass per role would be a scan of the page per member of the vocabulary,
 * which is the shape rule 4 holds this subsystem to: the vocabulary grows and
 * the page is what it is.
 */
const roleRowsOf = (passages: readonly Passage[]): readonly RoleCopy[] => {
  const rows = new Map<PrimitiveRole | null, RoleCopy>(
    [...PRIMITIVE_ROLES, null].map((role) => [
      role,
      {
        role,
        passages: 0,
        words: 0,
        wordsByStanding: { ...ZERO_BY_STANDING },
        share: null,
        floored: 0,
      },
    ])
  )

  for (const passage of passages) {
    const row = rows.get(passage.role)
    /**
     * A role this runtime does not know cannot reach here, since a part's role
     * is only ever a member of the closed vocabulary. Skipped rather than
     * thrown, as in the reading this is built on: a row that does not exist
     * cannot be drawn, and a reading is not worth failing over.
     */
    if (row === undefined) continue

    rows.set(passage.role, {
      ...row,
      passages: row.passages + 1,
      words: row.words + passage.words,
      wordsByStanding: {
        ...row.wordsByStanding,
        [passage.standing]: row.wordsByStanding[passage.standing] + passage.words,
      },
      share: null,
      floored: row.floored + (passage.floored ? 1 : 0),
    })
  }

  return [...rows.values()].map((row) => ({
    ...row,
    share: shareOf(row.wordsByStanding.read, row.words),
  }))
}

/**
 * The more costly of two passages nobody saw, which is the ranking rule spelled
 * once.
 *
 * Descending by words, and the comparison is strict so that equal passages keep
 * the reading order they arrived in rather than the last one winning.
 */
const byWordsLost = (one: Passage, other: Passage): number => other.words - one.words

const silenceOf = (
  words: number,
  views: number,
  floored: boolean,
  inconsistent: boolean
): CopySilence | null => {
  if (words === 0) return "wordless"
  if (views === 0) return "unmeasured"
  if (inconsistent) return "inconsistent"

  return floored ? "floored" : null
}

/**
 * How much of what a page says is getting read.
 *
 * Handed the output of `pageReadingOf`, because the words, the counters and the
 * reading order are joined there already and deriving them a second time is how
 * two screens come to disagree.
 */
export const copyReadingOf = (reading: PageReading): CopyReading => {
  const passages = reading.parts.map(passageOf).filter(saysSomething)

  const wordsByStanding = passages.reduce(
    (counted, passage) => ({
      ...counted,
      [passage.standing]: counted[passage.standing] + passage.words,
    }),
    { ...ZERO_BY_STANDING }
  )

  const floored = passages.reduce(
    (counted, passage) =>
      passage.floored
        ? { ...counted, [passage.standing]: counted[passage.standing] + 1 }
        : counted,
    { ...ZERO_BY_STANDING }
  )

  const words = wordsByStanding.read + wordsByStanding.skipped + wordsByStanding.unknown

  const silence = silenceOf(
    words,
    reading.views,
    floored.read + floored.skipped + floored.unknown > 0,
    passages.some((passage) => passage.readers > reading.views)
  )

  /**
   * Weighted by the readers of the part saying each word, over the page's views.
   * Guarded by the silence rather than by a clamp: a figure held back for a
   * stated reason is a reading somebody can act on, and one quietly cut to fit
   * its own ceiling is not.
   */
  const typical =
    silence === null
      ? passages.reduce((total, passage) => total + passage.readers * passage.words, 0) /
        reading.views
      : null

  return {
    treeId: reading.treeId,
    revision: reading.revision,
    views: reading.views,
    words,
    wordsByStanding,
    share: shareOf(wordsByStanding.read, words),
    passages,
    silent: reading.parts.length - passages.length,
    unseen: passages.filter((passage) => passage.standing === "skipped").sort(byWordsLost),
    roles: roleRowsOf(passages),
    floored,
    typical,
    silence,
  }
}
