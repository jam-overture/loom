import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { BindingReader } from "../render/reads.js"
import { err, ok, type Result } from "../result.js"
import {
  buildIntent,
  buildProposal,
  collectingEventSink,
  failingEventSink,
  fixedClock,
  scriptedInterpreter,
  scriptedRepairer,
  type CollectingEventSink,
} from "../testing/doubles.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { sampleTree, type SampleTree } from "../testing/fixtures.js"
import { buildElement } from "../tree/builders.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { findNode } from "../tree/navigation.js"
import type { LoomTree } from "../tree/tree.js"

import type { IntentOrigin } from "./intent.js"
import type { InterpretationError } from "./interpreter.js"
import {
  COMPOSITION_OUTCOME_KINDS,
  composeChange,
  confirmChange,
  type CompositionOutcomeKind,
  type CompositionRuntime,
} from "./pipeline.js"
import { fixedPolicy, type PolicyContext, type PolicySource } from "./policy-source.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./policy.js"
import type { ProposedChange } from "./proposal.js"
import type { PropsVocabulary } from "./vocabulary.js"

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
  readonly policySource?: PolicySource
  readonly origin?: IntentOrigin
  readonly confidence?: number
  /** For the containment tests: a sink that refuses some of what it is handed. */
  readonly sink?: CollectingEventSink
  readonly propsVocabulary?: PropsVocabulary
  readonly bindingReader?: BindingReader
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

  const events = options.sink ?? collectingEventSink()

  return {
    runtime: {
      interpreter: scriptedInterpreter(ok(proposal)),
      policySource: options.policySource ?? fixedPolicy(options.policy ?? defaultGatePolicy),
      events,
      clock: fixedClock(),
      idFactory: spare,
      ...(options.propsVocabulary ? { propsVocabulary: options.propsVocabulary } : {}),
      ...(options.bindingReader ? { bindingReader: options.bindingReader } : {}),
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
      "policy-resolved",
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
      policySource: fixedPolicy(defaultGatePolicy),
      events,
      clock: fixedClock(),
      idFactory: spare,
    }

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "not-interpreted") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.error.code).toBe("not-understood")
    expect(events.types()).toEqual([
      "intent-received",
      "policy-resolved",
      "interpretation-failed",
    ])
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
      "policy-resolved",
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

    const outcome = confirmChange(runtime, tree, proposal, intentFor(tree))
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

    expect(confirmChange(runtime, tree, proposal, intentFor(tree)).kind).toBe("rejected")
  })

  it("reports an inapplicable proposal instead of assessing it", () => {
    const { runtime, events, tree, proposal } = harnessFor({
      build: () => [{ op: "remove", nodeId: spare.nodeId() }],
    })

    const outcome = confirmChange(runtime, tree, proposal, intentFor(tree))
    if (outcome.kind !== "not-applicable") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.error.code).toBe("node-not-found")
    expect(events.types()).toEqual(["policy-resolved", "assessment-failed"])
  })

  it("rejects a confirmation that arrives after the tree has moved on", () => {
    const { runtime, tree, proposal } = harnessFor({ build: tweak, confidence: 0.5 })

    const moved = { ...tree, revision: tree.revision + 1 }
    const outcome = confirmChange(runtime, moved, proposal, intentFor(moved))
    if (outcome.kind !== "not-applicable") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.error.code).toBe("revision-mismatch")
  })
})

