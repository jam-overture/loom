import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

import { pageViewsFor, type RevisionPageViews, type StoredPageViews } from "./page-views.js"
import type { ReadingProgress, ReadingStop } from "./progress.js"

/**
 * Which of a deployment's pages to fix first.
 *
 * Every reading in this subsystem answers about one revision of one page: where
 * its reading stops, how much of what it says gets read, whether a change made
 * room to read it. A deployment has forty of them, and nothing until now could
 * put them in an order — so the first question anybody opening a portal asks,
 * *where is the problem*, was the one question the counters could not be asked.
 *
 * This is that order, taken off the readings a deployment already has and
 * nothing else: no payload, no browser change, no counter that does not exist,
 * no column and no byte on any wire.
 *
 * ## A count is comparable across two pages only once the door has scaled it
 *
 * Inside one page a fall is reported as a ratio of two counts off the same rows,
 * and the over-count in a distinct view count very nearly divides out: a reader
 * who straddled a rollup window straddled it for the whole page
 * ([0221](../../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)).
 *
 * **Across two pages it does not divide out, because the straddle rate is each
 * page's own.** A page readers linger on for twenty minutes, against a rollup
 * window of five, posts its batches into four windows and has every distinct
 * count against it inflated roughly fourfold; a page read in ninety seconds
 * does not. Ranking the raw losses therefore ranks partly by how long readers
 * stay, which is not the question anybody asked.
 *
 * So the ranking key is the loss put **on the scale the door counts in**:
 * `lost ÷ (1 + inflation)`, where the inflation is that page's own
 * `drift ÷ opened` off that page's own door row. The rule for picking the right
 * row is published beside the counter it is a rule about and is reused here
 * rather than written a second time
 * ([0219](../../decisions/0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)).
 *
 * The figure that comes out is not a count of people and is deliberately not
 * rounded into one. It is a loss stated at the door's scale, which is what makes
 * two pages' losses the same kind of number.
 *
 * ## A page the door cannot scale is not ranked against one it can
 *
 * A page can be perfectly well measured and still have no place in the order:
 * its counters are full of readers and its door row is missing, expired, or
 * predates the column. Mixing its unscaled loss in with scaled ones would put it
 * in the order at the wrong height, and there is no direction that is the safe
 * one — a long-dwell page would be over-ranked and a quick one under-ranked.
 *
 * So it is reported out of the order rather than in it, with the standing saying
 * which of four reasons applies. That is the same refusal a region map makes
 * about a bucket it may not publish: the figure a surface could misread is one
 * the function never offers.
 *
 * ## What is deliberately not published
 *
 * **No deployment-wide loss.** The artefact is an order and not a sum. Two
 * revisions of one tree are two live versions of one page and both belong in the
 * order, so anything that added their losses would count one page's problem
 * twice — and a count that has been added cannot be unadded
 * ([0158](../../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
 * A ranking cannot double-count, because nothing in it is added: the only error
 * available to it is one page standing in it twice, and that is the one thing
 * deduplicated here.
 *
 * The one figure that is added is `arrivals`, and it is addable for the reason
 * every other counter here is not: a page view began on exactly one revision of
 * exactly one tree, was counted once at the door, and is never recounted.
 *
 * Pure, linear in the pages times the rows, and reaches no store, clock or DOM.
 */

/** A reason a page has no place in the order. */
export type DeploymentSilence =
  /**
   * The window's counters report no view of this revision.
   *
   * There is no fall to rank because there was no reading, and this is checked
   * before the door is, so a page nobody opened is not reported as a page the
   * door could not scale.
   */
  | "unread"
  /**
   * There is no page-view row at the door for this revision, so its loss cannot
   * be put on the same scale as another page's.
   *
   * Not a page that was not measured. Its own reading is as good as any other's
   * and every figure inside it stands; what is missing is the one number that
   * makes two pages comparable.
   */
  | "unscaled"
  /**
   * The door row is there and nothing in it says a page view ever began.
   *
   * Either nobody has read this revision, or the senders are not marking their
   * openings — which the page-view reading publishes both numbers for, so the
   * diagnosis is a subtraction a surface can make.
   */
  | "unopened"
  /**
   * It reports more readers lost at one fall than the door has ever seen
   * appear, which no rollup produces.
   *
   * A reading assembled by hand or by a sender that is not one. The scaled
   * figure is withheld because it is the one the disagreement makes absurd, and
   * the fall it was taken from is published so the disagreement can be seen.
   */
  | "inconsistent"

