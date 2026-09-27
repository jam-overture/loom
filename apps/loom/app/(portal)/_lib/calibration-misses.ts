import type { DispositionReasonCode, IntentId, ProposalId, TreeId } from "@jam-overture/loom"
import {
  verdictOf,
  type CalibrationVerdict,
  type ConfidenceBucket,
  type EpisodeFold,
  type IntentEpisode,
  type ProposalEpisode,
} from "@jam-overture/loom/telemetry"

/**
 * The claims the calibration table counted and then threw away.
 *
 * `calibrationOf` is a fold, and a fold's whole job is to lose identity: it
 * returns how many claims were judged, how many survived, and the gap between
 * the mean claim and the observed rate. Every one of those is a number a reader
 * can look at and do nothing about. "The 0.9 band delivered 50%" does not say
 * *which* 0.9s, what they were trying to do, or what refused them — and those
 * are the only facts that tell anyone what to change.
 *
 * This reads the same fold the report reads, over the same claims, and keeps the
 * half the report discards. It is a second view of one set of facts, never a
 * second measurement: a claim that is a miss here was scored there, and the two
 * cannot disagree because both start from `verdictOf` and both drop exactly what
 * 0031 says to drop.
 *
 * It computes and returns. Nothing acts on it, for 0031's reason: calibration is
 * a reader. A reviewer with this list in front of them may well decide the Gate's
 * floor is in the wrong place, and that decision is theirs to make and to write
 * down.
 */

/**
 * Which way a claim was wrong, because the two cost different things.
 *
 * An overconfident claim is the dangerous one: the model asserted it was sure
 * and the change was refused anyway, which is precisely the case 0007 made
 * self-grading conditional on catching. An underconfident claim is expensive
 * rather than dangerous — it sends a reviewer a hold that did not need holding,
 * and a queue full of those is how a review surface stops being read.
 */
export type MissDirection = "overconfident" | "underconfident"

/**
 * What the claim ran into. A refusal names the rule the Gate refused under
 * (0033); a discard names no rule at all, because the human who discarded it
 * owed nobody a reason code and the Gate had already been willing.
 *
 * `survived-anyway` is the underconfident case, where nothing went wrong except
 * the grade.
 */
export type MissCause = DispositionReasonCode | "discarded-by-human" | "survived-anyway"

export type MissedClaim = {
  readonly proposalId: ProposalId
  readonly intentId: IntentId
  readonly treeId: TreeId
  readonly confidence: number
  readonly verdict: CalibrationVerdict
  readonly direction: MissDirection
  /**
   * How far the claim sat from what happened, as the claim's own error: a
   * confidence is a stated probability of surviving, so a 0.95 that was refused
   * was 0.95 wrong and a 0.2 that survived was 0.8 wrong.
   *
   * This is the number the aggregate cannot recover. Averaging a 0.95 refusal
   * with a 0.95 survival yields a gap of nothing, and the band reports itself as
   * on the mark while containing the worst claim in the window.
   */
  readonly surprise: number
  readonly cause: MissCause
  /** The Gate's own sentence, kept verbatim rather than paraphrased. */
  readonly detail?: string
  readonly rationale: string
  readonly proposedAt: string
  readonly policyId: string | null
  /** Who answered, when a human did. Not who asked (`provenance.actor`). */
  readonly answeredBy?: string
  /** Set when this claim replaced one the Gate refused (0006). */
  readonly repairOf?: ProposalId
  /** Set when a later claim in this window replaced this one. */
  readonly repairedBy?: ProposalId
}

/**
 * When the outcome landed on the wrong side of the model's own coin flip.
 *
 * A confidence is a probability, so a 0.3 that was refused is the model being
 * roughly right and does not belong on a page about being wrong. Half is where
 * the claim stops predicting what happened and starts contradicting it, which is
 * the only threshold that needs no tuning and no justification beyond the
 * meaning of the number.
 */
export const MISS_THRESHOLD = 0.5

export const surpriseOf = (confidence: number, verdict: CalibrationVerdict): number =>
  verdict === "survived" ? 1 - confidence : confidence

const causeOf = (proposal: ProposalEpisode, verdict: CalibrationVerdict): MissCause => {
  if (verdict === "survived") return "survived-anyway"
  /*
   * Order matters, and this is the one place it does. A discarded proposal has a
   * disposition too — the Gate held it, which is how a human came to see it — so
   * reading the reason code first would file every discard under whichever rule
   * caused the hold and lose the only judgment made from outside the system.
   * 0031 calls that the highest-value signal in the journal.
   */
  if (proposal.answer === "discarded") return "discarded-by-human"

  return proposal.disposition?.reason.code ?? "within-policy"
}

