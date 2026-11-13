import {
  describePartPaceSilence,
  partPaceOf,
  type KindPaceSilence,
  type PageReading,
  type PaceStanding,
  type PartPace,
  type StoredPageViews,
} from "@jam-overture/loom/signals"

import type { Goal } from "./goal"

/**
 * **How long readers stay on a goal's part**, for the *Goals* list (8b of
 * `docs/portal.md`, *3 · Goals* of the wireframes), read with `partPaceOf`
 * (0381) from the counters the deployment already keeps. Pure.
 *
 * It is the time the typical reader who reached the part had it on screen,
 * pooled across the pages the goal covers, each page's readers on its own
 * door's scale. It is **not** the wireframe's *Stays on it* goal kind, which
 * counts readers who stayed past a threshold: 0350 left that kind unoffered
 * because an average above a threshold can be one open tab, and nothing here
 * changes that.
 *
 * **A silence is said, never drawn as a nought** (0381): *nobody was seen on
 * it* and *they had no time on it* are two answers, and only the second is a
 * number.
 *
 * Which pages: the ones the goal names, or every page handed in for a goal on
 * all pages with the part. A reading without the part costs nothing but a
 * count inside `partPaceOf`, so there is no need to narrow further here.
 *
 * **Which page it is skimmed on** (0390) rides beside the pooled figure: the
 * pages whose own verdict is *skimmed*, in `partPaceOf`'s order, which ranks
 * them on the reading time their readers did not have. Two things are never
 * done with those rows, both written on the fields they come from: their
 * shortfalls are not added up (a page readers lingered on pays for one they
 * skimmed in the pooled figure, so the rows sum to more than it), and a row's
 * pace is not held against a threshold; its `standing` is the verdict.
 */

/** One page a goal's part is skimmed on, with that page's own shortfall. */
export type SkimmedPage = {
  readonly treeId: string
  /** The reading time the page's readers did not have between them, in milliseconds. */
  readonly shortMs: number
}

/** Where a goal's part is skimmed, out of the pages it is counted on. */
export type GoalSkims = {
  /** Distinct pages the part is counted on: the *of* in *skimmed on two of five*. */
  readonly counted: number
  /** The skimmed pages, the one short of the most reading time first. */
  readonly skimmed: readonly SkimmedPage[]
}

export type GoalStay = (
  | {
      readonly kind: "read"
      /** Time on screen per page view that reached the part, in milliseconds. */
      readonly spentMs: number
      /** The verdict on that time against what the part's words take (0230). */
      readonly standing: PaceStanding
    }
  | { readonly kind: "silent"; readonly silence: KindPaceSilence }
) & { readonly skims: GoalSkims }

/** The readings a goal covers: the pages it names, or all of them. */
const coveredBy = (
  goal: Pick<Goal, "pages">,
  readings: readonly PageReading[]
): readonly PageReading[] => {
  if (goal.pages === null) return readings

  const named = new Set<string>(goal.pages)

  return readings.filter((reading) => named.has(reading.treeId))
}

/**
 * The skimmed pages among `ranked`, keeping its order. A tree is named once,
 * at its first and so costliest revision, since a page is what a person goes
 * and fixes; the readings *Goals* hands in hold one revision a page anyway.
 */
const skimsOf = (ranked: PartPace["ranked"]): GoalSkims => {
  const trees = [...new Set(ranked.map((place) => place.treeId))]
  const skimmed = ranked.filter((place) => place.standing === "skimmed")
  const named = skimmed.filter(
    (place, index) => skimmed.findIndex((other) => other.treeId === place.treeId) === index
  )

  return {
    counted: trees.length,
    skimmed: named.map(({ treeId, shortMs }) => ({ treeId, shortMs })),
  }
}

/** How long readers stay on one goal's part, or why that cannot be said, and where it is skimmed. */
export const goalStayOf = (
  goal: Pick<Goal, "nodeId" | "pages">,
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[]
): GoalStay => {
  const pace = partPaceOf(goal.nodeId, coveredBy(goal, readings), rows)
  const skims = skimsOf(pace.ranked)

  /** `spentMs` is `null` exactly under a silence (0381); the fallback only satisfies the types. */
  if (pace.silence !== null || pace.spentMs === null) {
    return { kind: "silent", silence: pace.silence ?? "unread", skims }
  }

  return { kind: "read", spentMs: pace.spentMs, standing: pace.standing, skims }
}

const secondsOf = (ms: number): string => {
  const value = Math.round(ms / 100) / 10

  return value === 1 ? "1 second" : `${value.toLocaleString("en-GB")} seconds`
}

/** A shortfall between many readers, in the largest unit that keeps it readable. */
const durationOf = (ms: number): string => {
  const minutes = Math.round(ms / 60_000)

  if (minutes < 1) return secondsOf(ms)
  if (minutes < 120) return minutes === 1 ? "1 minute" : `${minutes} minutes`

  return `${Math.round(minutes / 60).toLocaleString("en-GB")} hours`
}

/** *a*, *a and b*, *a, b and c*. */
const listOf = (names: readonly string[]): string =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`

/** How many skimmed pages are named before the rest are counted. */
const NAMED_AT_MOST = 3

/**
 * *Skimmed on 2 of the 5 pages it is counted on: “Pricing” and “Tour”. Start
 * with “Pricing”: its readers were short of 26 minutes between them.* `undefined`
 * where it is skimmed on none, since the pooled verdict has then said all
 * there is. The shortfall named is one page's own, never a total of the rows.
 */
export const goalSkimSentence = (
  skims: GoalSkims,
  nameOf: (treeId: string) => string
): string | undefined => {
  const [first, ...rest] = skims.skimmed

  if (first === undefined) return undefined

  /** Quoted, since a page's name is its own heading and can read as part of the sentence. */
  const quoted = (treeId: string) => `“${nameOf(treeId)}”`
  const shown = skims.skimmed.slice(0, NAMED_AT_MOST).map(({ treeId }) => quoted(treeId))
  const unnamed = skims.skimmed.length - shown.length
  const names = unnamed > 0 ? `${shown.join(", ")} and ${unnamed} more` : listOf(shown)
  const where =
    skims.counted > 1
      ? `Skimmed on ${skims.skimmed.length} of the ${skims.counted} pages it is counted on: ${names}.`
      : `Skimmed on ${names}.`
  const short = durationOf(first.shortMs)

  return rest.length === 0
    ? `${where} Its readers there were short of ${short} between them.`
    : `${where} Start with ${quoted(first.treeId)}: its readers were short of ${short} between them.`
}

/** *Readers who reached it kept it on screen for 4.5 seconds on average*, or why not. */
export const goalStaySentence = (stay: GoalStay): string => {
  if (stay.kind === "read") {
    return `Readers who reached it kept it on screen for ${secondsOf(stay.spentMs)} on average.`
  }

  const why = describePartPaceSilence(stay.silence)

  return `No time on screen to show: ${why}.`
}
