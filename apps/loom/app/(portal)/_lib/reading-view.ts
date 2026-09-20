import type { NodeId, PrimitiveType, TreeId } from "@loom/runtime"
import type { StoredTally } from "@loom/runtime/signals"

import { nounOf, type PartName } from "./part-name"

/**
 * What readers did on a page, read the way a person asks it.
 *
 * ## What the counters actually are
 *
 * A `StoredTally` is one part of one revision of one page, with seven numbers
 * on it. Four of them are plain counts of *events* — dwell, clicks, opens,
 * closes — and the three that matter most are counts of *page views*:
 *
 * - **`views`** is how many distinct page views said anything about this part.
 * - **`reached`** is how many of those page views actually *saw* it.
 * - **`engaged`** is how many used something **inside** it.
 *
 * The third is the only one that is ever about a region, and it is the reason
 * this module was one counter short of describing a section at all: a press
 * lands on a button, so a band's clicks are zero however busy the band was.
 *
 * All three are correlated inside one page view by the opaque key of
 * [0146](../../../../../decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md),
 * which never persists and never identifies anybody. That is what makes "3 of
 * 40 visits" answerable without there being any such thing as a visitor here.
 *
 * ## Why this module exists rather than a component doing it
 *
 * Every sentence this screen says is arithmetic over those numbers, and
 * arithmetic that is done in a component is arithmetic no test can assert
 * without a renderer. The screen's job is to put the sentences in order; the
 * question of *which part fewest people saw* is settled here.
 *
 * ## The one thing these numbers are not
 *
 * They are not a rate unless a total is beside them. A part reached by two
 * people out of two is not "100%" in any sense a person should act on, and a
 * portal that printed one would be inventing confidence the data does not
 * have — the same defect `/portal/trust` refuses when it leaves an empty
 * confidence band blank rather than showing a zero. So every reading here
 * carries its denominator, and the only place a bare rate appears is inside the
 * technical disclosure, where a reader has asked for it.
 */

/** One part of one revision, named the way a person would say it. */
export type PartReading = {
  readonly nodeId: NodeId
  /** The registered type, kept for the disclosure. Never on the surface. */
  readonly type: PrimitiveType
  readonly name: PartName
  readonly views: number
  readonly reached: number
  /**
   * Page views in which a reader used something *inside* this part — pressed,
   * followed, filled, opened or closed, at any depth.
   *
   * The only counter on the row that is ever about a region. A press lands on a
   * button, so a band's `activations` is zero however busy the band was, and
   * until this was read a section's line on this screen was time on screen
   * beside four permanent zeroes.
   *
   * Strictly inside, so a control's own use is in `activations` and never here.
   * It is a count of views rather than of presses, which is what makes it the
   * one usage number a share may be taken of.
   *
   * **It can exceed `reached`, and that is not a fault.** A region is credited
   * by what happened under it, and nothing credits it with having been on
   * screen — so a band nobody reported seeing, whose button somebody pressed,
   * has `reached` of 0 here and a use of 1. Every reading below that would
   * divide the two checks for it rather than printing a share above 100.
   */
  readonly engaged: number
  readonly dwellMs: number
  readonly activations: number
  readonly opens: number
  readonly closes: number
}

/**
 * One revision of one page, and everything heard about it.
 *
 * Revisions are kept apart rather than added together, because that is what the
 * rollup does and for the reason it gives: *"a signal about the fourth section
 * means nothing once a proposal has moved it"*. Adding two revisions of a part
 * together is exactly the arithmetic that makes before-versus-after unreadable.
 */
export type RevisionReading = {
  readonly treeId: TreeId
  readonly revision: number
  /**
   * The closest thing these counters hold to a page-view count: the most page
   * views any single part was mentioned by, or used inside.
   *
   * It is a floor rather than a measurement, and the disclosure says so. A part
   * at the top of a page is mentioned by essentially every view that broadcast
   * anything, so in practice the floor is tight — but a page whose every part
   * is behind a disclosure would report fewer views than it had, and a number
   * presented as exact would be a claim this data cannot make.
   *
   * **Engagement raises the floor, and has to.** A view that used something
   * inside a part is a page view, and a region is credited with it without
   * being credited with a `views` of its own — so two readers who each pressed
   * a different button, and whose senders reported nothing else, are two page
   * views that the old floor read as one. Every share this module prints is
   * measured against this number, and a denominator below its own numerator is
   * the one arithmetic error a screen cannot explain away.
   */
  readonly views: number
  /** Ordered by how many people saw each part, most first. */
  readonly parts: readonly PartReading[]
}