/** The Gate's sentence, and only where the Gate is what refused it. */
const detailOf = (proposal: ProposalEpisode, cause: MissCause): string | undefined => {
  if (cause === "survived-anyway" || cause === "discarded-by-human") return undefined

  return proposal.disposition?.reason.detail
}

/**
 * Newest first within equal surprise, so a reader paging a long list sees the
 * recent instance of a repeated mistake rather than the oldest one.
 */
const byWrongestThenNewest = (left: MissedClaim, right: MissedClaim): number =>
  right.surprise - left.surprise || right.proposedAt.localeCompare(left.proposedAt)

/**
 * Which proposal replaced which, read across the whole window before any claim
 * is described.
 *
 * `repairOf` points backwards — a repair knows what it replaced — and the
 * interesting direction is the other one: a reader looking at a refused 0.9
 * wants to know it was retried, and the retry is a *later* record. A second pass
 * is the honest way to get it, because a claim cannot see its own successor.
 */
const repairsByOriginal = (episodes: readonly IntentEpisode[]): ReadonlyMap<ProposalId, ProposalId> =>
  new Map(
    episodes.flatMap((episode) =>
      episode.proposals.flatMap((proposal) =>
        proposal.repairOf === undefined ? [] : [[proposal.repairOf, proposal.proposalId] as const]
      )
    )
  )

/**
 * Every claim in this window whose outcome contradicted its own grade.
 *
 * The exclusions are the report's, deliberately and not by coincidence: a
 * runtime-authored proposal carries a confidence nobody graded (0032's inverse
 * is stamped with 1), and an unjudged proposal has no outcome to contradict. A
 * list that included either would be a list of claims the table beside it never
 * scored, and a reader comparing the two would be reading two different windows.
 */
export const missesOf = (fold: EpisodeFold): readonly MissedClaim[] => {
  const repairs = repairsByOriginal(fold.episodes)

  return fold.episodes
    .flatMap((episode) =>
      episode.proposals.flatMap((proposal): readonly MissedClaim[] => {
        if (proposal.provenance.authoredBy !== "model") return []

        const verdict = verdictOf(proposal)
        if (verdict !== "survived" && verdict !== "rejected") return []

        const { confidence } = proposal.provenance
        const surprise = surpriseOf(confidence, verdict)
        if (surprise <= MISS_THRESHOLD) return []

        const cause = causeOf(proposal, verdict)
        const detail = detailOf(proposal, cause)
        const repairedBy = repairs.get(proposal.proposalId)

        return [
          {
            proposalId: proposal.proposalId,
            intentId: episode.intentId,
            treeId: episode.treeId,
            confidence,
            verdict,
            direction: verdict === "survived" ? "underconfident" : "overconfident",
            surprise,
            cause,
            ...(detail === undefined ? {} : { detail }),
            rationale: proposal.rationale,
            proposedAt: proposal.proposedAt,
            policyId: proposal.disposition?.policyId ?? null,
            ...(proposal.answeredBy === undefined ? {} : { answeredBy: proposal.answeredBy }),
            ...(proposal.repairOf === undefined ? {} : { repairOf: proposal.repairOf }),
            ...(repairedBy === undefined ? {} : { repairedBy }),
          },
        ]
      })
    )
    .sort(byWrongestThenNewest)
}

/**
 * The misses that share a cause, worst group first.
 *
 * This is the reading a rate cannot produce. "The model is overconfident" is a
 * number; "the model is overconfident about changes it cannot reverse, six times
 * this window, at a mean claim of 0.91" names a class of change and points at
 * the rule that keeps catching it. One of those is something to fix.
 */
export type MissGroup = {
  readonly cause: MissCause
  readonly claims: readonly MissedClaim[]
  readonly meanConfidence: number
}

const bySizeThenSurprise = (left: MissGroup, right: MissGroup): number =>
  right.claims.length - left.claims.length ||
  (right.claims[0]?.surprise ?? 0) - (left.claims[0]?.surprise ?? 0)

export const groupMisses = (misses: readonly MissedClaim[]): readonly MissGroup[] => {
  const groups = new Map<MissCause, MissedClaim[]>()

  for (const miss of misses) {
    const existing = groups.get(miss.cause)
    if (existing) existing.push(miss)
    else groups.set(miss.cause, [miss])
  }

  return Array.from(groups, ([cause, claims]) => ({
    cause,
    claims,
    meanConfidence: claims.reduce((sum, claim) => sum + claim.confidence, 0) / claims.length,
  })).sort(bySizeThenSurprise)
}

