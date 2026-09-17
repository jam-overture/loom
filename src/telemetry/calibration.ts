import { everyMemberOf } from "../closed-set.js"

import type { EpisodeFold, ProposalEpisode } from "./episode.js"

/**
 * Confidence is self-graded and trusted on purpose, on one condition: that it
 * be calibrated (0007). This is the measurement half of that promise. It
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

/**
 * The buckets a fold has to open before the first proposal arrives, so a reason
 * nobody hit still reads as zero rather than as missing.
 *
 * Checked where it is written because nothing else could: this union has no
 * schema to hold it against, one consumer, and a member added without a bucket
 * costs a telemetry row that never appears — the quietest way a list goes stale.
 * `src/tree/delta.ts` has named it an exemplar of that remedy since it was
 * written, which until now it was not.
 */
export const UNJUDGED_REASONS: readonly UnjudgedReason[] = everyMemberOf<UnjudgedReason>()([
  "awaiting-answer",
  "failed",
  "unsettled",
])

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

/**
 * A calibration reading confined to the claims one policy judged.
 *
 * The overall report answers "is a 0.9 actually a 0.9". It can only answer that
 * for one gate at a time, because `observedRate` is not a property of the model
 * alone: survival is what the Gate and the human between them allowed, and a
 * host that tightened `minimumConfidence` moves the rate without the model
 * having changed at all. Pooling two policies produces a number that moved for a
 * reason the report cannot name.
 */
export type PolicyCalibration = {
  /**
   * Which policy judged these claims, as its own dispositions named it (0033).
   *
   * `null` means this window never saw the judgment — the page opened after the
   * disposition and before the commit, say. Distinct from the recorded string
   * `UNATTRIBUTED_POLICY_ID`, which is a judgment that really was made before the
   * Gate wrote down which policy made it. One is a gap in the reader, the other
   * is a gap in the record, and merging them would let a fixed record look like a
   * short page.
   */
  readonly policyId: string | null
  readonly overall: CalibrationScore
  readonly buckets: readonly ConfidenceBucket[]
  /**
   * The distinct fingerprints the judgments in this segment named, sorted.
   *
   * A name is host-declared, and hosts are asked to rename a policy they edit (0033).
   * More than one fingerprint under one name means that did not happen, and this
   * row is pooling gates that differ by more than what they are called — the same
   * error the segments exist to correct, one level down. `rulesetContinuityOf`
   * reads this list; the list itself is carried so a host can match a digest to
   * the configuration it is looking at.
   */
  readonly fingerprints: readonly string[]
  /**
   * Judged claims in this segment whose disposition named no fingerprint. Kept
   * beside the list rather than folded into it: one fingerprint plus twelve
   * unfingerprinted judgments is not a segment shown to be constant, and a list
   * of length one would say it was.
   */
  readonly unfingerprinted: number
}

export type CalibrationReport = {
  readonly overall: CalibrationScore
  readonly buckets: readonly ConfidenceBucket[]
  /**
   * The same claims again, split by the policy that judged each one. Every
   * judged proposal appears in exactly one segment, so the segments sum to
   * `overall` — the split is a partition, not a sample.
   *
   * Ordered by policy name, with the unrecorded segment last, so a reader
   * comparing two windows is comparing rows in the same order.
   */
  readonly byPolicy: readonly PolicyCalibration[]
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
   * Proposals the runtime authored rather than a model — the inverse behind a
   * revert, say. Segmented rather than dropped: they carry a confidence because
   * every proposal does, but nobody graded it, so scoring them would measure the
   * constant the runtime stamps. Reporting the count keeps that visible instead
   * of leaving a reader to wonder where the undos went.
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

/**
 * A whole and its bands. The overall report and every policy segment are the
 * same computation over a different set of claims, so they are the same code —
 * a segment that scored itself differently from the whole would be a difference
 * nobody chose and no test would think to look for.
 */
type Bands = { readonly overall: Tally; readonly byBucket: Map<number, Tally> }

const emptyTally = (): Tally => ({ judged: 0, survived: 0, confidenceSum: 0 })

const emptyBands = (): Bands => ({ overall: emptyTally(), byBucket: new Map() })

const bucketTally = (bands: Bands, index: number): Tally => {
  const existing = bands.byBucket.get(index)
  if (existing) return existing

  const fresh = emptyTally()
  bands.byBucket.set(index, fresh)

  return fresh
}

const addTo = (tally: Tally, confidence: number, verdict: CalibrationVerdict): void => {
  tally.judged += 1
  tally.confidenceSum += confidence
  if (verdict === "survived") tally.survived += 1
}

const record = (bands: Bands, confidence: number, verdict: CalibrationVerdict): void => {
  addTo(bands.overall, confidence, verdict)
  addTo(bucketTally(bands, bucketIndexOf(confidence)), confidence, verdict)
}

const bucketsOf = (bands: Bands): readonly ConfidenceBucket[] =>
  BUCKET_LOWER_BOUNDS.map((lower, index) => ({
    lower,
    upper: (index + 1) / CALIBRATION_BUCKET_COUNT,
    ...scoreOf(bands.byBucket.get(index) ?? emptyTally()),
  }))

/**
 * Which policy judged this claim, taken from the disposition and from nowhere
 * else. Its intent also carries a `policyId`, and it is the wrong answer: that
 * one is the *last* resolution the window saw, so on a proposal that was held
 * under one policy and confirmed under a narrower one it names the gate that did
 * not decide this verdict.
 */
const judgingPolicyOf = (proposal: ProposalEpisode): string | null =>
  proposal.disposition?.policyId ?? null

/** By name, with the unrecorded segment last rather than sorted as a value. */
const byPolicyName = (left: PolicyCalibration, right: PolicyCalibration): number => {
  if (left.policyId === null) return right.policyId === null ? 0 : 1
  if (right.policyId === null) return -1

  return left.policyId < right.policyId ? -1 : left.policyId > right.policyId ? 1 : 0
}

/** One gate's claims: how they scored, and which rulesets did the scoring. */
type Segment = {
  readonly bands: Bands
  readonly fingerprints: Set<string>
  unfingerprinted: number
}

export const calibrationOf = (fold: EpisodeFold): CalibrationReport => {
  const unjudged: Record<UnjudgedReason, number> = { "awaiting-answer": 0, failed: 0, unsettled: 0 }
  const whole = emptyBands()
  const byPolicy = new Map<string | null, Segment>()

  const segmentFor = (policyId: string | null): Segment => {
    const existing = byPolicy.get(policyId)
    if (existing) return existing

    const fresh: Segment = { bands: emptyBands(), fingerprints: new Set(), unfingerprinted: 0 }
    byPolicy.set(policyId, fresh)

    return fresh
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

      const { confidence } = proposal.provenance
      record(whole, confidence, verdict)

      const segment = segmentFor(judgingPolicyOf(proposal))
      record(segment.bands, confidence, verdict)

      const fingerprint = proposal.disposition?.policyFingerprint
      if (fingerprint === undefined) segment.unfingerprinted += 1
      else segment.fingerprints.add(fingerprint)
    }
  }

  return {
    overall: scoreOf(whole.overall),
    buckets: bucketsOf(whole),
    byPolicy: Array.from(byPolicy, ([policyId, segment]) => ({
      policyId,
      overall: scoreOf(segment.bands.overall),
      buckets: bucketsOf(segment.bands),
      fingerprints: Array.from(segment.fingerprints).sort(),
      unfingerprinted: segment.unfingerprinted,
    })).sort(byPolicyName),
    unjudged,
    unattributed: fold.unattributed.length,
    runtimeAuthored,
  }
}
