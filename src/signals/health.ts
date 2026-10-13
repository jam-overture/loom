import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

import { pageActionOf } from "./action.js"
import { pageViewsFor, type RevisionPageViews, type StoredPageViews } from "./page-views.js"
import type { PageReading } from "./parts.js"

/**
 * Whether what a deployment collected can be trusted, and which of its pages
 * cannot.
 *
 * Every reading in this subsystem answers a question about readers and, beside
 * the answer, names the reasons the answer may be absent: a part with no
 * denominator, a window with no page views, a sender that is not marking its
 * openings. Twelve vocabularies of them
 * ([0240](../../decisions/0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)),
 * each published beside the figure it withholds.
 *
 * **So a deployment could only discover that its measurement was broken by
 * asking a question about reading and noticing the answer was missing.** Three
 * of those reasons are faults rather than quiet windows — senders that never
 * mark an opening, so every rate on the page has no exact denominator (0229);
 * senders that credit no action to any reader, so every band reads *untouched*
 * while the counters look healthy
 * ([0242](../../decisions/0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md));
 * a rollup window shorter than a visit, so every count against the revision is
 * half again the truth
 * ([0219](../../decisions/0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)).
 * Each of them is page by page, one card at a time, and a deployment with
 * forty pages and one broken sender had no way to be told.
 *
 * This is that answer, taken off the readings and the door rows a deployment
 * already has and nothing else: no payload, no browser change, no counter that
 * does not exist, no column and no byte on any wire.
 *
 * ## A fault is named by what it costs, and the remedy is named only where the
 * rows determine one
 *
 * The five faults here are not five shapes of missing data; they are five
 * different things to go and do, and the reason to report them together is that
 * a person looking at a reader screen cannot tell them apart from the figures.
 * {@link remedyOf} publishes which of four hands each one falls to — the pages,
 * the configuration, the caller — and `undetermined` where the rows genuinely do
 * not say, which is one fault out of five and is better than inventing one of
 * three causes.
 *
 * ## What a fault costs is the page's arrivals, and a page is counted once
 *
 * The readers a fault affects are the readers of the page it is on: a sender not
 * marking its openings spoils every rate on that revision, not some share of
 * them. So the cost is the page's own `opened` — exact, counted once at the
 * door, and addable for the reason no other counter here is (0219).
 *
 * **Which makes the only double-count available to this reading the one it
 * guards: a page counted once per fault it has.** A revision with three faults
 * is one revision and its readers are added once, because counting a window and
 * forgetting it are one operation
 * ([0158](../../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
 * {@link CollectionHealth.faults} counts revisions per fault and so deliberately
 * does not add to the number of faulted pages, which is said on the field.
 *
 * ## A page the door cannot price is not ranked against one it can
 *
 * A revision whose counters hold readers and whose door row is missing is the
 * first fault in the list, and it is also the one page whose cost cannot be
 * stated: there is no exact arrival count to rank it by. Ranking it by its view
 * floor would put it in the order at a height taken off a different scale, which
 * is the mixing
 * [0265](../../decisions/0265-what-readers-do-inside-a-kind-of-part-is-a-share-of-the-readers-who-met-it-and-the-door-is-only-a-weight.md)
 * refuses one unit across and
 * [0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)
 * refuses for an order of pages. So it is published apart, in
 * {@link CollectionHealth.unpriced}, with its floor on the row and never in the
 * ranking.
 *
 * ## What is published as a figure rather than judged
 *
 * **Openings no rollup has folded.** `pending` is *the other sign of the same
 * subtraction* (0219) and is what a stalled collection looks like — and it is
 * also what a revision published two minutes ago looks like, because the
 * ordinary lag of the tallies behind the buffer is one window
 * ([0158](../../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
 * Telling those two apart needs to know when a rollup last folded this revision,
 * and the row carries one `updatedAt` written by both writers — so a busy page
 * whose rollup has stopped keeps a fresh timestamp while its appearances never
 * move, and a quiet healthy page looks stale by the same measure. The rows
 * cannot answer it, so this does not pretend to: `pending` is published per page
 * and added across the deployment, and no fault is raised from it. Filed with
 * the shape that would answer it.
 *
 * Pure, linear in the readings times the rows, and reaches no store, clock or
 * DOM.
 */

