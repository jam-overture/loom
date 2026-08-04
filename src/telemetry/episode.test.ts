import { describe, expect, it } from "vitest"

import { err, ok } from "../result.js"
import { buildProposal, scriptedRepairer } from "../testing/doubles.js"
import { harnessWith, proposalScript, removalDelta } from "../testing/episode-harness.js"
import { sampleTree } from "../testing/fixtures.js"
import { commitIntent, confirmHeld, discardHeld } from "../write/index.js"

import { EPISODE_RESOLUTION_KINDS, episodesOf, tallyEpisodes } from "./episode.js"

describe("episodesOf", () => {
  it("folds an accepted change into one episode that ends committed", async () => {
    const harness = await harnessWith({ script: proposalScript(0.9) })
    await commitIntent(harness.path, harness.intent)

    const { episodes, unattributed } = await harness.fold()
    const episode = episodes[0]

    expect(episodes).toHaveLength(1)
    expect(unattributed).toEqual([])
    expect(episode?.intentId).toBe(harness.intent.intentId)
    expect(episode?.resolution).toEqual({
      kind: "committed",
      proposalId: episode?.proposals[0]?.proposalId,
      revision: 1,
    })
    expect(episode?.proposals[0]?.disposition?.kind).toBe("accepted")
    expect(episode?.proposals[0]?.appliedRevision).toBe(1)
    expect(episode?.proposals[0]?.provenance.interpreter).toBe("scripted")
    expect(episode?.proposals[0]?.assessment?.removedNodeCount).toBe(1)
    expect(episode?.proposals[0]?.settledAt).toBeDefined()
  })

  /**
   * Which policy was in force is a fact about the ask, so it survives even for
   * an intent that never produced a judgment to hang it on.
   */
  it("says which policy the intent was judged under", async () => {
    const harness = await harnessWith({ script: proposalScript(0.9) })
    await commitIntent(harness.path, harness.intent)

    const { episodes } = await harness.fold()

    expect(episodes[0]?.policyId).toBe("default")
    expect(episodes[0]?.proposals[0]?.disposition?.policyId).toBe("default")
  })

  it("reports a change the Gate held as awaiting an answer", async () => {
    const harness = await harnessWith({ script: proposalScript(0.5) })
    await commitIntent(harness.path, harness.intent)

    const { episodes } = await harness.fold()

    expect(episodes[0]?.proposals[0]?.held).toBe(true)
    expect(episodes[0]?.proposals[0]?.disposition?.kind).toBe("requires-confirmation")
    expect(episodes[0]?.resolution.kind).toBe("awaiting-answer")
  })

  it("follows a held change through to the answer that applied it", async () => {
    const harness = await harnessWith({ script: proposalScript(0.5) })
    const held = await commitIntent(harness.path, harness.intent)
    const proposalId = held.kind === "held" ? held.held.proposalId : undefined
    if (!proposalId) throw new Error("the fixture must be held")

    await confirmHeld(harness.path, { proposalId })

    const { episodes } = await harness.fold()

    expect(episodes[0]?.proposals[0]?.answer).toBe("confirmed")
    expect(episodes[0]?.resolution).toEqual({ kind: "committed", proposalId, revision: 1 })
  })

  /** 0007's calibration signal: the Gate was willing, and a human was not. */
  it("records that a human said no", async () => {
    const harness = await harnessWith({ script: proposalScript(0.5) })
    const held = await commitIntent(harness.path, harness.intent)
    const proposalId = held.kind === "held" ? held.held.proposalId : undefined
    if (!proposalId) throw new Error("the fixture must be held")

    await discardHeld(harness.path, { proposalId })

    const { episodes } = await harness.fold()

    expect(episodes[0]?.proposals[0]?.answer).toBe("discarded")
    expect(episodes[0]?.resolution).toEqual({ kind: "discarded", proposalId })
  })

  /**
   * The asker and the answerer are two people, and a fold that showed only the
   * first would make a hold look like a change somebody waved through their own
   * ask (0027).
   */
  it("keeps who asked and who answered apart", async () => {
    const harness = await harnessWith({ script: proposalScript(0.5) })
    const held = await commitIntent(harness.path, harness.intent)
    const proposalId = held.kind === "held" ? held.held.proposalId : undefined
    if (!proposalId) throw new Error("the fixture must be held")

    await confirmHeld(harness.path, { proposalId, actor: "reviewer:bo" })

    const { episodes } = await harness.fold()
    const [proposal] = episodes[0]?.proposals ?? []

    expect(proposal?.answeredBy).toBe("reviewer:bo")
    expect(proposal?.provenance.actor).toBeUndefined()
  })

  /** 0006: both halves of a refusal-then-repair are in the record, and linked. */
  it("keeps a refusal and the repair that replaced it as two linked proposals", async () => {
    const harness = await harnessWith({
      script: proposalScript(0.1),
      repairer: (tree, ids, intent) =>
        scriptedRepairer(
          ok(
            buildProposal(ids, {
              intentId: intent.intentId,
              delta: removalDelta(tree, ids, sampleTree().ids.footer),
              confidence: 0.95,
            })
          )
        ),
    })

    await commitIntent(harness.path, harness.intent)

    const { episodes } = await harness.fold()
    const [refused, repaired] = episodes[0]?.proposals ?? []

    expect(episodes[0]?.proposals).toHaveLength(2)
    expect(refused?.disposition?.kind).toBe("rejected")
    expect(refused?.repairRequested).toBe(true)
    expect(repaired?.repairOf).toBe(refused?.proposalId)
    expect(episodes[0]?.resolution).toEqual({
      kind: "committed",
      proposalId: repaired?.proposalId,
      revision: 1,
    })
  })

  it("ends a refusal with no repairer as refused", async () => {
    const harness = await harnessWith({ script: proposalScript(0.1) })
    await commitIntent(harness.path, harness.intent)

    const { episodes } = await harness.fold()

    expect(episodes[0]?.resolution).toEqual({
      kind: "refused",
      proposalId: episodes[0]?.proposals[0]?.proposalId,
    })
  })

  it("records an intent that never became a proposal", async () => {
    const harness = await harnessWith({
      script: () => err({ code: "not-understood", detail: "no idea what that means" }),
    })
    await commitIntent(harness.path, harness.intent)

    const { episodes } = await harness.fold()

    expect(episodes[0]?.proposals).toEqual([])
    expect(episodes[0]?.resolution).toEqual({
      kind: "not-interpreted",
      failure: {
        stage: "interpretation",
        code: "not-understood",
        detail: "no idea what that means",
      },
    })
  })

  /** Contention, which is the one failure a client is expected to recover from (0017). */
  it("records an intent aimed at a revision the tree has moved past", async () => {
    const harness = await harnessWith({ script: proposalScript(0.9), baseRevision: 4 })
    await commitIntent(harness.path, harness.intent)

    const { episodes } = await harness.fold()

    expect(episodes[0]?.resolution.kind).toBe("not-writable")
    expect(episodes[0]?.proposals).toEqual([])
  })

  it("keeps the intent's shape without what was said", async () => {
    const harness = await harnessWith({ script: proposalScript(0.9) })
    await commitIntent(harness.path, harness.intent)

    const { episodes } = await harness.fold()

    expect(episodes[0]?.intent?.origin).toBe("user-instruction")
    expect(episodes[0]?.intent?.utteranceLength).toBe(harness.intent.utterance.length)
    expect(JSON.stringify(episodes[0]?.intent)).not.toContain(harness.intent.utterance)
  })

  /**
   * A page that opens mid-episode cannot attribute what follows. Reporting the
   * orphans is the difference between a partial fold and a wrong one.
   */
  it("reports records it cannot attribute rather than dropping them", async () => {
    const harness = await harnessWith({ script: proposalScript(0.9) })
    await commitIntent(harness.path, harness.intent)
    await harness.collector.flush()

    const page = await harness.journal.read()
    const records = page.ok ? page.value.records : []
    const opened = records.findIndex((record) => record.event.type === "change-proposed") + 1
    const midEpisode = records.slice(opened)
    const { episodes, unattributed } = episodesOf(midEpisode)

    expect(midEpisode.length).toBeGreaterThan(0)
    expect(episodes).toEqual([])
    expect(unattributed).toHaveLength(midEpisode.length)
  })

  it("folds nothing into nothing", () => {
    expect(episodesOf([])).toEqual({ episodes: [], unattributed: [] })
  })
})

