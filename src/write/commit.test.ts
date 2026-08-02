import { describe, expect, it } from "vitest"

import { nodeIdSchema, sequentialIdFactory, treeIdSchema, type ProposalId } from "../ids.js"
import { err, ok } from "../result.js"
import type { EditIntent } from "../runtime/intent.js"
import { defaultGatePolicy, gatePolicySchema } from "../runtime/policy.js"
import type { ProposedChange } from "../runtime/proposal.js"
import type { StoreError } from "../store/errors.js"
import { memoryTreeStore } from "../store/memory.js"
import type { TreeStore } from "../store/store.js"
import {
  buildIntent,
  buildProposal,
  collectingEventSink,
  fixedClock,
  scriptedInterpreter,
  type CollectingEventSink,
  type RecordingInterpreter,
} from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import type { TreeDelta } from "../tree/delta.js"
import { findNode } from "../tree/navigation.js"
import type { LoomTree } from "../tree/tree.js"

import { commitIntent, confirmHeld, describeWriteOutcome, discardHeld, type WritePath } from "./commit.js"
import { memoryHoldStore } from "./held.js"

const spare = sequentialIdFactory("write")

type Harness = {
  readonly path: WritePath
  readonly events: CollectingEventSink
  readonly interpreter: RecordingInterpreter
  readonly tree: LoomTree
  readonly intent: EditIntent
  readonly proposal: ProposedChange
  readonly bodyId: ReturnType<typeof sampleTree>["ids"]["body"]
}

/**
 * A store with one tree in it, a runtime that will propose one known change to
 * that tree, and a holding store. `confidence` is the dial: high applies, middling
 * asks, low is refused.
 */
const harnessFor = async (options?: {
  readonly confidence?: number
  readonly storeOf?: (store: TreeStore) => TreeStore
}): Promise<Harness> => {
  const { tree, ids } = sampleTree()

  const store = memoryTreeStore()
  await store.create(tree)

  const delta: TreeDelta = {
    deltaId: spare.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: [{ op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] }],
  }

  const intent = buildIntent(spare, { treeId: tree.treeId, baseRevision: tree.revision })
  const proposal = buildProposal(spare, {
    intentId: intent.intentId,
    delta,
    ...(options?.confidence === undefined ? {} : { confidence: options.confidence }),
  })

  const events = collectingEventSink()
  const interpreter = scriptedInterpreter(ok(proposal))

  return {
    path: {
      store: options?.storeOf ? options.storeOf(store) : store,
      holds: memoryHoldStore(),
      runtime: {
        interpreter,
        policy: defaultGatePolicy,
        events,
        clock: fixedClock(),
        idFactory: spare,
      },
    },
    events,
    interpreter,
    tree,
    intent,
    proposal,
    bodyId: ids.body,
  }
}