/**
 * How generous a revision's distinct counts may be before its absolute figures
 * are not worth printing.
 *
 * `drift ÷ opened` above a half means the appearances are more than one and a
 * half times the openings — so the typical page view is being folded into more
 * than one and a half rollup windows, which is a window shorter than the reading
 * it measures. Every **ratio** in this subsystem survives that, because both of
 * its counts come off the same rows and the inflation very nearly divides out
 * (0221, 0229, 0242); every **count** on a card is half again what it should be.
 *
 * Published and not overridable, which is
 * [0218](../../decisions/0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md)'s
 * rule at the one remove where it still holds: how much error makes a figure
 * unfit to print is the framework's statement about its own numbers, where the
 * remedy — a longer window — is the deployment's own configuration.
 */
export const COUNTS_INFLATED_ABOVE = 0.5

/** Something wrong with what a deployment is collecting, rather than a quiet window. */
export type CollectionFault =
  /**
   * The window's counters hold readers of this revision and there is no
   * page-view row at the door for it.
   *
   * Every rate on the page is left with the view floor for a denominator, which
   * is short of the page views there were (0212), and nothing on the page can be
   * put on the same scale as another page's (0250).
   *
   * **Three causes and the rows cannot tell them apart:** the revision was
   * served by senders older than the opening marker, the door row has passed out
   * of the deployment's retention window while the counters it describes have
   * not, or the counters were assembled by something that is not a sender. So
   * the remedy is `undetermined` rather than one of the three guessed.
   */
  | "door-unscaled"
  /**
   * The door row is there, something counted readers of this revision — a
   * rollup's appearances, or the counters themselves — and nothing has ever
   * said a page view *began*.
   *
   * An honest sender marks at most one batch of each page view as the one that
   * opened it (0214), and a deployment whose senders do not is the deployment a
   * share-of-readers reading calls `unopened` (0229): every rate
   * denominator-less while the counters look perfectly healthy. It is the one
   * fault here whose symptom is invisible on every screen that does not divide
   * by the door.
   */
  | "openings-unmarked"
  /**
   * The revision's distinct counts are inflated past
   * {@link COUNTS_INFLATED_ABOVE}.
   *
   * Not a broken sender and not a broken rollup: a rollup window shorter than
   * the visits being measured, which is the one control a deployment has over
   * this error (0219). The shares stay sound and the counts do not.
   */
  | "counts-inflated"
  /**
   * The window holds uses of this page and credits none of them to a reader.
   *
   * A press is filed against the control and credited to the addressed ancestors
   * the signal carries (0167), so a sender whose delegated signals have no
   * `within` adds occurrences and no `engaged` at all. Taken from
   * {@link pageActionOf} rather than spelled a second time, so the two readings
   * cannot come to disagree about what it looks like (0242).
   */
  | "actions-uncredited"
  /**
   * Counters filed under this tree and revision that name nodes the tree does
   * not contain, or the same row handed in twice.
   *
   * The two faults a **caller** can have rather than a deployment: a tree and a
   * window that do not belong together, which leaves most parts reading
   * `skipped` while the numbers stay plausible (0212), and two reads
   * concatenated instead of one, which neither sums nor overwrites honestly
   * (0147). Published as one fault because the hand it falls to is one hand and
   * the fix is one fix, with both counts on the row.
   */
  | "rows-mishandled"

export const COLLECTION_FAULTS: readonly CollectionFault[] =
  everyMemberOf<CollectionFault>()([
    "door-unscaled",
    "openings-unmarked",
    "counts-inflated",
    "actions-uncredited",
    "rows-mishandled",
  ])

