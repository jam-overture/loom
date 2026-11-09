import { z } from "zod"

import type { StoredPageViews, StoredTally } from "@jam-overture/loom/signals"
import type { HeldProposal } from "@jam-overture/loom/write"

import type { PublishedPage } from "@/app/_lib/pages/published"

import { goalRangeOf, type GoalRange } from "./goal-range"
import { primaryFirst, type Goal, type GoalKind } from "./goals/goal"
import {
  goalReadingsByPage,
  pageChoicesOf,
  partsByPageOf,
  type GoalCounts,
  type GoalReading,
} from "./goals/goal-view"
import { pageNameOf } from "./page-name"
import { pageRangeOf, type KindCounts, type PageHourly } from "./page-range"
import { namesInTree, type PartName } from "./part-name"
import { pageOfCopy, type PageCopy } from "./proposing/copies"
import { SIGNAL_KINDS } from "./vocabulary"

/**
 * *Signals · By page* (8a of `docs/portal.md`): one row per page, read off the
 * tallies this deployment already keeps, and the drawer that opens on one of
 * them.
 *
 * The list's figures are durable counters (`docs/signals.md` rule 5), added up
 * across every version and audience since the page was first counted, because
 * the tallies keep no time. **The drawer reads the range** the screen is read
 * over as well, from the hourly counters (0356, 0362, `page-range.ts`): what
 * readers did on the page and each goal's rate with its change on the period
 * before. Time on a part is not counted by the hour, so it stays since
 * counting began, and so do the figures beside every range, said as such.
 *
 * **Goals are measured here exactly as on *Goals*** (0350), one page at a
 * time: a goal's rate on a page is its count on the page over that page's
 * page views, and a page the goal does not cover has no rate for it at all.
 */

/** Rows a page of the list holds, the wireframes' 50. */
export const BY_PAGE_SIZE = 50

/** One part of a page, named from what the site published, by its id otherwise. */
export type NamedPart = {
  readonly nodeId: string
  /** `undefined` where the site has not published a tree that holds the part. */
  readonly name: string | undefined
}

export type PressedPart = NamedPart & { readonly presses: number }

/** One goal as measured on one page. */
export type GoalOnPage = {
  readonly goalId: string
  readonly name: string
  readonly kind: GoalKind
  readonly primary: boolean
  readonly reading: GoalReading
}

export type ByPageRow = {
  readonly treeId: string
  /** The heading the published page gives it, `undefined` where it published none. */
  readonly name: string | undefined
  /**
   * Whether the site has published the page, which is what gives it screens of
   * its own under *Pages*. Readers can be counted on a page before its site
   * publishes it, and such a page has nothing there to open.
   */
  readonly published: boolean
  /** The version the site last published, else the newest version readers were counted on. */
  readonly liveVersion: number
  /** Page views that began on any version of it (0219). */
  readonly opened: number
  /** When any of its page-view rows last moved, which is the order the list keeps. */
  readonly lastMoved: string
  /** The part with the most presses, `undefined` where nothing on it was pressed. */
  readonly mostPressed: PressedPart | undefined
  /** Changes waiting on a person for this page, `undefined` where they could not be read. */
  readonly waiting: number | undefined
  /**
   * The primary goal on this page, `undefined` where there is none, the goals
   * could not be read, or the primary goal does not cover this page.
   */
  readonly primaryGoal: GoalOnPage | undefined
}

/** What readers did on one page, as one bar per signal kind that counts occurrences. */
export type KindBar = {
  readonly label: string
  readonly meaning: string
  readonly technical: string
  readonly count: number
  /** Its length against the longest bar, from 0 to 1. */
  readonly share: number
}

/** The part readers kept on screen longest, on average over the page views that reached it. */
export type LongestLooked = NamedPart & { readonly seconds: number }

/** A goal on the page with its figure for the range, `undefined` where the hourly counters did not answer. */
export type GoalInDrawer = GoalOnPage & { readonly range: GoalRange | undefined }

/** The bars for the range, or why there are none. */
export type RangeBars =
  | { readonly kind: "unreadable" }
  | { readonly kind: "uncounted" }
  | {
      readonly kind: "read"
      readonly bars: readonly KindBar[]
      /** Where counting began inside the range, `undefined` where it began before. */
      readonly countedFrom: number | undefined
    }

