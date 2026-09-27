import { describe, expect, it } from "vitest"

import {
  deltaIdSchema,
  intentIdSchema,
  proposalIdSchema,
  treeIdSchema,
  type DispositionKind,
  type DispositionReasonCode,
  type TreeDelta,
} from "@jam-overture/loom"
import type { EpisodeFold, IntentEpisode, ProposalEpisode } from "@jam-overture/loom/telemetry"

import {
  APPROVAL_RUN,
  headlineOf,
  looksStricterThanNeeded,
  NO_RECORD,
  readingOfRecord,
  recordFor,
  recordOfRules,
} from "./rule-record"
import type { PlainRule } from "./rules-view"

const treeId = treeIdSchema.parse("t_1")

/** Nothing here reads the delta, and an empty one says so rather than implying a change. */
const emptyDelta: TreeDelta = {
  deltaId: deltaIdSchema.parse("d_1"),
  treeId,
  baseRevision: 0,
  operations: [],
}

/**
 * A proposal described by what became of it. Every test here is about the
 * relationship between the rule that decided a change and what happened to the
 * change afterwards, so the builder takes those and nothing it can avoid.
 */
const proposal = ({
  id,
  code,
  kind = "requires-confirmation",
  held = false,
  answer,
  repairOf,
  committed = false,
}: {
  id: string
  code: DispositionReasonCode
  kind?: DispositionKind
  held?: boolean
  answer?: "confirmed" | "discarded"
  repairOf?: string
  committed?: boolean
}): ProposalEpisode => ({
  proposalId: proposalIdSchema.parse(id),
  ...(repairOf === undefined ? {} : { repairOf: proposalIdSchema.parse(repairOf) }),
  provenance: {
    origin: "user-instruction",
    interpreter: "test",
    authoredBy: "model",
    confidence: 0.8,
    interpretedAt: "2026-09-02T09:00:00.000Z",
  },
  rationale: `rationale for ${id}`,
  delta: emptyDelta,
  proposedAt: "2026-09-02T09:00:00.000Z",
  disposition: {
    kind,
    reason: { code, detail: `decided by ${code}` },
    stakes: "medium",
    reversible: true,
    confidence: 0.8,
    policyId: "portal",
  },
  held,
  repairRequested: false,
  ...(answer === undefined ? {} : { answer, answeredBy: "jo" }),
  ...(committed ? { committedRevision: 3 } : {}),
})

/** One intent per proposal — the shape of unrelated asks. */
const foldOf = (...proposals: readonly ProposalEpisode[]): EpisodeFold => ({
  episodes: proposals.map(
    (single, index): IntentEpisode => ({
      intentId: intentIdSchema.parse(`i_${index + 1}`),
      treeId,
      startedAt: "2026-09-02T09:00:00.000Z",
      proposals: [single],
      resolution: { kind: "open" },
    })
  ),
  unattributed: [],
})

/** One intent holding several proposals — the shape a repair chain arrives in (0006). */
const oneEpisode = (...proposals: readonly ProposalEpisode[]): EpisodeFold => ({
  episodes: [
    {
      intentId: intentIdSchema.parse("i_1"),
      treeId,
      startedAt: "2026-09-02T09:00:00.000Z",
      proposals,
      resolution: { kind: "open" },
    },
  ],
  unattributed: [],
})

const rule = (over: Partial<PlainRule> = {}): PlainRule => ({
  id: "ceiling",
  title: "How much Loom may do without asking you",
  reading: "…",
  outcome: "requires-confirmation",
  rows: [],
  settings: [],
  code: "stakes-above-ceiling",
  ...over,
})

const refusalRule = rule({
  id: "never",
  outcome: "rejected",
  code: "stakes-at-refusal-floor",
})

/**
 * The one entry with no outcome and no code. Written out rather than spread over
 * `rule()`, because `exactOptionalPropertyTypes` is the difference between a
 * property that is absent and one set to `undefined` — and absent is what the
 * measurement is.
 */
const measurement: PlainRule = {
  id: "how-risk-is-measured",
  title: "How Loom decides a change is risky in the first place",
  reading: "This one refuses nothing by itself.",
  rows: [],
  settings: [],
}