/** One line per fault, for a surface naming what is wrong. */
export const describeCollectionFault = (fault: CollectionFault): string => {
  switch (fault) {
    case "door-unscaled":
      return "readers were counted against this version and no page views were counted at its door"
    case "openings-unmarked":
      return "page views of this version appeared in a rollup and nothing said one began"
    case "counts-inflated":
      return "the rollup window is shorter than the visits, so every count against this version is high"
    case "actions-uncredited":
      return "readers acted on this page and no reader was credited with acting inside anything"
    case "rows-mishandled":
      return "rows were handed in that this version cannot account for, or handed in twice"
  }
}

/** Whose hand a fault falls to. */
export type FaultRemedy =
  /** The pages: a newer broadcaster, or one whose delegation walks the ancestry. */
  | "senders"
  /** The deployment's own configuration: the rollup window. */
  | "configuration"
  /** The surface that asked: it handed in a tree and a window that do not match, or two reads. */
  | "caller"
  /**
   * Nothing the rows can name.
   *
   * One fault out of five, and it is the honest answer rather than a gap: a
   * missing door row is an old sender, an expired row or a hand-built counter,
   * and inventing one of the three is worse than naming none.
   */
  | "undetermined"

export const FAULT_REMEDIES: readonly FaultRemedy[] = everyMemberOf<FaultRemedy>()([
  "senders",
  "configuration",
  "caller",
  "undetermined",
])

/** Whose hand this fault falls to, which is the half of a fault a person acts on. */
export const remedyOf = (fault: CollectionFault): FaultRemedy => {
  switch (fault) {
    case "door-unscaled":
      return "undetermined"
    case "openings-unmarked":
      return "senders"
    case "counts-inflated":
      return "configuration"
    case "actions-uncredited":
      return "senders"
    case "rows-mishandled":
      return "caller"
  }
}

/** Where one revision of one page stands. */
export type HealthStanding =
  /** Measured, with nothing wrong that these rows can see. */
  | "sound"
  /** At least one fault, named on the row. */
  | "faulted"
  /**
   * Nothing was collected about this revision at all.
   *
   * No counters and no page views at the door, which is a page nobody opened in
   * the window rather than anything wrong. Checked before the door is, so a page
   * nobody read is never reported as a page the door could not price (0250).
   */
  | "unmeasured"
  /**
   * The door counted page views of this revision and no rollup has folded any of
   * them.
   *
   * A revision published minutes ago and a collection that has stopped look
   * exactly alike here, because the lag of the tallies behind the buffer is one
   * window by design (0158) and the row's one timestamp is written by both
   * writers. So this names the state and claims nothing about which it is.
   */
  | "unfolded"

export const HEALTH_STANDINGS: readonly HealthStanding[] = everyMemberOf<HealthStanding>()([
  "sound",
  "faulted",
  "unmeasured",
  "unfolded",
])

/** One line per standing, for a surface saying why a page is where it is. */
export const describeHealthStanding = (standing: HealthStanding): string => {
  switch (standing) {
    case "sound":
      return "measured, with nothing these rows can see wrong with it"
    case "faulted":
      return "something about what is being collected here is wrong"
    case "unmeasured":
      return "nothing was collected about this version in the window"
    case "unfolded":
      return "page views began and no rollup has folded any of them yet"
  }
}

/** One revision of one page, and what is wrong with what was collected about it. */
export type PageHealth = {
  readonly treeId: TreeId
  readonly revision: number
  readonly standing: HealthStanding
  /**
   * Every fault, in the order {@link COLLECTION_FAULTS} publishes them, which is
   * the order they are worth reading in: the one that costs the denominator
   * first, the three that are the deployment's, then the caller's.
   *
   * Empty on every standing but `faulted`.
   */
  readonly faults: readonly CollectionFault[]
  /**
   * The window's view floor, carried through from the reading unchanged.
   *
   * A floor and not a count (0212), which is why it is never ranked and never
   * added to an arrival count here.
   */
  readonly views: number
  /**
   * Page views counted at the door, exact, or `null` where this revision has no
   * row.
   *
   * On a faulted page these are the readers whose measurement its faults
   * affect, which is what makes one faulted page worse than another.
   */
  readonly arrivals: number | null
  /** The same page views as the rollups saw them, or `null` with no row. */
  readonly appearances: number | null
  /** This revision's own straddle rate, or `null` where nothing has opened. */
  readonly inflation: number | null
  /**
   * Openings no rollup has folded yet, which is a figure and never a fault here.
   *
   * Zero where there is no door row, because an absent row reports no openings
   * rather than none pending.
   */
  readonly pending: number
  /** Counters naming nodes this revision does not contain. */
  readonly orphaned: number
  /** Node counters and door rows handed in more than once, added. */
  readonly doubled: number
}

