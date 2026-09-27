import { describe, expect, it } from "vitest"

import {
  deltaIdSchema,
  intentIdSchema,
  proposalIdSchema,
  treeIdSchema,
  type DispositionReasonCode,
  type ProposalId,
  type TreeDelta,
} from "@jam-overture/loom"
import {
  calibrationOf,
  type ConfidenceBucket,
  type EpisodeFailure,
  type EpisodeFold,
  type IntentEpisode,
  type ProposalEpisode,
} from "@jam-overture/loom/telemetry"

import {
  contradictedBands,
  groupMisses,
  missesOf,
  MISS_THRESHOLD,
  pagesInMisses,
  pagesWithMisses,
  surpriseOf,
} from "./calibration-misses"
import { isOnTheMark } from "./calibration-view"

const treeId = treeIdSchema.parse("t_1")

/** No operations: nothing here reads the delta, and an empty one says so. */
const emptyDelta: TreeDelta = {
  deltaId: deltaIdSchema.parse("d_1"),
  treeId,
  baseRevision: 0,
  operations: [],
}

const brokeOnCommit: EpisodeFailure = {
  stage: "commit",
  code: "store-unavailable",
  detail: "broke",
}

/**
 * A proposal, described by what became of it rather than by every field the
 * fold carries. Every test here is about the relationship between a confidence
 * and an outcome, so the builder takes those two and nothing else it can help.
 */
type Outcome = "survived" | "refused" | "discarded" | "held" | "failed"

const proposal = ({
  id,
  confidence,
  outcome,
  code = "confidence-below-floor",
  authoredBy = "model",
  repairOf,
  proposedAt = "2026-08-17T09:00:00.000Z",
}: {
  id: string
  confidence: number
  outcome: Outcome
  code?: DispositionReasonCode
  authoredBy?: "model" | "runtime"
  repairOf?: string
  proposedAt?: string
}): ProposalEpisode => {
  const refused = outcome === "refused"
  /* A discard is a hold a human answered, so it carries a disposition too. */
  const judged = refused || outcome === "discarded" || outcome === "survived"

  return {
    proposalId: proposalIdSchema.parse(id),
    ...(repairOf === undefined ? {} : { repairOf: proposalIdSchema.parse(repairOf) }),
    provenance: {
      origin: "user-instruction",
      interpreter: "test",
      authoredBy,
      confidence,
      interpretedAt: proposedAt,
    },
    rationale: `rationale for ${id}`,
    delta: emptyDelta,
    proposedAt,
    ...(judged
      ? {
          disposition: {
            kind: refused ? ("rejected" as const) : ("requires-confirmation" as const),
            reason: { code, detail: `the gate said ${code}` },
            stakes: "medium" as const,
            reversible: true,
            confidence,
            policyId: "portal",
          },
        }
      : {}),
    held: outcome === "held",
    repairRequested: false,
    ...(outcome === "discarded" ? { answer: "discarded" as const, answeredBy: "jo" } : {}),
    ...(outcome === "survived" ? { committedRevision: 3 } : {}),
    ...(outcome === "failed" ? { failure: brokeOnCommit } : {}),
  }
}

const foldOf = (...proposals: readonly ProposalEpisode[]): EpisodeFold => ({
  episodes: proposals.map(
    (single, index): IntentEpisode => ({
      intentId: intentIdSchema.parse(`i_${index + 1}`),
      treeId,
      startedAt: single.proposedAt,
      proposals: [single],
      resolution: { kind: "open" },
    })
  ),
  unattributed: [],
})

/** All of one intent's proposals together, which is how a repair chain arrives. */
const oneEpisode = (...proposals: readonly ProposalEpisode[]): EpisodeFold => ({
  episodes: [
    {
      intentId: intentIdSchema.parse("i_1"),
      treeId,
      startedAt: "2026-08-17T09:00:00.000Z",
      proposals,
      resolution: { kind: "open" },
    },
  ],
  unattributed: [],
})

describe("surpriseOf", () => {
  /**
   * A confidence is a stated probability of surviving, so the error is measured
   * against what happened rather than against the other claims. Anything else
   * would make one claim's score depend on the window it was read in.
   */
  it("measures a claim against its own outcome", () => {
    expect(surpriseOf(0.95, "rejected")).toBeCloseTo(0.95)
    expect(surpriseOf(0.95, "survived")).toBeCloseTo(0.05)
    expect(surpriseOf(0.2, "survived")).toBeCloseTo(0.8)
    expect(surpriseOf(0.2, "rejected")).toBeCloseTo(0.2)
  })
})