const partName = (nodeId: NodeId, type: PrimitiveType, names: ReadonlyMap<string, PartName>) =>
  /*
   * A tally holds an id and a registered type and no node, so a part whose node
   * is still in the page being served is named from that node — words and all —
   * and a part whose node has since been removed is named from the only thing
   * left, its type.
   *
   * `nounOf` is `part-name.ts`'s, deliberately. That module is where a part is
   * named, and reading a registered type into a noun here would be the fourth
   * function to do it — which is an open finding of this lane's already, and not
   * one to make worse while closing something else.
   */
  names.get(nodeId) ?? { name: `the ${nounOf(type)}`, nodeId }

/**
 * Most-seen first.
 *
 * The order is the reading. Reach falls as a reader goes down a page, so a list
 * sorted by it is, in practice, the page in the order people met it — without
 * this module having to hold a tree to know what that order was. That matters
 * for more than tidiness: the counters outlive the revision they describe, so a
 * screen that needed the tree to order them could only ever order the newest
 * one.
 *
 * Ties break on dwell and then on id, so the same counters always produce the
 * same list. An order that shuffled between two reads of unchanged data would
 * make a screenshot useless as evidence.
 */
const byReach = (left: PartReading, right: PartReading): number =>
  right.reached - left.reached || right.dwellMs - left.dwellMs || left.nodeId.localeCompare(right.nodeId)

/**
 * Group stored counters into one reading per revision, newest revision first.
 *
 * Tallies for several pages may arrive in one read — an unscoped screen asks
 * for every tree the handle can see — so the grouping is on both halves of the
 * key, and the sort puts the newest revision of each page first within its own
 * page rather than across all of them.
 */
export const revisionReadings = (
  tallies: readonly StoredTally[],
  names: ReadonlyMap<string, PartName> = new Map()
): readonly RevisionReading[] => {
  const grouped = new Map<string, PartReading[]>()
  const keys = new Map<string, { readonly treeId: TreeId; readonly revision: number }>()

  for (const tally of tallies) {
    const key = `${tally.treeId}\u0000${tally.revision}`
    keys.set(key, { treeId: tally.treeId, revision: tally.revision })

    const reading: PartReading = {
      nodeId: tally.nodeId,
      type: tally.type,
      name: partName(tally.nodeId, tally.type, names),
      views: tally.views,
      reached: tally.reached,
      engaged: tally.engaged,
      dwellMs: tally.dwellMs,
      activations: tally.activations,
      opens: tally.opens,
      closes: tally.closes,
    }

    const existing = grouped.get(key)
    if (existing === undefined) grouped.set(key, [reading])
    else existing.push(reading)
  }

  return [...grouped.entries()]
    .map(([key, parts]) => {
      const { treeId, revision } = keys.get(key)!

      return {
        treeId,
        revision,
        views: parts.reduce((most, part) => Math.max(most, part.views, part.engaged), 0),
        parts: [...parts].sort(byReach),
      }
    })
    .sort(
      (left, right) => left.treeId.localeCompare(right.treeId) || right.revision - left.revision
    )
}

/** Every page with a reading, in the order a person meets them. */
export type PageReading = {
  readonly treeId: TreeId
  /** Newest first. Never empty — a page with no counters is not a page here. */
  readonly revisions: readonly RevisionReading[]
}

export const pageReadings = (readings: readonly RevisionReading[]): readonly PageReading[] => {
  const grouped = new Map<TreeId, RevisionReading[]>()

  for (const reading of readings) {
    const existing = grouped.get(reading.treeId)
    if (existing === undefined) grouped.set(reading.treeId, [reading])
    else existing.push(reading)
  }

  return [...grouped.entries()].map(([treeId, revisions]) => ({ treeId, revisions }))
}

/**
 * The five things worth saying about a revision out loud.
 *
 * Each is a part, or nothing. Nothing is a real answer and is said as one — a
 * page where nobody clicked anything has an honest sentence about that, and a
 * section that silently disappears leaves a reader unable to tell "I looked"
 * from "nothing looked".
 */
export type Highlights = {
  /** The part fewest people got to. Absent when every part was seen equally. */
  readonly fewestSaw?: PartReading
  /** Where people stayed longest, per person who got there. */
  readonly longest?: PartReading
  readonly mostClicked?: PartReading
  readonly mostOpened?: PartReading
}

/**
 * Dwell per person who reached the part, rather than dwell in total.
 *
 * Total dwell rewards the part the most people saw, which is the top of the
 * page every time — a "people stayed longest here" that always answers *the
 * heading* is a sentence that carries no information. Per reader is the
 * question somebody is actually asking.
 */
export const dwellEach = (part: PartReading): number =>
  part.reached === 0 ? 0 : part.dwellMs / part.reached

const best = (
  parts: readonly PartReading[],
  score: (part: PartReading) => number
): PartReading | undefined => {
  const ranked = parts.filter((part) => score(part) > 0)
  if (ranked.length === 0) return undefined

  return ranked.reduce((most, part) => (score(part) > score(most) ? part : most))
}