describe("composeChange when a refusal is repaired", () => {
  /**
   * The first proposal is refused for low confidence; the repair comes back
   * confident. Both halves of that story have to survive in the record.
   */
  const refusedThenRepaired = (repair: Result<ProposedChange, InterpretationError>) => {
    const base = harnessFor({ build: tweak, confidence: 0.05 })
    const repairer = scriptedRepairer(repair)

    return { ...base, repairer, runtime: { ...base.runtime, repairer } }
  }

  const confidentRepair = (tree: LoomTree, ids: SampleTree["ids"]): ProposedChange =>
    buildProposal(spare, {
      intentId: spare.intentId(),
      delta: {
        deltaId: spare.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: [{ op: "configure", nodeId: ids.body, set: { value: "Gentler" }, unset: [] }],
      },
      rationale: "a smaller change that respects the objection",
      confidence: 0.95,
    })

  it("leaves a refusal terminal when no repairer is wired in", async () => {
    const { runtime, events, tree } = harnessFor({ build: tweak, confidence: 0.05 })

    const outcome = await composeChange(runtime, tree, intentFor(tree))

    expect(outcome.kind).toBe("rejected")
    expect(events.types()).not.toContain("repair-requested")
  })

  it("hands the refusal back and applies the repaired change", async () => {
    const { tree, ids } = sampleTree()
    const { runtime } = refusedThenRepaired(ok(confidentRepair(tree, ids)))

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "applied") throw new Error(`unexpected ${outcome.kind}`)

    const body = findNode(outcome.tree.root, ids.body)
    expect(body?.kind === "text" && body.value).toBe("Gentler")
  })

  it("records the refusal as well as the repair, in order", async () => {
    const { tree, ids } = sampleTree()
    const { runtime, events } = refusedThenRepaired(ok(confidentRepair(tree, ids)))

    await composeChange(runtime, tree, intentFor(tree))

    expect(events.types()).toEqual([
      "intent-received",
      "policy-resolved",
      "change-proposed",
      "change-assessed",
      "disposition-decided",
      "repair-requested",
      "change-proposed",
      "change-assessed",
      "disposition-decided",
      "change-applied",
    ])
  })

  it("keeps the original refusal legible in the record after a successful repair", async () => {
    const { tree, ids } = sampleTree()
    const { runtime, events } = refusedThenRepaired(ok(confidentRepair(tree, ids)))

    await composeChange(runtime, tree, intentFor(tree))

    const dispositions = events.envelopes
      .map((envelope) => envelope.event)
      .filter((event) => event.type === "disposition-decided")

    expect(dispositions).toHaveLength(2)
    expect(dispositions[0]?.type === "disposition-decided" && dispositions[0].disposition.kind).toBe(
      "rejected"
    )
    expect(dispositions[1]?.type === "disposition-decided" && dispositions[1].disposition.kind).toBe(
      "accepted"
    )
  })

  it("tells the repairer which proposal was refused and why", async () => {
    const { tree, ids } = sampleTree()
    const { runtime, repairer, proposal } = refusedThenRepaired(ok(confidentRepair(tree, ids)))

    await composeChange(runtime, tree, intentFor(tree))

    expect(repairer.requests).toHaveLength(1)
    expect(repairer.requests[0]?.refused.proposalId).toBe(proposal.proposalId)
    expect(repairer.requests[0]?.disposition.kind).toBe("rejected")
    expect(repairer.requests[0]?.disposition.reason.code).toBe("confidence-below-floor")
  })

  it("stamps the repair with what it replaces, whatever the repairer claimed", async () => {
    const { tree, ids } = sampleTree()
    const claimed = { ...confidentRepair(tree, ids), repairOf: spare.proposalId() }
    const { runtime, events, proposal } = refusedThenRepaired(ok(claimed))

    await composeChange(runtime, tree, intentFor(tree))

    const proposals = events.envelopes
      .map((envelope) => envelope.event)
      .filter((event) => event.type === "change-proposed")

    expect(proposals[1]?.type === "change-proposed" && proposals[1].proposal.repairOf).toBe(
      proposal.proposalId
    )
  })

  it("allows exactly one attempt — a repair that is refused again is terminal", async () => {
    const { tree, ids } = sampleTree()
    const weak = { ...confidentRepair(tree, ids), provenance: { ...confidentRepair(tree, ids).provenance, confidence: 0.05 } }
    const { runtime, events, repairer } = refusedThenRepaired(ok(weak))

    const outcome = await composeChange(runtime, tree, intentFor(tree))

    expect(outcome.kind).toBe("rejected")
    expect(repairer.requests).toHaveLength(1)
    expect(events.types().filter((type) => type === "repair-requested")).toHaveLength(1)
  })

  it("leaves the original refusal standing when the repairer declines", async () => {
    const { tree } = sampleTree()
    const { runtime, events } = refusedThenRepaired(
      err({ code: "not-understood", detail: "no gentler version exists" })
    )

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.disposition.reason.code).toBe("confidence-below-floor")
    expect(events.types()).toContain("repair-failed")
    expect(events.types()).not.toContain("change-applied")
  })

  /**
   * The three ways a refusal ends, told apart from the return value alone. Read
   * together rather than one at a time: the point is not what any single one
   * carries, it is that no two of them look the same to a caller that never
   * opens the journal.
   */
  describe("and the outcome says what became of the repair", () => {
    it("carries the repairer's error when it declined", async () => {
      const { tree } = sampleTree()
      const { runtime } = refusedThenRepaired(
        err({ code: "not-understood", detail: "no gentler version exists" })
      )

      const outcome = await composeChange(runtime, tree, intentFor(tree))
      if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

      expect(outcome.repairFailure).toEqual({
        code: "not-understood",
        detail: "no gentler version exists",
      })
      expect(outcome.assessment.proposal.repairOf).toBeUndefined()
    })

    it("carries no error when a repair was made and refused in its turn", async () => {
      const { tree, ids } = sampleTree()
      const confident = confidentRepair(tree, ids)
      const weak = {
        ...confident,
        provenance: { ...confident.provenance, confidence: 0.05 },
      }
      const { runtime, proposal } = refusedThenRepaired(ok(weak))

      const outcome = await composeChange(runtime, tree, intentFor(tree))
      if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

      expect(outcome.repairFailure).toBeUndefined()
      expect(outcome.assessment.proposal.repairOf).toBe(proposal.proposalId)
    })

    it("carries no error and no repair when nothing was asked", async () => {
      const { runtime, tree } = harnessFor({ build: tweak, confidence: 0.05 })

      const outcome = await composeChange(runtime, tree, intentFor(tree))
      if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

      expect(outcome.repairFailure).toBeUndefined()
      expect(outcome.assessment.proposal.repairOf).toBeUndefined()
    })
  })

  it("does not repair a change the Gate merely held back for a human", async () => {
    const base = harnessFor({ build: tweak, confidence: 0.5 })
    const repairer = scriptedRepairer(err({ code: "not-understood", detail: "unused" }))
    const runtime = { ...base.runtime, repairer }

    const outcome = await composeChange(runtime, base.tree, intentFor(base.tree))

    expect(outcome.kind).toBe("awaiting-confirmation")
    expect(repairer.requests).toHaveLength(0)
  })

  it("does not repair a proposal that never applied in the first place", async () => {
    const base = harnessFor({ build: () => [{ op: "remove", nodeId: spare.nodeId() }] })
    const repairer = scriptedRepairer(err({ code: "not-understood", detail: "unused" }))
    const runtime = { ...base.runtime, repairer }

    const outcome = await composeChange(runtime, base.tree, intentFor(base.tree))

    expect(outcome.kind).toBe("not-applicable")
    expect(repairer.requests).toHaveLength(0)
  })

  it("reports a repair that does not apply as inapplicable", async () => {
    const { tree } = sampleTree()
    const broken = buildProposal(spare, {
      intentId: spare.intentId(),
      delta: {
        deltaId: spare.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: [{ op: "remove", nodeId: spare.nodeId() }],
      },
      confidence: 0.95,
    })
    const { runtime } = refusedThenRepaired(ok(broken))

    const outcome = await composeChange(runtime, tree, intentFor(tree))

    expect(outcome.kind).toBe("not-applicable")
  })
})