describe("commitIntent on a change the Gate accepts", () => {
  it("writes it and returns the tree the store produced", async () => {
    const { path, intent, bodyId } = await harnessFor()

    const outcome = await commitIntent(path, intent)
    if (outcome.kind !== "committed") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.tree.revision).toBe(1)

    const body = findNode(outcome.tree.root, bodyId)
    expect(body?.kind === "text" ? body.value : undefined).toBe("Rewritten")
  })

  /** The point of the whole exercise: the next read sees it, because the log moved. */
  it("advances the store's head, not just the returned tree", async () => {
    const { path, intent, tree } = await harnessFor()
    await commitIntent(path, intent)

    const head = await path.store.head(tree.treeId)
    if (!head.ok) throw new Error("expected the tree to still exist")

    expect(head.value.revision).toBe(1)
  })

  it("records the proposal's provenance in the log, not the runtime's guess at it", async () => {
    const { path, intent, tree, proposal } = await harnessFor()
    await commitIntent(path, intent)

    const history = await path.store.revisions(tree.treeId)
    if (!history.ok) throw new Error("expected a history")

    expect(history.value.revisions).toHaveLength(1)
    expect(history.value.revisions[0]?.proposalId).toBe(proposal.proposalId)
    expect(history.value.revisions[0]?.provenance).toEqual(proposal.provenance)
  })

  /**
   * A change the Gate accepted outright had no second person in the way of it,
   * so there is nobody to name. An `answeredBy` here would read as an approval
   * that never happened (0029).
   */
  it("records no approver on a change nobody had to allow", async () => {
    const { path, intent, tree } = await harnessFor()
    await commitIntent(path, intent)

    const history = await path.store.revisions(tree.treeId)
    if (!history.ok) throw new Error("expected a history")

    expect(history.value.revisions[0] && "answeredBy" in history.value.revisions[0]).toBe(false)
  })

  /**
   * `change-applied` is about a tree in memory; `change-committed` is about the
   * log. Both, in that order, or the stream cannot distinguish "accepted" from
   * "persisted".
   */
  it("narrates the commit after the application", async () => {
    const { path, intent, events } = await harnessFor()
    await commitIntent(path, intent)

    const types = events.types()
    expect(types).toContain("change-applied")
    expect(types.indexOf("change-committed")).toBeGreaterThan(types.indexOf("change-applied"))
  })
})

describe("commitIntent on a stale intent", () => {
  const staleIntent = (intent: EditIntent): EditIntent => ({ ...intent, baseRevision: 7 })

  it("refuses with a conflict that names both revisions", async () => {
    const { path, intent } = await harnessFor()

    const outcome = await commitIntent(path, staleIntent(intent))
    if (outcome.kind !== "not-written") throw new Error(`unexpected ${outcome.kind}`)
    if (outcome.error.code !== "revision-conflict") throw new Error(outcome.error.code)

    expect(outcome.error.expected).toBe(7)
    expect(outcome.error.found).toBe(0)
  })

  /** The reason the check is here and not left to `append`. */
  it("never reaches the interpreter", async () => {
    const { path, intent, interpreter } = await harnessFor()
    await commitIntent(path, staleIntent(intent))

    expect(interpreter.intents).toHaveLength(0)
  })

  it("narrates the refusal rather than failing silently", async () => {
    const { path, intent, events } = await harnessFor()
    await commitIntent(path, staleIntent(intent))

    expect(events.types()).toEqual(["intent-not-writable"])
  })

  it("reports a tree that does not exist as not-found", async () => {
    const { path, intent } = await harnessFor()

    const outcome = await commitIntent(path, {
      ...intent,
      treeId: treeIdSchema.parse("t_absent"),
    })
    if (outcome.kind !== "not-written") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.error.code).toBe("not-found")
  })
})

describe("commitIntent when the Gate holds the change back", () => {
  it("takes it into custody instead of writing it", async () => {
    const { path, intent, tree } = await harnessFor({ confidence: 0.5 })

    const outcome = await commitIntent(path, intent)
    if (outcome.kind !== "held") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.held.disposition.kind).toBe("requires-confirmation")

    const head = await path.store.head(tree.treeId)
    expect(head.ok && head.value.revision).toBe(0)
  })

  it("holds it under the proposal's own id, with the revision it was judged against", async () => {
    const { path, intent, proposal } = await harnessFor({ confidence: 0.5 })
    await commitIntent(path, intent)

    const found = await path.holds.get(proposal.proposalId)
    if (!found.ok) throw new Error("expected the proposal to be held")

    expect(found.value.baseRevision).toBe(0)
    expect(found.value.intent.intentId).toBe(intent.intentId)
  })

  it("narrates custody separately from the disposition that caused it", async () => {
    const { path, intent, events } = await harnessFor({ confidence: 0.5 })
    await commitIntent(path, intent)

    const types = events.types()
    expect(types).toContain("disposition-decided")
    expect(types).toContain("proposal-held")
    expect(types).not.toContain("change-committed")
  })
})

