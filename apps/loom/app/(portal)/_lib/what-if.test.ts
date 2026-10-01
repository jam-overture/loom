import { describe, expect, it } from "vitest"

import {
  defaultGatePolicy,
  deltaIdSchema,
  ESCALATION_LADDER,
  intentIdSchema,
  policyFingerprintOf,
  proposalIdSchema,
  treeIdSchema,
  type DispositionKind,
  type DispositionReasonCode,
  type GatePolicy,
  type IntentOrigin,
  type StakeFactorCode,
  type StakeLevel,
  type TreeDelta,
} from "@jam-overture/loom"
import type { EpisodeFold, IntentEpisode, ProposalEpisode } from "@jam-overture/loom/telemetry"

import {
  gameplanOf,
  judge,
  LADDER_AS_REPLAYED,
  movementOf,
  replayFrom,
  type JudgedChange,
} from "./what-if"

const treeId = treeIdSchema.parse("t_1")

const emptyDelta: TreeDelta = {
  deltaId: deltaIdSchema.parse("d_1"),
  treeId,
  baseRevision: 0,
  operations: [],
}

const change = (over: Partial<JudgedChange> = {}): JudgedChange => ({
  proposalId: proposalIdSchema.parse("p_1"),
  origin: "user-instruction",
  confidence: 0.9,
  stakes: "low",
  reversible: true,
  factors: [],
  recorded: { kind: "accepted", code: "within-policy" },
  answer: undefined,
  held: false,
  asked: "make the heading friendlier",
  at: "2026-10-01T09:00:00.000Z",
  ...over,
})

/**
 * A judged proposal, described by the handful of fields a replay reads.
 *
 * `factors` is deliberately a three-way choice rather than a list with a
 * default: the whole point of several tests below is the difference between
 * *no factors were weighed* and *the record does not say*, and a builder that
 * could not express the second would make them unwritable.
 */
const proposal = ({
  id,
  kind,
  code,
  stakes = "low",
  confidence = 0.9,
  reversible = true,
  origin = "user-instruction",
  factors = [],
  fingerprint,
  held = false,
  answer,
}: {
  id: string
  kind: DispositionKind
  code: DispositionReasonCode
  stakes?: StakeLevel
  confidence?: number
  reversible?: boolean
  origin?: IntentOrigin
  factors?: readonly StakeFactorCode[] | "unrecorded"
  fingerprint?: string
  held?: boolean
  answer?: "confirmed" | "discarded"
}): ProposalEpisode => ({
  proposalId: proposalIdSchema.parse(id),
  provenance: {
    origin,
    interpreter: "test",
    authoredBy: "model",
    confidence,
    interpretedAt: "2026-10-01T09:00:00.000Z",
  },
  rationale: `what ${id} asked for`,
  delta: emptyDelta,
  proposedAt: "2026-10-01T09:00:00.000Z",
  assessment: {
    proposalId: proposalIdSchema.parse(id),
    stakes,
    reversible,
    operationCount: 1,
    insertedNodeCount: 0,
    removedNodeCount: 0,
    movedNodeCount: 0,
    configuredNodeCount: 1,
    touchedPrimitiveTypes: [],
    shallowestAffectedDepth: 2,
    retainedNodeCount: 0,
    irreversibilityReasons: [],
    ...(factors === "unrecorded" ? {} : { stakeFactorCodes: factors }),
  },
  disposition: {
    kind,
    reason: { code, detail: `decided by ${code}` },
    stakes,
    reversible,
    confidence,
    policyId: "portal",
    ...(fingerprint === undefined ? {} : { policyFingerprint: fingerprint }),
  },
  held,
  repairRequested: false,
  ...(answer === undefined ? {} : { answer, answeredBy: "jo" }),
})

const foldOf = (...proposals: readonly ProposalEpisode[]): EpisodeFold => ({
  episodes: proposals.map(
    (single, index): IntentEpisode => ({
      intentId: intentIdSchema.parse(`i_${index + 1}`),
      treeId,
      startedAt: "2026-10-01T09:00:00.000Z",
      proposals: [single],
      resolution: { kind: "open" },
    })
  ),
  unattributed: [],
})

