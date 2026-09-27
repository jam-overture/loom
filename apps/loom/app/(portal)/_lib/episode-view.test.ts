import { describe, expect, it } from "vitest"

import {
  deltaIdSchema,
  intentIdSchema,
  nodeIdSchema,
  proposalIdSchema,
  treeIdSchema,
} from "@jam-overture/loom"
import {
  EPISODE_RESOLUTION_KINDS,
  type EpisodeResolution,
  type EpisodeTally,
  type IntentEpisode,
  type ProposalEpisode,
} from "@jam-overture/loom/telemetry"

import {
  askOutcome,
  describeAnswer,
  describeAsk,
  failureWords,
  tallySummary,
  toneOfResolution,
  unattributedNote,
  viewOf,
} from "./episode-view"

const treeId = treeIdSchema.parse("t_1")
const intentId = intentIdSchema.parse("i_1")
const proposalId = proposalIdSchema.parse("p_1")

const episode = (intent: IntentEpisode["intent"]): IntentEpisode => ({
  intentId,
  treeId,
  ...(intent === undefined ? {} : { intent }),
  startedAt: "2026-07-31T00:00:00.000Z",
  proposals: [],
  resolution: { kind: "open" },
})

/**
 * The words this screen printed at a reader before 24 August. Every one of them
 * is still reachable — under the card's disclosure, in `technical` — and none of
 * them may be the first thing anybody reads.
 */
const RUNTIME_JARGON =
  /\b(not-interpreted|not-writable|awaiting-answer|committed|discarded|in-flight|episode|intent|node|delta|proposal|gate|custody|interpretation|assessment|commit)\b/i

describe("viewOf", () => {
  /**
   * Every resolution the runtime can produce has a label here. A kind added to
   * the fold and not to the view would otherwise render as a blank badge, which
   * reads as "nothing happened" rather than "this page does not know".
   */
  it("labels every resolution the runtime can produce", () => {
    for (const kind of EPISODE_RESOLUTION_KINDS) {
      expect(askOutcome(kind).label).not.toBe("")
      expect(askOutcome(kind).meaning).not.toBe("")
      expect(toneOfResolution(kind)).toBeTruthy()
    }
  })

  /**
   * The point of the redirection, asserted where it is easiest to lose: a badge
   * reading `not-writable` is exactly what this branch removed, and it is the
   * sort of thing that comes back one component at a time.
   */
  it("puts no runtime identifier in front of a reader", () => {
    for (const kind of EPISODE_RESOLUTION_KINDS) {
      const outcome = askOutcome(kind)

      expect(outcome.label, outcome.label).not.toMatch(RUNTIME_JARGON)
      expect(outcome.meaning, outcome.meaning).not.toMatch(RUNTIME_JARGON)
      expect(outcome.label).not.toMatch(/-/)
    }
  })

  /**
   * The other half of the rule, and the half a rewording quietly breaks: the
   * runtime's own kind has to still be *somewhere*, because a bug report quotes
   * it and a query groups by it.
   */
  it("keeps the runtime's own name for every one of them", () => {
    for (const kind of EPISODE_RESOLUTION_KINDS) {
      expect(askOutcome(kind).technical).toBe(kind)
    }
  })

  /**
   * The guard the plain sentences are held against has to actually trip on the
   * reading it replaced, or the assertion above passes for the wrong reason —
   * the pattern `audit-view.test.ts` set. Asserted over the four hyphenated
   * kinds rather than all eight: `refused`, `failed` and `open` are ordinary
   * English as well as runtime identifiers, and a regex that banned them would
   * ban the honest sentence "Loom refused it" along with the badge.
   */
  it("holds the plain words against a guard the technical reading really trips", () => {
    for (const kind of [
      "not-interpreted",
      "not-writable",
      "awaiting-answer",
      "committed",
    ] as const) {
      expect(askOutcome(kind).technical).toMatch(RUNTIME_JARGON)
    }
  })

  /**
   * The one property that holds for all eight, and the one a rewording breaks
   * first: whatever a person reads, it is not what the type system says.
   */
  it("never lets a label be the runtime's own word for the same thing", () => {
    for (const kind of EPISODE_RESOLUTION_KINDS) {
      expect(askOutcome(kind).label.toLowerCase()).not.toBe(askOutcome(kind).technical)
    }
  })

  /**
   * The revision is handed over as a number rather than a sentence, so the card
   * can link it (0043) — an applied ask and the change it became are the two
   * halves of one question, and the reviewer should not have to retype the join.
   */
  it("names the revision a committed episode produced, and keeps it a number", () => {
    const resolution: EpisodeResolution = { kind: "committed", proposalId, revision: 7 }
    const view = viewOf(resolution)

    expect(view.revision).toBe(7)
    expect(view.tone).toBe("applied")
    expect(view.label).toBe("Done")
    expect(view.technical).toBe("committed")
  })

  /**
   * Every other outcome produced no revision, and must not invent one — a card
   * that linked somewhere for a change that never happened would offer a
   * reviewer a page that cannot exist.
   */
  it("names no revision for an outcome that produced none", () => {
    expect(viewOf({ kind: "refused", proposalId }).revision).toBeNull()
    expect(viewOf({ kind: "awaiting-answer", proposalId }).revision).toBeNull()
    expect(viewOf({ kind: "open" }).revision).toBeNull()
    expect(
      viewOf({
        kind: "failed",
        proposalId,
        failure: { stage: "commit", code: "conflict", detail: "the base revision moved" },
      }).revision
    ).toBeNull()
  })

  /** "You may not" and "a stage broke" are different answers, so they read differently. */
  it("distinguishes a refusal from a failure", () => {
    const refused = viewOf({ kind: "refused", proposalId })
    const failed = viewOf({
      kind: "failed",
      proposalId,
      failure: { stage: "commit", code: "conflict", detail: "the base revision moved" },
    })

    expect(refused.label).toBe("Not allowed")
    expect(failed.label).toBe("Something broke")
    expect(refused.label).not.toBe(failed.label)
  })

  /**
   * The stage and the store's own words are what somebody debugging this needs,
   * verbatim. They are the one thing a plain sentence cannot stand in for, so
   * they are appended to the kind rather than reworded away.
   */
  it("keeps a failure's stage and the runtime's own detail in the technical record", () => {
    const failed = viewOf({
      kind: "failed",
      proposalId,
      failure: { stage: "commit", code: "conflict", detail: "the base revision moved" },
    })

    expect(failed.technical).toContain("failed")
    expect(failed.technical).toContain("commit")
    expect(failed.technical).toContain("the base revision moved")
  })

  it("says an unfinished episode is the page boundary rather than an error", () => {
    expect(viewOf({ kind: "open" }).tone).toBe("uninterpreted")
    expect(viewOf({ kind: "open" }).meaning).toContain("further back than this page reaches")
  })
})

