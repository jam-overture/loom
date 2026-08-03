import { sequentialIdFactory, type IdFactory } from "../ids.js"
import { ok, type Result } from "../result.js"
import type { EditIntent } from "../runtime/intent.js"
import type { ChangeRepairer, InterpretationError } from "../runtime/interpreter.js"
import { fixedPolicy } from "../runtime/policy-source.js"
import { defaultGatePolicy } from "../runtime/policy.js"
import type { ProposedChange } from "../runtime/proposal.js"
import { memoryTreeStore } from "../store/memory.js"
import { episodesOf, type EpisodeFold } from "../telemetry/episode.js"
import type { TelemetryJournal } from "../telemetry/journal.js"
import { memoryTelemetryJournal } from "../telemetry/memory.js"
import { collectTelemetry, type TelemetryCollector } from "../telemetry/sink.js"
import type { TreeDelta } from "../tree/delta.js"
import type { LoomTree } from "../tree/tree.js"
import { memoryHoldStore, type WritePath } from "../write/index.js"

import { buildIntent, buildProposal, fixedClock, scriptedInterpreter } from "./doubles.js"
import { sampleTree } from "./fixtures.js"

/**
 * A write path wired to a real Gate, a real store and a real journal, with only
 * the model scripted.
 *
 * §6's derivations — the episode fold and the calibration report — are both
 * about what actually happened, so both are exercised through the pipeline
 * rather than over hand-assembled records. A test that wrote its own records
 * would be answering its own question: it would keep passing after the pipeline
 * stopped narrating a stage, or after a disposition changed shape.
 */

export type EpisodeHarness = {
  readonly path: WritePath
  readonly journal: TelemetryJournal
  readonly collector: TelemetryCollector
  readonly tree: LoomTree
  readonly ids: IdFactory
  readonly intent: EditIntent
  readonly fold: () => Promise<EpisodeFold>
}

export const removalDelta = (tree: LoomTree, ids: IdFactory, nodeId: string): TreeDelta => ({
  deltaId: ids.deltaId(),
  treeId: tree.treeId,
  baseRevision: 0,
  operations: [{ op: "remove", nodeId: nodeId as never }],
})

export const harnessWith = async (options: {
  readonly script: (
    tree: LoomTree,
    ids: IdFactory,
    intent: EditIntent
  ) => Result<ProposedChange, InterpretationError>
  readonly repairer?: (tree: LoomTree, ids: IdFactory, intent: EditIntent) => ChangeRepairer
  readonly baseRevision?: number
}): Promise<EpisodeHarness> => {
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
      policySource: fixedPolicy(defaultGatePolicy),
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

/**
 * Confidence is the only knob most of these tests need, because it is what the
 * default policy dispositions on: high accepts, middling holds, low refuses.
 */
export const proposalScript =
  (confidence: number) =>
  (
    tree: LoomTree,
    ids: IdFactory,
    intent: EditIntent
  ): Result<ProposedChange, InterpretationError> =>
    ok(
      buildProposal(ids, {
        intentId: intent.intentId,
        delta: removalDelta(tree, ids, sampleTree().ids.footer),
        confidence,
      })
    )