/**
 * A band the table calls settled that is holding misses anyway.
 *
 * The gap is a mean, and a mean of two claims that were wrong in opposite
 * directions is zero. So a band can report "on the mark" — the page says those
 * words — while every claim inside it missed. That is not a flaw in the report;
 * 0031 asked for a rate and a rate is what it gives. It is a flaw in reading a
 * rate as though it described the claims underneath, which is what anybody looking
 * at a calibration table is doing.
 *
 * Naming the bands where the two readings disagree is the only way a reader finds
 * out, and it is the one thing on this page that could not be derived by looking
 * harder at the table.
 */
export type ContradictedBand = {
  readonly bucket: ConfidenceBucket
  readonly claims: readonly MissedClaim[]
}

const withinBand = (bucket: ConfidenceBucket, isLast: boolean, confidence: number): boolean =>
  confidence >= bucket.lower && (isLast ? confidence <= bucket.upper : confidence < bucket.upper)

/**
 * The bands whose own reading is contradicted by the claims inside them.
 *
 * `settled` is passed in rather than recomputed: `readGap` already decides what
 * counts as agreement, and a second threshold here would let the page call a band
 * on the mark in one component and off it in another.
 */
export const contradictedBands = (
  buckets: readonly ConfidenceBucket[],
  misses: readonly MissedClaim[],
  settled: (bucket: ConfidenceBucket) => boolean
): readonly ContradictedBand[] => {
  const lastIndex = buckets.length - 1

  return buckets.flatMap((bucket, index): readonly ContradictedBand[] => {
    if (bucket.judged === 0 || !settled(bucket)) return []

    const claims = misses.filter((miss) => withinBand(bucket, index === lastIndex, miss.confidence))

    return claims.length === 0 ? [] : [{ bucket, claims }]
  })
}

/**
 * The misses that happened on one page.
 *
 * ## The fact this page dropped
 *
 * `MissedClaim` has carried `treeId` since it was written and no part of
 * `/portal/trust` has ever rendered it. So a reader who opened this screen and
 * found six overconfident claims could read what each one was trying to do, how
 * far out it was and which rule caught it — and could not find out whether all
 * six were on one page or spread across six. Those are opposite situations with
 * opposite next moves, and the screen looked identical either way.
 *
 * It is also the only fact on this screen a reader can act on *today*. A class
 * of change the AI keeps misjudging is something to watch; a page it keeps
 * misjudging is something to open.
 *
 * ## Why this groups and does not order
 *
 * An order over pages needs each page's **name**, and a name is a read against
 * the store (`page-name.ts`). This module is a pure fold over the record and
 * gets no store, which is deliberate: `missesOf` and `calibrationOf` start from
 * the same fold and cannot be allowed to disagree, and a function that reached
 * for a store could not be called beside one that cannot.
 *
 * So the arrangement is the screen's, through `_lib/page-order.ts` like every
 * other list of pages in this portal. What is here is the grouping and the two
 * numbers a row needs, and the insertion order is `missesOf`'s own — worst claim
 * first — which is what makes `worstSurprise` the first claim's without a second
 * scan.
 */
export type MissedPage = {
  readonly treeId: TreeId
  /** Worst first, inherited from `missesOf`. */
  readonly claims: readonly MissedClaim[]
  /**
   * How far the worst claim on this page sat from what happened.
   *
   * Kept beside the count because the two answer different questions and a row
   * showing only the count would flatten them: four claims that were each barely
   * over the line is a different page from one claim that was 0.95 wrong.
   */
  readonly worstSurprise: number
}

export const pagesInMisses = (misses: readonly MissedClaim[]): readonly MissedPage[] => {
  const pages = new Map<TreeId, MissedClaim[]>()

  for (const miss of misses) {
    const existing = pages.get(miss.treeId)
    if (existing) existing.push(miss)
    else pages.set(miss.treeId, [miss])
  }

  return Array.from(pages, ([treeId, claims]) => ({
    treeId,
    claims,
    /*
     * The first claim's, and not a `Math.max`. `missesOf` sorts worst first and
     * a group built by walking that list keeps the order, so the head is the
     * worst by construction — and a second reduction here would be a second
     * definition of "worst" that could drift from the sort.
     */
    worstSurprise: claims[0]!.surprise,
  }))
}

/**
 * Every page a miss happened on, once each, for the one read this adds.
 *
 * Separate from `pagesInMisses` because a screen needs the ids *before* it has
 * the names and the names before it can arrange the groups, and a screen that
 * mapped over the groups to get the ids would be holding two lists that have to
 * stay in step.
 */
export const pagesWithMisses = (misses: readonly MissedClaim[]): readonly TreeId[] =>
  Array.from(new Set(misses.map((miss) => miss.treeId)))
