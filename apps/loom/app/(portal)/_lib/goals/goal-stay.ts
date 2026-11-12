import {
  describePartPaceSilence,
  partPaceOf,
  type KindPaceSilence,
  type PageReading,
  type PaceStanding,
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
 */

export type GoalStay =
  | {
      readonly kind: "read"
      /** Time on screen per page view that reached the part, in milliseconds. */
      readonly spentMs: number
      /** The verdict on that time against what the part's words take (0230). */
      readonly standing: PaceStanding
    }
  | { readonly kind: "silent"; readonly silence: KindPaceSilence }

/** The readings a goal covers: the pages it names, or all of them. */
const coveredBy = (
  goal: Pick<Goal, "pages">,
  readings: readonly PageReading[]
): readonly PageReading[] => {
  if (goal.pages === null) return readings

  const named = new Set<string>(goal.pages)

  return readings.filter((reading) => named.has(reading.treeId))
}

/** How long readers stay on one goal's part, or why that cannot be said. */
export const goalStayOf = (
  goal: Pick<Goal, "nodeId" | "pages">,
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[]
): GoalStay => {
  const pace = partPaceOf(goal.nodeId, coveredBy(goal, readings), rows)

  /** `spentMs` is `null` exactly under a silence (0381); the fallback only satisfies the types. */
  if (pace.silence !== null || pace.spentMs === null) {
    return { kind: "silent", silence: pace.silence ?? "unread" }
  }

  return { kind: "read", spentMs: pace.spentMs, standing: pace.standing }
}

const secondsOf = (ms: number): string => {
  const value = Math.round(ms / 100) / 10

  return value === 1 ? "1 second" : `${value.toLocaleString("en-GB")} seconds`
}

/** *Readers who reached it kept it on screen for 4.5 seconds on average*, or why not. */
export const goalStaySentence = (stay: GoalStay): string => {
  if (stay.kind === "read") {
    return `Readers who reached it kept it on screen for ${secondsOf(stay.spentMs)} on average.`
  }

  const why = describePartPaceSilence(stay.silence)

  return `No time on screen to show: ${why}.`
}
