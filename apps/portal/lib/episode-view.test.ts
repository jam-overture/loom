import { describe, expect, it } from "vitest"

import { intentIdSchema, nodeIdSchema, proposalIdSchema, treeIdSchema } from "@loom/runtime"
import {
  EPISODE_RESOLUTION_KINDS,
  type EpisodeResolution,
  type IntentEpisode,
} from "@loom/runtime/telemetry"

import { describeIntent, headlineOfResolution, toneOfResolution, viewOf } from "./episode-view"

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

  it("names the revision a committed episode produced", () => {
    const resolution: EpisodeResolution = { kind: "committed", proposalId, revision: 7 }

    expect(viewOf(resolution)).toEqual({
      tone: "applied",
      headline: "applied",
      detail: "revision 7",
    })
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

    expect(described).toContain("user-instruction")
    expect(described).toContain("revision 3")
    expect(described).toContain("24 characters")
    expect(described).toContain("the whole tree")
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
    ).toContain(scopeNodeId)
  })

  /** A window can open mid-episode, and saying so beats rendering a blank line. */
  it("says so when the page opened after the ask", () => {
    expect(describeIntent(episode(undefined))).toContain("after the ask")
  })
})
