import { UNATTRIBUTED_POLICY_ID } from "@loom/runtime"
import type { CalibrationScore, UnjudgedReason } from "@loom/runtime/telemetry"

import type { OutcomeTone } from "./outcome"

/**
 * A calibration report, as something a page can render.
 *
 * The same shape and reason as `episode-view.ts`: the portal decides once what a
 * number means, in a pure function a test can cover without a database. The
 * report's `null`s are the interesting part — an empty bucket has no rate, and a
 * page that printed `0%` there would be inventing a finding out of a sample size
 * of nothing.
 */

/** An empty cell reads as absent, not as zero. */
export const NO_VALUE = "—"

export const formatRate = (value: number | null): string =>
  value === null ? NO_VALUE : `${Math.round(value * 100)}%`

export const formatRange = (lower: number, upper: number, isLast: boolean): string =>
  `${formatRate(lower)}${isLast ? "–" : "–<"}${formatRate(upper)}`

export type GapReading = {
  readonly tone: OutcomeTone
  readonly label: string
  readonly detail: string
}

/**
 * How far apart the claim and the outcome sat, in words.
 *
 * The band is deliberately wide. With the samples an alpha produces, a few
 * points either way is noise, and a page that called it overconfidence would be
 * reporting the sample size rather than the model.
 */
const GAP_TOLERANCE = 0.1

export const readGap = (score: CalibrationScore): GapReading => {
  if (score.gap === null) {
    return {
      tone: "inapplicable",
      label: "nothing judged",
      detail: "No claim in this window has been answered either way.",
    }
  }

  if (Math.abs(score.gap) <= GAP_TOLERANCE) {
    return {
      tone: "applied",
      label: "on the mark",
      detail: "What the model claimed and what survived agree, within noise.",
    }
  }

  return score.gap > 0
    ? {
        tone: "rejected",
        label: "claimed more than it delivered",
        detail: "Confidence ran ahead of outcomes in this window.",
      }
    : {
        tone: "awaiting",
        label: "delivered more than it claimed",
        detail: "Changes survived more often than the model said they would.",
      }
}

/**
 * Which gate judged a set of claims, in words a reader can act on.
 *
 * The two unknowns stay apart, because the reader's next move differs. A page
 * that never saw the judgment is fixed by widening the window; a judgment that
 * never named its policy is a record written before the Gate wrote one down, and
 * no amount of scrolling will produce it.
 */
export const describePolicy = (policyId: string | null): string => {
  if (policyId === null) return "judged before this page begins"
  if (policyId === UNATTRIBUTED_POLICY_ID) return "judged before policies were named"

  return policyId
}

export const UNJUDGED_LABELS: Readonly<Record<UnjudgedReason, string>> = {
  "awaiting-answer": "waiting on a human",
  failed: "broke mid-flight",
  unsettled: "unfinished in this window",
}
