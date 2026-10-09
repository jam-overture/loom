import { describe, expect, it } from "vitest"

import { checksContinuityOf, type WriteCheck } from "../runtime/checks.js"
import { UNATTRIBUTED_POLICY_ID } from "../runtime/disposition.js"
import { rulesetContinuityOf } from "../runtime/policy-fingerprint.js"
import { defaultGatePolicy, type GatePolicy } from "../runtime/policy.js"
import { harnessWith, proposalScript } from "../testing/episode-harness.js"
import { commitIntent, discardHeld, revertRevision } from "../write/index.js"

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

const runUnder = async (confidence: number, policy: GatePolicy): Promise<EpisodeFold> => {
  const harness = await harnessWith({ script: proposalScript(confidence), policy })
  await commitIntent(harness.path, harness.intent)

  return harness.fold()
}

/** Two hosts that disagree about what a 0.9 is worth. */
const GENEROUS: GatePolicy = { ...defaultGatePolicy, policyId: "generous" }
const STRICT: GatePolicy = {
  ...defaultGatePolicy,
  policyId: "strict",
  minimumConfidence: 0.99,
  confidenceFloor: 0.95,
}

const merged = (...folds: readonly EpisodeFold[]): EpisodeFold => ({
  episodes: folds.flatMap((fold) => fold.episodes),
  unattributed: folds.flatMap((fold) => fold.unattributed),
})

/**
 * Rewrites the dispositions a real run produced. Used only to reach the two
 * states a fixture cannot be driven into — a window that opened after the
 * judgment, and a record written before the Gate named the policy that made it.
 */
const withDispositions = (
  fold: EpisodeFold,
  rewrite: (proposal: ProposalEpisode) => ProposalEpisode
): EpisodeFold => ({
  ...fold,
  episodes: fold.episodes.map((episode) => ({
    ...episode,
    proposals: episode.proposals.map(rewrite),
  })),
})

const forgetDisposition = (proposal: ProposalEpisode): ProposalEpisode => {
  const { disposition: _unseen, ...rest } = proposal

  return rest
}

const judgedBy = (policyId: string) => (proposal: ProposalEpisode): ProposalEpisode =>
  proposal.disposition === undefined
    ? proposal
    : { ...proposal, disposition: { ...proposal.disposition, policyId } }

/** A judgment from before the Gate fingerprinted policies. No live run produces one. */
const forgetFingerprint = (proposal: ProposalEpisode): ProposalEpisode => {
  if (proposal.disposition === undefined) return proposal

  const { policyFingerprint: _unrecorded, ...disposition } = proposal.disposition

  return { ...proposal, disposition }
}

/**
 * A judgment from a version of Loom whose policy had a different set of knobs.
 * Reachable only by editing the shape half, since this version can produce
 * exactly one shape.
 */
const underPolicyShape = (shape: string) => (proposal: ProposalEpisode): ProposalEpisode => {
  const fingerprint = proposal.disposition?.policyFingerprint
  if (proposal.disposition === undefined || fingerprint === undefined) return proposal

  const values = fingerprint.slice(fingerprint.indexOf(":"))

  return { ...proposal, disposition: { ...proposal.disposition, policyFingerprint: `${shape}${values}` } }
}

/**
 * A judgment made by a runtime that had been handed the checks named here.
 *
 * Rewritten rather than driven, for the reason `underPolicyShape` is: the
 * fixture's composition root wires neither seam, so the one state worth reading
 * — a wiring that arrived part way through a window — is not reachable from it.
 */
const underWiredChecks =
  (...wiredChecks: readonly WriteCheck[]) =>
  (proposal: ProposalEpisode): ProposalEpisode =>
    proposal.disposition === undefined
      ? proposal
      : { ...proposal, disposition: { ...proposal.disposition, wiredChecks } }

const forgetWiredChecks = (proposal: ProposalEpisode): ProposalEpisode => {
  if (proposal.disposition === undefined) return proposal

  const { wiredChecks: _unrecorded, ...disposition } = proposal.disposition

  return { ...proposal, disposition }
}