describe("failureWords", () => {
  /**
   * The reassurance is the point. A reader who has just been told something
   * broke wants to know whether their page is now half-changed, and for every
   * stage the runtime has, the answer is no.
   */
  it("says what a failure meant for the page, for every stage", () => {
    const stages = [
      "interpretation",
      "assessment",
      "repair",
      "application",
      "custody",
      "commit",
    ] as const

    for (const stage of stages) {
      const words = failureWords({
        kind: "failed",
        proposalId,
        failure: { stage, code: "broke", detail: "the store said no" },
      })

      expect(words, stage).not.toBe("")
      expect(words, stage).not.toContain("the store said no")
    }
  })

  /** Nothing failed, so there is nothing to reassure anybody about. */
  it("says nothing for an outcome that did not fail", () => {
    expect(failureWords({ kind: "refused", proposalId })).toBe("")
    expect(failureWords({ kind: "committed", proposalId, revision: 1 })).toBe("")
    expect(failureWords({ kind: "open" })).toBe("")
  })
})

const tally = (overrides: Partial<EpisodeTally> = {}): EpisodeTally => ({
  episodes: 3,
  proposals: 3,
  held: 0,
  repairs: 0,
  byResolution: {
    committed: 3,
    refused: 0,
    "awaiting-answer": 0,
    discarded: 0,
    "not-interpreted": 0,
    "not-writable": 0,
    failed: 0,
    open: 0,
  },
  ...overrides,
})

