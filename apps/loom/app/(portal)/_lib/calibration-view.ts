import {
  checksContinuityOf,
  describeWiredChecks,
  rulesetContinuityOf,
  UNATTRIBUTED_POLICY_ID,
} from "@jam-overture/loom"
import type {
  CalibrationReport,
  CalibrationScore,
  PolicyCalibration,
  UnjudgedReason,
} from "@jam-overture/loom/telemetry"

import type { MissCause } from "./calibration-misses"
import type { OutcomeTone } from "./outcome"
import { namedList } from "./vocabulary"

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
/**
 * Exported because a second reading is now drawn at the same band. `trust-trend.ts`
 * asks whether the gap *moved*, and a movement smaller than the band the verdict
 * itself is drawn at is not a movement — two tolerances would let the page call a
 * window on the mark and its own change in that window significant.
 */
export const GAP_TOLERANCE = 0.1

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
 * The same reading, one altitude up: what a person came to this page to find out.
 *
 * `readGap` is precise and stays exactly as it is — it is the sentence a reviewer
 * who knows what a confidence gap is wants, and it is what the bands and the
 * policy rows are labelled with. It is also not an answer to the question the
 * page is named after. *"claimed more than it delivered"* describes a statistic;
 * *"the AI has been over-sure of itself"* describes the thing the reader has to
 * decide about, and only the second one tells them what to do next.
 *
 * So this is the plain-language default and `readGap` is the technical record,
 * one click down — the portal's rule applied to a number rather than to a state.
 * They are derived from the same `gap` and the same tolerance, so the headline
 * and the band it summarises cannot say different things.
 */
export type TrustVerdict = {
  readonly tone: OutcomeTone
  /** What a person reads first. Never a statistic. */
  readonly label: string
  /** What it means for them, in one sentence. */
  readonly meaning: string
  /** What to do about it. Every screen answers this. */
  readonly next: string
}

export const readTrust = (score: CalibrationScore): TrustVerdict => {
  if (score.gap === null) {
    return {
      tone: "inapplicable",
      label: "Not enough answers yet",
      meaning:
        "Nothing here has been settled either way, so there is no track record to read.",
      next: "Come back once a few changes have been accepted or turned down.",
    }
  }

  if (isOnTheMark(score)) {
    return {
      tone: "applied",
      label: "The AI has been about as right as it says it is",
      meaning:
        "When it said it was sure, it usually turned out to be. Its confidence is worth reading.",
      next: "Nothing to do. Carry on reviewing the way you have been.",
    }
  }

  return score.gap > 0
    ? {
        tone: "rejected",
        label: "The AI has been over-sure of itself",
        meaning:
          "It said it was confident more often than it turned out to be right, so a high number here is not the reassurance it looks like.",
        next: "Read what a change would do before you accept it, however sure the AI sounds.",
      }
    : {
        tone: "awaiting",
        label: "The AI has been harder on itself than it needed to be",
        meaning:
          "Changes went through more often than it predicted, so it is hedging on work that turned out fine.",
        next: "You are probably being asked about changes that did not need you. Worth loosening a rule.",
      }
}

/**
 * The three numbers behind the verdict, as a sentence rather than a table.
 *
 * A rate is the compact form and it is the wrong one for a reader meeting this
 * page for the first place: "72%" of what, out of how many, expected by whom.
 * Counts answer all three in one line — and the counts are the rates, rounded,
 * so the paragraph and the table underneath it are the same measurement.
 *
 * `null` when nothing was judged, because a scoreline over no claims is a
 * sentence made of zeroes and the empty state says it better.
 */