/** What a deployment is collecting, and what is wrong with it. */
export type CollectionHealth = {
  /** Every revision read, by tree id and newest revision first. */
  readonly pages: readonly PageHealth[]
  /**
   * Faulted revisions the door can price, worst first.
   *
   * Most arrivals, then the larger view floor, then tree id and newest revision
   * first — so two pages costing the same do not reorder on a refresh. By
   * headcount and never by a count of faults: one fault on a page nine thousand
   * people read is worse than four on a page three did (0221).
   */
  readonly faulted: readonly PageHealth[]
  /**
   * Faulted revisions with no exact arrival count, by tree id and newest
   * revision first.
   *
   * Out of the ranking rather than in it at a guessed height, which is the
   * refusal an order of pages makes about a page the door cannot scale (0250),
   * said about an order of faults.
   */
  readonly unpriced: readonly PageHealth[]
  /** The faulted page costing the most readers, which is the one to look at first. */
  readonly worst: PageHealth | null
  readonly standings: Readonly<Record<HealthStanding, number>>
  /**
   * How many revisions carry each fault.
   *
   * A count of pages and never of readers, and it does **not** add to
   * {@link standings}' `faulted`: a revision with three faults is one faulted
   * page and is in three of these rows.
   */
  readonly faults: Readonly<Record<CollectionFault, number>>
  /**
   * Page views at the door of every faulted revision the door can price, added
   * — each revision once however many faults it has.
   *
   * The headline figure: *the measurement of eleven hundred of your readers is
   * wrong in some way*. Exact and addable because a page view began on one
   * revision of one tree and was counted once (0219).
   */
  readonly readersAffected: number
  /**
   * Page views at the door across every revision read, added.
   *
   * The weight behind `readersAffected` — a share of readers rather than a share
   * of pages is what says whether a fault is marginal. This sees the pages its
   * caller read and not the deployment's.
   */
  readonly arrivals: number
  /**
   * Openings no rollup has folded, added across the revisions read.
   *
   * Published rather than judged, for the reason the module's own documentation
   * gives: one timestamp written by two writers cannot tell a fresh revision
   * from a stalled collection.
   */
  readonly pending: number
  /**
   * Distinct trees across the revisions read, which is not the number of pages.
   *
   * Two revisions of one tree are two live versions of one page and both stand
   * here, as they do in an order of pages (0250) and a census of a library
   * (0257).
   */
  readonly trees: number
  /**
   * Readings of a revision beyond the first, which were dropped.
   *
   * The one lie this reading can be told: a caller holding one page twice would
   * have its readers counted twice in `readersAffected`, and a count that has
   * been added cannot be unadded (0158).
   */
  readonly duplicated: number
}

const EMPTY_STANDINGS: Readonly<Record<HealthStanding, number>> = Object.freeze(
  Object.fromEntries(HEALTH_STANDINGS.map((standing) => [standing, 0])) as Record<
    HealthStanding,
    number
  >
)

const EMPTY_FAULTS: Readonly<Record<CollectionFault, number>> = Object.freeze(
  Object.fromEntries(COLLECTION_FAULTS.map((fault) => [fault, 0])) as Record<
    CollectionFault,
    number
  >
)

/**
 * One revision's row, with every fault it has rather than the first one found.
 *
 * A page with an old sender and a short window has two things to do and a
 * reading that stopped at the first would hide the second behind a fix.
 */