describe("commitIntent when nothing should be written", () => {
  it("leaves the store untouched on a refusal", async () => {
    const { path, intent, tree } = await harnessFor({ confidence: 0.05 })

    const outcome = await commitIntent(path, intent)

    expect(outcome.kind).toBe("refused")

    const history = await path.store.revisions(tree.treeId)
    expect(history.ok && history.value.revisions).toHaveLength(0)
  })

  it("passes an interpretation failure through without touching the store", async () => {
    const { path, intent, tree } = await harnessFor()
    const failing: WritePath = {
      ...path,
      runtime: {
        ...path.runtime,
        interpreter: scriptedInterpreter(err({ code: "not-understood", detail: "no idea" })),
      },
    }

    const outcome = await commitIntent(failing, intent)

    expect(outcome.kind).toBe("not-interpreted")

    const history = await failing.store.revisions(tree.treeId)
    expect(history.ok && history.value.revisions).toHaveLength(0)
  })

  /**
   * The one case where the event stream could otherwise claim a change landed
   * that did not: applied in memory, then refused by persistence.
   */
  it("narrates a change that was accepted and then not persisted", async () => {
    const unavailable: StoreError = { code: "unavailable", detail: "connection reset" }
    const { path, intent, events } = await harnessFor({
      storeOf: (store) => ({ ...store, append: () => Promise.resolve(err(unavailable)) }),
    })

    const outcome = await commitIntent(path, intent)
    if (outcome.kind !== "not-written") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.error).toEqual(unavailable)
    expect(events.types()).toContain("commit-failed")
    expect(events.types()).not.toContain("change-committed")
  })
})