describe("tallySummary", () => {
  /**
   * The one question somebody opens this screen with. It was previously
   * answerable only by finding a number labelled `held` among four monospace
   * pairs and knowing what "held" meant.
   */
  it("says outright when something is waiting on a person", () => {
    const summary = tallySummary(
      tally({
        byResolution: { ...tally().byResolution, committed: 1, "awaiting-answer": 2 },
      })
    )

    expect(summary).toContain("2 are waiting")
    expect(summary).toContain("say yes or no")
  })

  it("says the singular when exactly one is waiting", () => {
    const summary = tallySummary(
      tally({ byResolution: { ...tally().byResolution, committed: 2, "awaiting-answer": 1 } })
    )

    expect(summary).toContain("1 is waiting")
    expect(summary).not.toContain("1 are waiting")
  })

  /**
   * Said out loud rather than left as an absence, for the same reason the tally
   * renders its zeroes: a reassurance nobody printed is not a reassurance.
   */
  it("says nothing is waiting rather than leaving it to be inferred", () => {
    expect(tallySummary(tally())).toContain("Nothing here is waiting on you")
  })

  it("counts asks in the singular too", () => {
    const summary = tallySummary(
      tally({ episodes: 1, byResolution: { ...tally().byResolution, committed: 1 } })
    )

    expect(summary.startsWith("1 ask ")).toBe(true)
  })
})

describe("unattributedNote", () => {
  /** Zero is not a sentence, so the page asks about one thing rather than two. */
  it("says nothing when everything was attributed", () => {
    expect(unattributedNote(0)).toBe("")
  })

  it("explains what it means for the counts, in both numbers", () => {
    expect(unattributedNote(1)).toContain("One entry")
    expect(unattributedNote(1)).toContain("counted in nothing above")
    expect(unattributedNote(4)).toContain("4 entries")
    expect(unattributedNote(4)).toContain("counted in nothing above")
  })

  /** It is a fact about this page's window, not a word about the fold. */
  it("never says the word it used to be named after", () => {
    expect(unattributedNote(2).toLowerCase()).not.toContain("attribut")
  })
})

describe("describeAsk", () => {
  /** 0023 keeps the utterance out of the journal, so the shape of the ask is all there is. */
  it("describes an ask by its shape, never its words", () => {
    const described = describeAsk(
      episode({
        intentId,
        origin: "user-instruction",
        baseRevision: 3,
        utteranceLength: 24,
        observedAt: "2026-07-31T00:00:00.000Z",
      })
    )

    expect(described.who).toBe("Somebody using the site asked for this.")
    expect(described.scope).toBe("It was aimed at the whole page.")
    expect(described.revision).toBe(3)
    expect(described.technical).toContain("user-instruction")
    expect(described.technical).toContain("the whole tree")
    expect(described.technical).toContain("24 characters")
  })

  /**
   * A reader does not need the node id to know whether the ask was narrow; the
   * id is in the disclosure for whoever wants to go and find the part.
   */
  it("says an ask was aimed at one part, and keeps the part's name below", () => {
    const scopeNodeId = nodeIdSchema.parse("n_card")
    const described = describeAsk(
      episode({
        intentId,
        origin: "user-instruction",
        baseRevision: 0,
        scopeNodeId,
        utteranceLength: 1,
        observedAt: "2026-07-31T00:00:00.000Z",
      })
    )

    expect(described.scope).toBe("It was aimed at one part of the page.")
    expect(described.technical).toContain(scopeNodeId)
  })

  /** One character is one character, and `1 characters` reads as a bug. */
  it("counts a single character in the singular", () => {
    const described = describeAsk(
      episode({
        intentId,
        origin: "user-instruction",
        baseRevision: 0,
        utteranceLength: 1,
        observedAt: "2026-07-31T00:00:00.000Z",
      })
    )

    expect(described.technical).toContain("1 character")
    expect(described.technical).not.toContain("1 characters")
  })

  /**
   * Who asked is the question a reader brings to this page; the origin is a
   * category and stays in the technical line, because `developer` and
   * `user-instruction` are different acts by the same person (0017).
   */
  it("leads with who asked, and keeps the origin beside it below", () => {
    const described = describeAsk(
      episode({
        intentId,
        origin: "user-instruction",
        actor: "ana@loom.local",
        baseRevision: 0,
        utteranceLength: 12,
        observedAt: "2026-07-31T00:00:00.000Z",
      })
    )

    expect(described.who).toBe("ana@loom.local asked for this.")
    expect(described.technical.startsWith("ana@loom.local · user-instruction")).toBe(true)
  })

  /** Everything written before identity existed has no actor, and still reads. */
  it("falls back to naming the act when nobody was named", () => {
    const described = describeAsk(
      episode({
        intentId,
        origin: "system-signal",
        baseRevision: 0,
        utteranceLength: 12,
        observedAt: "2026-07-31T00:00:00.000Z",
      })
    )

    expect(described.who).toBe("Your site asked for this by itself.")
    expect(described.technical.startsWith("system-signal ·")).toBe(true)
  })

  /**
   * Every origin the runtime has gets a sentence. A missing one would render as
   * `undefined asked for this`, which is worse than the raw enum it replaced.
   */
  it("has a sentence for every origin, and never a hyphenated one", () => {
    for (const origin of ["user-instruction", "developer", "system-signal", "scheduled-adaptation"] as const) {
      const described = describeAsk(
        episode({
          intentId,
          origin,
          baseRevision: 0,
          utteranceLength: 4,
          observedAt: "2026-07-31T00:00:00.000Z",
        })
      )

      expect(described.who, origin).not.toContain(origin)
      expect(described.who, origin).not.toBe("")
      expect(described.technical, origin).toContain(origin)
    }
  })

  /**
   * `who` and `scope` are set side by side by the card, so a `who` without a
   * terminal stop renders as one run-on line. A screenshot found this; no
   * assertion on the parts could have.
   */
  it("ends every sentence it hands the card, so two of them do not run together", () => {
    for (const origin of ["user-instruction", "developer", "system-signal", "scheduled-adaptation"] as const) {
      for (const actor of [undefined, "ana@loom.local"]) {
        const described = describeAsk(
          episode({
            intentId,
            origin,
            ...(actor === undefined ? {} : { actor }),
            baseRevision: 0,
            utteranceLength: 4,
            observedAt: "2026-07-31T00:00:00.000Z",
          })
        )

        expect(described.who.endsWith("."), described.who).toBe(true)
        expect(described.scope.endsWith("."), described.scope).toBe(true)
      }
    }
    expect(describeAsk(episode(undefined)).who.endsWith(".")).toBe(true)
  })

  /** A window can open mid-episode, and saying so beats rendering a blank line. */
  it("says so when the page opened after the ask", () => {
    const described = describeAsk(episode(undefined))

    expect(described.who).toContain("further back than this page reaches")
    expect(described.scope).toBe("")
  })

  /**
   * Nothing placed the ask, so there is no position to offer. A line that fell
   * back to revision 0 would send a reader to a page the log cannot hold.
   */
  it("names no revision when the ask itself was not recorded", () => {
    expect(describeAsk(episode(undefined)).revision).toBeNull()
  })
})