/**
 * The policy is chosen for the ask, not for the answer. Everything here is
 * about *when* it is resolved and *what* the source is allowed to have seen,
 * because those are the properties that keep the Gate's verdict meaningful.
 */
describe("the policy a change is judged under", () => {
  const recordingSource = (policy: GatePolicy) => {
    const seen: PolicyContext[] = []

    return {
      seen,
      source: {
        resolve: (context: PolicyContext) => {
          seen.push(context)

          return policy
        },
      },
    }
  }

  it("names the policy that decided, on the disposition itself", async () => {
    const policy = gatePolicySchema.parse({ policyId: "storefront" })
    const { runtime, tree } = harnessFor({ build: tweak, policy })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "applied") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.disposition.policyId).toBe("storefront")
  })

  it("narrates the resolution before anything is interpreted", async () => {
    const policy = gatePolicySchema.parse({ policyId: "storefront" })
    const { runtime, events, tree } = harnessFor({ build: tweak, policy })
    const intent = intentFor(tree)

    await composeChange(runtime, tree, intent)

    expect(events.types().indexOf("policy-resolved")).toBeLessThan(
      events.types().indexOf("change-proposed")
    )
    expect(events.envelopes[0]?.event.type).toBe("intent-received")
    expect(events.envelopes[1]?.event).toEqual({
      type: "policy-resolved",
      intentId: intent.intentId,
      policy,
    })
  })

  /**
   * The context is the tree and the ask, and nothing else. A source that could
   * see what the model proposed could pick a lenient policy in answer to a
   * change the strict one would have refused.
   */
  it("shows the source the ask and the tree, and never the proposal", async () => {
    const { seen, source } = recordingSource(defaultGatePolicy)
    const { runtime, tree } = harnessFor({ build: tweak, policySource: source })
    const intent = intentFor(tree)

    await composeChange(runtime, tree, intent)

    expect(seen).toHaveLength(1)
    expect(Object.keys(seen[0] ?? {}).sort()).toEqual(["intent", "tree"])
    expect(seen[0]?.intent.intentId).toBe(intent.intentId)
    expect(seen[0]?.tree.treeId).toBe(tree.treeId)
  })

  /**
   * 0006's whole point is that the repair is comparable to what it replaced.
   * Resolving twice would let a host's source hand the second attempt an easier
   * bar and make the repair look like it earned its acceptance.
   */
  it("judges a repair under the same policy as the proposal it replaces", async () => {
    const { seen, source } = recordingSource(gatePolicySchema.parse({ policyId: "storefront" }))
    const base = harnessFor({ build: tweak, confidence: 0.05, policySource: source })
    const repair = buildProposal(spare, {
      intentId: spare.intentId(),
      delta: {
        deltaId: spare.deltaId(),
        treeId: base.tree.treeId,
        baseRevision: base.tree.revision,
        operations: tweak(base.ids),
      },
      confidence: 0.95,
    })
    const runtime = { ...base.runtime, repairer: scriptedRepairer(ok(repair)) }

    await composeChange(runtime, base.tree, intentFor(base.tree))

    const decided = base.events.envelopes.flatMap((envelope) =>
      envelope.event.type === "disposition-decided" ? [envelope.event.disposition] : []
    )

    expect(seen).toHaveLength(1)
    expect(decided).toHaveLength(2)
    expect(decided.map((disposition) => disposition.policyId)).toEqual(["storefront", "storefront"])
  })

  /**
   * The second look is a look at things as they are now — the same rule the
   * assessment already follows. A host that tightened its policy while the
   * proposal sat in the queue meant that for the queue too.
   */
  it("resolves again when a held proposal is confirmed", async () => {
    const { runtime, tree, proposal } = harnessFor({
      build: (ids) => [{ op: "remove", nodeId: ids.card }],
      policySource: {
        resolve: ({ intent }: PolicyContext) =>
          intent.origin === "developer"
            ? gatePolicySchema.parse({ policyId: "lenient" })
            : gatePolicySchema.parse({
                policyId: "locked-down",
                protectedPrimitiveTypes: ["loom.card"],
              }),
      },
    })

    const lenient = buildIntent(spare, {
      treeId: tree.treeId,
      baseRevision: tree.revision,
      origin: "developer",
    })

    const held = confirmChange(runtime, tree, proposal, lenient)
    expect(held.kind).toBe("applied")
    expect(held.kind === "applied" && held.disposition.policyId).toBe("lenient")

    const locked = confirmChange(runtime, tree, proposal, intentFor(tree))
    expect(locked.kind).toBe("rejected")
    expect(locked.kind === "rejected" && locked.disposition.policyId).toBe("locked-down")
  })
})