export const DEPLOYMENT_SILENCES: readonly DeploymentSilence[] =
  everyMemberOf<DeploymentSilence>()(["unread", "unscaled", "unopened", "inconsistent"])

/** Where one page stands in the order, or why it is not in it. */
export type RankStanding =
  /** In the order, with a fall and a scale for it. */
  | "ranked"
  /**
   * Read, scalable, and losing nobody anywhere on the page.
   *
   * The cheerful answer, and a thin window can produce it as well: a revision
   * two readers saw through to the end has no fall in it either. `views` is what
   * tells the two apart and it travels with the row.
   */
  | "unbroken"
  | DeploymentSilence

export const RANK_STANDINGS: readonly RankStanding[] = everyMemberOf<RankStanding>()([
  "ranked",
  "unbroken",
  "unread",
  "unscaled",
  "unopened",
  "inconsistent",
])

/** One line per standing, for a surface naming why a page is where it is. */
export const describeRankStanding = (standing: RankStanding): string => {
  switch (standing) {
    case "ranked":
      return "in the order, by the readers it loses at its sharpest fall"
    case "unbroken":
      return "read, and losing nobody anywhere on the page"
    case "unread":
      return "nothing reported a view of this version in the window"
    case "unscaled":
      return "no page views counted at the door, so its loss is not comparable with another page's"
    case "unopened":
      return "the page-view row is there and nothing has said a page view began"
    case "inconsistent":
      return "it loses more readers at one fall than have ever appeared"
  }
}

/** One revision of one page, as the order has it. */
export type RankedPage = {
  readonly treeId: TreeId
  readonly revision: number
  readonly standing: RankStanding
  /**
   * The window's view floor, carried through from the reading unchanged.
   *
   * A floor and not a count, which is why it is never the denominator of
   * anything here.
   */
  readonly views: number
  /**
   * Page views counted at the door, exact, or `null` where this revision has no
   * row.
   *
   * The weight behind the row: *three hundred and forty of twelve hundred
   * readers*, where the second number is this and the first is scaled to it.
   */
  readonly opened: number | null
  /** This page's own straddle rate, which is what scales its loss. */
  readonly inflation: number | null
  /** The sharpest fall on the page, where it has one. */
  readonly at: ReadingStop | null
  /** Readers lost at that fall, as the window's counters have it. */
  readonly lost: number | null
  /**
   * The same loss on the door's scale, which is the key the order is on.
   *
   * Not a count of people and not rounded into one. Withheld where the page has
   * no fall, no reading, or no row to scale it by.
   */
  readonly readers: number | null
  /**
   * The fall as a share of the readers who reached the part before it, carried
   * through unchanged.
   *
   * Sound without any correction, because both of its counts come off the same
   * rows — so it is published even for a page whose scaled figure is withheld
   * as inconsistent.
   */
  readonly share: number | null
}

/** A deployment's pages, in the order they should be looked at. */
export type DeploymentReading = {
  /**
   * Every page with a fall and a scale for it, worst first.
   *
   * Most readers lost at the door's scale, then the larger share, then by tree
   * id and newest revision first — so two pages that lose the same do not
   * reorder on a refresh.
   */
  readonly ranked: readonly RankedPage[]
  /** Every other page, by tree id and newest revision first. */
  readonly unranked: readonly RankedPage[]
  /** The head of the order, which is the page to fix first. */
  readonly worst: RankedPage | null
  /** How many pages stand in each state, over the ranked and the unranked alike. */
  readonly standings: Readonly<Record<RankStanding, number>>
  /**
   * Distinct trees across every page read, which is not the number of pages.
   *
   * Two revisions of one tree are two live versions of one page, and both are
   * in the order rather than one replacing the other: a revision shipped an
   * hour ago with four readers on it does not supersede the one that nine
   * thousand read.
   */
  readonly trees: number
  /**
   * Page views counted at the door across the pages handed in, added.
   *
   * Exact and addable, for the reason no other figure here is: a page view began
   * on one revision of one tree and was counted once. It is a weight rather than
   * a deployment total — this sees the pages its caller read, not the
   * deployment's.
   */
  readonly arrivals: number
  /**
   * Readings of a revision beyond the first, which were dropped.
   *
   * A caller that concatenated two reads holds one page twice, and a page twice
   * in an order is the one way an order can lie about how much there is to fix.
   */
  readonly duplicated: number
  /**
   * Door rows for one revision beyond the first, which were ignored.
   *
   * A store keeps one row per revision, so this is a caller's two reads again —
   * and adding them would double a page's arrivals and halve its scaled loss.
   */
  readonly duplicatedRows: number
}