const segmentFor = (report: CalibrationReport, policyId: string | null) => {
  const segment = report.byPolicy.find((candidate) => candidate.policyId === policyId)
  if (!segment) throw new Error(`no segment for ${String(policyId)}`)

  return segment
}

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
  /**
   * The interaction 0032 created, driven through the real revert path rather
   * than over a hand-built episode. A revert is proposed with `confidence: 1` by
   * an interpreter that cannot be wrong and always survives, so scoring it would
   * walk the top band toward a perfect record that measures arithmetic rather
   * than judgment. It is segmented rather than dropped, because a reader who
   * cannot see where the undos went is being asked to trust a denominator that
   * changed silently.
   */
  it("keeps a change the runtime authored out of the score, and says how many", async () => {
    const harness = await harnessWith({ script: proposalScript(0.9) })
    await commitIntent(harness.path, harness.intent)

    const beforeUndo = calibrationOf(await harness.fold())

    const undone = await revertRevision(harness.path, {
      treeId: harness.tree.treeId,
      revision: 1,
      seed: harness.tree,
      origin: "user-instruction",
    })
    expect(undone.kind).toBe("committed")

    const afterUndo = calibrationOf(await harness.fold())

    /** The undo committed, and moved not one number in the score. */
    expect(afterUndo.overall).toEqual(beforeUndo.overall)
    expect(bucketAt(afterUndo, 9).judged).toBe(bucketAt(beforeUndo, 9).judged)
    expect(afterUndo.runtimeAuthored).toBe(1)
    expect(beforeUndo.runtimeAuthored).toBe(0)
  })

  it("carries the fold's unattributed records through to the report", async () => {
    const real = await runAt(0.9)

    const report = calibrationOf({
      episodes: real.episodes,
      unattributed: [
        {
          seq: 1,
          treeId: real.episodes[0]?.treeId ?? ("t_missing" as never),
          occurredAt: "2026-08-02T00:00:00.000Z",
          recordedAt: "2026-08-02T00:00:00.000Z",
          event: { type: "change-applied", proposalId: "p_missing" as never, revision: 1 },
        },
      ],
    })

    expect(report.unattributed).toBe(1)
  })
})

/**
 * The reason this split exists, in one fixture: the same claim, at the same
 * confidence, judged by two hosts that disagree.
 *
 * `observedRate` is not a property of the model. Survival is what the Gate
 * allowed, so a report that pools two policies produces a number that describes
 * neither of them — and it moves when a host edits its configuration, which is
 * exactly when a reader would conclude the model had got worse.
 */
