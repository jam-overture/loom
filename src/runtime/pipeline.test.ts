import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { err, ok } from "../result.js"
import {
  buildIntent,
  buildProposal,
  collectingEventSink,
  fixedClock,
  scriptedInterpreter,
  type CollectingEventSink,
} from "../testing/doubles.js"
import { sampleTree, type SampleTree } from "../testing/fixtures.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { findNode } from "../tree/navigation.js"
import type { LoomTree } from "../tree/tree.js"

import type { IntentOrigin } from "./intent.js"
import { composeChange, confirmChange, type CompositionRuntime } from "./pipeline.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./policy.js"
import type { ProposedChange } from "./proposal.js"

const spare = sequentialIdFactory("pipe")

type Harness = {
  readonly runtime: CompositionRuntime
  readonly events: CollectingEventSink
  readonly tree: LoomTree
  readonly ids: SampleTree["ids"]
  readonly proposal: ProposedChange
}

const harnessFor = (options: {
  readonly build: (ids: SampleTree["ids"]) => TreeOperation[]
  readonly policy?: GatePolicy
  readonly origin?: IntentOrigin
  readonly confidence?: number
}): Harness => {
  const { tree, ids } = sampleTree()

  const delta: TreeDelta = {
    deltaId: spare.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: options.build(ids),
  }

  const intent = buildIntent(spare, { treeId: tree.treeId, baseRevision: tree.revision })
  const proposal = buildProposal(spare, {
    intentId: intent.intentId,
    delta,
    ...(options.origin ? { origin: options.origin } : {}),
    ...(options.confidence === undefined ? {} : { confidence: options.confidence }),
  })

  const events = collectingEventSink()

  return {
    runtime: {
      interpreter: scriptedInterpreter(ok(proposal)),
      policy: options.policy ?? defaultGatePolicy,
      events,
      clock: fixedClock(),
      idFactory: spare,
    },
    events,
    tree,
    ids,
    proposal,
  }
}

const intentFor = (tree: LoomTree) =>
  buildIntent(spare, { treeId: tree.treeId, baseRevision: tree.revision })

/** Deep, small, reversible — the Gate accepts this one. */
const tweak = (ids: SampleTree["ids"]): TreeOperation[] => [
  { op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] },
]

describe("composeChange on an accepted change", () => {
  it("applies the delta and returns the new tree", async () => {
    const { runtime, tree, ids } = harnessFor({ build: tweak })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "applied") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.tree.revision).toBe(tree.revision + 1)

    const body = findNode(outcome.tree.root, ids.body)
    expect(body?.kind === "text" && body.value).toBe("Rewritten")
  })

  it("leaves the original tree untouched", async () => {
    const { runtime, tree, ids } = harnessFor({ build: tweak })
    await composeChange(runtime, tree, intentFor(tree))

    const body = findNode(tree.root, ids.body)
    expect(body?.kind === "text" && body.value).toBe("Body copy")
  })

  it("hands back an inverse that undoes what it just did", async () => {
    const { runtime, tree } = harnessFor({ build: tweak })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "applied") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.inverse.baseRevision).toBe(outcome.tree.revision)
  })

  it("narrates every stage in order", async () => {
    const { runtime, events, tree } = harnessFor({ build: tweak })
    await composeChange(runtime, tree, intentFor(tree))

    expect(events.types()).toEqual([
      "intent-received",
      "change-proposed",
      "change-assessed",
      "disposition-decided",
      "change-applied",
    ])
  })

  it("stamps every event with the tree and the clock", async () => {
    const { runtime, events, tree } = harnessFor({ build: tweak })
    await composeChange(runtime, tree, intentFor(tree))

    for (const envelope of events.envelopes) {
      expect(envelope.treeId).toBe(tree.treeId)
      expect(envelope.occurredAt).toBe("2026-07-28T00:00:00.000Z")
    }
  })
})

describe("composeChange when the Gate holds a change back", () => {
  it("does not apply it, and says what it is waiting on", async () => {
    const { runtime, tree } = harnessFor({ build: tweak, confidence: 0.5 })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "awaiting-confirmation") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.disposition.reason.code).toBe("confidence-below-minimum")
  })

  it("emits the disposition but never an application", async () => {
    const { runtime, events, tree } = harnessFor({ build: tweak, confidence: 0.5 })
    await composeChange(runtime, tree, intentFor(tree))

    expect(events.types()).toContain("disposition-decided")
    expect(events.types()).not.toContain("change-applied")
  })
})

describe("composeChange when the Gate refuses", () => {
  it("reports the refusal without touching the tree", async () => {
    const { runtime, events, tree } = harnessFor({ build: tweak, confidence: 0.05 })

    const outcome = await composeChange(runtime, tree, intentFor(tree))

    expect(outcome.kind).toBe("rejected")
    expect(events.types()).not.toContain("change-applied")
  })
})

describe("composeChange when interpretation fails", () => {
  it("distinguishes not understanding from not being allowed", async () => {
    const { tree } = sampleTree()
    const events = collectingEventSink()
    const runtime: CompositionRuntime = {
      interpreter: scriptedInterpreter(err({ code: "not-understood", detail: "no idea" })),
      policy: defaultGatePolicy,
      events,
      clock: fixedClock(),
      idFactory: spare,
    }

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "not-interpreted") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.error.code).toBe("not-understood")
    expect(events.types()).toEqual(["intent-received", "interpretation-failed"])
  })
})

describe("composeChange when the proposal does not apply", () => {
  it("reports an inapplicable proposal rather than a policy decision", async () => {
    const { runtime, events, tree } = harnessFor({
      build: () => [{ op: "remove", nodeId: spare.nodeId() }],
    })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "not-applicable") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.error.code).toBe("node-not-found")
    expect(events.types()).toEqual([
      "intent-received",
      "change-proposed",
      "assessment-failed",
    ])
  })
})

describe("confirmChange", () => {
  it("applies a change the Gate had held back", async () => {
    const { runtime, tree, ids, proposal } = harnessFor({ build: tweak, confidence: 0.5 })

    const held = await composeChange(runtime, tree, intentFor(tree))
    expect(held.kind).toBe("awaiting-confirmation")

    const outcome = confirmChange(runtime, tree, proposal)
    if (outcome.kind !== "applied") throw new Error(`unexpected ${outcome.kind}`)

    const body = findNode(outcome.tree.root, ids.body)
    expect(body?.kind === "text" && body.value).toBe("Rewritten")
  })

  it("refuses a confirmation for a change the Gate would now refuse outright", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"] })
    const { runtime, tree, proposal } = harnessFor({
      build: (ids) => [{ op: "remove", nodeId: ids.card }],
      policy,
    })

    expect(confirmChange(runtime, tree, proposal).kind).toBe("rejected")
  })

  it("reports an inapplicable proposal instead of assessing it", () => {
    const { runtime, events, tree, proposal } = harnessFor({
      build: () => [{ op: "remove", nodeId: spare.nodeId() }],
    })

    const outcome = confirmChange(runtime, tree, proposal)
    if (outcome.kind !== "not-applicable") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.error.code).toBe("node-not-found")
    expect(events.types()).toEqual(["assessment-failed"])
  })

  it("rejects a confirmation that arrives after the tree has moved on", () => {
    const { runtime, tree, proposal } = harnessFor({ build: tweak, confidence: 0.5 })

    const moved = { ...tree, revision: tree.revision + 1 }
    const outcome = confirmChange(runtime, moved, proposal)
    if (outcome.kind !== "not-applicable") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.error.code).toBe("revision-mismatch")
  })
})