export const highlightsOf = (reading: RevisionReading): Highlights => {
  const { parts } = reading
  if (parts.length === 0) return {}

  const least = parts[parts.length - 1]!
  const most = parts[0]!

  return {
    /*
     * A page whose parts were all reached the same number of times has no
     * "fewest", and saying one anyway would point a reader at a part that is
     * doing nothing wrong. One part on its own is the same case.
     */
    ...(least.reached < most.reached ? { fewestSaw: least } : {}),
    ...withKey("longest", best(parts, dwellEach)),
    ...withKey("mostClicked", best(parts, (part) => part.activations)),
    ...withKey("mostOpened", best(parts, (part) => part.opens)),
  }
}

const withKey = <K extends string>(
  key: K,
  part: PartReading | undefined
): Partial<Record<K, PartReading>> => (part === undefined ? {} : ({ [key]: part } as Record<K, PartReading>))

/**
 * A part, and the views that used something inside it.
 *
 * The denominator is optional and that is the whole of the type's design. A
 * region is credited with a view because of what happened *under* it, and
 * nothing credits it with having been on screen — so `reached` is a denominator
 * for this count only when it is one, and a part whose use outran its measured
 * reach says so in words instead of printing a share above a hundred.
 */
export type UseReading = {
  readonly part: PartReading
  /** Page views in which a reader used something inside the part. */
  readonly used: number
  /**
   * Page views that got as far as it, when that is a number this count can
   * honestly be read against. Absent when nothing reported the part on screen,
   * or reported it on fewer views than used something in it.
   */
  readonly outOf?: number
}

const useReading = (part: PartReading): UseReading => ({
  part,
  used: part.engaged,
  ...(part.reached > 0 && part.engaged <= part.reached ? { outOf: part.reached } : {}),
})

/**
 * What readers did on the page, rather than to any one part of it.
 *
 * ## Why the whole page is a number this data can give exactly
 *
 * A delegated signal names every addressed region it happened inside, *up to
 * and including the root*. So the largest `engaged` on a revision is the root's,
 * and it is not an estimate of anything: it is the page views in which a reader
 * used something, anywhere on the page. Every other part's engagement is a
 * subset of it.
 *
 * That is the sentence this screen had no way to say. `activations`, `opens`
 * and `closes` are per-part event counts — *this button was pressed nine times*
 * — and nine presses may be one enthusiastic reader. *Twelve of the forty
 * visits did something* is a different claim and the one an author is actually
 * asking for.
 *
 * ## And why the region below it is the more interesting half
 *
 * The root always wins, so naming the most-engaged part would name the page
 * every time. `region` is therefore the most-used part the measurement can tell
 * *apart* from the page as a whole — the best-engaged part strictly below the
 * maximum. A part whose engagement is indistinguishable from the whole page's
 * is not news about a part.
 *
 * Ranked on the count rather than on the share, deliberately. A share would put
 * a band reached once and used once above everything else on the page, which is
 * the small-sample confidence this module refuses everywhere else.
 */
export type PageUse = {
  /** Page views in which a reader used something anywhere on the page. */
  readonly whole: number
  /** The most-used part that is not simply the page itself. */
  readonly region?: UseReading
}

const byUse = (left: PartReading, right: PartReading): number =>
  right.engaged - left.engaged ||
  right.reached - left.reached ||
  left.nodeId.localeCompare(right.nodeId)

export const pageUse = (reading: RevisionReading): PageUse | undefined => {
  const whole = reading.parts.reduce((most, part) => Math.max(most, part.engaged), 0)
  if (whole === 0) return undefined

  const inner = [...reading.parts].filter((part) => part.engaged > 0 && part.engaged < whole)
  const best = inner.sort(byUse)[0]

  return { whole, ...(best === undefined ? {} : { region: useReading(best) }) }
}

/**
 * Presses this screen was told about and cannot place.
 *
 * A batch whose delegated signals carry no ancestry adds nothing to any
 * region's count — *"absent is not empty"*, as the framework lane put it when it
 * built the counter. The symptom is a screen where every section reports time
 * on screen and nothing else, which reads as *nobody uses my sections* and
 * means *nothing told us where anything happened*.
 *
 * The two are told apart by a signature this module can see without asking
 * anybody: something on this page **was** used, and not one part of it heard
 * about any of it. Since every region up to the root is credited, one placed
 * press anywhere makes this impossible — so a zero here is the sender, not the
 * readers.
 *
 * Absent when there is nothing to explain: no use at all is the honest empty
 * result the screen already has a sentence for, and a single placed use means
 * the walk is working.
 */
export type UnplacedUse = {
  /** Clicks, opens and closes reported on this revision, added up. */
  readonly uses: number
}