const answered = (answer: ProposalEpisode["answer"], answeredBy?: string): ProposalEpisode => ({
  proposalId,
  provenance: {
    origin: "user-instruction",
    interpreter: "claude-test-1",
    authoredBy: "model",
    confidence: 0.5,
    interpretedAt: "2026-07-31T00:00:00.000Z",
  },
  rationale: "because",
  delta: { deltaId: deltaIdSchema.parse("d_1"), treeId, baseRevision: 0, operations: [] },
  proposedAt: "2026-07-31T00:00:00.000Z",
  held: true,
  repairRequested: false,
  ...(answer === undefined ? {} : { answer }),
  ...(answeredBy === undefined ? {} : { answeredBy }),
})

describe("describeAnswer", () => {
  it("names who answered, and how", () => {
    expect(describeAnswer(answered("confirmed", "ana@loom.local"))?.sentence).toBe(
      "ana@loom.local said yes."
    )
    expect(describeAnswer(answered("discarded", "bo@loom.local"))?.sentence).toBe(
      "bo@loom.local said no."
    )
  })

  /** The record's own words survive, so the log and the screen can be matched up. */
  it("keeps the record's own words for both answers", () => {
    expect(describeAnswer(answered("confirmed", "ana@loom.local"))?.technical).toBe(
      "confirmed by ana@loom.local"
    )
    expect(describeAnswer(answered("discarded", "bo@loom.local"))?.technical).toBe(
      "discarded by bo@loom.local"
    )
  })

  /**
   * Nobody has answered yet, which is a queue. Distinct from an answer with no
   * name on it, which is a gap in the record — rendering them the same way would
   * make the second invisible.
   */
  it("says nothing when nobody has answered", () => {
    expect(describeAnswer(answered(undefined))).toBeNull()
  })

  /**
   * `confirmed by nobody recorded` is a true line that reads as a bug. The gap
   * is still reported and it is now reported as a gap.
   */
  it("says the answer was unattributed rather than pretending it was not answered", () => {
    const described = describeAnswer(answered("confirmed"))

    expect(described?.sentence).toBe("Somebody said yes, but the record doesn't say who.")
    expect(described?.technical).toBe("confirmed by nobody recorded")
  })
})
