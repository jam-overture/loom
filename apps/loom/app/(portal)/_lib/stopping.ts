import type { NodeId, PrimitiveType, TreeId } from "@jam-overture/loom"
import type { PartStanding, ReadingProgress, ReadingStop } from "@jam-overture/loom/signals"

import { capitalised, nounOf, partReading, type PartName } from "./part-name"
import type { PlainLine } from "./vocabulary"

/**
 * Where a page loses its readers — the one sentence on this surface a person can
 * act on this afternoon.
 *
 * ## The question the readers screen could not ask
 *
 * `_lib/skipped.ts` answers *which parts did nobody get to*, and it is a
 * question about each part on its own: a standing per part, in reading order.
 * The question underneath it is about **two** parts — *people get through the
 * first four bands and the fifth is where they leave* — and nothing on the
 * screen could ask it, because a fall is a comparison and the screen had no
 * sound one to make.
 *
 * It was making an unsound one. The card's own highlight read:
 *
 * > *Of the parts people reported on, fewest got as far as the footer. If
 * > anything on this page is worth moving up, it is what sits above that.*
 *
 * The first sentence is a minimum over every part of the page and is true. The
 * second is a claim about **reading order** drawn from it, and a page-wide
 * minimum does not support one: a heading three levels inside the first band
 * comes before the second band and is reached by fewer people than either, so
 * the part with the smallest reach is routinely a part nothing stopped at.
 * `readingProgressOf` is the sound version of that advice and this module is its
 * reading, so the card keeps the fact and takes the inference from here.
 *
 * ## Why the figures can be believed
 *
 * [0221](../../../../../../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)
 * makes a fall a comparison between **two children of one parent**, and that is
 * the whole of why a share is printable here. Reach is a distinct view count
 * summed across roll-up windows, so it is generous by every visit that straddled
 * a boundary (0147, measured since 0219) — and two parts of one page are
 * inflated by the same straddling visits, so the inflation very nearly divides
 * out of a ratio between them. *Four in ten of the people who got this far
 * stopped here* survives an over-count that *four hundred people* does not.
 *
 * So the surface leads with the share and the counts are one click down, which
 * is the reverse of every other section on this card and is deliberate. The
 * record behind the disclosure says which of the two is safe to quote.
 *
 * ## What it never does
 *
 * **It never divides by the page's visits.** The visit floor and the reach of a
 * part are different counters written in different places, and a ratio across
 * the two can honestly exceed one. Every denominator in this module is the reach
 * of the part immediately above the fall, which is the only one 0221 permits.
 *
 * **It never adds a fall to a fall.** One reader who got past two parts is in
 * both pairs' figures, so a page-level total of lost readers would be the most
 * headline-shaped wrong number available. There is a count of *places* where
 * reading falls off, and no count of people across them.
 *
 * **It takes nothing.** A number here is an argument for a person to make a
 * change with, never a change — the same shape 0031 settled for calibration.
 */

/** One part as a point on its parent's sequence, named. */
export type StoppingPart = {
  readonly nodeId: NodeId
  readonly name: PartName
  /** The registered type, for the technical record. Never on the surface. */
  readonly type: PrimitiveType
  readonly standing: PartStanding
  /**
   * Visits that reported this part coming onto the screen, and `0` where no row
   * named it.
   *
   * Zero means two things and {@link StoppingPart.anchors} is which: nobody got
   * here, or nothing can say.
   */
  readonly reached: number
  /**
   * Whether this part can be either end of a fall.
   *
   * False for a part that reported something other than coming into view, whose
   * reach of `0` is an absence of evidence rather than an absence of readers.
   * The runtime passes those over rather than building a cliff nobody fell off.
   */
  readonly anchors: boolean
}

/** Two parts side by side, and the people who got to the first and not the second. */
export type Fall = {
  readonly after: StoppingPart
  readonly before: StoppingPart
  /** Visits that reached the first of the two, which is the denominator of `share`. */
  readonly reached: number
  readonly lost: number
  /** `lost ÷ reached`, in `(0, 1]`. The figure that survives the over-count. */
  readonly share: number
}

