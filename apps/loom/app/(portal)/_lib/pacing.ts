import type { NodeId, PrimitiveType, TreeId } from "@jam-overture/loom"
import type {
  PaceSilence,
  PaceStanding,
  PacedPart,
  PagePace,
} from "@jam-overture/loom/signals"

import { nounOf, type PartName } from "./part-name"
import type { PageStopping } from "./stopping"
import { plainPaceSilence, type PlainLine } from "./vocabulary"

/**
 * Whether the people who got to a part of a page had time to read it.
 *
 * ## The question every other reading on this screen leaves open
 *
 * `_lib/skipped.ts` answers *which parts did anybody get to*. `_lib/stopping.ts`
 * answers *between which two parts do people leave*. Both are built on reach,
 * and reach means one thing only: **a row says this part was on a reader's
 * screen**. A band somebody scrolled through at speed is reached by that
 * definition and was not read by any other, so a page of them reported here as
 * a page read from top to bottom.
 *
 * That is the plausible-false-number failure this lane keeps finding in new
 * places — the figure is the right shape, it is on the screen, and nobody can
 * tell it is wrong. `readingPaceOf` closes it with two things that were already
 * in the join: the time readers spent on a part, and the time its words take at
 * a published rate.
 *
 * ## Why the two readings belong on one card and not on two
 *
 * They answer into each other, and the sentence they make together is the one
 * this screen can open with and nothing else in the ecosystem can say at all:
 *
 * > *Readers had eight seconds on the band whose words take fifty, and it is
 * > the band they stop at.*
 *
 * Neither half is derived from the other — one is time against words, the other
 * is a ratio of two siblings' reach — so when they name the same part that is
 * two independent readings agreeing. {@link alsoWhereTheyStop} is the only place
 * in this module that looks at both, and it draws the sentence **only** when the
 * part is literally the same one. A sentence that joined a skim on one part to a
 * fall on another would read as a single finding and be two.
 *
 * ## What may be quoted, and what may not
 *
 * Three things bias the comparison and all three bias it the same way: dwell is
 * time on screen rather than time reading, a word count is a floor wherever a
 * type has not declared its copy, and a reach is a distinct-visit count added
 * across roll-up windows and so is generous by every visit that straddled a
 * boundary.
 *
 * So **a skim is the one standing that survives every doubt being resolved in
 * the page's favour**, and it is the only one this surface leads with.
 * {@link PagePacing.lingering} is drawn as a question and never as engagement;
 * `paced` is not drawn at all above the disclosure, because *readers read this*
 * is a thing nobody acts on.
 *
 * ## Two sums that are not here
 *
 * **No word figure is ever added across parts.** A band's words are inside the
 * page's, so a total would charge one reader once per level — which is why
 * {@link PagePacing.whole} is the page's own figure taken from the root rather
 * than a sum of anything, and why it is kept out of the ranking: the root
 * contains every part, so by words passed it would win every ranking it was
 * entered in.
 *
 * **It takes nothing.** A number here is an argument for a person to make a
 * change with, never a change — the same shape 0031 settled for calibration and
 * the same one `stopping.ts` holds.
 */

/** One part of a page, with the time its readers had against the time its words take. */
export type PacingPart = {
  readonly nodeId: NodeId
  readonly name: PartName
  /** The registered type, for the technical record. Never on the surface. */
  readonly type: PrimitiveType
  readonly standing: PaceStanding
  /** Why there is no reading, and `undefined` where there is one. */
  readonly silence: PaceSilence | undefined
  /** Visits that reported this part coming onto the screen. */
  readonly readers: number
  /** The words this part says itself. Its own, never its subtree's. */
  readonly words: number
  /** The words of this part and everything inside it — the denominator. Nests. */
  readonly wordsWithin: number
  /** Whether {@link wordsWithin} is a floor rather than a count. */
  readonly floored: boolean
  /** Time on screen per reader, or `undefined` where nobody got here. */
  readonly spentMs: number | undefined
  /** What its words take at the costing rate. */
  readonly needMs: number
  /** Time spent for every unit of time the words take, or `undefined`. */
  readonly pace: number | undefined
  /** The nesting, for the record. */
  readonly depth: number
  /** Readers times the words they were shown — the ranking key, never a total. */
  readonly wordsPassed: number
}

export type PagePacing = {
  readonly treeId: TreeId
  readonly revision: number
  /** The floor on visits the window holds, as the runtime computes it. */
  readonly views: number
  /** Every part of the page, in reading order. */
  readonly parts: readonly PacingPart[]
  /**
   * The page itself, timed against all of its words.
   *
   * `undefined` on the one tree shape with no part at the top. It is the
   * headline and it is deliberately not in {@link mostSkimmed}.
   */
  readonly whole: PacingPart | undefined
  /**
   * The part of the page most words went unread in: most words passed, then
   * first in reading order.
   *
   * By words passed rather than by the worst ratio, which is the runtime's rule
   * and the right one — a caption two readers hurried past is a worse ratio and
   * a smaller problem than a band four hundred of them did.
   */
  readonly mostSkimmed: PacingPart | undefined
  /** Parts readers stayed far longer on than the words account for. A question. */
  readonly lingering: readonly PacingPart[]
  /** How many parts have no reading, and which nothing each one is. */
  readonly silences: Readonly<Record<PaceSilence, number>>
  /** The over-count correction that was applied; `0` where none was available. */
  readonly inflation: number
  /** The rate the words were costed at, in words per minute. */
  readonly wordsPerMinute: number
}