describe("calibrationOf, by the policy that judged", () => {
  it("splits one pooled rate into the two gates that produced it", async () => {
    const report = calibrationOf(merged(await runUnder(0.9, GENEROUS), await runUnder(0.9, STRICT)))

    /** Pooled, the model looks half right and badly overconfident. */
    expect(report.overall.judged).toBe(2)
    expect(report.overall.observedRate).toBe(0.5)
    expect(report.overall.gap).toBeCloseTo(0.4)

    /** Split, neither gate saw anything of the sort. */
    expect(segmentFor(report, "generous").overall.observedRate).toBe(1)
    expect(segmentFor(report, "generous").overall.gap).toBeCloseTo(-0.1)
    expect(segmentFor(report, "strict").overall.observedRate).toBe(0)
    expect(segmentFor(report, "strict").overall.gap).toBeCloseTo(0.9)
  })

  it("partitions every judged claim, so the segments sum to the whole", async () => {
    const report = calibrationOf(
      merged(
        await runUnder(0.9, GENEROUS),
        await runUnder(0.2, GENEROUS),
        await runUnder(0.9, STRICT)
      )
    )

    const judged = report.byPolicy.reduce((total, segment) => total + segment.overall.judged, 0)
    const survived = report.byPolicy.reduce((total, segment) => total + segment.overall.survived, 0)

    expect(judged).toBe(report.overall.judged)
    expect(survived).toBe(report.overall.survived)
  })

  it("bands a claim inside its segment the same way the whole report bands it", async () => {
    const report = calibrationOf(merged(await runUnder(0.9, GENEROUS), await runUnder(0.2, GENEROUS)))
    const segment = segmentFor(report, "generous")

    expect(segment.buckets).toHaveLength(10)
    expect(segment.buckets[9]?.judged).toBe(1)
    expect(segment.buckets[2]?.judged).toBe(1)
    expect(segment.buckets[9]?.observedRate).toBe(1)
    expect(segment.buckets[2]?.observedRate).toBe(0)
  })

  it("names one segment when one policy judged everything", async () => {
    const report = calibrationOf(merged(await runUnder(0.9, GENEROUS), await runUnder(0.2, GENEROUS)))

    expect(report.byPolicy).toHaveLength(1)
    expect(report.byPolicy[0]?.policyId).toBe("generous")
    expect(report.byPolicy[0]?.overall).toEqual(report.overall)
  })

  it("orders segments by name, with the unrecorded one last", async () => {
    const report = calibrationOf(
      merged(
        await runUnder(0.9, STRICT),
        await runUnder(0.9, GENEROUS),
        withDispositions(await runUnder(0.9, GENEROUS), forgetDisposition)
      )
    )

    expect(report.byPolicy.map((segment) => segment.policyId)).toEqual([
      "generous",
      "strict",
      null,
    ])
  })

  /**
   * Two different unknowns, kept apart. `null` is a gap in the reader — the page
   * began after the judgment. `UNATTRIBUTED_POLICY_ID` is a gap in the record: a
   * disposition really was written before the Gate named the policy that made
   * it. Merging them would let a fixed record keep reading as a short page.
   */
  it("keeps a judgment it never saw apart from one that never named its policy", async () => {
    const report = calibrationOf(
      merged(
        withDispositions(await runUnder(0.9, GENEROUS), forgetDisposition),
        withDispositions(await runUnder(0.9, GENEROUS), judgedBy(UNATTRIBUTED_POLICY_ID))
      )
    )

    expect(report.byPolicy).toHaveLength(2)
    expect(segmentFor(report, null).overall.judged).toBe(1)
    expect(segmentFor(report, UNATTRIBUTED_POLICY_ID).overall.judged).toBe(1)
  })

  /**
   * A held proposal carries a disposition and no verdict. Opening a segment for
   * it would put a policy on the page with nothing under it — a row claiming a
   * rate of nothing rather than an absence.
   */
  it("opens no segment for a policy that has judged nothing yet", async () => {
    const report = calibrationOf(await runUnder(0.5, GENEROUS))

    expect(report.unjudged["awaiting-answer"]).toBe(1)
    expect(report.byPolicy).toEqual([])
  })

  /** An undo is not the model's claim (0032), so it belongs to no policy's score. */
  it("leaves a change the runtime authored out of every segment", async () => {
    const harness = await harnessWith({ script: proposalScript(0.9), policy: GENEROUS })
    await commitIntent(harness.path, harness.intent)
    await revertRevision(harness.path, {
      treeId: harness.tree.treeId,
      revision: 1,
      seed: harness.tree,
      origin: "user-instruction",
    })

    const report = calibrationOf(await harness.fold())

    expect(report.runtimeAuthored).toBe(1)
    expect(report.byPolicy).toHaveLength(1)
    expect(segmentFor(report, "generous").overall.judged).toBe(1)
  })
})

/**
 * The hole 0047 left, and the reason 0048 exists. Segmenting by name is only as
 * good as the contract that a name identifies content — a host that edits a
 * policy in place produces one row pooling two gates, which is the exact error
 * the segments were built to correct, one level down.
 */
