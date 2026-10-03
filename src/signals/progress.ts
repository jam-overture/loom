import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveRole } from "../role.js"
import type { PrimitiveType } from "../primitive-type.js"

import type { PageReading, PartReading, PartStanding } from "./parts.js"

/**
 * Where in a page reading stops.
 *
 * [`parts.ts`](parts.ts) answers *which* parts were read, part by part, and
 * notes in passing that the shape of that answer is where the reading stops —
 * which a set of rows keyed by id cannot show. This is that shape, taken off the
 * same reading and nothing else: no payload, no browser change, no counter that
 * does not already exist, and no byte on any wire. It is the second thing
 * derived from the join rather than the first thing asked of a reader.
 *
 * The question it answers is *readers get through the first four bands and the
 * fifth is where they leave*, and it is the first thing in this subsystem that
 * tells a model something to act on rather than telling a person something true.
 *
 * ## A stop is between siblings, never between a page and a number
 *
 * The unit is a **run**: one parent's element children, in the order a reader
 * meets them. Every comparison this module makes is between two members of one
 * run, and that is the whole of why its figures can be trusted:
 *
 * - **A ratio of two `reached` counts is sound where either count alone is
 *   not.** `reached` is a distinct view count summed across rollup windows, so
 *   it is generous by every page view that straddled a boundary
 *   ([0147](../../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md),
 *   measured since
 *   [0219](../../decisions/0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)).
 *   Two parts of one page are inflated by the same straddling readers, because
 *   a reader who straddled a window straddled it for the whole page — so the
 *   inflation is very nearly common to the numerator and the denominator and
 *   divides out. *Four in ten readers stopped here* survives an over-count that
 *   *four hundred readers* does not.
 * - **Siblings are comparable and cousins are not.** A part deep inside the
 *   first band comes before the second band in reading order and is reached by
 *   fewer readers than either, so a page-wide sequence of `reached` is not
 *   descending and a fall in it is not a stop. Within a run, every step is one
 *   level of one parent, and a fall from one to the next is a reader who got to
 *   one and not the other.
 *
 * ## What cannot anchor a stop
 *
 * A part whose standing is `unknown` **while the window held views** reported
 * something other than coming into view — a press was delegated to a band no
 * `viewed` ever named, so a reader plainly had it in front of them and the
 * counter that would say so is missing (0167 does not put `viewed` on a
 * delegated signal's ancestry). Its `reached` is 0 and the truth is *not zero,
 * unknown*. Treating it as the end of a run would report a cliff that nobody
 * fell off, which is the lie in the direction nobody checks. So it is passed
 * over: a stop names the two nearest parts in the run that can anchor one, and
 * the parts passed over are counted where a reading can see them.
 *
 * Pure, linear in the parts, and reaches no store, clock or DOM — it adds
 * nothing to the broadcaster's import graph.
 */

/** One part as a point on its parent's sequence. */
export type ReadingStep = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** What part it plays (0114), or `null` where its type declared none. */
  readonly role: PrimitiveRole | null
  readonly standing: PartStanding
  /**
   * Distinct page views that reported it coming into view, and `0` where no row
   * named it at all.
   *
   * Zero means two different things and {@link ReadingStep.anchors} is which:
   * nobody got here, or nothing can say.
   */
  readonly reached: number
  /**
   * Whether this step can be either end of a stop.
   *
   * False for a part that reported something other than a view, whose `reached`
   * of 0 is an absence of evidence rather than an absence of readers.
   */
  readonly anchors: boolean
}

/**
 * Two parts of one run, and the readers who reached the first and not the
 * second.
 *
 * Only ever a fall. A rise is {@link ReadingRun.gained}, because a reader who
 * scrolls cannot produce one and the reason they exist is worth a different
 * sentence.
 */
export type ReadingStop = {
  /** The part they reached. */
  readonly after: NodeId
  /** The next part in the run that could anchor a stop, which fewer reached. */
  readonly before: NodeId
  /** Views that reached `after`, which is the denominator of `share`. */
  readonly reached: number
  /** Views that reached `after` and not `before`. */
  readonly lost: number
  /**
   * `lost ÷ reached`, in `(0, 1]`.
   *
   * Both numbers are `reached` counts off the same rows, so this is the figure
   * that survives the over-count the counts themselves carry. It is never
   * divided by the page's views or by the page views counted at the door — those
   * are a different measurement of a different thing, and dividing across the
   * two would put a number on a screen that no two rows agree about.
   */
  readonly share: number
}

/** One parent's children, in the order a reader meets them. */
export type ReadingRun = {
  readonly parentId: NodeId
  /** The depth of the steps, which is one below the parent's. */
  readonly depth: number
  readonly steps: readonly ReadingStep[]
  /** Every fall, in run order. */
  readonly stops: readonly ReadingStop[]
  /**
   * The last step in run order that any view reached, or `null` where none did.
   *
   * *How far down they got*, as a node rather than a fraction.
   */
  readonly furthest: NodeId | null
  /**
   * Pairs where more views reached the later part than the earlier one.
   *
   * Scrolling cannot do this, so it is a reader who arrived somewhere other than
   * the top — an anchored link, a restored scroll position — or a part that is
   * on screen whatever the reader does, such as a footer a short page never
   * pushes down. Worth seeing and not worth reporting as a negative stop.
   */
  readonly gained: number
}

