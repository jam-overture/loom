import type { EpisodeFold, ProposalEpisode } from "./episode.js"

/**
 * 0007 made confidence self-graded and trusted on purpose, on one condition:
 * that it be calibrated. This is the measurement half of that promise. It
 * compares what the model claimed against what became of the claim, and it
 * changes nothing — no threshold moves, no policy reads it.
 *
 * That separation is deliberate rather than incremental. A runtime that adjusts
 * its own gate from its own record of its own judgments can drift somewhere no
 * one chose, and the only defence is that the drift was proposed to a human
 * first. Measuring is the part that is safe to do unsupervised.
 */

/** What became of a proposal, once it is something a claim can be scored against. */
export type CalibrationVerdict = "survived" | "rejected"

/**
 * Why a proposal yielded no verdict. Kept apart from `rejected` on purpose: a
 * commit that failed on the database says nothing about whether the model was
 * right, and folding those into the rejections would make the runtime look
 * overconfident every time infrastructure broke.
 */
export type UnjudgedReason = "awaiting-answer" | "failed" | "unsettled"

export const UNJUDGED_REASONS: readonly UnjudgedReason[] = ["awaiting-answer", "failed", "unsettled"]

/**
 * A repair (0006) is scored as its own proposal, not merged into the one it
 * replaced. Both graded themselves, and the refusal that prompted the repair is
 * exactly the case where the grade was wrong — averaging it away would hide the
 * datapoint calibration exists to collect.
 */
export const verdictOf = (proposal: ProposalEpisode): CalibrationVerdict | UnjudgedReason => {
  if (proposal.committedRevision !== undefined) return "survived"
  if (proposal.disposition?.kind === "rejected") return "rejected"
  if (proposal.answer === "discarded") return "rejected"
  if (proposal.failure !== undefined) return "failed"
  if (proposal.held) return "awaiting-answer"

  return "unsettled"
}

export const CALIBRATION_BUCKET_COUNT = 10

export type CalibrationScore = {
  readonly judged: number
  readonly survived: number
  /** null when nothing was judged — zero out of zero is not zero. */
  readonly observedRate: number | null
  readonly meanConfidence: number | null
  /**
   * `meanConfidence - observedRate`. Positive means the model claimed more than
   * it delivered. null when there is nothing to compare.
   */
  readonly gap: number | null
}

/** Half-open `[lower, upper)`, except the last bucket, which is closed so 1 has a home. */
export type ConfidenceBucket = CalibrationScore & {
  readonly lower: number
  readonly upper: number
}

export type CalibrationReport = {
  readonly overall: CalibrationScore
  readonly buckets: readonly ConfidenceBucket[]
  /** Proposals that produced no verdict, by why. Never in a denominator. */
  readonly unjudged: Readonly<Record<UnjudgedReason, number>>
  /**
   * Records the fold could not attribute to a proposal, carried through rather
   * than dropped — the same reason `EpisodeFold` returns them. A rate computed
   * over a window that silently lost records is a rate over a denominator it
   * changed without saying so.
   */
  readonly unattributed: number
  /**
   * Proposals the runtime authored rather than a model — a revert, say. Out of
   * scope rather than unjudged: they carry a confidence because every proposal
   * does, but nobody graded it, so scoring them would measure the constant the
   * runtime happened to stamp.
   */
  readonly runtimeAuthored: number
}

type Tally = { judged: number; survived: number; confidenceSum: number }

const BUCKET_LOWER_BOUNDS: readonly number[] = Array.from(
  { length: CALIBRATION_BUCKET_COUNT },
  (_, index) => index / CALIBRATION_BUCKET_COUNT
)

/**
 * Counting the bounds a confidence clears, rather than multiplying it out.
 * `Math.floor(0.7 * 10)` is not reliably 7 in binary floating point, and a
 * report that filed a claim under a range its own printed bounds exclude would
 * be wrong in the one way nobody would think to check. Comparing against the
 * very numbers the bucket publishes makes that unrepresentable.
 */
const bucketIndexOf = (confidence: number): number =>
  BUCKET_LOWER_BOUNDS.filter((lower) => confidence >= lower).length - 1

const scoreOf = (tally: Tally): CalibrationScore => {
  if (tally.judged === 0) {
    return { judged: 0, survived: 0, observedRate: null, meanConfidence: null, gap: null }
  }

  const observedRate = tally.survived / tally.judged
  const meanConfidence = tally.confidenceSum / tally.judged

  return {
    judged: tally.judged,
    survived: tally.survived,
    observedRate,
    meanConfidence,
    gap: meanConfidence - observedRate,
  }
}

export const calibrationOf = (fold: EpisodeFold): CalibrationReport => {
  const tallies = new Map<number, Tally>()
  const unjudged: Record<UnjudgedReason, number> = { "awaiting-answer": 0, failed: 0, unsettled: 0 }
  const overall: Tally = { judged: 0, survived: 0, confidenceSum: 0 }

  const tallyFor = (index: number): Tally => {
    const existing = tallies.get(index)
    if (existing) return existing

    const fresh: Tally = { judged: 0, survived: 0, confidenceSum: 0 }
    tallies.set(index, fresh)

    return fresh
  }

  const count = (tally: Tally, proposal: ProposalEpisode, verdict: CalibrationVerdict): void => {
    tally.judged += 1
    tally.confidenceSum += proposal.provenance.confidence
    if (verdict === "survived") tally.survived += 1
  }

  let runtimeAuthored = 0

  for (const episode of fold.episodes) {
    for (const proposal of episode.proposals) {
      if (proposal.provenance.authoredBy !== "model") {
        runtimeAuthored += 1
        continue
      }

      const verdict = verdictOf(proposal)

      if (verdict !== "survived" && verdict !== "rejected") {
        unjudged[verdict] += 1
        continue
      }

      count(tallyFor(bucketIndexOf(proposal.provenance.confidence)), proposal, verdict)
      count(overall, proposal, verdict)
    }
  }

  return {
    overall: scoreOf(overall),
    buckets: BUCKET_LOWER_BOUNDS.map((lower, index) => ({
      lower,
      upper: (index + 1) / CALIBRATION_BUCKET_COUNT,
      ...scoreOf(tallies.get(index) ?? { judged: 0, survived: 0, confidenceSum: 0 }),
    })),
    unjudged,
    unattributed: fold.unattributed.length,
    runtimeAuthored,
  }
}