export type PageDrawer = {
  readonly row: ByPageRow
  /** What readers did over the range, from the hourly counters. */
  readonly range: RangeBars
  /** What readers did since the page was first counted, from the tallies. */
  readonly bars: readonly KindBar[]
  /** The three parts pressed most, most first. Empty where nothing was pressed. */
  readonly pressed: readonly PressedPart[]
  readonly longest: LongestLooked | undefined
  /** Every goal covering the page, the primary first; `undefined` where goals could not be read. */
  readonly goals: readonly GoalInDrawer[] | undefined
}

export type ByPageReadings = {
  readonly pageViews: readonly StoredPageViews[]
  readonly tallies: readonly StoredTally[]
  readonly published: readonly PublishedPage[]
  /** `undefined` where the changes waiting could not be read. */
  readonly waiting: ReadonlyMap<string, number> | undefined
  /** `undefined` where the goals could not be read. */
  readonly goals: readonly Goal[] | undefined
}

/** The figures a page's drawer reads, which are the list's without the changes waiting. */
export type PageDrawerReadings = Omit<ByPageReadings, "waiting">

/** Each goal's readings by page, the primary goal first, measured once for the whole list. */
const goalsByPageOf = (
  goals: readonly Goal[],
  readings: PageDrawerReadings
): ((treeId: string) => readonly GoalOnPage[]) => {
  const counts: GoalCounts = {
    pageViews: readings.pageViews,
    tallies: readings.tallies,
    parts: partsByPageOf(pageChoicesOf(readings.published)),
  }
  const measured = primaryFirst(goals).map(
    (goal) => [goal, goalReadingsByPage(goal, counts)] as const
  )

  return (treeId) =>
    measured.flatMap(([goal, byPage]) => {
      const reading = byPage.get(treeId)

      return reading === undefined
        ? []
        : [
            {
              goalId: goal.goalId,
              name: goal.name,
              kind: goal.kind,
              primary: goal.primarySince !== null,
              reading,
            },
          ]
    })
}

/** Changes waiting on a person, by the page they would change rather than the copy they were made to. */
export const waitingByPage = (
  held: readonly HeldProposal[],
  copies: readonly PageCopy[]
): ReadonlyMap<string, number> =>
  held.reduce((counts, change) => {
    const page = pageOfCopy(copies, change.treeId)

    return new Map(counts).set(page, (counts.get(page) ?? 0) + 1)
  }, new Map<string, number>())

type PartTotals = {
  readonly presses: number
  readonly dwellMs: number
  readonly reached: number
}

const NO_PART: PartTotals = { presses: 0, dwellMs: 0, reached: 0 }

/** Every part of one page, its counters added across versions and audiences. */
const partsOf = (tallies: readonly StoredTally[]): ReadonlyMap<string, PartTotals> =>
  tallies.reduce((parts, tally) => {
    const held = parts.get(tally.nodeId) ?? NO_PART

    return new Map(parts).set(tally.nodeId, {
      presses: held.presses + tally.activations,
      dwellMs: held.dwellMs + tally.dwellMs,
      reached: held.reached + tally.reached,
    })
  }, new Map<string, PartTotals>())

const partNamer =
  (names: ReadonlyMap<string, PartName>) =>
  (nodeId: string): NamedPart => ({ nodeId, name: names.get(nodeId)?.name })

/** Most first; a tie goes to the id, so the order does not move between two reads of the same rows. */
const pressedParts = (
  parts: ReadonlyMap<string, PartTotals>,
  named: (nodeId: string) => NamedPart
): readonly PressedPart[] =>
  [...parts.entries()]
    .filter(([, totals]) => totals.presses > 0)
    .sort(([a, x], [b, y]) => y.presses - x.presses || a.localeCompare(b))
    .map(([nodeId, totals]) => ({ ...named(nodeId), presses: totals.presses }))

const groupBy = <T>(
  rows: readonly T[],
  keyOf: (row: T) => string
): ReadonlyMap<string, readonly T[]> =>
  rows.reduce(
    (groups, row) => new Map(groups).set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), row]),
    new Map<string, readonly T[]>()
  )