describe("confirmHeld", () => {
  const heldHarness = async () => {
    const harness = await harnessFor({ confidence: 0.5 })
    const outcome = await commitIntent(harness.path, harness.intent)
    if (outcome.kind !== "held") throw new Error(`unexpected ${outcome.kind}`)

    return { ...harness, held: outcome.held }
  }

  it("applies the change a human said yes to", async () => {
    const { path, held, bodyId } = await heldHarness()

    const outcome = await confirmHeld(path, { proposalId: held.proposalId })
    if (outcome.kind !== "committed") throw new Error(`unexpected ${outcome.kind}`)

    const body = findNode(outcome.tree.root, bodyId)
    expect(body?.kind === "text" ? body.value : undefined).toBe("Rewritten")
    expect(outcome.tree.revision).toBe(1)
  })

  it("narrates the human answer before the Gate's second look", async () => {
    const { path, held, events } = await heldHarness()
    await confirmHeld(path, { proposalId: held.proposalId })

    const types = events.types()
    expect(types).toContain("hold-confirmed")
    expect(types.lastIndexOf("disposition-decided")).toBeGreaterThan(types.indexOf("hold-confirmed"))
  })

  /**
   * A hold exists to put a second person in the way of a change, so the record
   * of who that was is the whole point of holding it (0027). Provenance names
   * the asker and cannot answer this.
   */
  it("names who answered, which is not who asked", async () => {
    const { path, held, events } = await heldHarness()
    await confirmHeld(path, { proposalId: held.proposalId, actor: "reviewer:ana" })

    const confirmed = events.envelopes.find(
      (envelope) => envelope.event.type === "hold-confirmed"
    )?.event

    expect(confirmed?.type === "hold-confirmed" && confirmed.actor).toBe("reviewer:ana")
  })

  it("leaves the answer unattributed when the host names nobody", async () => {
    const { path, held, events } = await heldHarness()
    await confirmHeld(path, { proposalId: held.proposalId })

    const confirmed = events.envelopes.find(
      (envelope) => envelope.event.type === "hold-confirmed"
    )?.event

    expect(confirmed && "actor" in confirmed).toBe(false)
  })

  /**
   * 0029: the same actor lands on the revision, so the log alone answers "who
   * allowed this". Before it, that question needed the journal as well, and a
   * deployment that lost its journal kept the change and lost the approver.
   */
  it("records who allowed it on the revision, not only in the journal", async () => {
    const { path, held, intent } = await heldHarness()
    await confirmHeld(path, { proposalId: held.proposalId, actor: "reviewer:ana" })

    const log = await path.store.revisions(intent.treeId)
    if (!log.ok) throw new Error("the store refused the read")

    expect(log.value.revisions.map((stored) => stored.answeredBy)).toEqual(["reviewer:ana"])
  })

  /** One source, two writes — the event and the revision cannot disagree. */
  it("puts the same actor on the revision as on the event", async () => {
    const { path, held, intent, events } = await heldHarness()
    await confirmHeld(path, { proposalId: held.proposalId, actor: "reviewer:bo" })

    const log = await path.store.revisions(intent.treeId)
    if (!log.ok) throw new Error("the store refused the read")

    const confirmed = events.envelopes.find(
      (envelope) => envelope.event.type === "hold-confirmed"
    )?.event

    expect(log.value.revisions[0]?.answeredBy).toBe(
      confirmed?.type === "hold-confirmed" ? confirmed.actor : undefined
    )
  })

  it("leaves the revision unattributed when the host names nobody", async () => {
    const { path, held, intent } = await heldHarness()
    await confirmHeld(path, { proposalId: held.proposalId })

    const log = await path.store.revisions(intent.treeId)
    if (!log.ok) throw new Error("the store refused the read")

    expect(log.value.revisions[0] && "answeredBy" in log.value.revisions[0]).toBe(false)
  })

  /** Custody is a take, so the second click has nothing to answer. */
  it("cannot be answered twice", async () => {
    const { path, held } = await heldHarness()
    await confirmHeld(path, { proposalId: held.proposalId })

    const again = await confirmHeld(path, { proposalId: held.proposalId })
    if (again.kind !== "not-answerable") throw new Error(`unexpected ${again.kind}`)

    expect(again.error.code).toBe("not-held")
  })

  it("reports an id that was never held rather than inventing a proposal", async () => {
    const { path } = await harnessFor()

    const outcome = await confirmHeld(path, { proposalId: "p_nothing" as ProposalId })

    expect(outcome.kind).toBe("not-answerable")
  })

  /**
   * A hold names a revision it can never apply to again once the tree moves,
   * so confirming a dead one ends its custody rather than leaving it to fail
   * on every future click.
   */
  it("discards a hold whose tree has moved on, and says why", async () => {
    const { path, held, tree, intent } = await heldHarness()

    const other = await harnessFor()
    await path.store.append(tree.treeId, {
      proposalId: other.proposal.proposalId,
      delta: { ...other.proposal.delta, treeId: tree.treeId },
      provenance: other.proposal.provenance,
      appliedAt: "2026-07-30T00:00:00.000Z",
    })

    const outcome = await confirmHeld(path, { proposalId: held.proposalId })
    if (outcome.kind !== "not-written") throw new Error(`unexpected ${outcome.kind}`)
    if (outcome.error.code !== "revision-conflict") throw new Error(outcome.error.code)

    expect(outcome.error.expected).toBe(0)
    expect(outcome.error.found).toBe(1)
    expect((await path.holds.get(held.proposalId)).ok).toBe(false)
    expect(intent.baseRevision).toBe(0)
  })

  /** A human saying yes is permission to proceed, not permission to skip the Gate. */
  it("re-runs the Gate, and a policy that now refuses still refuses", async () => {
    const { path, held } = await heldHarness()

    const stricter: WritePath = {
      ...path,
      runtime: {
        ...path.runtime,
        policy: gatePolicySchema.parse({ minimumConfidence: 0.9, confidenceFloor: 0.8 }),
      },
    }

    const outcome = await confirmHeld(stricter, { proposalId: held.proposalId })

    expect(outcome.kind).toBe("refused")
  })
})