/**
 * The guarantee `EventSink` has carried since §2, tested at the level it is
 * made rather than at the level it is implemented: not "our sinks happen not to
 * throw" but "a sink that does throw changes nothing" (0042).
 */
describe("composeChange when the event sink fails", () => {
  it("still applies a change whose narration the sink refused", async () => {
    const sink = failingEventSink(["change-applied"])
    const { runtime, tree, ids } = harnessFor({ build: tweak, sink })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "applied") throw new Error(`unexpected ${outcome.kind}`)

    const body = findNode(outcome.tree.root, ids.body)
    expect(body?.kind === "text" && body.value).toBe("Rewritten")
  })

  it("still refuses a change the Gate rejected when the sink refuses the disposition", async () => {
    const sink = failingEventSink(["disposition-decided"])
    const { runtime, tree } = harnessFor({
      build: (ids) => [{ op: "remove", nodeId: ids.card }],
      confidence: 0.1,
      sink,
    })

    const outcome = await composeChange(runtime, tree, intentFor(tree))

    expect(outcome.kind).toBe("rejected")
  })

  it("narrates every stage after the one the sink refused", async () => {
    const sink = failingEventSink(["change-proposed"])
    const { runtime, tree } = harnessFor({ build: tweak, sink })

    await composeChange(runtime, tree, intentFor(tree))

    expect(sink.types()).toEqual([
      "intent-received",
      "policy-resolved",
      "change-assessed",
      "disposition-decided",
      "change-applied",
    ])
  })

  it("contains a sink that rejects as well as one that throws", async () => {
    const sink = failingEventSink(["change-applied"], "reject")
    const { runtime, tree } = harnessFor({ build: tweak, sink })

    const outcome = await composeChange(runtime, tree, intentFor(tree))

    expect(outcome.kind).toBe("applied")
  })
})

/**
 * The end-to-end shape of 0064: a proposal that would put a link inside a link
 * is refused by the same machinery that refuses any critical change, and the
 * repairer — which exists to answer a refusal — gets the reason.
 */