const EMPTY_STANDINGS: Readonly<Record<RankStanding, number>> = Object.freeze(
  Object.fromEntries(RANK_STANDINGS.map((standing) => [standing, 0])) as Record<
    RankStanding,
    number
  >
)

/**
 * One page's row, with the four reasons tried in the order they have to be
 * tried in.
 *
 * `views` before the door, because *nobody read it* is a better answer than
 * *its readers could not be scaled*. The door before the fall, because a page
 * with no scale has nothing to put its fall on. And the disagreement last,
 * because it is a statement about a fall and a row together.
 */
const rowOf = (page: ReadingProgress, door: RevisionPageViews | null): RankedPage => {
  const where = {
    treeId: page.treeId,
    revision: page.revision,
    views: page.views,
    opened: door?.opened ?? null,
    inflation: door?.inflation ?? null,
  }
  const nothing = { at: null, lost: null, readers: null, share: null }

  if (page.views === 0) return { ...where, ...nothing, standing: "unread" }
  if (door === null) return { ...where, ...nothing, standing: "unscaled" }

  /**
   * A null inflation is exactly an opened of nought — the page-view reading
   * withholds the fraction rather than dividing by nothing — so the check is
   * written on the figure the scale needs and not on the count behind it.
   */
  if (door.inflation === null) return { ...where, ...nothing, standing: "unopened" }

  const at = page.steepest

  if (at === null) return { ...where, ...nothing, standing: "unbroken" }

  if (at.lost > door.appearances) {
    return { ...where, standing: "inconsistent", at, lost: at.lost, readers: null, share: at.share }
  }

  return {
    ...where,
    standing: "ranked",
    at,
    lost: at.lost,
    readers: at.lost / (1 + door.inflation),
    share: at.share,
  }
}

/**
 * The worse of two, which is the ranking rule spelled once.
 *
 * By readers lost before share, for the reason a single page ranks its own falls
 * that way: a page two readers out of three abandoned is a worse rate and a
 * smaller problem than one four hundred out of a thousand left.
 */
const worseOf = (one: RankedPage, other: RankedPage): number =>
  (other.readers ?? 0) - (one.readers ?? 0) ||
  (other.share ?? 0) - (one.share ?? 0) ||
  one.treeId.localeCompare(other.treeId) ||
  other.revision - one.revision

/** Tree id, then newest revision first, which is the order the page-view rows are read in. */
const byPage = (one: RankedPage, other: RankedPage): number =>
  one.treeId.localeCompare(other.treeId) || other.revision - one.revision

/**
 * A deployment's pages, in the order they should be looked at.
 *
 * Takes the readings rather than the counters, for the reason every derived
 * reading in this subsystem does: the falls and the standings are what this is
 * made of, and deriving them twice is how two screens come to disagree. A
 * caller with counters and trees reads the parts, then the progress, then this.
 *
 * The rows are the whole window of page-view rows a deployment holds, not one
 * page's — each page's own row is picked out of them by the published rule, so
 * no caller writes the matching itself.
 */
export const deploymentReadingOf = (
  pages: readonly ReadingProgress[],
  rows: readonly StoredPageViews[]
): DeploymentReading => {
  const seen = new Set<string>()
  const read: RankedPage[] = []
  let duplicated = 0
  let duplicatedRows = 0

  for (const page of pages) {
    const key = `${page.treeId}\u0000${page.revision}`

    if (seen.has(key)) {
      duplicated += 1
      continue
    }

    seen.add(key)

    const door = pageViewsFor(page, rows)

    duplicatedRows += door.duplicated
    read.push(rowOf(page, door.measured))
  }

  const ranked = read.filter((row) => row.standing === "ranked").sort(worseOf)
  const standings = { ...EMPTY_STANDINGS }

  for (const row of read) standings[row.standing] += 1

  return {
    ranked,
    unranked: read.filter((row) => row.standing !== "ranked").sort(byPage),
    worst: ranked[0] ?? null,
    standings,
    trees: new Set(read.map((row) => row.treeId)).size,
    arrivals: read.reduce((sum, row) => sum + (row.opened ?? 0), 0),
    duplicated,
    duplicatedRows,
  }
}