/** One parent's parts, in the order a reader meets them. */
export type StoppingRun = {
  readonly parentId: NodeId
  /** What the parts sit inside, named. */
  readonly place: PartName
  /** The nesting of the parts, which is one below the parent's. */
  readonly depth: number
  readonly steps: readonly StoppingPart[]
  /** Every fall, in reading order. */
  readonly falls: readonly Fall[]
  /** The last part in reading order anybody got to, or `undefined` where nobody did. */
  readonly furthest: StoppingPart | undefined
  /** Pairs where more visits reached the later part than the earlier one. */
  readonly gained: number
}

export type PageStopping = {
  readonly treeId: TreeId
  readonly revision: number
  /** The floor on visits the window holds, as the runtime computes it. */
  readonly views: number
  /** Every run of two or more parts, in reading order. */
  readonly runs: readonly StoppingRun[]
  /**
   * The sharpest fall on the page: most people lost, then largest share, then
   * first in reading order.
   *
   * Ranked by people rather than by share, which is the runtime's rule and the
   * right one: a part two readers out of three abandoned is a worse rate and a
   * smaller problem than one four hundred out of a thousand left at.
   */
  readonly steepest: Fall | undefined
  /** Places where reading falls off, added across runs. Never people. */
  readonly places: number
  /**
   * Parts that could not be either end of a fall.
   *
   * Empty on an ordinary page. A long list is a diagnosis rather than a reading:
   * clicks are being reported against parts that never reported coming into
   * view, which is a piece of the page not saying what it is — and it used to
   * look exactly like a page nobody read.
   */
  readonly unanchored: readonly StoppingPart[]
  /** Every run's rises, added. */
  readonly gained: number
}

/**
 * A sentence with **two** names in it, which is the shape a fall needs and
 * `PlainLine` cannot carry.
 *
 * `PlainLine` holds one subject, because almost every sentence in this portal is
 * about one part. A fall is irreducibly about a pair — *this part, and the one
 * after it* — and a sentence that named only the first would be the half of the
 * reading a person cannot act on.
 *
 * It stays in this module rather than joining `PlainLine` in `vocabulary.ts`,
 * under the rule that file holds: a shape moves to the shared table on the run a
 * **second** screen needs it, never in anticipation of one. One screen says this
 * today.
 */
export type FallLine = {
  /** Everything before the first name, ending in whatever space the sentence needs. */
  readonly before: string
  /** The part they got to. */
  readonly reached: PartName
  /** Everything between the two names. */
  readonly between: string
  /** The part fewer of them got to. */
  readonly missed: PartName
  /** Everything after it, including the full stop. */
  readonly after: string
}

/** The whole sentence, as a reader meets it. Assert this, not the pieces. */
export const fallReading = (line: FallLine): string =>
  `${line.before}${partReading(line.reached)}${line.between}${partReading(line.missed)}${line.after}`

/**
 * How many of the people who got that far stopped, in words.
 *
 * Tenths, because the question is *roughly how many* and a reader who wants the
 * third decimal place has the disclosure. The two ends are named rather than
 * rounded into the middle: *fewer than 1 in 10* rather than a `0 in 10` that
 * reads as nobody, and *almost all* rather than a `10 in 10` that reads as
 * everybody — and everybody is a different sentence, below, because *nobody went
 * on* is how English says it.
 */
export const plainShare = (share: number): string => {
  const tenths = Math.round(share * 10)

  if (tenths <= 0) return "fewer than 1 in 10 of the people"
  if (tenths >= 10) return "almost all of the people"

  return `${tenths} in 10 of the people`
}

/** Where the share is the whole of it: nobody at all went on. */
const EVERYBODY = 0.995

/**
 * One fall, as a sentence.
 *
 * Two phrasings and the share chooses. *Nobody who got as far as the pricing
 * band went on to the questions* is the sentence English has for a share of one,
 * and *everybody … never went on* is the sentence a single template would have
 * produced.
 */