export const unplacedUse = (reading: RevisionReading): UnplacedUse | undefined => {
  if (reading.parts.some((part) => part.engaged > 0)) return undefined

  const uses = reading.parts.reduce(
    (total, part) => total + part.activations + part.opens + part.closes,
    0
  )

  return uses === 0 ? undefined : { uses }
}

/**
 * What changed for readers when the page changed.
 *
 * This is the measurement the whole product is for — *before versus after a
 * change* — and it is answerable here only because the rollup refuses to add
 * revisions together. A part is comparable when both revisions heard from
 * somebody about it; a part that is new, gone, or unheard-of in one of the two
 * is left out rather than compared against a zero, because an absent
 * denominator is not a fall to nothing.
 */
export type ReachSide = {
  readonly reached: number
  readonly views: number
}

export type ReachShift = {
  readonly nodeId: NodeId
  readonly name: PartName
  readonly before: ReachSide
  readonly after: ReachSide
}

/**
 * Both counts are kept rather than the rate they produce, because the two
 * windows are not the same size and a reader has to be able to see that. *Up
 * sixty points* over four visits and over four hundred are the same number and
 * different news, and a shift that carried only its rates would have thrown
 * away the half that says which.
 */
export const rateOf = (side: ReachSide): number =>
  side.views === 0 ? 0 : side.reached / side.views

export const shiftOf = (shift: ReachShift): number => rateOf(shift.after) - rateOf(shift.before)

/**
 * Comparable parts, biggest change first, risers and fallers together.
 *
 * Sorted by size of change rather than by direction: a reader wants the parts
 * the change moved, and which way it moved them is the second question. Ties
 * break on id so the list does not shuffle between reads.
 */
export const reachShifts = (
  before: RevisionReading,
  after: RevisionReading
): readonly ReachShift[] => {
  const earlier = new Map(before.parts.map((part) => [part.nodeId, part]))

  return after.parts
    .flatMap((part) => {
      const was = earlier.get(part.nodeId)
      if (was === undefined || was.views === 0 || part.views === 0) return []

      return [
        {
          nodeId: part.nodeId,
          name: part.name,
          before: { reached: was.reached, views: was.views },
          after: { reached: part.reached, views: part.views },
        },
      ]
    })
    .sort(
      (left, right) =>
        Math.abs(shiftOf(right)) - Math.abs(shiftOf(left)) || left.nodeId.localeCompare(right.nodeId)
    )
}

/**
 * How long, in words somebody would use out loud.
 *
 * Milliseconds are the runtime's unit and nobody says them. The rounding is
 * deliberately coarse and the word "about" is not decoration: dwell is measured
 * by a browser that stops counting when a tab is hidden, so a figure to the
 * millisecond would be precision this measurement does not have. The exact
 * number stays one click down, where a reader who wants it has asked for it.
 */
export const plainDuration = (ms: number): string => {
  if (ms < 1_000) return "under a second"
  if (ms < 60_000) {
    const seconds = Math.round(ms / 1_000)

    return `about ${seconds} ${seconds === 1 ? "second" : "seconds"}`
  }
  if (ms < 3_600_000) {
    const minutes = Math.round(ms / 60_000)

    return `about ${minutes} ${minutes === 1 ? "minute" : "minutes"}`
  }

  const hours = Math.round(ms / 3_600_000)

  return `about ${hours} ${hours === 1 ? "hour" : "hours"}`
}

/**
 * A count against the visits it is a count of.
 *
 * Never a percentage on the surface. Two of two is not the same news as two
 * hundred of two hundred, and a page that printed "100%" for both would be
 * making the smallest sample in the portal look like the strongest evidence in
 * it. The denominator is what a person needs to know how much to believe.
 */
export const outOfVisits = (count: number, views: number): string =>
  `${count} of the ${views} ${views === 1 ? "visit" : "visits"}`

/**
 * The same count, against the visits that got as far as the part it is about.
 *
 * A separate sentence rather than a second argument to the one above, because
 * the denominator is a different population and a reader has to be told which.
 * *5 of the 40 visits* and *5 of the 12 visits that got that far* are the same
 * numerator and opposite news, and a screen that printed the first where it
 * meant the second would be reporting a section as ignored when four fifths of
 * the people who saw it used it.
 */
export const outOfReaders = (count: number, reached: number): string =>
  `${count} of the ${reached} ${reached === 1 ? "visit" : "visits"} that got that far`

/**
 * A change in reach, as a person would read it.
 *
 * Percentage points, because this one *is* a comparison of two rates and the
 * difference between them is the whole sentence. It is inside the comparison
 * block, under a heading that says both denominators, rather than standing
 * alone the way a bare rate would.
 */
export const plainShift = (shift: ReachShift): string => {
  const points = Math.round(shiftOf(shift) * 100)

  if (points === 0) return "about the same"

  const size = Math.abs(points)

  return `${points > 0 ? "up" : "down"} ${size} ${size === 1 ? "point" : "points"}`
}
