import { describe, expect, it } from "vitest"

import { harnessWith, proposalScript } from "../testing/episode-harness.js"
import { commitIntent, discardHeld } from "../write/index.js"

import { calibrationOf, verdictOf, type CalibrationReport } from "./calibration.js"
import type { EpisodeFold, ProposalEpisode } from "./episode.js"

/**
 * Every fixture here is a real run through the Gate. The whole point of the
 * report is to say what became of a claim, and a test that asserted its own
 * dispositions would still pass after the Gate stopped producing them.
 */

const runAt = async (
  confidence: number,
  answer?: (proposalId: ProposalEpisode["proposalId"], harness: Awaited<ReturnType<typeof harnessWith>>) => Promise<unknown>
): Promise<EpisodeFold> => {
  const harness = await harnessWith({ script: proposalScript(confidence) })
  const outcome = await commitIntent(harness.path, harness.intent)

  if (answer && outcome.kind === "held") await answer(outcome.held.proposalId, harness)

  return harness.fold()
}

const merged = (...folds: readonly EpisodeFold[]): EpisodeFold => ({
  episodes: folds.flatMap((fold) => fold.episodes),
  unattributed: folds.flatMap((fold) => fold.unattributed),
})

const onlyProposal = (fold: EpisodeFold): ProposalEpisode => {
  const proposal = fold.episodes[0]?.proposals[0]
  if (!proposal) throw new Error("the fixture must produce one proposal")

  return proposal
}

const bucketAt = (report: CalibrationReport, index: number) => {
  const bucket = report.buckets[index]
  if (!bucket) throw new Error(`no bucket ${index}`)

  return bucket
}

describe("verdictOf", () => {
  it("scores a change that reached the log as survived", async () => {
    expect(verdictOf(onlyProposal(await runAt(0.9)))).toBe("survived")
  })

  it("scores a Gate refusal as rejected", async () => {
    expect(verdictOf(onlyProposal(await runAt(0.1)))).toBe("rejected")
  })

  it("scores a human discarding a held change as rejected", async () => {
    const fold = await runAt(0.5, (proposalId, harness) => discardHeld(harness.path, { proposalId }))

    expect(verdictOf(onlyProposal(fold))).toBe("rejected")
  })

  it("leaves a change nobody has answered yet unjudged", async () => {
    expect(verdictOf(onlyProposal(await runAt(0.5)))).toBe("awaiting-answer")
  })

  /**
   * The distinction the whole report rests on. A commit that fell over on the
   * database says nothing about whether the model was right, and counting it as
   * a rejection would make the runtime look overconfident every time the
   * infrastructure had a bad day.
   */
  it("does not blame the model for a commit that failed", async () => {
    const committed = onlyProposal(await runAt(0.9))
    const { committedRevision: _dropped, ...withoutCommit } = committed

    expect(
      verdictOf({
        ...withoutCommit,
        failure: { stage: "commit", code: "unavailable", detail: "the store was unreachable" },
      })
    ).toBe("failed")
  })
})

describe("calibrationOf", () => {
  it("reports nothing rather than zero when nothing has been judged", () => {
    const report = calibrationOf({ episodes: [], unattributed: [] })

    expect(report.overall).toEqual({
      judged: 0,
      survived: 0,
      observedRate: null,
      meanConfidence: null,
      gap: null,
    })
    expect(report.buckets).toHaveLength(10)
    expect(report.buckets.every((bucket) => bucket.observedRate === null)).toBe(true)
  })

  it("files a claim in the bucket whose printed range contains it", async () => {
    const report = calibrationOf(merged(await runAt(0.7), await runAt(0.9)))

    expect(bucketAt(report, 7).judged).toBe(1)
    expect(bucketAt(report, 9).judged).toBe(1)
    expect(bucketAt(report, 7).lower).toBeLessThanOrEqual(0.7)
    expect(bucketAt(report, 7).upper).toBeGreaterThan(0.7)
  })

  it("gives a confidence of 1 a home in the top bucket", async () => {
    const report = calibrationOf(await runAt(1))

    expect(bucketAt(report, 9).judged).toBe(1)
    expect(report.overall.judged).toBe(1)
  })

  /**
   * A rate is only meaningful over the population it claims to describe, so a
   * proposal still waiting on a human is counted and named, never averaged in
   * as though the silence were an answer.
   */
  it("keeps proposals nobody has answered out of every denominator", async () => {
    const report = calibrationOf(merged(await runAt(0.9), await runAt(0.5), await runAt(0.5)))

    expect(report.overall.judged).toBe(1)
    expect(report.overall.observedRate).toBe(1)
    expect(report.unjudged).toEqual({ "awaiting-answer": 2, failed: 0, unsettled: 0 })
  })

  it("reports a positive gap when the model claimed more than it delivered", async () => {
    const report = calibrationOf(merged(await runAt(0.1), await runAt(0.1)))
    const bucket = bucketAt(report, 1)

    expect(bucket.judged).toBe(2)
    expect(bucket.survived).toBe(0)
    expect(bucket.observedRate).toBe(0)
    expect(bucket.meanConfidence).toBeCloseTo(0.1)
    expect(bucket.gap).toBeCloseTo(0.1)
  })

  it("reports a negative gap when the model delivered more than it claimed", async () => {
    const report = calibrationOf(merged(await runAt(0.8), await runAt(0.8)))

    expect(report.overall.observedRate).toBe(1)
    expect(report.overall.gap).toBeCloseTo(-0.2)
  })

  /**
   * The fold hands back records it could not attribute rather than dropping
   * them, and a report that swallowed the count would be quoting a rate over a
   * denominator it had quietly changed.
   */
  it("carries the fold's unattributed records through to the report", async () => {
    const real = await runAt(0.9)

    const report = calibrationOf({
      episodes: real.episodes,
      unattributed: [
        {
          seq: 1,
          treeId: real.episodes[0]?.treeId ?? ("t_missing" as never),
          occurredAt: "2026-08-02T00:00:00.000Z",
          event: { type: "change-applied", proposalId: "p_missing" as never, revision: 1 },
        },
      ],
    })

    expect(report.unattributed).toBe(1)
  })
})
