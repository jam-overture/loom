import { plainMoment } from "../when"
import type { GoalKind, GoalTarget, PartsByPage } from "./goal"
import { pagesCoveredBy, readingSentence, type GoalReading } from "./goal-view"

/**
 * The *New goal* drawer's preview (`docs/portal-wireframes.md`, *3 · Goals*:
 * *a green band previewing what it would have counted over the last 7 days*).
 * Pure, and free of the counters' own module, because the form works it out
 * in the browser as the owner picks a kind, a part and the pages.
 *
 * The screen folds the project's hourly counters over the last 7 days into
 * totals once (`rangeTotalsOf`), page views by page and what readers did by
 * page and part; the preview adds up the ones a goal would cover, by the rule
 * a saved goal is measured by (`pagesCoveredBy`, 0350), so the band and the
 * goal's *Last 7 days* on the list agree the moment it is saved.
 */

/** What readers did to one part of one page over the range, in each kind a goal counts. */
export type PartTotal = {
  readonly treeId: string
  readonly nodeId: string
  readonly counts: Readonly<Record<GoalKind, number>>
}

/** Page views one page had over the range. */
export type PageTotal = {
  readonly treeId: string
  readonly views: number
}

export type RangeTotals =
  /** The hourly counters did not answer. */
  | { readonly kind: "unreadable" }
  /** Nothing was counted by the hour before the range ended. */
  | { readonly kind: "uncounted" }
  | {
      readonly kind: "read"
      /** Where the totals start: the range's start, or where counting began inside it. */
      readonly from: number
      /** Whether counting began inside the range. */
      readonly clipped: boolean
      readonly pages: readonly PageTotal[]
      readonly parts: readonly PartTotal[]
    }

/** What a goal on this target would have counted over the totals' range, on the pages it would cover. */
export const previewOf = (
  target: GoalTarget,
  totals: Extract<RangeTotals, { kind: "read" }>,
  parts: PartsByPage
): GoalReading => {
  const covered = pagesCoveredBy(target, parts, totals.parts)

  return {
    count: totals.parts
      .filter((row) => row.nodeId === target.nodeId && covered.has(row.treeId))
      .reduce((sum, row) => sum + row.counts[target.kind], 0),
    pageViews: totals.pages
      .filter((row) => covered.has(row.treeId))
      .reduce((sum, row) => sum + row.views, 0),
  }
}

export type Preview = {
  /** `counted` is drawn as the wireframe's green band; the rest say why there is no figure. */
  readonly tone: "counted" | "waiting"
  readonly sentence: string
}

/**
 * The band's words: what the goal would have counted, or what it waits on. A
 * target still missing a part or its pages is `undefined`.
 */
export const previewWordsOf = (
  target: GoalTarget | undefined,
  totals: RangeTotals,
  parts: PartsByPage
): Preview => {
  if (totals.kind === "unreadable") {
    return {
      tone: "waiting",
      sentence: "What it would have counted over the last 7 days cannot be read just now.",
    }
  }

  if (totals.kind === "uncounted") {
    return {
      tone: "waiting",
      sentence: "Nothing has been counted by the hour yet, so there is no week to preview.",
    }
  }

  if (target === undefined) {
    return {
      tone: "waiting",
      sentence:
        "Choose the part, and this says what the goal would have counted over the last 7 days.",
    }
  }

  const reading = previewOf(target, totals, parts)
  const clipped = totals.clipped
    ? ` Counted by the hour from ${plainMoment(new Date(totals.from).toISOString())}.`
    : ""

  return reading.pageViews === 0
    ? {
        tone: "waiting",
        sentence: `No page views in the last 7 days on the pages it would cover.${clipped}`,
      }
    : {
        tone: "counted",
        sentence: `Over the last 7 days it would have counted ${readingSentence(target.kind, reading)}${clipped}`,
      }
}