/**
 * A length of time, as somebody would say it out loud.
 *
 * Seconds up to a minute and a half and whole minutes above it, because the
 * question is *roughly how long* and the exact milliseconds are in the record.
 * The two ends are named rather than rounded into the middle: *under a second*
 * rather than a `0 seconds` that reads as a broken counter, and *no time at
 * all* for the genuine nought a wordless part's words take.
 */
export const plainSeconds = (ms: number): string => {
  if (ms <= 0) return "no time at all"

  const seconds = Math.round(ms / 1000)

  if (seconds < 1) return "under a second"
  if (seconds < 90) return seconds === 1 ? "1 second" : `${seconds} seconds`

  const minutes = Math.round(ms / 60_000)

  return minutes === 1 ? "1 minute" : `${minutes} minutes`
}

/** `1 part` and never `1 parts`, which is the first thing a reader distrusts. */
export const partsCount = (count: number): string => (count === 1 ? "1 part" : `${count} parts`)

/**
 * What the window says about the page as a whole, in one sentence.
 *
 * Five answers, and the four that are not a reading are each a different fact
 * said out loud rather than an empty section — the distinction this lane has
 * drawn since `StateNotice` grew a `settled` tone. *Nothing was counted*,
 * *nobody got here* and *nothing said which of its text is words* render
 * identically as silence and mean entirely different things.
 */
export const pacingSummary = (pacing: PagePacing): string => {
  if (pacing.views === 0)
    return "No visit has reported anything about this version of the page yet, so there is nothing yet to say about whether people had time to read it."

  const whole = pacing.whole

  if (whole === undefined)
    return "This version of the page has nothing at the top of it that could be timed as a whole."

  if (whole.spentMs === undefined)
    return "No visit reported the page itself coming onto the screen, so there is no time to set against its words."

  if (whole.standing === "unknown" && whole.silence !== undefined)
    return `${plainPaceSilence(whole.silence).meaning} So the page as a whole has no reading, and only the parts below do.`

  return `Readers spent about ${plainSeconds(whole.spentMs)} on this page, and its words take about ${plainSeconds(whole.needMs)} to read.`
}

/**
 * One part readers had too little time on, as a sentence.
 *
 * The two figures and nothing between them. There is no *so nobody read it*
 * clause, and the omission is the point: what was measured is time against
 * words, and the step from there to a claim about what went into anybody's head
 * is one a reader can take for themselves and this surface must not take for
 * them.
 */
export const skimSentence = (part: PacingPart): PlainLine => ({
  before: "Readers had about ",
  subject: part.name,
  after: ` for ${plainSeconds(part.spentMs ?? 0)}, and its words take about ${plainSeconds(part.needMs)}.`,
})

/**
 * What to do about it, which is the question every screen in this portal has to
 * answer.
 *
 * The part itself and not the one above it, which is the opposite of
 * `stopping.ts`'s advice and is right for the opposite reason. A fall is about
 * what did not carry a reader onward, so the thing to change is the part they
 * were last on. A skim is about this part's own words against this part's own
 * time, so the thing to change is these words.
 */
export const worthShortening = (part: PacingPart): PlainLine => ({
  before: "If one thing on this page is worth shortening, it is ",
  subject: part.name,
  after: " — more people went past these words than past any others nobody had time for.",
})

/**
 * The two readings pointing at one part, which is the sentence this screen
 * exists to be able to say.
 *
 * `undefined` unless the part most words went unread in **is** the part people
 * stop going at. Not a near miss, not a parent, not a sibling: the same
 * identifier, because the whole value of the sentence is that two readings
 * built on different arithmetic arrived at the same place, and a sentence that
 * stretched to cover two different parts would read as one finding and be two.
 */
export const alsoWhereTheyStop = (
  pacing: PagePacing,
  stopping: PageStopping | undefined
): PlainLine | undefined => {
  const skimmed = pacing.mostSkimmed
  const stopped = stopping?.steepest?.after

  if (skimmed === undefined || stopped === undefined || skimmed.nodeId !== stopped.nodeId)
    return undefined

  return {
    before: "Two separate readings point at the same part of this page: ",
    subject: skimmed.name,
    after: " is both where the most words went past unread and where the most people stop going. It is the strongest thing this page has to tell you.",
  }
}