describe("recordOfRules", () => {
  it("counts a decision under the rule the Gate recorded as its reason", () => {
    const record = recordOfRules(
      foldOf(
        proposal({ id: "p_1", code: "stakes-above-ceiling", held: true }),
        proposal({ id: "p_2", code: "confidence-below-minimum", held: true })
      )
    )

    expect(record.byCode["stakes-above-ceiling"]?.fired).toBe(1)
    expect(record.byCode["confidence-below-minimum"]?.fired).toBe(1)
    expect(record.judged).toBe(2)
  })

  /**
   * `within-policy` is what the Gate records when nothing objected, so it is the
   * headline rather than a rule. Counting it as one would put a card on the
   * screen for the absence of a rule and give it a fired count larger than every
   * real one.
   */
  it("keeps changes nothing objected to out of the rules and in the headline", () => {
    const record = recordOfRules(
      foldOf(
        proposal({ id: "p_1", code: "within-policy", kind: "accepted", committed: true }),
        proposal({ id: "p_2", code: "within-policy", kind: "accepted", committed: true }),
        proposal({ id: "p_3", code: "irreversible", held: true })
      )
    )

    expect(record.wentAhead).toBe(2)
    expect(record.judged).toBe(3)
    expect(record.byCode["within-policy"]).toBeUndefined()
  })

  it("counts nothing for a proposal that was never judged", () => {
    const unjudged: ProposalEpisode = {
      proposalId: proposalIdSchema.parse("p_9"),
      provenance: {
        origin: "user-instruction",
        interpreter: "test",
        authoredBy: "model",
        confidence: 0.8,
        interpretedAt: "2026-09-02T09:00:00.000Z",
      },
      rationale: "never reached the Gate",
      delta: emptyDelta,
      proposedAt: "2026-09-02T09:00:00.000Z",
      held: false,
      repairRequested: false,
    }

    const record = recordOfRules(foldOf(unjudged))

    expect(record.judged).toBe(0)
    expect(record.wentAhead).toBe(0)
    expect(record.byCode).toEqual({})
  })

  it("splits what a person did with a hold from what nobody could do with it", () => {
    const record = recordOfRules(
      foldOf(
        proposal({ id: "p_1", code: "irreversible", held: true, answer: "confirmed" }),
        proposal({ id: "p_2", code: "irreversible", held: true, answer: "discarded" }),
        proposal({ id: "p_3", code: "irreversible", held: true }),
        /* Held by the Gate, and custody did not survive: nothing will ever answer it. */
        proposal({ id: "p_4", code: "irreversible", held: false })
      )
    )

    expect(record.byCode.irreversible).toEqual({
      fired: 4,
      rescued: 0,
      saidYes: 1,
      saidNo: 1,
      waiting: 1,
      lost: 1,
    })
  })

  it("counts a refusal the AI got past on a second attempt", () => {
    const record = recordOfRules(
      oneEpisode(
        proposal({ id: "p_1", code: "confidence-below-floor", kind: "rejected" }),
        proposal({
          id: "p_2",
          code: "within-policy",
          kind: "accepted",
          repairOf: "p_1",
          committed: true,
        })
      )
    )

    expect(record.byCode["confidence-below-floor"]).toMatchObject({ fired: 1, rescued: 1 })
    expect(record.wentAhead).toBe(1)
  })

  /**
   * A repair that was itself refused rescued nothing. The distinction is the
   * whole point of the count: a rule the AI can always work around is a rule
   * that costs a round trip, and a rule nothing gets past is a rule that stops
   * people.
   */
  it("does not count a repair that never went through", () => {
    const record = recordOfRules(
      oneEpisode(
        proposal({ id: "p_1", code: "confidence-below-floor", kind: "rejected" }),
        proposal({ id: "p_2", code: "confidence-below-floor", kind: "rejected", repairOf: "p_1" })
      )
    )

    expect(record.byCode["confidence-below-floor"]).toMatchObject({ fired: 2, rescued: 0 })
  })
})

describe("recordFor", () => {
  it("gives a rule that has never fired an empty record rather than nothing", () => {
    const record = recordOfRules(foldOf())

    expect(recordFor(record, rule())).toEqual(NO_RECORD)
  })

  it("gives the measurement an empty record, because it is never a reason", () => {
    const record = recordOfRules(
      foldOf(proposal({ id: "p_1", code: "stakes-above-ceiling", held: true }))
    )

    expect(recordFor(record, measurement)).toEqual(NO_RECORD)
  })
})

