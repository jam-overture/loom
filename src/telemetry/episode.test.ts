import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type IdFactory } from "../ids.js"
import { err, ok, type Result } from "../result.js"
import type { EditIntent } from "../runtime/intent.js"
import type { ChangeRepairer, InterpretationError } from "../runtime/interpreter.js"
import { defaultGatePolicy } from "../runtime/policy.js"
import type { ProposedChange } from "../runtime/proposal.js"
import { memoryTreeStore } from "../store/memory.js"
import { buildIntent, buildProposal, fixedClock, scriptedInterpreter, scriptedRepairer } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import type { TreeDelta } from "../tree/delta.js"
import type { LoomTree } from "../tree/tree.js"
import { commitIntent, confirmHeld, discardHeld, memoryHoldStore, type WritePath } from "../write/index.js"

import { episodesOf, type EpisodeFold } from "./episode.js"
import type { TelemetryJournal } from "./journal.js"
import { memoryTelemetryJournal } from "./memory.js"
import { collectTelemetry, type TelemetryCollector } from "./sink.js"

/**
 * The fold is exercised through the real runtime rather than hand-written
 * records. What §6 is for is answering "what happened to that change", and a
 * test that assembled the records itself would be answering its own question —
 * it would keep passing after the pipeline stopped narrating a stage.
 */

type Harness = {
  readonly path: WritePath
  readonly journal: TelemetryJournal
  readonly collector: TelemetryCollector
  readonly tree: LoomTree
  readonly ids: IdFactory
  readonly intent: EditIntent
  readonly fold: () => Promise<EpisodeFold>
}

const removalDelta = (tree: LoomTree, ids: IdFactory, nodeId: string): TreeDelta => ({
  deltaId: ids.deltaId(),
  treeId: tree.treeId,
  baseRevision: 0,
  operations: [{ op: "remove", nodeId: nodeId as never }],
})

const harnessWith = async (options: {
  readonly script: (tree: LoomTree, ids: IdFactory, intent: EditIntent) => Result<ProposedChange, InterpretationError>
  readonly repairer?: (tree: LoomTree, ids: IdFactory, intent: EditIntent) => ChangeRepairer
  readonly baseRevision?: number
}): Promise<Harness> => {
  const { tree } = sampleTree()
  const ids = sequentialIdFactory("h")
  const store = memoryTreeStore()
  await store.create(tree)

  const journal = memoryTelemetryJournal()
  const collector = collectTelemetry(journal)

  const intent = buildIntent(ids, {
    treeId: tree.treeId,
    baseRevision: options.baseRevision ?? 0,
  })

  const repairer = options.repairer?.(tree, ids, intent)

  const path: WritePath = {
    store,
    holds: memoryHoldStore(),
    runtime: {
      interpreter: scriptedInterpreter(options.script(tree, ids, intent)),
      policy: defaultGatePolicy,
      events: collector.sink,
      clock: fixedClock(),
      idFactory: ids,
      ...(repairer ? { repairer } : {}),
    },
  }

  return {
    path,
    journal,
    collector,
    tree,
    ids,
    intent,
    fold: async () => {
      await collector.flush()
      const page = await journal.read()

      return episodesOf(page.ok ? page.value.records : [])
    },
  }
}

const proposalScript =
  (confidence: number) =>
  (tree: LoomTree, ids: IdFactory, intent: EditIntent): Result<ProposedChange, InterpretationError> =>
    ok(
      buildProposal(ids, {
        intentId: intent.intentId,
        delta: removalDelta(tree, ids, sampleTree().ids.footer),
        confidence,
      })
    )

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

    await confirmHeld(harness.path, proposalId)

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

    await discardHeld(harness.path, proposalId)

    const { episodes } = await harness.fold()

    expect(episodes[0]?.proposals[0]?.answer).toBe("discarded")
    expect(episodes[0]?.resolution).toEqual({ kind: "discarded", proposalId })
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
    const { episodes, unattributed } = episodesOf(records.slice(2))

    expect(records.length).toBeGreaterThan(2)
    expect(episodes).toEqual([])
    expect(unattributed).toHaveLength(records.length - 2)
  })

  it("folds nothing into nothing", () => {
    expect(episodesOf([])).toEqual({ episodes: [], unattributed: [] })
  })
})