describe("missesOf", () => {
  it("keeps a confident claim that was refused", () => {
    const misses = missesOf(foldOf(proposal({ id: "p_1", confidence: 0.9, outcome: "refused" })))

    expect(misses).toHaveLength(1)
    expect(misses[0]?.direction).toBe("overconfident")
    expect(misses[0]?.surprise).toBeCloseTo(0.9)
  })

  it("keeps a hedged claim that survived, and names it the other way round", () => {
    const misses = missesOf(foldOf(proposal({ id: "p_1", confidence: 0.15, outcome: "survived" })))

    expect(misses[0]?.direction).toBe("underconfident")
    expect(misses[0]?.cause).toBe("survived-anyway")
  })

  /**
   * The threshold is the meaning of the number, not a taste setting: below it
   * the outcome is what the claim predicted. A page that listed a 0.3 refusal as
   * a miss would be calling the model wrong for being right.
   */
  it("leaves a claim whose outcome matched its own estimate alone", () => {
    const fold = foldOf(
      proposal({ id: "p_1", confidence: 0.3, outcome: "refused" }),
      proposal({ id: "p_2", confidence: 0.8, outcome: "survived" })
    )

    expect(missesOf(fold)).toEqual([])
  })

  it("does not count a claim sitting exactly on the threshold", () => {
    const fold = foldOf(proposal({ id: "p_1", confidence: MISS_THRESHOLD, outcome: "refused" }))

    expect(missesOf(fold)).toEqual([])
  })

  /**
   * 0031 excludes both from the score. A list that included them would be a list
   * of claims the table beside it never counted, and the two would be describing
   * different windows while looking like one page.
   */
  it("drops the claims the report itself never scores", () => {
    const fold = foldOf(
      proposal({ id: "p_1", confidence: 1, outcome: "refused", authoredBy: "runtime" }),
      proposal({ id: "p_2", confidence: 0.95, outcome: "held" }),
      proposal({ id: "p_3", confidence: 0.95, outcome: "failed" })
    )

    expect(missesOf(fold)).toEqual([])
    expect(calibrationOf(fold).overall.judged).toBe(0)
  })

  /** Infrastructure having a bad day is not the model being overconfident. */
  it("is a subset of what the report judged", () => {
    const fold = foldOf(
      proposal({ id: "p_1", confidence: 0.9, outcome: "refused" }),
      proposal({ id: "p_2", confidence: 0.9, outcome: "failed" }),
      proposal({ id: "p_3", confidence: 0.1, outcome: "survived" })
    )

    expect(missesOf(fold)).toHaveLength(2)
    expect(calibrationOf(fold).overall.judged).toBe(2)
  })

  it("ranks the wrongest claim first", () => {
    const misses = missesOf(
      foldOf(
        proposal({ id: "p_1", confidence: 0.7, outcome: "refused" }),
        proposal({ id: "p_2", confidence: 0.99, outcome: "refused" }),
        proposal({ id: "p_3", confidence: 0.85, outcome: "refused" })
      )
    )

    expect(misses.map((miss) => miss.proposalId)).toEqual(["p_2", "p_3", "p_1"])
  })

  it("breaks a tie towards the more recent claim", () => {
    const misses = missesOf(
      foldOf(
        proposal({ id: "p_1", confidence: 0.9, outcome: "refused", proposedAt: "2026-08-01T00:00:00.000Z" }),
        proposal({ id: "p_2", confidence: 0.9, outcome: "refused", proposedAt: "2026-08-17T00:00:00.000Z" })
      )
    )

    expect(misses.map((miss) => miss.proposalId)).toEqual(["p_2", "p_1"])
  })

  /**
   * The discard is the only judgment in the journal made from outside the
   * system, and it arrives wearing a disposition — the Gate held it, which is
   * how a human saw it at all. Reading the reason code first would file it under
   * whichever rule caused the hold and lose it.
   */
  it("credits a discard to the human, not to the rule that caused the hold", () => {
    const misses = missesOf(
      foldOf(
        proposal({
          id: "p_1",
          confidence: 0.9,
          outcome: "discarded",
          code: "stakes-above-ceiling",
        })
      )
    )

    expect(misses[0]?.cause).toBe("discarded-by-human")
    expect(misses[0]?.answeredBy).toBe("jo")
  })

  it("names the rule a refusal was made under", () => {
    const misses = missesOf(
      foldOf(proposal({ id: "p_1", confidence: 0.9, outcome: "refused", code: "irreversible" }))
    )

    expect(misses[0]?.cause).toBe("irreversible")
    expect(misses[0]?.detail).toBe("the gate said irreversible")
  })

  /** A discard has no rule behind it, so it must not borrow the hold's sentence. */
  it("gives a discard no rule detail", () => {
    const misses = missesOf(foldOf(proposal({ id: "p_1", confidence: 0.9, outcome: "discarded" })))

    expect(misses[0]?.detail).toBeUndefined()
  })

  /**
   * `repairOf` points backwards, so the successor is only reachable by reading
   * the whole window first. A claim cannot see its own retry.
   */
  it("links a refused claim to the attempt that replaced it, in both directions", () => {
    const misses = missesOf(
      oneEpisode(
        proposal({ id: "p_1", confidence: 0.95, outcome: "refused" }),
        proposal({ id: "p_2", confidence: 0.9, outcome: "refused", repairOf: "p_1" })
      )
    )

    const first = misses.find((miss) => miss.proposalId === "p_1")
    const second = misses.find((miss) => miss.proposalId === "p_2")

    expect(first?.repairedBy).toBe("p_2")
    expect(first?.repairOf).toBeUndefined()
    expect(second?.repairOf).toBe("p_1")
    expect(second?.repairedBy).toBeUndefined()
  })
})