describe("composeChange on a change that nests one target inside another", () => {
  const withTargets = gatePolicySchema.parse({
    policyId: "library",
    interactiveTypes: { "loom.card": { whenProps: ["href"] }, "loom.action": "always" },
  })

  const linkInsideALink = (ids: SampleTree["ids"]): TreeOperation[] => [
    { op: "configure", nodeId: ids.card, set: { href: "/pricing" }, unset: [] },
    {
      op: "insert",
      parentId: ids.card,
      index: 0,
      node: buildElement(spare, { type: "loom.action" }),
    },
  ]

  it("refuses it, naming both nodes", async () => {
    const { runtime, tree, ids } = harnessFor({ build: linkInsideALink, policy: withTargets })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.disposition.reason.code).toBe("stakes-at-refusal-floor")
    expect(outcome.disposition.reason.detail).toContain(`inside loom.card ${ids.card}`)
  })

  it("leaves the same change alone when the host declares no targets", async () => {
    const { runtime, tree } = harnessFor({ build: linkInsideALink })

    const outcome = await composeChange(runtime, tree, intentFor(tree))

    expect(outcome.kind).toBe("applied")
  })

  it("does not refuse an action inside a card that is not a link", async () => {
    const { runtime, tree } = harnessFor({
      policy: withTargets,
      build: (ids) => [
        {
          op: "insert",
          parentId: ids.card,
          index: 0,
          node: buildElement(spare, { type: "loom.action" }),
        },
      ],
    })

    const outcome = await composeChange(runtime, tree, intentFor(tree))

    expect(outcome.kind).toBe("applied")
  })

  it("refuses it however high the origin's ceiling is, because the markup is wrong either way", async () => {
    const { runtime, tree } = harnessFor({
      build: linkInsideALink,
      policy: withTargets,
      origin: "developer",
    })

    expect((await composeChange(runtime, tree, intentFor(tree))).kind).toBe("rejected")
  })
})

/**
 * `CompositionOutcome` has no schema — it never crosses a boundary, so there is
 * nothing to parse it back and nothing to count it. The completeness check is
 * therefore at the type level: the record below has to name every kind or this
 * file does not compile, and the assertion carries that into the exported list.
 */
const everyKind: Readonly<Record<CompositionOutcomeKind, true>> = {
  applied: true,
  "awaiting-confirmation": true,
  rejected: true,
  "not-interpreted": true,
  "not-applicable": true,
}

describe("COMPOSITION_OUTCOME_KINDS", () => {
  it("is every way an ask can end", () => {
    expect([...COMPOSITION_OUTCOME_KINDS].sort()).toEqual(Object.keys(everyKind).sort())
  })

  it("names each ending once", () => {
    expect(new Set(COMPOSITION_OUTCOME_KINDS).size).toBe(COMPOSITION_OUTCOME_KINDS.length)
  })
})

/**
 * The defect `Loom docs` found by running the quickstart rather than reading it
 * (17 September): a delta naming a primitive nobody registered reached
 * `committed`, because nothing between the interpreter and the store had the
 * means to ask whether the type exists. Both halves are held here — the one that
 * has not changed, and the one that now can.
 */
describe("composeChange on a delta that names a primitive nobody registered", () => {
  const inventing = (ids: SampleTree["ids"]): TreeOperation[] => [
    {
      op: "insert",
      parentId: ids.page,
      index: 0,
      node: buildElement(spare, { type: "app.nonesuch" }),
    },
  ]

  const library = ["loom.page", "loom.header", "loom.card", "loom.footer"]

  it("applies it when the host has declared no library, which is what it always did", async () => {
    const { runtime, tree } = harnessFor({ build: inventing })

    const outcome = await composeChange(runtime, tree, intentFor(tree))

    expect(outcome.kind).toBe("applied")
  })

  it("refuses it when the host has declared one", async () => {
    const { runtime, tree } = harnessFor({
      build: inventing,
      policy: gatePolicySchema.parse({ registeredPrimitiveTypes: library }),
    })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.disposition.reason.code).toBe("stakes-at-refusal-floor")
    expect(outcome.disposition.reason.detail).toContain("app.nonesuch")
    expect(outcome.assessment.analysis.unknownPrimitives).toHaveLength(1)
  })

  /**
   * Which is the reason a refusal is the useful disposition and not merely the
   * severe one. *That type does not exist* is the most actionable thing a model
   * can be told, and only a refusal reaches the repairer at all.
   */
  it("gives the repairer the chance to name one that exists", async () => {
    const base = harnessFor({
      build: inventing,
      policy: gatePolicySchema.parse({ registeredPrimitiveTypes: library }),
    })
    const repaired = buildProposal(spare, {
      intentId: spare.intentId(),
      delta: {
        deltaId: spare.deltaId(),
        treeId: base.tree.treeId,
        baseRevision: base.tree.revision,
        operations: [
          {
            op: "insert",
            parentId: base.ids.page,
            index: 0,
            node: buildElement(spare, { type: "loom.card" }),
          },
        ],
      },
      rationale: "a primitive this deployment has",
      confidence: 0.95,
      origin: "developer",
    })
    const repairer = scriptedRepairer(ok(repaired))

    const outcome = await composeChange(
      { ...base.runtime, repairer },
      base.tree,
      intentFor(base.tree)
    )

    expect(repairer.requests[0]?.disposition.reason.detail).toContain("app.nonesuch")
    expect(outcome.kind).toBe("applied")
  })

  /** A host that declared a library still keeps everything already in its trees. */
  it("says nothing about a change that only rearranges what the tree already holds", async () => {
    const { runtime, tree, ids } = harnessFor({
      build: (fixture) => [
        { op: "move", nodeId: fixture.card, parentId: fixture.page, index: 0 },
      ],
      policy: gatePolicySchema.parse({
        registeredPrimitiveTypes: ["loom.page"],
        autoApplyCeiling: { developer: "critical" },
      }),
      origin: "developer",
    })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "applied") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.assessment.analysis.unknownPrimitives).toEqual([])
    expect(findNode(outcome.tree.root, ids.card)).toBeTruthy()
  })
})