export const fallSentence = (fall: Fall): FallLine =>
  fall.share >= EVERYBODY
    ? {
        before: "Nobody who got as far as ",
        reached: fall.after.name,
        between: " went on to ",
        missed: fall.before.name,
        after: ".",
      }
    : {
        before: `${capitalised(plainShare(fall.share))} who got as far as `,
        reached: fall.after.name,
        between: " never went on to ",
        missed: fall.before.name,
        after: ".",
      }

/**
 * What to do about it, which is the question every screen in this portal has to
 * answer and the one a drop-off reading answers better than anything else here.
 *
 * The part **above** the fall, and that is the whole of the advice: it is the
 * last thing a reader saw before they left, so it is the thing that did not
 * carry them. Naming the part below instead would send somebody to rewrite the
 * part nobody read.
 */
export const whatToLookAt = (fall: Fall): PlainLine => ({
  before: "If one thing on this page is worth changing, it is ",
  subject: fall.after.name,
  after: " — it is the last thing people saw before they left.",
})

/**
 * What the window says about the page as a whole, in one sentence.
 *
 * Four answers, and the three that are not a reading are each a different fact
 * said out loud rather than an empty section. *Nothing was counted* and *nobody
 * stopped anywhere* render identically as silence and mean opposite things,
 * which is the distinction this lane has drawn since `StateNotice` grew a
 * `settled` tone.
 */
export const stoppingSummary = (stopping: PageStopping): string => {
  if (stopping.views === 0)
    return "No visit has reported anything about this version of the page yet, so there is nothing yet to say about where people stop reading."

  if (stopping.runs.length === 0)
    return "This page has no two parts sitting side by side, so there is nowhere for reading to stop."

  if (stopping.steepest === undefined)
    return "Everybody who got to a part of this page got to the part after it. This page is not losing people anywhere."

  return stopping.places === 1
    ? "There is one place on this page where people stop going."
    : `There are ${stopping.places} places on this page where people stop going, and this is the biggest.`
}

/** `1 place` and never `1 places`, which is the first thing a reader distrusts. */
export const placesCount = (count: number): string =>
  count === 1 ? "1 place" : `${count} places`

/**
 * People arriving part way down, which is not an error and not a warning.
 *
 * More visits on a later part than an earlier one cannot be produced by
 * scrolling, so it is somebody who arrived somewhere other than the top — a link
 * to a point on the page, a restored scroll position — or a part that is on
 * screen whatever anybody does, such as a footer a short page never pushes down.
 * Worth a line; the runtime's own record says explicitly that it is not worth a
 * warning, and a notice tone here would have a reader hunting a fault.
 */
export const arrivedPartWayDown = (stopping: PageStopping): string | undefined =>
  stopping.gained === 0
    ? undefined
    : `In ${placesCount(stopping.gained)} more people saw the later of two parts than saw the earlier one. Nobody scrolled up to do that — either they followed a link to a point on this page, or the part is on screen however little anybody reads.`

/**
 * The diagnosis, which is the one thing here that is about the page's wiring
 * rather than about its readers.
 *
 * A part that reported a click and never reported coming into view is a part the
 * runtime refuses to anchor a fall to, because its reach of `0` is an absence of
 * evidence. A page with a few is ordinary; a page with many is a piece that is
 * not saying what it is, and before this reading existed that page looked
 * exactly like a page nobody read.
 */
export const notReporting = (stopping: PageStopping): string | undefined => {
  const quiet = stopping.unanchored.length

  if (quiet === 0) return undefined

  return quiet === 1
    ? "One part of this page has never reported coming onto anybody’s screen, so it is left out of the reading above rather than counted as unread. That is usually the page rather than the people: a piece that cannot report being seen cannot be one end of a drop-off."
    : `${quiet} parts of this page have never reported coming onto anybody’s screen, so they are left out of the reading above rather than counted as unread. That is usually the page rather than the people: a piece that cannot report being seen cannot be one end of a drop-off.`
}

/**
 * The reading, from the runtime's own and the names the page gives its parts.
 *
 * Handed a `ReadingProgress` rather than a page and a window, which is the
 * difference between this module and `skipped.ts`: the join to the page happens
 * once on the screen and both readings are taken off the one result. Two joins
 * of the same counters to the same page is how two sections of one card come to
 * disagree about how many visits there were.
 */