describe("groupMisses", () => {
  it("gathers claims by what caught them, largest group first", () => {
    const groups = groupMisses(
      missesOf(
        foldOf(
          proposal({ id: "p_1", confidence: 0.9, outcome: "refused", code: "irreversible" }),
          proposal({ id: "p_2", confidence: 0.95, outcome: "refused", code: "irreversible" }),
          proposal({ id: "p_3", confidence: 0.8, outcome: "refused", code: "stakes-above-ceiling" })
        )
      )
    )

    expect(groups.map((group) => group.cause)).toEqual(["irreversible", "stakes-above-ceiling"])
    expect(groups[0]?.claims).toHaveLength(2)
  })

  /**
   * The mean is over the group's own claims. It is the number that turns "the
   * model is overconfident" into "the model claims 0.93 about changes it cannot
   * undo", which is a sentence a host can act on.
   */
  it("reports the mean claim within a group", () => {
    const groups = groupMisses(
      missesOf(
        foldOf(
          proposal({ id: "p_1", confidence: 0.9, outcome: "refused", code: "irreversible" }),
          proposal({ id: "p_2", confidence: 0.8, outcome: "refused", code: "irreversible" })
        )
      )
    )

    expect(groups[0]?.meanConfidence).toBeCloseTo(0.85)
  })

  it("keeps the two directions apart even when they are the same size", () => {
    const groups = groupMisses(
      missesOf(
        foldOf(
          proposal({ id: "p_1", confidence: 0.95, outcome: "refused" }),
          proposal({ id: "p_2", confidence: 0.05, outcome: "survived" })
        )
      )
    )

    expect(groups.map((group) => group.cause).sort()).toEqual([
      "confidence-below-floor",
      "survived-anyway",
    ])
  })

  it("has nothing to group when nothing missed", () => {
    expect(groupMisses([])).toEqual([])
  })
})

