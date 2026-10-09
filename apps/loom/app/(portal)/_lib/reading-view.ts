import type { NodeId, PrimitiveType, TreeId } from "@jam-overture/loom"
import type { StoredTally } from "@jam-overture/loom/signals"

import { nounOf, type PartName } from "./part-name"
import { versionMention } from "./version"

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
  /**
   * The most recent moment any part of this version took a rollup.
   *
   * Counting and forgetting are one operation
   * ([0158](../../../../../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)),
   * so a batch becomes a counter only once it has been held for the collection
   * window — an hour by default. A reader who is on the page right now is in
   * the buffer and in no tally, and will be in one after the next run past
   * their window.
   *
   * That means every number on this screen is *as of* a moment, and the moment
   * is never now. Saying which one is the difference between a figure a person
   * can act on and a figure they have to guess the age of.
   */
  readonly countedAt: string
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
  /*
   * The newest rollup across the version's parts, not the oldest and not one
   * part's. Parts of one version are counted in the same run, so in practice
   * they agree — but a part added between two runs has an earlier moment than
   * its neighbours, and reporting that one would age the whole screen by a
   * window for no reason. ISO-8601 UTC to the millisecond compares correctly
   * as a string, which is why this is a comparison and not a parse.
   */
  const counted = new Map<string, string>()

  for (const tally of tallies) {
    const key = `${tally.treeId}\u0000${tally.revision}`
    keys.set(key, { treeId: tally.treeId, revision: tally.revision })

    const seen = counted.get(key)
    if (seen === undefined || tally.updatedAt > seen) counted.set(key, tally.updatedAt)

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
        countedAt: counted.get(key)!,
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
 * Whether these counters are about the page you are serving right now.
 *
 * ## The question, and why nothing else on this screen asks it
 *
 * Counters are kept per version, and a version is only counted once its
 * batches have been held for the collection window. So the moment somebody
 * makes a change — which is the exact moment they come here to see what it did
 * — the page they are serving has **no row at all**, and the newest thing this
 * screen can find is the version before it.
 *
 * Read naively that is indistinguishable from a working screen: real numbers,
 * a real version, everything populated. The reader concludes their change
 * broke the measurement, or worse, reads the old version's figures as the new
 * version's. `Loom daily build` filed exactly this on 14 September — *"a screen
 * that does not say so will look broken"* — and the answer has to be the
 * screen's, because there is nothing wrong with the numbers.
 *
 * ## Where the answer comes from
 *
 * The page being served, which this screen already reads and already throws
 * away: `readers/page.tsx` fetches each tree to name its parts and keeps only
 * the names. A tree carries its revision, so the comparison costs no read at
 * all — it is one field of something already in hand.
 *
 * ## Why three answers and not a boolean
 *
 * ## Why four answers and not a boolean
 *
 * A read of the page can fail, and a screen that reported a failed read as
 * *these numbers are current* would be making the confident claim this whole
 * module exists to refuse. `unread` is a real state and it is said out loud.
 *
 * `replaced` should not happen: a revision only ever climbs, so a page older
 * than its own counters means something put a different page at this id. It is
 * a case of its own rather than folded into `unread` because the two send a
 * reader to opposite places — *try again* against *somebody replaced this* —
 * and because falling through to `current` would print *these are the numbers
 * for the version you are serving* over numbers about a page that is gone.
 */
export type CountingStanding =
  /** The newest counted version is the page being served. */
  | { readonly kind: "current"; readonly counted: number }
  /** The page has been changed since the newest counted version. */
  | {
      readonly kind: "behind"
      readonly counted: number
      readonly live: number
      /** How many changes have landed since the newest counted version. */
      readonly changes: number
    }
  /** The page itself could not be read, so nothing can be said either way. */
  | { readonly kind: "unread"; readonly counted: number }
  /** The page being served is older than its own counters. */
  | { readonly kind: "replaced"; readonly counted: number; readonly live: number }

/**
 * `live` is the revision of the page being served, or `undefined` when the read
 * of it did not come back.
 */
export const countingStanding = (
  reading: PageReading,
  live: number | undefined
): CountingStanding => {
  const counted = reading.revisions[0]!.revision

  if (live === undefined) return { kind: "unread", counted }
  if (live === counted) return { kind: "current", counted }
  if (live < counted) return { kind: "replaced", counted, live }

  return { kind: "behind", counted, live, changes: live - counted }
}

/**
 * How many changes, as somebody would say it rather than as a counter.
 *
 * *Once* and *twice* rather than *1 times* and *2 times*, which is the same
 * plural care `outOfVisits` takes and for the same reason: a screen that says
 * *1 times* reads as a screen nobody looked at.
 */
const timesChanged = (changes: number): string =>
  changes === 1 ? "once" : changes === 2 ? "twice" : `${changes} times`

/**
 * The first sentence of a page's card: how much was heard, and what it was
 * heard about.
 *
 * The version is part of the sentence rather than a decoration on it, because
 * the sentence is only true of one version. *"…have reported back since it was
 * last changed"* is a claim that the counted version **is** the current one,
 * and on a page changed ten minutes ago it is false — the visits reported back
 * before the last change, not since it.
 *
 * That is the whole defect this reading exists for. It is a string rather than
 * markup for the second reason too: an expression sitting next to a word in JSX
 * loses the space between them, which this lane has now shipped twice.
 */
export const visitsHeard = (reading: RevisionReading, standing: CountingStanding): string => {
  const visits = reading.views === 1 ? "One visit" : `${reading.views} visits`
  const verb = reading.views === 1 ? "has" : "have"

  return standing.kind === "current"
    ? `${visits} to this page ${verb} reported back since it was last changed. That is ${versionMention(reading.revision)}.`
    : `${visits} ${verb} reported back on ${versionMention(reading.revision)} of this page.`
}

/**
 * Whether the reader is looking at the page they think they are, in one
 * sentence that is never absent.
 *
 * `current` says so out loud rather than saying nothing. Silence would be
 * indistinguishable from the three states that are not it, which is the whole
 * failure being fixed — and it is the sentence a reader who has *not* just made
 * a change needs, because it is the one that tells them the numbers are live.
 */
export const standingNote = (standing: CountingStanding): string => {
  switch (standing.kind) {
    case "current":
      return "These are the numbers for the version you are serving right now."
    case "behind":
      return `You have changed this page ${timesChanged(standing.changes)} since then, and nothing has been counted for ${versionMention(standing.live)} yet.`
    case "unread":
      return "We couldn’t read the page itself just now, so we can’t tell you whether this is the version you are serving."
    case "replaced":
      return `The page being served is ${versionMention(standing.live)}, which is older than these numbers — something has put a different page at this address.`
  }
}

/**
 * What to do about it, which for the common case is nothing — and saying so is
 * the answer rather than the absence of one.
 *
 * A person who has just made a change and found nothing about it will go
 * looking for a fault in their page. There is none: counting a window of
 * readings and forgetting it are one operation
 * ([0158](../../../../../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)),
 * so a reading is held for the collection window before it becomes a counter.
 * The wait is the design, and a reader told that will wait instead of debugging.
 */
export const standingAdvice = (standing: CountingStanding): string | undefined => {
  switch (standing.kind) {
    case "behind":
      return "Nothing is wrong and there is nothing to fix: readings are held for about an hour before they are counted, so a change you have just made takes a while to show up here."
    case "unread":
      return "The counters were read and the page was not, so what is here is still true — try again in a moment to find out which version it is about."
    case "replaced":
      return "Nothing has been lost. These counters stay exactly as they are, and the page being served now will start counting under its own version."
    case "current":
      return undefined
  }
}

/**
 * The two things worth saying out loud about how a revision was *read*.
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
  }
}

const withKey = <K extends string>(
  key: K,
  part: PartReading | undefined
): Partial<Record<K, PartReading>> => (part === undefined ? {} : ({ [key]: part } as Record<K, PartReading>))

/*
 * **`pageUse`, `unplacedUse` and `UseReading` were here, and the framework now
 * answers all three exactly.**
 *
 * This lane built them when the region counter was first readable and nothing
 * interpreted it: the page-wide headcount was the largest `engaged` any row
 * reported, over the largest view count any row reported, and *presses with
 * nowhere to go* was a predicate over the same rows.
 *
 * `pageActionOf`
 * ([0242](../../../../../decisions/0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md))
 * is the same three readings off the **root's own row** rather than off a
 * maximum, with the structural fact that tells a region nobody used from a leaf
 * nobody could use — which is the sentence neither of these could say. So they
 * are gone rather than kept beside it: a lane that adds a better figure beside a
 * worse one ships both, which this lane filed on 7 October after a photograph
 * caught one card printing two numbers for one part three lines apart.
 *
 * `mostClicked` and `mostOpened` left `highlightsOf` in the same change, for the
 * weaker reason that they are about doing and everything else it returns is
 * about attention. They are `_lib/doing.ts`'s now, off the same reading as the
 * headcounts they sit under.
 */

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
 * What this page can honestly be told about before and after — always
 * something.
 *
 * ## Why this is a reading rather than a length check
 *
 * The card's own rule is that an absent sentence is a lie: *"a page whose
 * sections silently disappear when their number is zero leaves a reader unable
 * to tell Loom looked and there was nothing from Loom did not look."* The one
 * section that broke it was the comparison — the measurement this product
 * exists for — which was drawn under `shifts.length > 0` and otherwise was not
 * on the screen at all.
 *
 * Three different facts were arriving as that one blank: a page nobody has
 * changed yet, a change that replaced every part it could have been compared
 * on, and — the one the reader is most likely to meet — a change so recent
 * that nothing has been counted for it. A reader met all three as silence, and
 * silence is the reading they are least able to act on.
 *
 * So this returns a fact in every case and the union has no empty arm. A
 * section that cannot disappear is a section a later edit cannot quietly
 * delete.
 *
 * ## What it does not answer
 *
 * Whether the newer of the two versions is the page being served. That is
 * `countingStanding`, it is one fact, and it is said once — beside the counts
 * it qualifies rather than inside the comparison, which would be the same
 * sentence in two places disagreeing the first time one of them was edited.
 */
export type Comparison =
  /** Two counted versions, with parts both of them heard about. */
  | {
      readonly kind: "shifts"
      readonly shifts: readonly ReachShift[]
      readonly before: number
      readonly after: number
    }
  /**
   * Two counted versions and not one part in common — so the change replaced
   * everything anybody reported on, and there is nothing to compare rather
   * than nothing that moved. The two are opposite news.
   */
  | { readonly kind: "nothing-shared"; readonly before: number; readonly after: number }
  /** One counted version. Nothing has been compared because nothing came before. */
  | { readonly kind: "first"; readonly counted: number }

export const comparisonOf = (reading: PageReading): Comparison => {
  const newest = reading.revisions[0]!
  const previous = reading.revisions[1]

  if (previous === undefined) return { kind: "first", counted: newest.revision }

  const shifts = reachShifts(previous, newest)

  return shifts.length === 0
    ? { kind: "nothing-shared", before: previous.revision, after: newest.revision }
    : { kind: "shifts", shifts, before: previous.revision, after: newest.revision }
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