export const stoppingOf = (
  progress: ReadingProgress,
  names: ReadonlyMap<string, PartName>
): PageStopping => {
  /*
   * Named from the page the reading was joined to, so a part is called what it
   * says rather than what it is. The fallback cannot fire — every part of a run
   * is an element of that same page — and it is written anyway, to the noun in
   * the registered type, which is what `skipped.ts` does for the same reason: a
   * naming miss should cost a name and not a screen.
   */
  const named = (nodeId: NodeId, type: PrimitiveType): PartName =>
    names.get(nodeId) ?? { name: `the ${nounOf(type)}`, nodeId }

  const parts = new Map<NodeId, StoppingPart>()

  for (const run of progress.runs) {
    for (const step of run.steps) {
      parts.set(step.nodeId, {
        nodeId: step.nodeId,
        name: named(step.nodeId, step.type),
        type: step.type,
        standing: step.standing,
        reached: step.reached,
        anchors: step.anchors,
      })
    }
  }

  /*
   * The pair, looked up rather than rebuilt. A fall names two parts of a run
   * this reading has already named, so reading them out of the map is what keeps
   * the sentence and the run below it calling one part one thing.
   */
  const fallOf = (stop: ReadingStop): Fall | undefined => {
    const after = parts.get(stop.after)
    const before = parts.get(stop.before)

    if (after === undefined || before === undefined) return undefined

    return { after, before, reached: stop.reached, lost: stop.lost, share: stop.share }
  }

  const runs = progress.runs.map((run): StoppingRun => {
    const steps = run.steps.flatMap((step) => {
      const part = parts.get(step.nodeId)

      return part === undefined ? [] : [part]
    })

    return {
      parentId: run.parentId,
      /*
       * The parent is an element of the same page, so it is named like any other
       * part. The fallback has no type to read a noun off — a run carries its
       * parent's id and not its type — so it is the plainest true phrase
       * available, with the identifier beside it as every name on this surface
       * carries one.
       */
      place: names.get(run.parentId) ?? { name: "the part these sit inside", nodeId: run.parentId },
      depth: run.depth,
      steps,
      falls: run.stops.flatMap((stop) => {
        const fall = fallOf(stop)

        return fall === undefined ? [] : [fall]
      }),
      furthest: run.furthest === null ? undefined : parts.get(run.furthest),
      gained: run.gained,
    }
  })

  return {
    treeId: progress.treeId,
    revision: progress.revision,
    views: progress.views,
    runs,
    steepest: progress.steepest === null ? undefined : fallOf(progress.steepest),
    /*
     * Places, added. The one total this reading is allowed: a fall is a place on
     * a page, and two places can be counted together where the people who left
     * at them cannot.
     */
    places: runs.reduce((count, run) => count + run.falls.length, 0),
    /*
     * Only the ones inside a run. A part with no sibling cannot be either end of
     * a fall whatever it reported, so counting it here would turn the diagnosis
     * into a count of only children and the number would stop meaning anything.
     */
    unanchored: progress.unanchored.flatMap((nodeId) => {
      const part = parts.get(nodeId)

      return part === undefined ? [] : [part]
    }),
    gained: progress.gained,
  }
}

/** The runs worth drawing: the ones reading actually falls off in. */
export const runsThatLose = (stopping: PageStopping): readonly StoppingRun[] =>
  stopping.runs.filter((run) => run.falls.length > 0)

/**
 * The runs nobody left in the middle of, as a sentence rather than as rows.
 *
 * A run with no fall is good news and is worth saying; it is not worth a block
 * of its own, because every row in it would carry the same figure. The rows are
 * in the record behind the disclosure either way, which is the rule this whole
 * surface is built on.
 */
export const heldAllTheWay = (stopping: PageStopping): string | undefined => {
  if (stopping.runs.length === 0) return undefined

  const held = stopping.runs.length - runsThatLose(stopping).length

  if (held === 0) return undefined

  return held === 1
    ? "In one other group of parts on this page, everybody who saw the first of them saw the last."
    : `In ${held} other groups of parts on this page, everybody who saw the first of them saw the last.`
}
