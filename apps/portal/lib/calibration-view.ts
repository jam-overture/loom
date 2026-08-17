import { rulesetContinuityOf, UNATTRIBUTED_POLICY_ID } from "@loom/runtime"
import type {
  CalibrationReport,
  CalibrationScore,
  PolicyCalibration,
  UnjudgedReason,
} from "@loom/runtime/telemetry"

import type { MissCause } from "./calibration-misses"
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

/**
 * Whether a score's own reading is "these agree".
 *
 * Exported because a second component now asks the same question, and a second
 * copy of `0.1` would let the page call a band on the mark in one place and off
 * it in another — the disagreement being invisible precisely because both would
 * look right on their own.
 */
export const isOnTheMark = (score: CalibrationScore): boolean =>
  score.gap !== null && Math.abs(score.gap) <= GAP_TOLERANCE

export const readGap = (score: CalibrationScore): GapReading => {
  if (score.gap === null) {
    return {
      tone: "inapplicable",
      label: "nothing judged",
      detail: "No claim in this window has been answered either way.",
    }
  }

  if (isOnTheMark(score)) {
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

/**
 * What the fingerprints under one policy name say about that name (0048).
 *
 * Silent when there is nothing a reader would act on: one ruleset, all of it
 * recorded. A caveat printed on every row every day is a caveat nobody reads on
 * the day it matters, which is the same reason the breakdown itself is
 * conditional.
 */
export const readRuleset = (segment: PolicyCalibration): GapReading | null => {
  const continuity = rulesetContinuityOf(segment.fingerprints)
  const older =
    segment.unfingerprinted === 0
      ? ""
      : ` ${segment.unfingerprinted} of them were judged before rulesets were recorded, so they could have run on anything.`

  if (continuity === "changed") {
    return {
      tone: "rejected",
      label: "the rules changed under this name",
      detail: `${segment.fingerprints.length} different rulesets judged these claims while calling themselves "${segment.policyId ?? ""}", so this row pools gates that differ by more than their name.${older}`,
    }
  }

  if (continuity === "incomparable") {
    return {
      tone: "inapplicable",
      label: "judged under different versions of the policy",
      detail: `These claims were judged by policies with different sets of knobs — a Loom version changed between them — so whether the values were also edited cannot be read from here.${older}`,
    }
  }

  if (older === "") return null

  return {
    tone: "inapplicable",
    label: continuity === "unrecorded" ? "no ruleset recorded" : "partly recorded",
    detail: `This row is not shown to be one ruleset.${older}`,
  }
}

/**
 * Whether the page is pooling gates that should not be pooled — two names, or
 * one name that stopped meaning one thing. The second case is why this is not
 * simply a length check: a single segment whose rules changed mid-window is
 * exactly the failure the fingerprint exists to surface, and it produces one row.
 */
export const poolsMoreThanOneGate = (report: CalibrationReport): boolean =>
  report.byPolicy.length > 1 ||
  report.byPolicy.some((segment) => {
    const continuity = rulesetContinuityOf(segment.fingerprints)

    return continuity === "changed" || continuity === "incomparable"
  })

export const UNJUDGED_LABELS: Readonly<Record<UnjudgedReason, string>> = {
  "awaiting-answer": "waiting on a human",
  failed: "broke mid-flight",
  unsettled: "unfinished in this window",
}

/**
 * What kept catching a confident claim, in words that name a class of change.
 *
 * A reason code is the Gate's vocabulary and it is exactly right on a verdict,
 * where the reader is looking at one change and wants the rule. Grouped over a
 * window it is being asked a different question — *what does this model keep
 * being wrong about* — and `stakes-above-ceiling` repeated nine times does not
 * answer it. These do, which is why they are sentences about the model rather
 * than translations of the code.
 */
export const MISS_CAUSE_LABELS: Readonly<Record<MissCause, string>> = {
  "confidence-below-floor": "sure about a change the Gate would not take on trust",
  "stakes-at-refusal-floor": "sure about a change of a kind this policy never takes",
  irreversible: "sure about a change that could not be undone",
  "discards-later-work": "sure about a change that would have thrown away later work",
  "stakes-above-ceiling": "sure about a change too big to apply unattended",
  "confidence-below-minimum": "sure, and under the floor it had to clear anyway",
  "within-policy": "refused with nothing in the policy against it",
  "discarded-by-human": "sure, the Gate agreed, and a person said no",
  "survived-anyway": "hedged on a change that was fine",
}

/**
 * The reader's next move, which differs by cause and is the reason these are
 * grouped at all.
 *
 * The discard is the one worth reading twice. Every other row is the model
 * disagreeing with a rule the host wrote, and a host may reasonably conclude the
 * rule is right and the model should be less sure. A discard is the model and
 * the Gate agreeing with each other and both being overruled from outside, which
 * is the only signal here that no amount of policy tuning would have produced —
 * and 0031 says so in as many words.
 */
export const MISS_CAUSE_NOTES: Readonly<Record<MissCause, string>> = {
  "confidence-below-floor":
    "The Gate held these for a person. Either the claims are inflated for this class of change, or the floor is stricter than this host needs.",
  "stakes-at-refusal-floor":
    "This policy refuses this class outright, so no confidence would have carried them. The claim is measuring something the Gate never consults.",
  irreversible:
    "Reversibility is assessed from the delta, not claimed. A model confident about changes it cannot undo is confident about the wrong axis.",
  "discards-later-work":
    "These would have overwritten revisions that landed after the model read the tree (0035). The claim was made against a tree that had moved.",
  "stakes-above-ceiling":
    "Size, not correctness. These may well have been right — the policy declines to apply changes this large without a person, whatever the model thinks.",
  "confidence-below-minimum":
    "The claim was under the minimum and high enough to count as a miss here, which means the floor and this reading disagree about what counts as sure.",
  "within-policy":
    "Nothing in the policy refused these, so the refusal came from somewhere the disposition does not name. Worth reading the episodes directly.",
  "discarded-by-human":
    "The Gate was willing and a person was not. This is the only judgment here made from outside the system, and the only one no policy change would have produced.",
  "survived-anyway":
    "These cost a reviewer's attention rather than a wrong page: each one was held or hedged and turned out fine. A queue of them is how a review surface stops being read.",
}