/**
 * The tally is folded from episodes the runtime actually produced, for the same
 * reason the fold itself is: a count assembled from hand-written records would
 * agree with itself no matter what the pipeline stopped narrating.
 */
describe("tallyEpisodes", () => {
  it("counts nothing as every resolution at zero", () => {
    const tally = tallyEpisodes([])

    expect(tally).toEqual({
      episodes: 0,
      proposals: 0,
      held: 0,
      repairs: 0,
      byResolution: {
        committed: 0,
        refused: 0,
        "awaiting-answer": 0,
        discarded: 0,
        "not-interpreted": 0,
        "not-writable": 0,
        failed: 0,
        open: 0,
      },
    })
  })

  /** Absent and zero are different claims, and a view that omits one lies about the other. */
  it("names every resolution, including the ones that did not happen", () => {
    expect(Object.keys(tallyEpisodes([]).byResolution).sort()).toEqual(
      [...EPISODE_RESOLUTION_KINDS].sort()
    )
  })

  it("counts a committed episode and its proposal", async () => {
    const harness = await harnessWith({ script: proposalScript(0.9) })
    await commitIntent(harness.path, harness.intent)

    const tally = tallyEpisodes((await harness.fold()).episodes)

    expect(tally.episodes).toBe(1)
    expect(tally.proposals).toBe(1)
    expect(tally.held).toBe(0)
    expect(tally.repairs).toBe(0)
    expect(tally.byResolution.committed).toBe(1)
  })

  it("counts a held proposal as held while it is still awaiting an answer", async () => {
    const harness = await harnessWith({ script: proposalScript(0.5) })
    await commitIntent(harness.path, harness.intent)

    const tally = tallyEpisodes((await harness.fold()).episodes)

    expect(tally.held).toBe(1)
    expect(tally.byResolution["awaiting-answer"]).toBe(1)
    expect(tally.byResolution.committed).toBe(0)
  })

  /** 0006: a repair is a second proposal on one intent, not a second episode. */
  it("counts a repaired refusal as one episode with two proposals", async () => {
    const harness = await harnessWith({
      script: proposalScript(0.1),
      repairer: (tree, ids, intent) =>
        scriptedRepairer(
          ok(
            buildProposal(ids, {
              intentId: intent.intentId,
              delta: removalDelta(tree, ids, sampleTree().ids.footer),
              confidence: 0.95,
            })
          )
        ),
    })
    await commitIntent(harness.path, harness.intent)

    const tally = tallyEpisodes((await harness.fold()).episodes)

    expect(tally.episodes).toBe(1)
    expect(tally.proposals).toBe(2)
    expect(tally.repairs).toBe(1)
    expect(tally.byResolution.committed).toBe(1)
    expect(tally.byResolution.refused).toBe(0)
  })
})