const later = (a: string, b: string): string => (a >= b ? a : b)

/** Where a row sits in the list: when it last moved, then its id. */
type Position = readonly [lastMoved: string, treeId: string]

const positionOf = (row: ByPageRow): Position => [row.lastMoved, row.treeId]

/** Newest first; a tie goes to the id, which is what makes a cursor land on one row. */
const byPosition = (a: Position, b: Position): number =>
  b[0].localeCompare(a[0]) || a[1].localeCompare(b[1])

const newestFirst = (a: ByPageRow, b: ByPageRow): number => byPosition(positionOf(a), positionOf(b))

/**
 * One row per page readers were counted on, newest first.
 *
 * A page is listed only once a page view of it has been counted: a published
 * page nobody has opened is on *Pages*, and listing it here would be a row of
 * noughts on a screen that answers *what did readers do*.
 */
export const byPageRowsOf = (readings: ByPageReadings): readonly ByPageRow[] => {
  const { pageViews, tallies, published, waiting, goals } = readings
  const goalsOn = goalsByPageOf(goals ?? [], readings)
  const trees = new Map(published.map(({ tree }) => [tree.treeId as string, tree] as const))
  const talliesByPage = groupBy(tallies, (tally) => tally.treeId)

  return [...groupBy(pageViews, (row) => row.treeId).entries()]
    .map(([treeId, rows]): ByPageRow => {
      const tree = trees.get(treeId)
      const heading = tree === undefined ? undefined : pageNameOf(tree)
      const named = partNamer(tree === undefined ? new Map() : namesInTree(tree))

      return {
        treeId,
        name: heading?.derived === true ? heading.name : undefined,
        published: tree !== undefined,
        liveVersion: tree?.revision ?? Math.max(...rows.map((row) => row.revision)),
        opened: rows.reduce((sum, row) => sum + row.opened, 0),
        lastMoved: rows.map((row) => row.updatedAt).reduce(later),
        mostPressed: pressedParts(partsOf(talliesByPage.get(treeId) ?? []), named)[0],
        waiting: waiting === undefined ? undefined : (waiting.get(treeId) ?? 0),
        primaryGoal: goalsOn(treeId).find((goal) => goal.primary),
      }
    })
    .sort(newestFirst)
}

/**
 * Where a page of the list starts: the row it opens on, by when it last moved
 * and its id. Kept in the URL as `from`, so a link to the second page is the
 * second page, and a row that moves to the top between two reads does not
 * shift every row after it.
 */
const cursorSchema = z.tuple([z.string().min(1), z.string().min(1)])

export type ByPageCursor = z.infer<typeof cursorSchema>

export const cursorOf = (row: ByPageRow): string =>
  Buffer.from(JSON.stringify(positionOf(row))).toString("base64url")

/** `undefined` for anything that is not a cursor this screen wrote, which opens the first page. */
export const parseCursor = (from: string | undefined): ByPageCursor | undefined => {
  if (from === undefined) return undefined

  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(from, "base64url").toString()))

    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

export type ByPageList = {
  readonly rows: readonly ByPageRow[]
  /** 1-based, and 0 for an empty list. */
  readonly first: number
  readonly last: number
  readonly total: number
  /** The page before this one, `undefined` on the first. */
  readonly newer: string | undefined
  /** The page after this one, `undefined` on the last. */
  readonly older: string | undefined
}

/**
 * The page of rows that starts at the cursor: the first row at or after it in
 * the list's own order, so a cursor whose row has since moved still opens
 * where that row was.
 */
export const byPageListOf = (
  rows: readonly ByPageRow[],
  cursor: ByPageCursor | undefined,
  size: number = BY_PAGE_SIZE
): ByPageList => {
  const found =
    cursor === undefined ? 0 : rows.findIndex((row) => byPosition(cursor, positionOf(row)) <= 0)
  const start = found === -1 ? Math.max(rows.length - size, 0) : found
  const shown = rows.slice(start, start + size)
  const before = rows[Math.max(start - size, 0)]
  const after = rows[start + size]

  return {
    rows: shown,
    first: shown.length === 0 ? 0 : start + 1,
    last: start + shown.length,
    total: rows.length,
    newer: start === 0 || before === undefined ? undefined : cursorOf(before),
    older: after === undefined ? undefined : cursorOf(after),
  }
}