const policy: GatePolicy = defaultGatePolicy
const fingerprint = policyFingerprintOf(policy)

const looser = (over: Partial<GatePolicy>): GatePolicy => ({ ...policy, ...over })

describe("the ladder this screen replays", () => {
  /**
   * **The guard the whole screen rests on.**
   *
   * A rung added to the Gate that this module does not know about would not
   * break anything visibly: the replay would go on reproducing most verdicts,
   * the self-check would quietly set aside the handful it got wrong, and the
   * gameplan would answer confidently about a rule it had never heard of.
   * Holding the derived list against the runtime's own derived list is what
   * turns that into a failing test on the day the rung lands.
   */
  it("is the runtime's ladder, in the runtime's order", () => {
    expect(LADDER_AS_REPLAYED).toEqual(ESCALATION_LADDER)
  })

  it("has a rung for every code but the acceptance", () => {
    expect(LADDER_AS_REPLAYED).not.toContain("within-policy")
  })
})

describe("judging one change again", () => {
  it("lets through a change nothing objects to", () => {
    expect(judge(change(), policy)).toEqual({ kind: "accepted", code: "within-policy" })
  })

  it("turns down a change the AI believes in less than the floor", () => {
    expect(judge(change({ confidence: 0.2 }), policy)).toEqual({
      kind: "rejected",
      code: "confidence-below-floor",
    })
  })

  it("asks about a change the AI is not sure enough to make alone", () => {
    expect(judge(change({ confidence: 0.5 }), policy)).toEqual({
      kind: "requires-confirmation",
      code: "confidence-below-minimum",
    })
  })

  it("turns down a change at the line nothing may cross", () => {
    expect(judge(change({ stakes: "critical" }), policy)).toEqual({
      kind: "rejected",
      code: "stakes-at-refusal-floor",
    })
  })

  it("asks about a change above the ceiling for whoever asked", () => {
    expect(judge(change({ stakes: "high" }), policy)).toEqual({
      kind: "requires-confirmation",
      code: "stakes-above-ceiling",
    })
  })

  it("gives a developer the latitude the policy gives a developer", () => {
    expect(judge(change({ stakes: "high", origin: "developer" }), policy)).toEqual({
      kind: "accepted",
      code: "within-policy",
    })
  })

  it("asks about a change that cannot be cleanly undone, however small", () => {
    expect(judge(change({ reversible: false }), policy)).toEqual({
      kind: "requires-confirmation",
      code: "irreversible",
    })
  })

  it.each([
    ["discards-later-work"],
    ["redirected-submission"],
    ["repointed-binding"],
  ] as const)("asks about a change weighed as %s whatever the ceiling allows", (factor) => {
    expect(judge(change({ factors: [factor] }), looser({ refusalFloor: "critical" }))).toEqual({
      kind: "requires-confirmation",
      code: factor,
    })
  })

  /**
   * Precedence, not merely the set. A change that breaks two rules is recorded
   * under one of them, so a replay that knew the right rungs in the wrong order
   * would move counts between rows and leave every total correct — which is the
   * quietest way for this screen to be wrong.
   */
  it("records the first rung that fires and not the worst thing about the change", () => {
    const both = change({ confidence: 0.1, stakes: "critical" })

    expect(judge(both, policy).code).toBe("confidence-below-floor")
  })

  it("puts the line nothing may cross above being unable to undo it", () => {
    const both = change({ stakes: "critical", reversible: false })

    expect(judge(both, policy).code).toBe("stakes-at-refusal-floor")
  })

  it("puts being unable to undo it above the ceiling for whoever asked", () => {
    const both = change({ stakes: "high", reversible: false })

    expect(judge(both, policy).code).toBe("irreversible")
  })
})