describe("calibrationOf, by what the policy contained", () => {
  /** Same name, different rules. Exactly what 0033 asked hosts not to do. */
  const GENEROUS_EDITED: GatePolicy = { ...GENEROUS, minimumConfidence: 0.5 }

  it("reports one ruleset when a name kept meaning one thing", async () => {
    const report = calibrationOf(merged(await runUnder(0.9, GENEROUS), await runUnder(0.2, GENEROUS)))
    const segment = segmentFor(report, "generous")

    expect(segment.fingerprints).toHaveLength(1)
    expect(segment.unfingerprinted).toBe(0)
    expect(rulesetContinuityOf(segment.fingerprints)).toBe("single")
  })

  it("sees two rulesets under one name when a host edited a policy without renaming it", async () => {
    const report = calibrationOf(
      merged(await runUnder(0.9, GENEROUS), await runUnder(0.9, GENEROUS_EDITED))
    )
    const segment = segmentFor(report, "generous")

    expect(segment.overall.judged).toBe(2)
    expect(segment.fingerprints).toHaveLength(2)
    expect(rulesetContinuityOf(segment.fingerprints)).toBe("changed")
  })

  it("does not call a renamed policy an edit", async () => {
    const renamed: GatePolicy = { ...GENEROUS, policyId: "generous-v2" }
    const report = calibrationOf(merged(await runUnder(0.9, GENEROUS), await runUnder(0.9, renamed)))

    expect(report.byPolicy.map((segment) => segment.policyId)).toEqual([
      "generous",
      "generous-v2",
    ])
    expect(segmentFor(report, "generous").fingerprints).toEqual(
      segmentFor(report, "generous-v2").fingerprints
    )
  })

  /** Fingerprints belong to the gate that produced them, like the verdicts do (0047). */
  it("keeps each gate's rulesets inside that gate's segment", async () => {
    const report = calibrationOf(merged(await runUnder(0.9, GENEROUS), await runUnder(0.9, STRICT)))

    expect(segmentFor(report, "generous").fingerprints).toHaveLength(1)
    expect(segmentFor(report, "strict").fingerprints).toHaveLength(1)
    expect(segmentFor(report, "generous").fingerprints).not.toEqual(
      segmentFor(report, "strict").fingerprints
    )
  })

  /**
   * The count is beside the list rather than in it. One fingerprint and three
   * judgments that named none is not a segment shown to be constant, and a list
   * of length one would say that it was.
   */
  it("counts a judgment that named no ruleset without letting it look like agreement", async () => {
    const report = calibrationOf(
      merged(
        await runUnder(0.9, GENEROUS),
        withDispositions(await runUnder(0.9, GENEROUS), forgetFingerprint)
      )
    )
    const segment = segmentFor(report, "generous")

    expect(segment.overall.judged).toBe(2)
    expect(segment.fingerprints).toHaveLength(1)
    expect(segment.unfingerprinted).toBe(1)
  })

  it("reads a segment where nothing was fingerprinted as unrecorded, not as agreement", async () => {
    const report = calibrationOf(
      withDispositions(await runUnder(0.9, GENEROUS), forgetFingerprint)
    )
    const segment = segmentFor(report, "generous")

    expect(segment.fingerprints).toEqual([])
    expect(segment.unfingerprinted).toBe(1)
    expect(rulesetContinuityOf(segment.fingerprints)).toBe("unrecorded")
  })

  /**
   * Two versions of Loom disagreeing about which knobs exist is not evidence that
   * a host edited anything. Reporting it as a change would make every upgrade
   * look like a configuration incident.
   */
  it("calls judgments from two versions of the policy schema incomparable", async () => {
    const report = calibrationOf(
      merged(
        await runUnder(0.9, GENEROUS),
        withDispositions(await runUnder(0.9, GENEROUS), underPolicyShape("00000000"))
      )
    )
    const segment = segmentFor(report, "generous")

    expect(segment.fingerprints).toHaveLength(2)
    expect(rulesetContinuityOf(segment.fingerprints)).toBe("incomparable")
  })

  it("sorts the rulesets, so two readings of one window list them the same way", async () => {
    const report = calibrationOf(
      merged(
        await runUnder(0.9, GENEROUS_EDITED),
        await runUnder(0.9, GENEROUS),
        await runUnder(0.2, GENEROUS_EDITED)
      )
    )
    const { fingerprints } = segmentFor(report, "generous")

    expect(fingerprints).toEqual([...fingerprints].sort())
  })
})