describe("discardHeld", () => {
  it("ends custody and says what was discarded", async () => {
    const harness = await harnessFor({ confidence: 0.5 })
    const committed = await commitIntent(harness.path, harness.intent)
    if (committed.kind !== "held") throw new Error(`unexpected ${committed.kind}`)

    const discarded = await discardHeld(harness.path, { proposalId: committed.held.proposalId })
    if (!discarded.ok) throw new Error("expected the proposal to be discarded")

    expect(discarded.value.proposalId).toBe(committed.held.proposalId)
    expect((await harness.path.holds.get(committed.held.proposalId)).ok).toBe(false)
  })

  /** §6's most informative event: the Gate allowed it and a human did not want it. */
  it("narrates the refusal so calibration can learn from it", async () => {
    const harness = await harnessFor({ confidence: 0.5 })
    const committed = await commitIntent(harness.path, harness.intent)
    if (committed.kind !== "held") throw new Error(`unexpected ${committed.kind}`)

    await discardHeld(harness.path, { proposalId: committed.held.proposalId })

    expect(harness.events.types()).toContain("hold-discarded")
  })

  /**
   * A refusal is only evidence about the Gate's calibration if it says which
   * reviewer refused: two reviewers disagreeing is a different fact from one
   * reviewer refusing twice, and an unattributed stream cannot tell them apart.
   */
  it("names the reviewer who said no", async () => {
    const harness = await harnessFor({ confidence: 0.5 })
    const committed = await commitIntent(harness.path, harness.intent)
    if (committed.kind !== "held") throw new Error(`unexpected ${committed.kind}`)

    await discardHeld(harness.path, {
      proposalId: committed.held.proposalId,
      actor: "reviewer:bo",
    })

    const discarded = harness.events.envelopes.find(
      (envelope) => envelope.event.type === "hold-discarded"
    )?.event

    expect(discarded?.type === "hold-discarded" && discarded.actor).toBe("reviewer:bo")
  })

  it("leaves the tree exactly as it was", async () => {
    const harness = await harnessFor({ confidence: 0.5 })
    const committed = await commitIntent(harness.path, harness.intent)
    if (committed.kind !== "held") throw new Error(`unexpected ${committed.kind}`)

    await discardHeld(harness.path, { proposalId: committed.held.proposalId })

    const head = await harness.path.store.head(harness.tree.treeId)
    expect(head.ok && head.value.revision).toBe(0)
  })

  it("reports an unknown id rather than pretending to discard", async () => {
    const { path } = await harnessFor()

    const discarded = await discardHeld(path, { proposalId: "p_nothing" as ProposalId })

    expect(discarded.ok).toBe(false)
  })
})

describe("describeWriteOutcome", () => {
  it("produces a non-empty message for every outcome a write can have", async () => {
    const { path, intent, proposal } = await harnessFor()
    const committed = await commitIntent(path, intent)

    const held = await harnessFor({ confidence: 0.5 })
    const holdOutcome = await commitIntent(held.path, held.intent)

    const refused = await harnessFor({ confidence: 0.05 })
    const refusedOutcome = await commitIntent(refused.path, refused.intent)

    const outcomes = [
      committed,
      holdOutcome,
      refusedOutcome,
      { kind: "not-interpreted", error: { code: "not-understood", detail: "no" } } as const,
      {
        kind: "not-applicable",
        proposal,
        error: { code: "node-not-found", nodeId: nodeIdSchema.parse("n_1") },
      } as const,
      { kind: "not-written", error: { code: "unavailable", detail: "down" } } as const,
      { kind: "not-answerable", error: { code: "not-held", proposalId: "p_1" as ProposalId } } as const,
    ]

    for (const outcome of outcomes) {
      expect(describeWriteOutcome(outcome).length).toBeGreaterThan(0)
    }

    expect(new Set(outcomes.map((outcome) => outcome.kind)).size).toBe(outcomes.length)
  })
})