/**
 * Where people stayed far longer than the words account for — a question, in the
 * words of a question.
 *
 * Dwell is time on screen and not attention. A tall part at the foot of a page
 * lingers because nothing ever scrolled past it; a band lingers for the whole
 * time its own children were being read. So this is *is this where people get
 * stuck*, and the sentence says both of the things it can mean rather than
 * letting a reader supply the flattering one.
 */
export const lingeringQuestion = (pacing: PagePacing): string | undefined => {
  const staying = pacing.lingering.length

  if (staying === 0) return undefined

  /*
   * *One part* rather than *1 part* at the head of a sentence, which is what
   * `stopping.ts` does in the same position and for the same reason: a numeral
   * opening a sentence reads as a row out of a table, and the sentence after it
   * is the most carefully worded one on this section.
   */
  const where = staying === 1 ? "On one part of this page" : `On ${partsCount(staying)} of this page`

  return `${where}, readers stayed more than three times as long as the words account for. That is a question rather than an answer: it can mean the part is hard going, and it can equally mean it was on screen the whole time something inside it was being read.`
}

/**
 * The parts whose words could not all be counted, and the remedy.
 *
 * Shown rather than hidden, which the runtime's own record asks for explicitly.
 * On the starter library this is near zero; on a deployment's own primitives it
 * can be most of the page — and a surface that quietly dropped those parts
 * would report a page as timed when the honest answer is that nobody can tell,
 * and the deployment would never learn it had declarations to write.
 */
export const wordsNotCounted = (pacing: PagePacing): string | undefined => {
  const quiet = pacing.silences.unreadable

  if (quiet === 0) return undefined

  const what =
    quiet === 1
      ? "One part of this page could not be timed, because something in it has not said"
      : `${partsCount(quiet)} of this page could not be timed, because something in each of them has not said`

  return `${what} which of its text is words a reader would read. Only a skim can be claimed about those, never that there was time enough — so they are left without a reading rather than counted as read.`
}

/** The parts worth drawing above the disclosure: the ones the claim holds for. */
export const partsThatSkim = (pacing: PagePacing): readonly PacingPart[] =>
  pacing.parts.filter((part) => part.standing === "skimmed" && part.nodeId !== pacing.whole?.nodeId)

/**
 * Good news, said rather than shown as an absence.
 *
 * A page nobody raced through is the answer somebody came here hoping for, and
 * it must not arrive as a blank space — the rule that made `settled` a tone.
 * `undefined` where there is nothing to be pleased about or nothing was counted,
 * so the caller cannot draw it over a page that simply has no reading.
 */
export const everybodyHadTime = (pacing: PagePacing): string | undefined => {
  if (pacing.views === 0) return undefined
  if (partsThatSkim(pacing).length > 0) return undefined
  if (pacing.parts.every((part) => part.standing === "unknown")) return undefined

  return "No part of this page went past people too fast to have been read. Everywhere anything could be compared, there was time enough for the words."
}

/**
 * The reading, from the runtime's own and the names the page gives its parts.
 *
 * Handed a `PagePace` rather than a page and a window, for the reason
 * `stopping.ts` is handed a `ReadingProgress`: the join to the page happens once
 * on the screen and every reading is taken off the one result. Two joins of the
 * same counters to the same page is how two sections of one card come to
 * disagree about how many visits there were.
 */
export const pacingOf = (
  pace: PagePace,
  names: ReadonlyMap<string, PartName>
): PagePacing => {
  /*
   * Named from the page the reading was joined to, so a part is called what it
   * says rather than what it is. The fallback cannot fire — every part here is
   * an element of that same page — and is written anyway, to the noun in the
   * registered type, which is what `skipped.ts` and `stopping.ts` both do for
   * the same reason: a naming miss should cost a name and not a screen.
   */
  const named = (part: PacedPart): PacingPart => ({
    nodeId: part.nodeId,
    name: names.get(part.nodeId) ?? { name: `the ${nounOf(part.type)}`, nodeId: part.nodeId },
    type: part.type,
    standing: part.standing,
    silence: part.silence ?? undefined,
    readers: part.readers,
    words: part.words,
    wordsWithin: part.wordsWithin,
    floored: part.floored,
    spentMs: part.spentMs ?? undefined,
    needMs: part.needMs,
    pace: part.pace ?? undefined,
    depth: part.depth,
    wordsPassed: part.wordsPassed,
  })

  const parts = pace.parts.map(named)

  /*
   * Looked up in the list rather than named a second time, which is what keeps
   * the headline sentence and the rows below it calling one part one thing.
   */
  const find = (nodeId: NodeId | undefined): PacingPart | undefined =>
    nodeId === undefined ? undefined : parts.find((part) => part.nodeId === nodeId)

  return {
    treeId: pace.treeId,
    revision: pace.revision,
    views: pace.views,
    parts,
    whole: find(pace.whole?.nodeId),
    mostSkimmed: find(pace.mostSkimmed?.nodeId),
    lingering: parts.filter((part) => part.standing === "lingered"),
    silences: pace.silences,
    inflation: pace.inflation,
    wordsPerMinute: pace.wordsPerMinute,
  }
}