/**
 * The write path against a deployment that has declared what its primitives
 * accept. `loom.card` takes two variants here; everything else is undeclared,
 * which is the state most of a real registry is in on the day it is wired.
 */
const acceptsVariants: PropsVocabulary = (type, props) =>
  type !== "loom.card"
    ? { outcome: "undeclared" }
    : props.variant === "outlined" || props.variant === "filled"
      ? { outcome: "valid" }
      : {
          outcome: "invalid",
          issues: [{ path: "variant", message: `received ${String(props.variant)}` }],
        }

/** The change the docs' quickstart makes: a prop the declaring schema will not take. */
const overlongProp = (ids: SampleTree["ids"]): TreeOperation[] => [
  { op: "configure", nodeId: ids.card, set: { variant: "invented" }, unset: [] },
]

describe("composeChange against a declared props vocabulary", () => {
  /**
   * The behaviour every deployment had before 0179, asserted rather than
   * assumed: an unwired runtime must be bit-for-bit what it was, because that
   * is the only thing that makes this an additive change.
   */
  it("commits a change no schema was consulted about when none is wired", async () => {
    const { runtime, tree } = harnessFor({ build: overlongProp })

    const outcome = await composeChange(runtime, tree, intentFor(tree))

    expect(outcome.kind).toBe("applied")
  })

  it("refuses a change that would leave a node its own primitive will not draw", async () => {
    const { runtime, tree } = harnessFor({ build: overlongProp, propsVocabulary: acceptsVariants })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.disposition.reason.code).toBe("stakes-at-refusal-floor")
    expect(outcome.assessment.stakes.factors.map((factor) => factor.code)).toContain("invalid-props")
  })

  it("leaves the tree where it was, so no reader is served the hole", async () => {
    const { runtime, tree, ids } = harnessFor({
      build: overlongProp,
      propsVocabulary: acceptsVariants,
    })

    await composeChange(runtime, tree, intentFor(tree))

    const card = findNode(tree.root, ids.card)
    expect(card?.kind === "element" && card.props.variant).toBe("outlined")
  })

  it("says which prop and why, rather than that something was wrong", async () => {
    const { runtime, tree, ids } = harnessFor({
      build: overlongProp,
      propsVocabulary: acceptsVariants,
    })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.assessment.analysis.invalidProps).toEqual([
      {
        nodeId: ids.card,
        type: "loom.card",
        issues: [{ path: "variant", message: "received invented" }],
      },
    ])
  })

  it("lets through a change the declared schema accepts", async () => {
    const { runtime, tree } = harnessFor({
      build: (ids) => [{ op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] }],
      propsVocabulary: acceptsVariants,
    })

    expect((await composeChange(runtime, tree, intentFor(tree))).kind).toBe("applied")
  })

  /**
   * The property the whole shape was chosen for. A validation failure arrives
   * as an ordinary refusal, so it carries a `Disposition`, so a repairer is
   * offered it and can answer — which is exactly what a sixth outcome kind
   * would have cost (0179). Without this, a model's near-miss is a dead end.
   */
  it("offers the refusal to a repairer, which can answer it", async () => {
    const { tree, ids, runtime: base } = harnessFor({
      build: overlongProp,
      propsVocabulary: acceptsVariants,
    })

    const mended = buildProposal(spare, {
      intentId: spare.intentId(),
      delta: {
        deltaId: spare.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: [{ op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] }],
      },
    })

    const repairer = scriptedRepairer(ok(mended))
    const outcome = await composeChange({ ...base, repairer }, tree, intentFor(tree))

    expect(repairer.requests).toHaveLength(1)
    expect(repairer.requests[0]?.disposition.kind).toBe("rejected")
    expect(outcome.kind).toBe("applied")
  })

  /**
   * A repairer that is told *which* prop and *what the schema said* has enough
   * to work with; one told only "rejected" does not. The detail is on the
   * disposition's own sentence, which is what a repairer reads.
   */
  it("hands the repairer the prop and the schema's own words", async () => {
    const { tree, runtime: base } = harnessFor({
      build: overlongProp,
      propsVocabulary: acceptsVariants,
    })

    const repairer = scriptedRepairer(err({ code: "not-understood", detail: "unused" }))
    await composeChange({ ...base, repairer }, tree, intentFor(tree))

    expect(repairer.requests[0]?.disposition.reason.detail).toContain("variant: received invented")
  })

  /**
   * A page can already hold a node a later schema refuses, and an ordinary edit
   * to it must not be refused for damage the change did not do. The same
   * measurement `nestedTargets` makes, and the case that would make this
   * feature unusable on any deployment that tightened a schema.
   */
  it("does not refuse an edit to a page that was already carrying a refused node", async () => {
    const { runtime, tree } = harnessFor({
      build: (ids) => [{ op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] }],
      propsVocabulary: (type, props) =>
        type === "loom.card" && props.variant === "outlined"
          ? { outcome: "invalid", issues: [{ path: "variant", message: "no longer offered" }] }
          : { outcome: "undeclared" },
    })

    expect((await composeChange(runtime, tree, intentFor(tree))).kind).toBe("applied")
  })
})

