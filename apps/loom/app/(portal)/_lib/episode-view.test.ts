import { describe, expect, it } from "vitest"

import { deltaIdSchema, intentIdSchema, nodeIdSchema, proposalIdSchema, treeIdSchema } from "@loom/runtime"
import {
  EPISODE_RESOLUTION_KINDS,
  type EpisodeResolution,
  type IntentEpisode,
  type ProposalEpisode,
} from "@loom/runtime/telemetry"

import {
  describeAnswer,
  describeIntent,
  headlineOfResolution,
  toneOfResolution,
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

describe("viewOf", () => {
  /**
   * Every resolution the runtime can produce has a label here. A kind added to
   * the fold and not to the view would otherwise render as a blank badge, which
   * reads as "nothing happened" rather than "this page does not know".
   */
  it("labels every resolution the runtime can produce", () => {
    for (const kind of EPISODE_RESOLUTION_KINDS) {
      expect(headlineOfResolution(kind)).not.toBe("")
      expect(toneOfResolution(kind)).toBeTruthy()
    }
  })

  /**
   * The revision is handed over as a number rather than a sentence, so the card
   * can link it (0043) — an applied ask and the change it became are the two
   * halves of one question, and the reviewer should not have to retype the join.
   */
  it("names the revision a committed episode produced, and keeps it a number", () => {
    const resolution: EpisodeResolution = { kind: "committed", proposalId, revision: 7 }

    expect(viewOf(resolution)).toEqual({
      tone: "applied",
      headline: "applied",
      detail: "",
      revision: 7,
    })
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

    expect(refused.headline).toBe("refused")
    expect(failed.headline).toBe("failed")
    expect(failed.detail).toContain("commit")
    expect(failed.detail).toContain("the base revision moved")
  })

  it("says an unfinished episode is the page boundary rather than an error", () => {
    expect(viewOf({ kind: "open" }).tone).toBe("uninterpreted")
  })
})

describe("describeIntent", () => {
  /** 0023 keeps the utterance out of the journal, so the shape of the ask is all there is. */
  it("describes an ask by its shape, never its words", () => {
    const described = describeIntent(
      episode({
        intentId,
        origin: "user-instruction",
        baseRevision: 3,
        utteranceLength: 24,
        observedAt: "2026-07-31T00:00:00.000Z",
      })
    )

    expect(described.before).toContain("user-instruction")
    expect(described.before).toContain("the whole tree")
    expect(described.revision).toBe(3)
    expect(described.after).toContain("24 characters")
  })

  it("names the node an ask was scoped to", () => {
    const scopeNodeId = nodeIdSchema.parse("n_card")

    expect(
      describeIntent(
        episode({
          intentId,
          origin: "user-instruction",
          baseRevision: 0,
          scopeNodeId,
          utteranceLength: 1,
          observedAt: "2026-07-31T00:00:00.000Z",
        })
      )
    ).toMatchObject({ before: expect.stringContaining(scopeNodeId) })
  })


  /**
   * Who asked is the question a reader brings to this page; the origin is a
   * category and stays alongside it, because `developer` and `user-instruction`
   * are different acts by the same person (0017).
   */
  it("leads with who asked, and keeps the origin beside it", () => {
    const described = describeIntent(
      episode({
        intentId,
        origin: "user-instruction",
        actor: "ana@loom.local",
        baseRevision: 0,
        utteranceLength: 12,
        observedAt: "2026-07-31T00:00:00.000Z",
      })
    )

    expect(described.before.startsWith("ana@loom.local · user-instruction")).toBe(true)
  })

  /** Everything written before identity existed has no actor, and still reads. */
  it("falls back to the origin alone when nobody was named", () => {
    const described = describeIntent(
      episode({
        intentId,
        origin: "system-signal",
        baseRevision: 0,
        utteranceLength: 12,
        observedAt: "2026-07-31T00:00:00.000Z",
      })
    )

    expect(described.before.startsWith("system-signal ·")).toBe(true)
  })

  /** A window can open mid-episode, and saying so beats rendering a blank line. */
  it("says so when the page opened after the ask", () => {
    expect(describeIntent(episode(undefined)).before).toContain("after the ask")
  })

  /**
   * Nothing placed the ask, so there is no position to offer. A line that fell
   * back to revision 0 would send a reader to a page the log cannot hold.
   */
  it("names no revision when the ask itself was not recorded", () => {
    expect(describeIntent(episode(undefined)).revision).toBeNull()
  })

  /**
   * The parts are joined by JSX with the revision between them, so they have to
   * read as one line when they are — the separators live on the parts, not on
   * the component that assembles them.
   */
  it("reads as one line once the revision is put back between the parts", () => {
    const described = describeIntent(
      episode({
        intentId,
        origin: "user-instruction",
        actor: "ana@loom.local",
        baseRevision: 3,
        utteranceLength: 24,
        observedAt: "2026-07-31T00:00:00.000Z",
      })
    )

    expect(`${described.before}revision ${described.revision}${described.after}`).toBe(
      "ana@loom.local · user-instruction · the whole tree · revision 3 · 24 characters"
    )
  })
})

const answered = (
  answer: ProposalEpisode["answer"],
  answeredBy?: string
): ProposalEpisode => ({
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
    expect(describeAnswer(answered("confirmed", "ana@loom.local"))).toBe(
      "confirmed by ana@loom.local"
    )
    expect(describeAnswer(answered("discarded", "bo@loom.local"))).toBe("discarded by bo@loom.local")
  })

  /**
   * Nobody has answered yet, which is a queue. Distinct from an answer with no
   * name on it, which is a gap in the record — rendering them the same way would
   * make the second invisible.
   */
  it("says nothing when nobody has answered", () => {
    expect(describeAnswer(answered(undefined))).toBeNull()
  })

  it("says the answer was unattributed rather than pretending it was not answered", () => {
    expect(describeAnswer(answered("confirmed"))).toBe("confirmed by nobody recorded")
  })
})
