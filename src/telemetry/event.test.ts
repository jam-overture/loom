import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type ProposalId } from "../ids.js"
import { assessChange } from "../runtime/assessment.js"
import type { RuntimeEvent } from "../runtime/events.js"
import { defaultGatePolicy, gatePolicySchema } from "../runtime/policy.js"
import type { ProposedChange } from "../runtime/proposal.js"
import { buildIntent, buildProposal, FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import type { TreeDelta } from "../tree/delta.js"

import {
  recordOf,
  telemetryEventSchema,
  telemetryRecordSchema,
  intentIdOf,
  proposalIdOf,
} from "./event.js"

const ids = sequentialIdFactory("e")
const { tree, ids: nodes } = sampleTree()

const intent = buildIntent(ids, { treeId: tree.treeId, baseRevision: 0, utterance: "make it quieter" })

const delta: TreeDelta = {
  deltaId: ids.deltaId(),
  treeId: tree.treeId,
  baseRevision: 0,
  operations: [{ op: "remove", nodeId: nodes.footer }],
}

const proposal: ProposedChange = buildProposal(ids, { intentId: intent.intentId, delta })

const assessed = assessChange(tree, proposal, defaultGatePolicy, ids.deltaId())
if (!assessed.ok) throw new Error("the fixture delta must assess")
const assessment = assessed.value

const disposition = {
  kind: "accepted",
  reason: { code: "within-policy", detail: "low stakes, reversible" },
  stakes: "low",
  reversible: true,
  confidence: 0.9,
  policyId: "storefront",
} as const

const otherProposal = "p_other" as ProposalId

/**
 * Every variant the runtime can narrate. The list is exhaustive on purpose: it
 * is what proves narrowing changes payloads and never membership.
 */
const everyEvent: readonly RuntimeEvent[] = [
  { type: "intent-received", intent },
  { type: "policy-resolved", intentId: intent.intentId, policy: defaultGatePolicy },
  { type: "interpretation-failed", intent, error: { code: "not-understood", detail: "no idea" } },
  { type: "change-proposed", proposal },
  { type: "assessment-failed", proposal, error: { code: "node-not-found", nodeId: nodes.footer } },
  { type: "change-assessed", assessment },
  { type: "disposition-decided", proposalId: proposal.proposalId, disposition },
  {
    type: "repair-requested",
    refusedProposalId: proposal.proposalId,
    reason: { code: "irreversible", detail: "removes a checkout" },
  },
  {
    type: "repair-failed",
    refusedProposalId: proposal.proposalId,
    error: { code: "refused", detail: "the model declined" },
  },
  { type: "change-applied", proposalId: proposal.proposalId, revision: 1, inverse: delta },
  {
    type: "application-failed",
    proposalId: proposal.proposalId,
    error: { code: "node-not-found", nodeId: nodes.footer },
  },
  {
    type: "intent-not-writable",
    intent,
    error: { code: "revision-conflict", treeId: tree.treeId, expected: 0, found: 3 },
  },
  { type: "proposal-held", proposalId: proposal.proposalId },
  { type: "hold-failed", proposalId: proposal.proposalId, detail: "custody store refused" },
  { type: "hold-confirmed", proposalId: proposal.proposalId, actor: "reviewer:ana" },
  { type: "hold-discarded", proposalId: proposal.proposalId, actor: "reviewer:bo" },
  { type: "change-committed", proposalId: proposal.proposalId, revision: 1 },
  {
    type: "commit-failed",
    proposalId: proposal.proposalId,
    error: { code: "unavailable", detail: "connection lost" },
  },
]

const envelopeOf = (event: RuntimeEvent) => ({
  treeId: tree.treeId,
  occurredAt: FIXED_INSTANT,
  event,
})

describe("recordOf", () => {
  /**
   * `everyEvent` is only evidence about membership if it is actually every one.
   * Enumerating the stored union and comparing keeps a new `RuntimeEvent` from
   * being narrowed correctly and then never exercised, which is the failure a
   * hand-maintained fixture list invites.
   */
  it("is exercised against every event the journal can store", () => {
    const stored = telemetryEventSchema.options.map((option) => option.shape.type.value)

    expect(new Set(everyEvent.map((event) => event.type))).toEqual(new Set(stored))
  })

  it("narrows every runtime event without dropping any of them", () => {
    const narrowed = everyEvent.map((event) => recordOf(envelopeOf(event)).event.type)

    expect(narrowed).toEqual(everyEvent.map((event) => event.type))
  })

  /** Storage is a boundary, so what the narrowing produces has to survive it. */
  it("produces records that parse back from JSON", () => {
    for (const event of everyEvent) {
      const record = recordOf(envelopeOf(event))
      const parsed = telemetryRecordSchema.safeParse(JSON.parse(JSON.stringify(record)))

      expect(parsed.success, `${event.type} did not parse: ${parsed.error?.message ?? ""}`).toBe(true)
    }
  })

  it("keeps the shape of an intent but not what was said", () => {
    const record = recordOf(envelopeOf({ type: "intent-received", intent }))

    expect(JSON.stringify(record)).not.toContain("quieter")
    expect(record.event).toEqual({
      type: "intent-received",
      intent: {
        intentId: intent.intentId,
        origin: "user-instruction",
        baseRevision: 0,
        utteranceLength: "make it quieter".length,
        observedAt: FIXED_INSTANT,
      },
    })
  })

  /**
   * An identity is an identifier a query groups by, not content someone typed —
   * which is the line 0023 drew, and the utterance is on the other side of it.
   */
  it("keeps who asked, alongside the origin it belongs to", () => {
    const attributed = buildIntent(ids, {
      treeId: tree.treeId,
      baseRevision: 0,
      actor: "reviewer:ana",
    })
    const record = recordOf(envelopeOf({ type: "intent-received", intent: attributed }))

    expect(record.event.type === "intent-received" && record.event.intent.actor).toBe("reviewer:ana")
  })

  it("keeps who answered a held proposal", () => {
    const confirmed = recordOf(
      envelopeOf({ type: "hold-confirmed", proposalId: proposal.proposalId, actor: "reviewer:ana" })
    )
    const discarded = recordOf(
      envelopeOf({ type: "hold-discarded", proposalId: proposal.proposalId, actor: "reviewer:bo" })
    )

    expect(confirmed.event).toEqual({
      type: "hold-confirmed",
      proposalId: proposal.proposalId,
      actor: "reviewer:ana",
    })
    expect(discarded.event).toEqual({
      type: "hold-discarded",
      proposalId: proposal.proposalId,
      actor: "reviewer:bo",
    })
  })

  /**
   * A policy is host configuration, versioned where the host keeps it. Copying
   * its values onto every change would store one document a million times to
   * answer a question the name already answers — provided the name identifies
   * the content, which is what `GatePolicy.policyId` asks of a host.
   */
  it("keeps the name of the policy in force and drops its values", () => {
    const policy = gatePolicySchema.parse({ policyId: "storefront", minimumConfidence: 0.93 })
    const record = recordOf(
      envelopeOf({ type: "policy-resolved", intentId: intent.intentId, policy })
    )

    expect(record.event).toEqual({
      type: "policy-resolved",
      intentId: intent.intentId,
      policyId: "storefront",
    })
    expect(JSON.stringify(record)).not.toContain("0.93")
  })

  it("keeps a proposal whole, because a refused change is recorded nowhere else", () => {
    const record = recordOf(envelopeOf({ type: "change-proposed", proposal }))

    expect(record.event).toEqual({ type: "change-proposed", proposal })
  })

  /** The inverse is in the revision log, attached to the revision this names. */
  it("drops the inverse delta from an applied change", () => {
    const record = recordOf(
      envelopeOf({ type: "change-applied", proposalId: proposal.proposalId, revision: 1, inverse: delta })
    )

    expect(record.event).toEqual({
      type: "change-applied",
      proposalId: proposal.proposalId,
      revision: 1,
    })
  })

  it("summarises an assessment instead of storing it", () => {
    const record = recordOf(envelopeOf({ type: "change-assessed", assessment }))

    expect(record.event.type === "change-assessed" && record.event.assessment).toMatchObject({
      proposalId: proposal.proposalId,
      operationCount: 1,
      removedNodeCount: 1,
      insertedNodeCount: 0,
      reversible: true,
    })
  })

  it("records a failure as its code and a sentence about it", () => {
    const record = recordOf(
      envelopeOf({
        type: "commit-failed",
        proposalId: proposal.proposalId,
        error: { code: "unavailable", detail: "connection lost" },
      })
    )

    expect(record.event).toEqual({
      type: "commit-failed",
      proposalId: proposal.proposalId,
      failure: { code: "unavailable", detail: "storage is unavailable: connection lost" },
    })
  })
})

describe("correlation", () => {
  it("names the proposal an event is about", () => {
    expect(proposalIdOf(recordOf(envelopeOf({ type: "change-proposed", proposal })).event)).toBe(
      proposal.proposalId
    )
    expect(
      proposalIdOf(
        recordOf(envelopeOf({ type: "hold-discarded", proposalId: otherProposal })).event
      )
    ).toBe(otherProposal)
  })

  it("has no proposal for an intent that never produced one", () => {
    const record = recordOf(
      envelopeOf({
        type: "interpretation-failed",
        intent,
        error: { code: "not-understood", detail: "no idea" },
      })
    )

    expect(proposalIdOf(record.event)).toBeUndefined()
    expect(intentIdOf(record.event)).toBe(intent.intentId)
  })

  it("reaches the intent through the proposal that names it", () => {
    expect(intentIdOf(recordOf(envelopeOf({ type: "change-proposed", proposal })).event)).toBe(
      intent.intentId
    )
  })
})