describe("contradictedBands", () => {
  /**
   * The reading the table cannot produce about itself, and the reason this
   * function exists.
   *
   * Three claims of 0.65: two survive, one is refused. The band's observed rate
   * is 67% against a mean claim of 65%, so the row reports itself as on the mark
   * and it is genuinely well calibrated *as a rate*. Inside it sits a change the
   * model was 65% sure of that the Gate refused — a claim that went the way its
   * own confidence said it would not, invisible in every number on the row.
   */
  it("finds a band whose rate agrees while a claim inside it does not", () => {
    const fold = foldOf(
      proposal({ id: "p_1", confidence: 0.65, outcome: "refused" }),
      proposal({ id: "p_2", confidence: 0.65, outcome: "survived" }),
      proposal({ id: "p_3", confidence: 0.65, outcome: "survived" })
    )
    const report = calibrationOf(fold)
    const band = report.buckets[6] as ConfidenceBucket

    expect(band.judged).toBe(3)
    expect(isOnTheMark(band)).toBe(true)

    const bands = contradictedBands(report.buckets, missesOf(fold), isOnTheMark)

    expect(bands).toHaveLength(1)
    expect(bands[0]?.bucket.lower).toBeCloseTo(0.6)
    expect(bands[0]?.claims.map((claim) => claim.proposalId)).toEqual(["p_1"])
  })

  /** A claim is filed under the band the table would draw it in, and no other. */
  it("keeps a claim out of the neighbouring band", () => {
    const fold = foldOf(
      proposal({ id: "p_1", confidence: 0.65, outcome: "refused" }),
      proposal({ id: "p_2", confidence: 0.65, outcome: "survived" }),
      proposal({ id: "p_3", confidence: 0.65, outcome: "survived" }),
      proposal({ id: "p_4", confidence: 0.7, outcome: "refused" })
    )
    const report = calibrationOf(fold)
    const bands = contradictedBands(report.buckets, missesOf(fold), isOnTheMark)

    expect(bands.flatMap((band) => band.claims.map((claim) => claim.proposalId))).toEqual(["p_1"])
  })

  it("says nothing about a band that already reports itself as wrong", () => {
    const fold = foldOf(
      proposal({ id: "p_1", confidence: 0.95, outcome: "refused" }),
      proposal({ id: "p_2", confidence: 0.95, outcome: "refused" })
    )
    const report = calibrationOf(fold)

    expect(contradictedBands(report.buckets, missesOf(fold), isOnTheMark)).toEqual([])
  })

  it("says nothing about an empty band", () => {
    const fold = foldOf(proposal({ id: "p_1", confidence: 0.95, outcome: "refused" }))
    const report = calibrationOf(fold)
    const bands = contradictedBands(report.buckets, missesOf(fold), () => true)

    expect(bands).toHaveLength(1)
    expect(bands[0]?.bucket.judged).toBe(1)
  })

  /**
   * A confidence of exactly 1 belongs to the closed top band, and a claim filed
   * into a band the page does not draw would vanish from this reading entirely.
   */
  it("puts a claim of exactly 1 in the closed top band", () => {
    const fold = foldOf(proposal({ id: "p_1", confidence: 1, outcome: "refused" }))
    const report = calibrationOf(fold)
    const bands = contradictedBands(report.buckets, missesOf(fold), () => true)

    expect(bands).toHaveLength(1)
    expect(bands[0]?.bucket.upper).toBe(1)
  })
})

/**
 * The two views are read from one fold on the page, and this is what that buys:
 * a claim the misses list shows is a claim the table counted. A regression that
 * let one drift would otherwise show up as two numbers on a screen that nobody
 * subtracts.
 */
describe("the misses and the report", () => {
  it("never name a claim the report did not judge", () => {
    const fold = foldOf(
      proposal({ id: "p_1", confidence: 0.95, outcome: "refused" }),
      proposal({ id: "p_2", confidence: 0.9, outcome: "held" }),
      proposal({ id: "p_3", confidence: 0.05, outcome: "survived" }),
      proposal({ id: "p_4", confidence: 1, outcome: "refused", authoredBy: "runtime" })
    )
    const report = calibrationOf(fold)
    const misses = missesOf(fold)

    expect(misses.length).toBeLessThanOrEqual(report.overall.judged)
    expect(report.overall.judged).toBe(2)
    expect(misses.map((miss) => miss.proposalId as ProposalId).sort()).toEqual(["p_1", "p_3"])
  })
})

/**
 * A window whose claims were made against more than one page.
 *
 * Every other fixture in this file uses one `treeId`, because every other test
 * here is about the relationship between a confidence and an outcome and the page
 * is not part of it. It is the whole of what `pagesInMisses` is about, so these
 * two need a builder that can say which.
 */
const acrossPages = (
  ...claims: readonly { readonly page: string; readonly proposal: ProposalEpisode }[]
): EpisodeFold => ({
  episodes: claims.map(
    (claim, index): IntentEpisode => ({
      intentId: intentIdSchema.parse(`i_${index + 1}`),
      treeId: treeIdSchema.parse(claim.page),
      startedAt: claim.proposal.proposedAt,
      proposals: [claim.proposal],
      resolution: { kind: "open" },
    })
  ),
  unattributed: [],
})