export const plainScoreline = (score: CalibrationScore): string | null => {
  if (score.judged === 0 || score.observedRate === null) return null

  const wentThrough = Math.round(score.observedRate * score.judged)
  const noun = score.judged === 1 ? "change has" : "changes have"
  const expected =
    score.meanConfidence === null
      ? ""
      : ` The AI expected about ${Math.round(score.meanConfidence * score.judged)}.`

  return `${score.judged} ${noun} been answered. ${wentThrough} went through.${expected}`
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
 * The rest of that sentence: what the write path under one policy name was doing
 * while it judged (0248).
 *
 * `readRuleset` above is correct and is half of *what judged these claims*. A
 * fingerprint proves which **rules** were consulted and cannot reach the two
 * seams a composition root hands over separately — they are functions, and a
 * policy is a serialisable value (0179, 0208) — so a deployment that wires a
 * registry into the write path on Tuesday produces judgments whose rules are
 * byte-identical to Monday's and whose outcomes are not. A row saying *one
 * ruleset* across that week is saying something true and hearable as something
 * false.
 *
 * Silent on the same terms as the ruleset note and for the same reason: one set
 * of checks, all of it recorded, is the ordinary state and a caveat printed on
 * every row every day is a caveat nobody reads on the day it matters. The empty
 * set is part of that ordinary state — a deployment that has wired neither seam
 * is not a deployment with something missing.
 *
 * The checks are named with the record's own spelling here rather than the
 * portal's. This reading is only ever drawn inside the breakdown, which is the
 * technical record, and a host matching a row against its own composition root
 * wants the names it wrote there. The plain reading of each one is beside the
 * table, where the legend explains it.
 */
export const readWritePath = (segment: PolicyCalibration): GapReading | null => {
  const continuity = checksContinuityOf(segment.checkSets)
  const unrecorded =
    segment.unrecordedChecks === 0
      ? ""
      : ` ${segment.unrecordedChecks} of them recorded no checks at all, so those could have been judged with anything in place.`

  if (continuity === "changed") {
    const named = namedList(
      segment.checkSets.map((checks) => `“${describeWiredChecks(checks)}”`)
    )

    return {
      tone: "rejected",
      label: "what Loom was checking changed under this name",
      detail: `These claims were judged with ${segment.checkSets.length} different sets of checks in place — ${named} — so this row pools two write paths whether or not its rules ever moved.${unrecorded}`,
    }
  }

  if (continuity === "unrecorded") {
    return {
      tone: "inapplicable",
      label: "no checks recorded",
      detail:
        "None of these claims recorded which checks were in place when they were judged, so whether one write path judged them cannot be read from here.",
    }
  }

  if (unrecorded === "") return null

  /*
   * Named apart from the ruleset note's "partly recorded" on purpose. A row can
   * honestly carry both badges, and two identical words stacked one under the
   * other would leave a reader unable to tell which half each was about.
   */
  return {
    tone: "inapplicable",
    label: "checks partly recorded",
    detail: `This row is not shown to be one write path.${unrecorded}`,
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

/**
 * The same question about the write path: whether a single row was judged under
 * two of them.
 *
 * Kept apart from `poolsMoreThanOneGate` rather than folded into it, because the
 * two make different claims and the breakdown says which it is drawing for. A
 * row whose rules moved is the host having edited a policy without renaming it
 * (0048); a row whose checks moved is the host having changed what it hands the
 * write path, with the policy untouched. A reader sent to the wrong one of those
 * looks in the wrong place.
 *
 * `changed` only. A segment that recorded nothing is the ordinary state of a
 * journal written before the field existed, and a disclosure headed *careful*
 * that opened for every one of those would be a warning about the passage of
 * time.
 */
export const poolsMoreThanOneWritePath = (report: CalibrationReport): boolean =>
  report.byPolicy.some((segment) => checksContinuityOf(segment.checkSets) === "changed")

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
 *
 * The Gate is *this project's rules* here, the same words `vocabulary.ts` uses
 * for it. A reader who has met the Gate loses nothing by seeing it called what
 * it does; a reader who has not is spared a proper noun they would have to go
 * and look up before the heading meant anything.
 */
export const MISS_CAUSE_LABELS: Readonly<Record<MissCause, string>> = {
  "confidence-below-floor": "sure about a change your rules would not take on trust",
  "stakes-at-refusal-floor": "sure about a change of a kind your rules never allow",
  irreversible: "sure about a change that could not be undone",
  "discards-later-work": "sure about a change that would have thrown away later work",
  "redirected-submission": "sure about a change that would have sent a form somewhere else",
  "repointed-binding": "sure about a change that would have shown different data than before",
  "stakes-above-ceiling": "sure about a change too big to apply without asking",
  "confidence-below-minimum": "sure, and still under the bar it had to clear",
  "within-policy": "turned down with nothing in your rules against it",
  "discarded-by-human": "sure, your rules agreed, and a person said no",
  "survived-anyway": "hedged on a change that turned out fine",
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
    "Your rules sent these to a person instead. Either the AI is over-rating itself on this kind of change, or your bar for deciding alone is stricter than you need.",
  "stakes-at-refusal-floor":
    "Your rules turn this kind of change down outright, so no amount of confidence would have carried them. The AI is grading something the rules never look at.",
  irreversible:
    "Whether a change can be undone is worked out from the change itself, not claimed. An AI that is confident about changes it cannot undo is confident about the wrong thing.",
  "discards-later-work":
    "These would have written over work that landed after the AI read the page. It was sure about a page that had already moved on.",
  "redirected-submission":
    "These would have moved where a form sends what people type. Both ends were registered, so nothing left your deployment — what the AI was sure about is that the next visitor's message should arrive somewhere else.",
  "repointed-binding":
    "These would have moved which of your data a region of the page reads. Both sources were registered, so nothing was invented — what the AI was sure about is that the next visitor should see something else of yours.",
  "stakes-above-ceiling":
    "Size, not correctness. These may well have been right — your rules decline to apply changes this large without a person, whatever the AI thinks.",
  "confidence-below-minimum":
    "The AI was under the bar your rules set and still sure enough to count as wrong here, which means the two disagree about what counts as sure.",
  "within-policy":
    "Nothing in your rules turned these down, so the refusal came from somewhere the record does not name. Worth reading these changes one by one.",
  "discarded-by-human":
    "Your rules were willing and a person was not. This is the only judgment here made from outside the system, and the only one no change to your rules would have produced.",
  "survived-anyway":
    "These cost a reviewer's attention rather than a wrong page: each one was held or hedged and turned out fine. A queue of them is how a review surface stops being read.",
}