describe("confirmChange against a declared props vocabulary", () => {
  /**
   * The confirmation path recomputes the assessment rather than trusting the
   * one captured at proposal time, and it has to recompute it the same way. A
   * vocabulary threaded into one call site and not the other would let a held
   * change land carrying exactly what the first look refused.
   */
  it("refuses a held change the schema will not take, even with a person saying yes", () => {
    const { runtime, tree, proposal } = harnessFor({
      build: overlongProp,
      propsVocabulary: acceptsVariants,
    })

    const outcome = confirmChange(runtime, tree, proposal, intentFor(tree))
    if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.assessment.stakes.factors.map((factor) => factor.code)).toContain("invalid-props")
  })
})

/** `loom.card` reads its answer under `items` and says so. */
const readsItems: BindingReader = {
  bindingsReadBy: (type) => (type === "loom.card" ? ["items"] : undefined),
}

/** The mistake a model makes: the right source, under a name nobody opens. */
const asksUnderTheWrongName = (ids: SampleTree["ids"]): TreeOperation[] => [
  {
    op: "configure",
    nodeId: ids.card,
    set: { [DATA_PROP_KEY]: { rows: { source: "catalogue.services" } } },
    unset: [],
  },
]

describe("composeChange against a declared binding reader", () => {
  /**
   * The behaviour every deployment had before 0208, asserted rather than
   * assumed: an unwired runtime commits exactly what it committed yesterday,
   * which is the only thing that makes this additive. Two primitives in the
   * library now declare `reads`, so a default that had leaked would start
   * refusing changes on every host that upgraded without asking to.
   */
  it("commits a change no reader was consulted about when none is wired", async () => {
    const { runtime, tree } = harnessFor({ build: asksUnderTheWrongName })

    expect((await composeChange(runtime, tree, intentFor(tree))).kind).toBe("applied")
  })

  it("refuses a change that would ask for data nothing on the page reads", async () => {
    const { runtime, tree } = harnessFor({
      build: asksUnderTheWrongName,
      bindingReader: readsItems,
    })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.disposition.reason.code).toBe("stakes-at-refusal-floor")
    expect(outcome.assessment.stakes.factors.map((factor) => factor.code)).toContain(
      "unread-binding"
    )
  })

  /**
   * The whole reason a refusal beats a hold here: the refusal carries the name
   * that was asked and the type that does not read it, which is everything a
   * repairer needs and is one string away from the change that would land.
   */
  it("names the node and the name it asked under, rather than that something was wrong", async () => {
    const { runtime, tree, ids } = harnessFor({
      build: asksUnderTheWrongName,
      bindingReader: readsItems,
    })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.assessment.analysis.unreadBindings).toEqual([
      { nodeId: ids.card, type: "loom.card", name: "rows" },
    ])
  })

  it("leaves the tree where it was, so no reader is served the empty region", async () => {
    const { runtime, tree, ids } = harnessFor({
      build: asksUnderTheWrongName,
      bindingReader: readsItems,
    })

    await composeChange(runtime, tree, intentFor(tree))

    const card = findNode(tree.root, ids.card)
    expect(card?.kind === "element" && card.props[DATA_PROP_KEY]).toBeUndefined()
  })

  it("lets through a change that asks under the name the primitive declared", async () => {
    const { runtime, tree } = harnessFor({
      build: (ids) => [
        {
          op: "configure",
          nodeId: ids.card,
          set: { [DATA_PROP_KEY]: { items: { source: "catalogue.services" } } },
          unset: [],
        },
      ],
      bindingReader: readsItems,
    })

    expect((await composeChange(runtime, tree, intentFor(tree))).kind).toBe("applied")
  })
})