/** One bar per kind that counts things readers did, each against the longest. */
const barsOf = (counts: KindCounts): readonly KindBar[] => {
  const words = [
    { word: SIGNAL_KINDS.viewed, count: counts.viewed },
    { word: SIGNAL_KINDS.activated, count: counts.activated },
    { word: SIGNAL_KINDS.disclosed, count: counts.disclosed },
    { word: SIGNAL_KINDS.completed, count: counts.completed },
  ]
  const longestBar = Math.max(...words.map(({ count }) => count))

  return words.map(({ word, count }) => ({
    ...word,
    count,
    share: longestBar === 0 ? 0 : count / longestBar,
  }))
}

const rangeBarsOf = (hourly: PageHourly): RangeBars => {
  const range = pageRangeOf(hourly)

  return range.kind === "read"
    ? {
        kind: "read",
        bars: barsOf(range.counts),
        countedFrom: range.clipped ? range.from : undefined,
      }
    : range
}

/**
 * The drawer for one page: what readers did on it over the range and since it
 * was first counted, the parts they pressed most and the part they kept on
 * screen longest.
 *
 * The bars are the kinds that count things readers did, each in its own
 * unit (page views, presses, sections opened or closed, forms sent), so
 * their lengths say which happened most and nothing finer. Time on a part is
 * not a count and is said in seconds instead: the part with the longest
 * average over the page views that reached it, because a total would favour
 * whatever sits at the top of every page.
 *
 * Below them, every goal that covers the page, the primary first, with its
 * rate here over the range and the period before (on this page alone, so a
 * goal on several pages reads as it does on this one), and since counting
 * began.
 */
export const pageDrawerOf = (
  row: ByPageRow,
  readings: PageDrawerReadings,
  hourly: PageHourly
): PageDrawer => {
  const { tallies, published, goals } = readings
  const own = tallies.filter((tally) => tally.treeId === row.treeId)
  const tree = published.find((page) => page.tree.treeId === row.treeId)?.tree
  const named = partNamer(tree === undefined ? new Map() : namesInTree(tree))
  const parts = partsOf(own)
  const sum = (count: (tally: StoredTally) => number) =>
    own.reduce((total, tally) => total + count(tally), 0)

  const longest = [...parts.entries()]
    .filter(([, totals]) => totals.reached > 0 && totals.dwellMs > 0)
    .map(([nodeId, totals]) => ({
      nodeId,
      seconds: totals.dwellMs / totals.reached / 1000,
    }))
    .sort((a, b) => b.seconds - a.seconds || a.nodeId.localeCompare(b.nodeId))[0]

  const pageParts = partsByPageOf(pageChoicesOf(published))
  const goalRangeFor = (goalId: string): GoalRange | undefined => {
    const goal = goals?.find((each) => each.goalId === goalId)

    return goal === undefined || hourly.kind === "unreadable"
      ? undefined
      : goalRangeOf(goal, hourly.range, { ...hourly.counters, parts: pageParts })
  }

  return {
    row,
    range: rangeBarsOf(hourly),
    bars: barsOf({
      viewed: row.opened,
      activated: sum((tally) => tally.activations),
      disclosed: sum((tally) => tally.opens + tally.closes),
      completed: sum((tally) => tally.completions),
    }),
    pressed: pressedParts(parts, named).slice(0, 3),
    longest:
      longest === undefined
        ? undefined
        : {
            ...named(longest.nodeId),
            seconds: Math.round(longest.seconds * 10) / 10,
          },
    goals:
      goals === undefined
        ? undefined
        : goalsByPageOf(
            goals,
            readings
          )(row.treeId).map((goal) => ({
            ...goal,
            range: goalRangeFor(goal.goalId),
          })),
  }
}

/** The page the drawer is open on, `undefined` where the URL names none of the rows. */
export const openRowOf = (
  rows: readonly ByPageRow[],
  asked: string | undefined
): ByPageRow | undefined =>
  asked === undefined ? undefined : rows.find((row) => row.treeId === asked)