describe("reading the record back", () => {
  it("keeps a change whose recorded verdict it reproduces", () => {
    const replay = replayFrom(
      foldOf(
        proposal({
          id: "p_1",
          kind: "requires-confirmation",
          code: "confidence-below-minimum",
          confidence: 0.5,
          fingerprint,
        })
      ),
      policy
    )

    expect(replay.changes).toHaveLength(1)
    expect(replay.judged).toBe(1)
    expect(replay.setAside).toEqual({
      "judged-under-other-rules": 0,
      "not-enough-recorded": 0,
      "did-not-reproduce": 0,
    })
  })

  it("never counts a proposal nothing judged", () => {
    const unjudged: ProposalEpisode = {
      proposalId: proposalIdSchema.parse("p_9"),
      provenance: {
        origin: "user-instruction",
        interpreter: "test",
        authoredBy: "model",
        confidence: 0.9,
        interpretedAt: "2026-10-01T09:00:00.000Z",
      },
      rationale: "never got as far as a verdict",
      delta: emptyDelta,
      proposedAt: "2026-10-01T09:00:00.000Z",
      held: false,
      repairRequested: false,
    }

    const replay = replayFrom(foldOf(unjudged), policy)

    expect(replay.judged).toBe(0)
    expect(replay.changes).toEqual([])
  })

  it("sets aside a change judged under a different policy", () => {
    const replay = replayFrom(
      foldOf(
        proposal({
          id: "p_1",
          kind: "accepted",
          code: "within-policy",
          fingerprint: "something-else",
        })
      ),
      policy
    )

    expect(replay.changes).toEqual([])
    expect(replay.judged).toBe(1)
    expect(replay.setAside["judged-under-other-rules"]).toBe(1)
  })

  /**
   * A judgment recorded before the Gate fingerprinted policies carries none,
   * and the conservative reading is the only safe one: an unidentified policy
   * is not evidence that *this* policy decided anything.
   */
  it("sets aside a change whose judgment names no policy at all", () => {
    const replay = replayFrom(
      foldOf(proposal({ id: "p_1", kind: "accepted", code: "within-policy" })),
      policy
    )

    expect(replay.setAside["judged-under-other-rules"]).toBe(1)
  })

  /**
   * **The absence is refused on its own, not rescued by the self-check.**
   *
   * This case is built so the self-check would pass: the recorded verdict is
   * the acceptance, and reading the missing factors as "none were weighed"
   * would reproduce it exactly. It is still set aside, because three rungs read
   * that list and all three hold a change *whatever the dials say* — a gameplan
   * missing them would report that loosening a ceiling releases changes which
   * would in fact still be held.
   */
  it("sets aside a change whose record does not say what was weighed, even where guessing would reproduce it", () => {
    const replay = replayFrom(
      foldOf(
        proposal({
          id: "p_1",
          kind: "accepted",
          code: "within-policy",
          factors: "unrecorded",
          fingerprint,
        })
      ),
      policy
    )

    expect(replay.changes).toEqual([])
    expect(replay.setAside["not-enough-recorded"]).toBe(1)
  })

  it("sets aside a change it cannot reproduce, and says that is what happened", () => {
    const replay = replayFrom(
      foldOf(
        proposal({
          id: "p_1",
          kind: "rejected",
          code: "stakes-at-refusal-floor",
          stakes: "low",
          fingerprint,
        })
      ),
      policy
    )

    expect(replay.changes).toEqual([])
    expect(replay.setAside["did-not-reproduce"]).toBe(1)
  })

  /**
   * The rule rather than only the kind. A verdict with the right kind and the
   * wrong rule is a misread rung that happens to land on the same answer, and
   * it is exactly the drift this check exists to catch.
   */
  it("sets aside a change whose answer is right for the wrong rule", () => {
    const replay = replayFrom(
      foldOf(
        proposal({
          id: "p_1",
          kind: "requires-confirmation",
          code: "irreversible",
          reversible: true,
          stakes: "high",
          fingerprint,
        })
      ),
      policy
    )

    expect(replay.setAside["did-not-reproduce"]).toBe(1)
  })

  it("counts every judged change, including the ones it set aside", () => {
    const replay = replayFrom(
      foldOf(
        proposal({ id: "p_1", kind: "accepted", code: "within-policy", fingerprint }),
        proposal({ id: "p_2", kind: "accepted", code: "within-policy" }),
        proposal({
          id: "p_3",
          kind: "accepted",
          code: "within-policy",
          factors: "unrecorded",
          fingerprint,
        })
      ),
      policy
    )

    expect(replay.judged).toBe(3)
    expect(replay.changes).toHaveLength(1)
  })
})