/**
 * And the rest of the sentence `fingerprints` starts. A segment with one
 * fingerprint was judged under one set of rules; whether it was judged by one
 * *write path* is a second question, because the two seams a composition root
 * hands over are deliberately not on the policy (0179, 0208).
 */
describe("calibrationOf, by which checks were in place", () => {
  it("reports one write path when nothing about the wiring moved", async () => {
    const report = calibrationOf(
      merged(await runUnder(0.9, GENEROUS), await runUnder(0.2, GENEROUS))
    )
    const segment = segmentFor(report, "generous")

    expect(segment.checkSets).toEqual([[]])
    expect(segment.unrecordedChecks).toBe(0)
    expect(checksContinuityOf(segment.checkSets)).toBe("single")
  })

  /**
   * The finding this closes, as a row of a real report: one name, one
   * fingerprint, two write paths. Everything a reader had before this field said
   * the gate held.
   */
  it("sees two write paths under one unchanged fingerprint", async () => {
    const report = calibrationOf(
      merged(
        await runUnder(0.9, GENEROUS),
        withDispositions(await runUnder(0.9, GENEROUS), underWiredChecks("props"))
      )
    )
    const segment = segmentFor(report, "generous")

    expect(segment.fingerprints).toHaveLength(1)
    expect(rulesetContinuityOf(segment.fingerprints)).toBe("single")

    expect(segment.checkSets).toEqual([[], ["props"]])
    expect(checksContinuityOf(segment.checkSets)).toBe("changed")
  })

  it("reads two spellings of one wiring as one write path", async () => {
    const report = calibrationOf(
      merged(
        withDispositions(await runUnder(0.9, GENEROUS), underWiredChecks("props", "bindings")),
        withDispositions(await runUnder(0.2, GENEROUS), underWiredChecks("bindings", "props"))
      )
    )
    const segment = segmentFor(report, "generous")

    expect(segment.checkSets).toEqual([["props", "bindings"]])
    expect(checksContinuityOf(segment.checkSets)).toBe("single")
  })

  /**
   * The count beside the sets rather than in them, which is `unfingerprinted`'s
   * bargain for its reason: one set and a judgment that recorded none is not a
   * segment shown to have been judged by one write path.
   */
  it("counts a judgment that recorded no checks without letting it look like agreement", async () => {
    const report = calibrationOf(
      merged(
        await runUnder(0.9, GENEROUS),
        withDispositions(await runUnder(0.9, GENEROUS), forgetWiredChecks)
      )
    )
    const segment = segmentFor(report, "generous")

    expect(segment.overall.judged).toBe(2)
    expect(segment.checkSets).toEqual([[]])
    expect(segment.unrecordedChecks).toBe(1)
  })

  it("reads a segment where nothing recorded its checks as unrecorded, not as agreement", async () => {
    const report = calibrationOf(
      withDispositions(await runUnder(0.9, GENEROUS), forgetWiredChecks)
    )
    const segment = segmentFor(report, "generous")

    expect(segment.checkSets).toEqual([])
    expect(segment.unrecordedChecks).toBe(1)
    expect(checksContinuityOf(segment.checkSets)).toBe("unrecorded")
  })

  it("sorts the write paths, so two readings of one window list them the same way", async () => {
    const report = calibrationOf(
      merged(
        withDispositions(await runUnder(0.9, GENEROUS), underWiredChecks("props")),
        await runUnder(0.9, GENEROUS),
        withDispositions(await runUnder(0.2, GENEROUS), underWiredChecks("props", "bindings"))
      )
    )
    const { checkSets } = segmentFor(report, "generous")

    expect(checkSets).toEqual([[], ["props"], ["props", "bindings"]])
  })
})