const healthOf = (
  reading: PageReading,
  door: RevisionPageViews | null,
  doubledRows: number
): PageHealth => {
  const doubled = reading.duplicated.length + doubledRows
  const faults: CollectionFault[] = []

  if (reading.views > 0 && door === null) faults.push("door-unscaled")
  if (door !== null && door.opened === 0 && (door.appearances > 0 || reading.views > 0)) {
    faults.push("openings-unmarked")
  }
  if (door !== null && door.inflation !== null && door.inflation > COUNTS_INFLATED_ABOVE) {
    faults.push("counts-inflated")
  }
  if (pageActionOf(reading).unwalked) faults.push("actions-uncredited")
  if (reading.orphaned.length > 0 || doubled > 0) faults.push("rows-mishandled")

  const standing: HealthStanding =
    faults.length > 0
      ? "faulted"
      : reading.views > 0
        ? "sound"
        : door !== null && door.opened > 0
          ? "unfolded"
          : "unmeasured"

  return {
    treeId: reading.treeId,
    revision: reading.revision,
    standing,
    faults,
    views: reading.views,
    arrivals: door?.opened ?? null,
    appearances: door?.appearances ?? null,
    inflation: door?.inflation ?? null,
    pending: door?.pending ?? 0,
    orphaned: reading.orphaned.length,
    doubled,
  }
}

/**
 * The worse of two faulted pages, which is the ranking rule spelled once.
 *
 * By arrivals before the view floor, because the arrivals are the readers and
 * the floor is only what is left to order by when two pages cost the same.
 */
const worseOf = (one: PageHealth, other: PageHealth): number =>
  (other.arrivals ?? 0) - (one.arrivals ?? 0) ||
  other.views - one.views ||
  one.treeId.localeCompare(other.treeId) ||
  other.revision - one.revision

/** Tree id, then newest revision first, which is the order the door rows are read in. */
const byPage = (one: PageHealth, other: PageHealth): number =>
  one.treeId.localeCompare(other.treeId) || other.revision - one.revision

/**
 * What a deployment is collecting, read off the page readings and the door rows
 * it already has.
 *
 * Takes the readings rather than the counters, as every derived reading here
 * does: the join to the tree is what makes an orphaned counter and an uncredited
 * action visible at all, and deriving it twice is how two screens come to
 * disagree. A caller with counters and trees reads the parts, then this.
 *
 * The rows are the whole window of door rows a deployment holds, not one page's
 * — each revision's own row is picked out of them by the published rule (0219),
 * so no caller writes the matching itself.
 */
export const collectionHealthOf = (
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[]
): CollectionHealth => {
  const seen = new Set<string>()
  const pages: PageHealth[] = []
  let duplicated = 0

  for (const reading of readings) {
    const key = `${reading.treeId}\u0000${reading.revision}`

    if (seen.has(key)) {
      duplicated += 1
      continue
    }

    seen.add(key)

    const door = pageViewsFor(reading, rows)

    pages.push(healthOf(reading, door.measured, door.duplicated))
  }

  const standings = { ...EMPTY_STANDINGS }
  const faults = { ...EMPTY_FAULTS }

  for (const page of pages) {
    standings[page.standing] += 1

    for (const fault of page.faults) faults[fault] += 1
  }

  const faulted = pages
    .filter((page) => page.standing === "faulted" && page.arrivals !== null)
    .sort(worseOf)

  return {
    pages: [...pages].sort(byPage),
    faulted,
    unpriced: pages
      .filter((page) => page.standing === "faulted" && page.arrivals === null)
      .sort(byPage),
    worst: faulted[0] ?? null,
    standings,
    faults,
    readersAffected: faulted.reduce((sum, page) => sum + (page.arrivals ?? 0), 0),
    arrivals: pages.reduce((sum, page) => sum + (page.arrivals ?? 0), 0),
    pending: pages.reduce((sum, page) => sum + page.pending, 0),
    trees: new Set(pages.map((page) => page.treeId)).size,
    duplicated,
  }
}