describe("confirmChange against a declared binding reader", () => {
  /**
   * The confirmation path recomputes the assessment rather than trusting the one
   * captured at proposal time, and it has to recompute it the same way. A reader
   * threaded into one call site and not the other would let a held change land
   * carrying exactly what the first look refused.
   */
  it("refuses a held change nothing will read, even with a person saying yes", () => {
    const { runtime, tree, proposal } = harnessFor({
      build: asksUnderTheWrongName,
      bindingReader: readsItems,
    })

    const outcome = confirmChange(runtime, tree, proposal, intentFor(tree))
    if (outcome.kind !== "rejected") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.assessment.stakes.factors.map((factor) => factor.code)).toContain(
      "unread-binding"
    )
  })
})

describe("what a composition root's seams leave on the record", () => {
  /**
   * The gap this closes, driven end to end: the same tree, the same policy and
   * the same change, judged by two runtimes that differ only in what their
   * composition root handed the write path. The fingerprints agree, correctly,
   * and until this field existed that agreement was the whole of what a reader
   * holding the two judgments could learn.
   */
  it("records a wiring that the policy fingerprint cannot see", async () => {
    const before = harnessFor({ build: tweak })
    const after = harnessFor({ build: tweak, propsVocabulary: acceptsVariants })

    const monday = await composeChange(before.runtime, before.tree, intentFor(before.tree))
    const wednesday = await composeChange(after.runtime, after.tree, intentFor(after.tree))
    if (monday.kind !== "applied" || wednesday.kind !== "applied") {
      throw new Error(`unexpected ${monday.kind} / ${wednesday.kind}`)
    }

    expect(monday.disposition.policyFingerprint).toBe(wednesday.disposition.policyFingerprint)
    expect(monday.disposition.wiredChecks).toEqual([])
    expect(wednesday.disposition.wiredChecks).toEqual(["props"])
  })

  it("records both seams when both were handed over", async () => {
    const { runtime, tree } = harnessFor({
      build: tweak,
      propsVocabulary: acceptsVariants,
      bindingReader: readsItems,
    })

    const outcome = await composeChange(runtime, tree, intentFor(tree))
    if (outcome.kind !== "applied") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.disposition.wiredChecks).toEqual(["props", "bindings"])
    expect(outcome.assessment.wiredChecks).toEqual(outcome.disposition.wiredChecks)
  })

  /**
   * The confirmation path has to record the same thing, for the reason it
   * recomputes the assessment at all: the second look is a look at things as
   * they are now, and a held change that landed carrying no record of what
   * checked it would be the one judgment in the corpus nothing could place.
   */
  it("records them on the confirmation path too", () => {
    const { runtime, tree, proposal } = harnessFor({
      build: tweak,
      propsVocabulary: acceptsVariants,
    })

    const outcome = confirmChange(runtime, tree, proposal, intentFor(tree))
    if (outcome.kind !== "applied") throw new Error(`unexpected ${outcome.kind}`)

    expect(outcome.disposition.wiredChecks).toEqual(["props"])
  })

  /**
   * A repair is judged by the same policy as the proposal it replaces, and so by
   * the same seams. A repaired proposal whose disposition named a different write
   * path than the refusal it answers would make the pair unreadable, which is the
   * one thing the record of a repair exists to keep legible.
   */
  it("records them identically on a refusal and on the repair that answers it", async () => {
    const base = harnessFor({
      build: tweak,
      confidence: 0.05,
      propsVocabulary: acceptsVariants,
    })
    const repair = buildProposal(spare, {
      intentId: spare.intentId(),
      delta: {
        deltaId: spare.deltaId(),
        treeId: base.tree.treeId,
        baseRevision: base.tree.revision,
        operations: [{ op: "configure", nodeId: base.ids.body, set: { value: "Gentler" }, unset: [] }],
      },
      confidence: 0.95,
    })
    const runtime = { ...base.runtime, repairer: scriptedRepairer(ok(repair)) }

    const outcome = await composeChange(runtime, base.tree, intentFor(base.tree))
    if (outcome.kind !== "applied") throw new Error(`unexpected ${outcome.kind}`)

    const decided = base.events.envelopes.flatMap((envelope) =>
      envelope.event.type === "disposition-decided" ? [envelope.event.disposition] : []
    )

    expect(decided).toHaveLength(2)
    expect(decided.map((disposition) => disposition.wiredChecks)).toEqual([["props"], ["props"]])
  })
})