describe("readingOfRecord", () => {
  it("says a rule has not come up rather than printing a zero", () => {
    expect(readingOfRecord(rule(), NO_RECORD)).toBe("This has not come up yet.")
  })

  it("says the measurement is never recorded as a reason", () => {
    expect(readingOfRecord(measurement, NO_RECORD)).toContain("decides nothing on its own")
  })

  it("reads a refusal by whether anything got through afterwards", () => {
    expect(readingOfRecord(refusalRule, { ...NO_RECORD, fired: 3 })).toBe(
      "Turned down 3 changes. Nothing got through afterwards."
    )
    expect(readingOfRecord(refusalRule, { ...NO_RECORD, fired: 3, rescued: 2 })).toBe(
      "Turned down 3 changes. On 2 of them the AI tried again with something allowed, and that went through."
    )
    expect(readingOfRecord(refusalRule, { ...NO_RECORD, fired: 2, rescued: 2 })).toContain(
      "On each of them"
    )
  })

  it("reads a hold by what the person did with it", () => {
    expect(
      readingOfRecord(rule(), { ...NO_RECORD, fired: 3, saidYes: 2, saidNo: 1 })
    ).toBe("Stopped to ask you about 3 changes — you said yes to 2, you said no to 1.")
  })

  /**
   * The sentence has to add up, and it only can if it names the holds nobody
   * could answer. A reading that said "asked you about 3 — you said yes to 2"
   * leaves a reader looking for a third change that is not in the queue and
   * never will be.
   */
  it("names the holds that reached nobody rather than losing them in the total", () => {
    expect(readingOfRecord(rule(), { ...NO_RECORD, fired: 3, saidYes: 1, waiting: 1, lost: 1 })).toBe(
      "Stopped to ask you about 3 changes — you said yes to 1, 1 still waiting, 1 never reached anybody."
    )
  })

  it("counts one change as one change", () => {
    expect(readingOfRecord(refusalRule, { ...NO_RECORD, fired: 1 })).toContain("1 change.")
    expect(readingOfRecord(rule(), { ...NO_RECORD, fired: 1, saidYes: 1 })).toContain("1 change —")
  })
})

describe("headlineOf", () => {
  const headline = (judged: number, wentAhead: number) =>
    headlineOf({ byCode: {}, judged, wentAhead })

  it("says nothing has been judged rather than printing a zero", () => {
    expect(headline(0, 0)).toContain("Nothing has been judged against them yet")
  })

  /**
   * The defect a screenshot found: "and the rest ran into one of the rules
   * below" over a record where the rest was one change. Every arithmetic case
   * gets a reading, because three of the four only occur on a deployment
   * somebody has used.
   */
  it("counts what ran into a rule rather than calling it the rest", () => {
    expect(headline(4, 3)).toBe(
      "4 changes have been judged: 3 went ahead with nothing objecting, and 1 ran into one of the rules below."
    )
    expect(headline(9, 4)).toContain("and 5 ran into one of the rules below")
  })

  it("says so plainly when nothing objected to any of them", () => {
    expect(headline(3, 3)).toBe("All 3 changes judged so far went ahead with nothing objecting.")
    expect(headline(1, 1)).toBe("All 1 change judged so far went ahead with nothing objecting.")
  })

  it("says so plainly when every one of them ran into a rule", () => {
    expect(headline(2, 0)).toBe(
      "2 changes have been judged, and every one of them ran into one of the rules below."
    )
    expect(headline(1, 0)).toContain("1 change has been judged")
  })
})

describe("looksStricterThanNeeded", () => {
  it("says so only after a run of approvals with nothing else in it", () => {
    const approved = { ...NO_RECORD, fired: APPROVAL_RUN, saidYes: APPROVAL_RUN }

    expect(looksStricterThanNeeded(rule(), approved)).toBe(true)
    expect(looksStricterThanNeeded(rule(), { ...approved, saidYes: APPROVAL_RUN - 1, fired: APPROVAL_RUN - 1 })).toBe(
      false
    )
  })

  it("stays quiet while a hold is unanswered, and once somebody has said no", () => {
    const approved = { ...NO_RECORD, fired: APPROVAL_RUN, saidYes: APPROVAL_RUN }

    expect(looksStricterThanNeeded(rule(), { ...approved, waiting: 1 })).toBe(false)
    expect(looksStricterThanNeeded(rule(), { ...approved, lost: 1 })).toBe(false)
    expect(looksStricterThanNeeded(rule(), { ...approved, saidNo: 1 })).toBe(false)
  })

  /**
   * A refusal is never approved, so a rule that refuses can never earn this
   * sentence — and a check that only counted `saidYes` would say nothing about
   * it either way, which is the same answer for the wrong reason.
   */
  it("never says it about a rule that refuses, which nobody is ever asked about", () => {
    expect(
      looksStricterThanNeeded(refusalRule, { ...NO_RECORD, fired: 9, saidYes: 9 })
    ).toBe(false)
  })
})