describe("where a change would end up", () => {
  it.each([
    ["accepted", "accepted", "unchanged"],
    ["requires-confirmation", "accepted", "goes-ahead"],
    ["rejected", "accepted", "goes-ahead"],
    ["accepted", "requires-confirmation", "asks-you"],
    ["rejected", "requires-confirmation", "asks-you"],
    ["accepted", "rejected", "turned-down"],
    ["requires-confirmation", "rejected", "turned-down"],
    ["rejected", "rejected", "unchanged"],
    ["requires-confirmation", "requires-confirmation", "unchanged"],
  ] as const)("reads %s becoming %s as %s", (was, would, movement) => {
    expect(movementOf(was, would)).toBe(movement)
  })
})

describe("the gameplan", () => {
  const held = (id: string, answer?: "confirmed" | "discarded") =>
    proposal({
      id,
      kind: "requires-confirmation",
      code: "confidence-below-minimum",
      confidence: 0.6,
      fingerprint,
      held: true,
      ...(answer === undefined ? {} : { answer }),
    })

  const replay = () =>
    replayFrom(foldOf(held("p_1", "discarded"), held("p_2", "confirmed"), held("p_3")), policy)

  it("moves nothing while the settings are the ones you have", () => {
    const plan = gameplanOf(replay(), policy)

    expect(plan.moved).toEqual([])
    expect(plan.unchanged).toBe(3)
    expect(plan.weighed).toBe(3)
  })

  it("releases the changes a lower threshold would no longer have held", () => {
    const plan = gameplanOf(replay(), looser({ minimumConfidence: 0.5 }))

    expect(plan.moved).toHaveLength(3)
    expect(plan.moved.every((entry) => entry.movement === "goes-ahead")).toBe(true)
    expect(plan.unchanged).toBe(0)
  })

  /**
   * The number the screen exists for. A loosening always reads as time saved;
   * only this says whether the time saved was spent saying no.
   */
  it("counts the released changes somebody had turned down", () => {
    const plan = gameplanOf(replay(), looser({ minimumConfidence: 0.5 }))

    expect(plan.againstYourNo).toBe(1)
  })

  it("counts the released changes still waiting for an answer", () => {
    const plan = gameplanOf(replay(), looser({ minimumConfidence: 0.5 }))

    expect(plan.offYourQueue).toBe(1)
  })

  it("counts neither against a change that would still be held", () => {
    const plan = gameplanOf(replay(), looser({ minimumConfidence: 0.65 }))

    expect(plan.moved).toEqual([])
    expect(plan.againstYourNo).toBe(0)
    expect(plan.offYourQueue).toBe(0)
  })

  it("holds more when a ceiling comes down", () => {
    const fold = foldOf(
      proposal({ id: "p_1", kind: "accepted", code: "within-policy", stakes: "medium", fingerprint })
    )
    const plan = gameplanOf(
      replayFrom(fold, policy),
      looser({ autoApplyCeiling: { ...policy.autoApplyCeiling, "user-instruction": "low" } })
    )

    expect(plan.moved).toHaveLength(1)
    expect(plan.moved[0]?.movement).toBe("asks-you")
    expect(plan.moved[0]?.would.code).toBe("stakes-above-ceiling")
  })

  it("turns down what a lower refusal floor would refuse", () => {
    const fold = foldOf(
      proposal({ id: "p_1", kind: "accepted", code: "within-policy", stakes: "medium", fingerprint })
    )
    const plan = gameplanOf(replayFrom(fold, policy), looser({ refusalFloor: "medium" }))

    expect(plan.moved[0]?.movement).toBe("turned-down")
    expect(plan.moved[0]?.would.code).toBe("stakes-at-refusal-floor")
  })

  it("weighs nothing when nothing reproduced", () => {
    const plan = gameplanOf(
      { changes: [], judged: 4, setAside: { "judged-under-other-rules": 4, "not-enough-recorded": 0, "did-not-reproduce": 0 } },
      looser({ minimumConfidence: 0.5 })
    )

    expect(plan.weighed).toBe(0)
    expect(plan.moved).toEqual([])
  })
})