export type ReadingProgress = {
  readonly treeId: TreeId
  readonly revision: number
  /**
   * The page's view floor, carried through from the reading unchanged.
   *
   * Zero is the whole answer: nothing was measured, so nothing stopped
   * anywhere, and `runs` is empty rather than a page of parts that all look
   * skipped.
   */
  readonly views: number
  /**
   * Every run of two or more children, in reading order.
   *
   * A run of one is left out: a stop is between two parts, and an only child has
   * nowhere for reading to stop. Every part of the page is a step in at most one
   * run — its parent's — so no reader's progress is counted at two depths.
   */
  readonly runs: readonly ReadingRun[]
  /**
   * The sharpest fall on the page: most views lost, then largest share, then
   * first in reading order.
   *
   * By views lost rather than by share, because *where does this page lose
   * readers* is a question about readers. A band two readers out of three
   * abandoned is a worse rate and a smaller problem than one four hundred out of
   * a thousand did, and ranking by share would put the former at the top of
   * every screen for ever.
   */
  readonly steepest: ReadingStop | null
  /**
   * Parts that could not anchor a stop, because they reported something other
   * than coming into view.
   *
   * Empty on an ordinary page. A long list is a diagnosis: presses are being
   * delegated to regions that no `viewed` names, which is a sender or a
   * primitive not reporting what it is, rather than a page nobody read.
   */
  readonly unanchored: readonly NodeId[]
  /** Every run's {@link ReadingRun.gained}, added. */
  readonly gained: number
}

const stepOf = (part: PartReading): ReadingStep => ({
  nodeId: part.nodeId,
  type: part.type,
  role: part.role,
  standing: part.standing,
  reached: part.counters?.reached ?? 0,
  /**
   * `read` carries a reach above zero and `skipped` carries no row at all, and
   * both are statements. `unknown` is the absence of one — and with views on the
   * page it is the sharp case this module refuses to build a cliff out of.
   */
  anchors: part.standing !== "unknown",
})

/**
 * The falls and the rises of one run, over the steps that can anchor either.
 *
 * One pass. The previous anchorable step is carried rather than searched for
 * backwards, so a run of unanchorable parts costs its length and not its square
 * — the ledger was quadratic once and a 6,000-node page took 314 ms.
 */
const pairsOf = (
  steps: readonly ReadingStep[]
): { readonly stops: readonly ReadingStop[]; readonly gained: number } => {
  const stops: ReadingStop[] = []
  let gained = 0
  let previous: ReadingStep | undefined

  for (const step of steps) {
    if (!step.anchors) continue

    if (previous !== undefined) {
      const lost = previous.reached - step.reached

      if (lost > 0) {
        stops.push({
          after: previous.nodeId,
          before: step.nodeId,
          reached: previous.reached,
          lost,
          share: lost / previous.reached,
        })
      } else if (lost < 0) gained += 1
    }

    previous = step
  }

  return { stops, gained }
}

/** The last step any view reached, which is a scan from the end rather than a sort. */
const furthestOf = (steps: readonly ReadingStep[]): NodeId | null => {
  for (let at = steps.length - 1; at >= 0; at -= 1) {
    const step = steps[at]

    if (step !== undefined && step.reached > 0) return step.nodeId
  }

  return null
}

const runOf = (parentId: NodeId, parts: readonly PartReading[]): ReadingRun => {
  const steps = parts.map(stepOf)
  const { stops, gained } = pairsOf(steps)

  return {
    parentId,
    depth: parts[0]?.depth ?? 0,
    steps,
    stops,
    furthest: furthestOf(steps),
    gained,
  }
}

/**
 * The steepest of two, which is the ranking rule spelled once.
 *
 * `>` rather than `>=` on both keys is what makes the third rule — first in
 * reading order — hold without a third comparison: an equal candidate never
 * displaces the one already standing, and the parts arrive in reading order.
 */
const steeperOf = (standing: ReadingStop | null, next: ReadingStop): ReadingStop => {
  if (standing === null) return next
  if (next.lost > standing.lost) return next
  if (next.lost === standing.lost && next.share > standing.share) return next

  return standing
}

/**
 * Where reading stops, from a reading of one revision.
 *
 * Handed the output of `pageReadingOf`, because the standings and the reading
 * order are what this is made of and deriving them twice is how two screens
 * come to disagree. A caller with counters and a tree reads the parts first.
 */
export const readingProgressOf = (reading: PageReading): ReadingProgress => {
  const empty = {
    treeId: reading.treeId,
    revision: reading.revision,
    views: reading.views,
  }

  /**
   * A window with no views of this revision answers nothing, rather than
   * answering that every part was abandoned.
   *
   * Every standing is `unknown` below that floor (`parts.ts`), so there is not
   * an anchorable step on the page and every run would be a list of parts with
   * no stop in it. Saying so once here is cheaper to read than a page of empty
   * runs, and it is the same refusal `unknown` already makes one level down.
   */
  if (reading.views === 0) {
    return { ...empty, runs: [], steepest: null, unanchored: [], gained: 0 }
  }

  /**
   * Grouped by parent in one pass. The parts arrive in reading order, so each
   * group is in run order by construction and nothing is sorted.
   */
  const byParent = new Map<NodeId, PartReading[]>()

  for (const part of reading.parts) {
    if (part.parentId === null) continue

    const siblings = byParent.get(part.parentId)

    if (siblings === undefined) byParent.set(part.parentId, [part])
    else siblings.push(part)
  }

  const runs: ReadingRun[] = []
  let steepest: ReadingStop | null = null
  let gained = 0

  for (const [parentId, siblings] of byParent) {
    if (siblings.length < 2) continue

    const run = runOf(parentId, siblings)

    runs.push(run)
    gained += run.gained

    for (const stop of run.stops) steepest = steeperOf(steepest, stop)
  }

  return {
    ...empty,
    runs,
    steepest,
    unanchored: reading.parts.filter((part) => part.standing === "unknown").map((part) => part.nodeId),
    gained,
  }
}