describe("pagesWithMisses", () => {
  it("names each page once, however many claims it holds", () => {
    const misses = missesOf(
      acrossPages(
        { page: "t_a", proposal: proposal({ id: "p_1", confidence: 0.9, outcome: "refused" }) },
        { page: "t_a", proposal: proposal({ id: "p_2", confidence: 0.8, outcome: "refused" }) },
        { page: "t_b", proposal: proposal({ id: "p_3", confidence: 0.7, outcome: "refused" }) }
      )
    )

    expect(pagesWithMisses(misses)).toEqual(["t_a", "t_b"])
  })

  /**
   * The read this drives is one per entry, so a duplicate here is a store read
   * nobody asked for. Asserting the length rather than only the contents is what
   * makes that a property instead of a hope.
   */
  it("asks for no more reads than there are pages", () => {
    const misses = missesOf(
      acrossPages(
        { page: "t_a", proposal: proposal({ id: "p_1", confidence: 0.9, outcome: "refused" }) },
        { page: "t_a", proposal: proposal({ id: "p_2", confidence: 0.8, outcome: "refused" }) },
        { page: "t_a", proposal: proposal({ id: "p_3", confidence: 0.7, outcome: "refused" }) }
      )
    )

    expect(misses).toHaveLength(3)
    expect(pagesWithMisses(misses)).toHaveLength(1)
  })

  it("is empty when nothing was wrong", () => {
    expect(pagesWithMisses([])).toEqual([])
  })
})

describe("pagesInMisses", () => {
  it("gathers the claims made against one page", () => {
    const pages = pagesInMisses(
      missesOf(
        acrossPages(
          { page: "t_a", proposal: proposal({ id: "p_1", confidence: 0.9, outcome: "refused" }) },
          { page: "t_b", proposal: proposal({ id: "p_2", confidence: 0.8, outcome: "refused" }) },
          { page: "t_a", proposal: proposal({ id: "p_3", confidence: 0.7, outcome: "refused" }) }
        )
      )
    )

    expect(pages).toHaveLength(2)
    expect(pages.find((page) => page.treeId === "t_a")?.claims).toHaveLength(2)
    expect(pages.find((page) => page.treeId === "t_b")?.claims).toHaveLength(1)
  })

  /**
   * The one property the grouping gets for free from `missesOf` and would lose
   * the moment somebody re-sorted it: the head of each group is the worst claim
   * on that page, so `worstSurprise` needs no second pass and cannot drift from
   * the sort that produced it.
   */
  it("takes the worst claim as the page's own, because the claims arrive worst first", () => {
    const pages = pagesInMisses(
      missesOf(
        acrossPages(
          { page: "t_a", proposal: proposal({ id: "p_1", confidence: 0.6, outcome: "refused" }) },
          { page: "t_a", proposal: proposal({ id: "p_2", confidence: 0.95, outcome: "refused" }) },
          { page: "t_a", proposal: proposal({ id: "p_3", confidence: 0.7, outcome: "refused" }) }
        )
      )
    )

    expect(pages).toHaveLength(1)
    expect(pages[0]?.worstSurprise).toBeCloseTo(0.95)
    expect(pages[0]?.claims[0]?.proposalId).toBe("p_2")
  })

  /** A page's worst claim is its own, and not the window's. */
  it("gives each page the worst claim on that page rather than the worst anywhere", () => {
    const pages = pagesInMisses(
      missesOf(
        acrossPages(
          { page: "t_a", proposal: proposal({ id: "p_1", confidence: 0.95, outcome: "refused" }) },
          { page: "t_b", proposal: proposal({ id: "p_2", confidence: 0.6, outcome: "refused" }) }
        )
      )
    )

    expect(pages.find((page) => page.treeId === "t_a")?.worstSurprise).toBeCloseTo(0.95)
    expect(pages.find((page) => page.treeId === "t_b")?.worstSurprise).toBeCloseTo(0.6)
  })

  /**
   * The two views of one set of claims cannot describe different windows, which
   * is the property `missesOf`'s own comment is written under. Every claim is in
   * exactly one page group and no group is empty.
   */
  it("partitions the claims, losing none and inventing none", () => {
    const misses = missesOf(
      acrossPages(
        { page: "t_a", proposal: proposal({ id: "p_1", confidence: 0.9, outcome: "refused" }) },
        { page: "t_b", proposal: proposal({ id: "p_2", confidence: 0.8, outcome: "refused" }) },
        { page: "t_c", proposal: proposal({ id: "p_3", confidence: 0.2, outcome: "survived" }) },
        { page: "t_a", proposal: proposal({ id: "p_4", confidence: 0.7, outcome: "discarded" }) }
      )
    )
    const pages = pagesInMisses(misses)

    expect(pages.flatMap((page) => page.claims)).toHaveLength(misses.length)
    expect(pages.every((page) => page.claims.length > 0)).toBe(true)
    expect(new Set(pages.map((page) => page.treeId)).size).toBe(pages.length)
    expect(
      pages.every((page) => page.claims.every((claim) => claim.treeId === page.treeId))
    ).toBe(true)
  })

  it("is empty when nothing was wrong", () => {
    expect(pagesInMisses([])).toEqual([])
  })
})
