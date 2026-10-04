import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type ProposalId } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { assessChange, type ChangeAssessment } from "../runtime/assessment.js"
import type { RuntimeEvent } from "../runtime/events.js"
import { policyFingerprintOf } from "../runtime/policy-fingerprint.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "../runtime/policy.js"
import type { ProposedChange } from "../runtime/proposal.js"
import { stakeFactor, type StakeFactorCode } from "../runtime/stakes.js"
import { buildIntent, buildProposal, FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement } from "../tree/builders.js"
import type { TreeDelta } from "../tree/delta.js"

import {
  recordOf,
  TELEMETRY_EVENT_TYPES,
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

/** The same footer removal, under a host that declared the footer protected. */
const assessUnder = (policy: GatePolicy, change: ProposedChange = proposal): ChangeAssessment => {
  const result = assessChange(tree, change, policy, ids.deltaId())
  if (!result.ok) throw new Error("the fixture delta must assess")

  return result.value
}

const assessedUnderProtection = assessUnder(
  gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.footer"] })
)

/**
 * A different critical: a change that adds a node this deployment has no
 * primitive for. Both refusals sit at the top of the scale and nothing but the
 * codes separates them.
 */
/** A change that trips no rule at all: one node reconfigured, deep and small. */
const assessedQuietly = assessUnder(
  defaultGatePolicy,
  buildProposal(ids, {
    intentId: intent.intentId,
    delta: {
      deltaId: ids.deltaId(),
      treeId: tree.treeId,
      baseRevision: 0,
      operations: [{ op: "configure", nodeId: nodes.card, set: { variant: "filled" }, unset: [] }],
    },
  })
)

const assessedAsUndrawable = assessUnder(
  gatePolicySchema.parse({ registeredPrimitiveTypes: ["loom.page", "loom.header", "loom.card"] }),
  buildProposal(ids, {
    intentId: intent.intentId,
    delta: {
      deltaId: ids.deltaId(),
      treeId: tree.treeId,
      baseRevision: 0,
      operations: [
        {
          op: "insert",
          parentId: nodes.card,
          index: 0,
          node: buildElement(ids, { type: primitiveTypeSchema.parse("app.nonesuch") }),
        },
      ],
    },
  })
)

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
   * the content, which is what `GatePolicy.policyId` asks of a host. The
   * fingerprint is how a reader checks that it did, at a fixed size and without
   * carrying a single value across (0048).
   */
  it("keeps the name of the policy in force and a digest of its values, never the values", () => {
    const policy = gatePolicySchema.parse({ policyId: "storefront", minimumConfidence: 0.93 })
    const record = recordOf(
      envelopeOf({ type: "policy-resolved", intentId: intent.intentId, policy })
    )

    expect(record.event).toEqual({
      type: "policy-resolved",
      intentId: intent.intentId,
      policyId: "storefront",
      policyFingerprint: policyFingerprintOf(policy),
    })
    expect(JSON.stringify(record)).not.toContain("0.93")
  })

  it("gives two hosts that edited one policy name two different fingerprints", () => {
    const fingerprintUnder = (minimumConfidence: number): string | undefined => {
      const policy = gatePolicySchema.parse({ policyId: "storefront", minimumConfidence })
      const { event } = recordOf(
        envelopeOf({ type: "policy-resolved", intentId: intent.intentId, policy })
      )

      return event.type === "policy-resolved" ? event.policyFingerprint : undefined
    }

    expect(fingerprintUnder(0.93)).not.toBe(fingerprintUnder(0.6))
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

  it("retains the types a change destroyed, which is the half a rule's name cannot say", () => {
    const record = recordOf(envelopeOf({ type: "change-assessed", assessment }))

    expect(record.event.type === "change-assessed" && record.event.assessment).toMatchObject({
      touchedPrimitiveTypes: ["loom.footer"],
      removedPrimitiveTypes: ["loom.footer"],
      relocatedPrimitiveTypes: [],
      relocatedNodeCount: 0,
    })
  })

  /**
   * The reason this is a field and not a derivation: `stakes` is the highest
   * level anything reached, which is what the Gate compares against a ceiling
   * and is not what a reader of the corpus is asking. Three rules are
   * `critical`, so without the codes every one of them is the same row.
   */
  it("records which rules the Gate raised, not merely how high they reached", () => {
    const record = recordOf(envelopeOf({ type: "change-assessed", assessment: assessedUnderProtection }))

    expect(record.event.type === "change-assessed" && record.event.assessment).toMatchObject({
      stakes: "critical",
      stakeFactorCodes: [
        "protected-type-removed",
        "protected-type-touched",
        "shallow-structural-change",
      ],
    })
  })

  /**
   * The code says a reason fired; this says what it fired about. Without it the
   * screen holding the decision can explain the mechanism — *this sets up a part
   * that reaches beyond the page* — and has to end on *the kind of thing*,
   * because `touchedPrimitiveTypes` is a superset and guessing which member is
   * the offender is the one guess that screen must not make.
   */
  it("names which touched types reach outside the page, not merely that some do", () => {
    const assessedOutOfTree = assessUnder(
      gatePolicySchema.parse({ outOfTreeEffectTypes: ["loom.footer"] })
    )

    const record = recordOf(envelopeOf({ type: "change-assessed", assessment: assessedOutOfTree }))

    expect(record.event.type === "change-assessed" && record.event.assessment).toMatchObject({
      reversible: false,
      irreversibilityReasons: ["out-of-tree-effect"],
      outOfTreeEffectTypes: ["loom.footer"],
    })
  })

  /**
   * A subset and not an echo, which is the whole point of the field. This change
   * touches two parts and the policy declares one of them, so a field that
   * simply repeated what the change touched would send a reader to look at the
   * footer as well — and the screen's one job here is to name the part that
   * actually reaches a payment.
   */
  it("narrows to the declared types rather than repeating what the change touched", () => {
    const touchingTwo = buildProposal(ids, {
      intentId: intent.intentId,
      delta: {
        deltaId: ids.deltaId(),
        treeId: tree.treeId,
        baseRevision: 0,
        operations: [
          { op: "configure", nodeId: nodes.card, set: { variant: "filled" }, unset: [] },
          { op: "configure", nodeId: nodes.footer, set: { note: "see terms" }, unset: [] },
        ],
      },
    })

    const assessedOutOfTree = assessUnder(
      gatePolicySchema.parse({ outOfTreeEffectTypes: ["loom.card"] }),
      touchingTwo
    )

    const { event } = recordOf(
      envelopeOf({ type: "change-assessed", assessment: assessedOutOfTree })
    )
    if (event.type !== "change-assessed") throw new Error("the fixture is an assessment")

    expect(event.assessment.touchedPrimitiveTypes).toEqual(["loom.card", "loom.footer"])
    expect(event.assessment.outOfTreeEffectTypes).toEqual(["loom.card"])
  })

  /** Absent and never defaulted (0045), like every other field added later. */
  it("leaves the types out when no out-of-tree reason fired", () => {
    const { event } = recordOf(envelopeOf({ type: "change-assessed", assessment }))
    if (event.type !== "change-assessed") throw new Error("the fixture is an assessment")

    expect(event.assessment.reversible).toBe(true)
    expect("outOfTreeEffectTypes" in event.assessment).toBe(false)
  })

  /**
   * The budget reason journals its numbers already — `retainedNodeCount` is
   * beside the codes — so it is the one member the codes nearly cover, and the
   * new field must not fire for it.
   */
  it("leaves the types out when the reason is the retention budget", () => {
    const assessedOverBudget = assessUnder(
      gatePolicySchema.parse({ inverseRetentionBudget: 1 }),
      buildProposal(ids, {
        intentId: intent.intentId,
        delta: {
          deltaId: ids.deltaId(),
          treeId: tree.treeId,
          baseRevision: 0,
          operations: [{ op: "remove", nodeId: nodes.main }],
        },
      })
    )

    const { event } = recordOf(
      envelopeOf({ type: "change-assessed", assessment: assessedOverBudget })
    )
    if (event.type !== "change-assessed") throw new Error("the fixture is an assessment")

    expect(event.assessment.irreversibilityReasons).toEqual(["retention-budget-exceeded"])
    expect("outOfTreeEffectTypes" in event.assessment).toBe(false)
  })

  it("tells a refusal for an invented part from a refusal for a risky one", () => {
    const codesOf = (change: ChangeAssessment): readonly StakeFactorCode[] | undefined => {
      const { event } = recordOf(envelopeOf({ type: "change-assessed", assessment: change }))

      return event.type === "change-assessed" ? event.assessment.stakeFactorCodes : undefined
    }

    expect(assessedUnderProtection.stakes.level).toBe("critical")
    expect(assessedAsUndrawable.stakes.level).toBe("critical")

    expect(codesOf(assessedAsUndrawable)).toEqual(["unknown-primitive"])
    expect(codesOf(assessedUnderProtection)).not.toContain("unknown-primitive")
  })

  /**
   * The codes cross and the sentences do not (0023). A factor's `detail` names
   * the nodes and types it found, which is content — the same content the
   * summary is a narrowing of.
   */
  it("keeps the sentence a factor wrote out of the record", () => {
    const record = recordOf(envelopeOf({ type: "change-assessed", assessment: assessedUnderProtection }))

    expect(stakeFactor(assessedUnderProtection.stakes, "protected-type-removed")?.detail).toBe(
      "destroys protected loom.footer"
    )
    expect(JSON.stringify(record)).not.toContain("destroys protected")
  })

  /**
   * An empty list is a fact — the Gate looked and raised nothing — and absent
   * is a different fact, that the record predates the field. Defaulting the
   * second to the first would put a finding in the mouth of a record that
   * never made one (0045).
   */
  it("distinguishes a change that raised no rule from a record written before the field", () => {
    const record = recordOf(envelopeOf({ type: "change-assessed", assessment: assessedQuietly }))
    const stored = JSON.parse(JSON.stringify(record)) as {
      event: { assessment: Record<string, unknown> }
    }

    expect(record.event.type === "change-assessed" && record.event.assessment.stakeFactorCodes).toEqual([])

    delete stored.event.assessment.stakeFactorCodes
    const parsed = telemetryRecordSchema.parse(stored)
    if (parsed.event.type !== "change-assessed") throw new Error("the fixture is an assessment")

    expect(parsed.event.assessment.stakeFactorCodes).toBeUndefined()
  })

  /**
   * The two fields that make the measurement re-runnable, and the reason each is
   * a number or a list of names rather than the thing the rule was handed.
   * `broad-change` compares a length against a threshold, so the count is the
   * whole of it and the ids stay here; `protected-prop-configured` reads the
   * keys, which are vocabulary the host registered, where the values are what a
   * visitor would have read.
   */
  it("records what the measuring rules read, so a policy can be asked about it later", () => {
    const configured = recordOf(
      envelopeOf({
        type: "change-assessed",
        assessment: assessUnder(
          defaultGatePolicy,
          buildProposal(ids, {
            intentId: intent.intentId,
            delta: {
              deltaId: ids.deltaId(),
              treeId: tree.treeId,
              baseRevision: 0,
              operations: [
                { op: "configure", nodeId: nodes.card, set: { variant: "filled" }, unset: ["elevation"] },
              ],
            },
          })
        ),
      })
    )

    expect(configured.event.type === "change-assessed" && configured.event.assessment).toMatchObject({
      affectedNodeCount: 1,
      configuredPropKeys: ["variant", "elevation"],
    })
    expect(JSON.stringify(configured)).not.toContain("filled")
    expect(JSON.stringify(configured)).not.toContain(nodes.card)
  })

  it("reads a record written before those fields existed rather than defaulting them", () => {
    const record = recordOf(envelopeOf({ type: "change-assessed", assessment }))
    const stored = JSON.parse(JSON.stringify(record)) as {
      event: { assessment: Record<string, unknown> }
    }
    delete stored.event.assessment.removedPrimitiveTypes
    delete stored.event.assessment.relocatedPrimitiveTypes
    delete stored.event.assessment.relocatedNodeCount
    delete stored.event.assessment.affectedNodeCount
    delete stored.event.assessment.configuredPropKeys

    const parsed = telemetryRecordSchema.parse(stored)
    if (parsed.event.type !== "change-assessed") throw new Error("the fixture is an assessment")

    expect(parsed.event.assessment.removedPrimitiveTypes).toBeUndefined()
    expect(parsed.event.assessment.relocatedNodeCount).toBeUndefined()
    expect(parsed.event.assessment.affectedNodeCount).toBeUndefined()
    expect(parsed.event.assessment.configuredPropKeys).toBeUndefined()
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

/**
 * The list is only worth exporting if it cannot fall behind the union, and the
 * schema is where the union is enforced — a record crossing storage is parsed by
 * it, so a type it accepts is one the journal can hold whether or not anyone
 * remembered to list it.
 */
describe("TELEMETRY_EVENT_TYPES", () => {
  it("is every type the journal can store, in the schema's own order", () => {
    const stored = telemetryEventSchema.options.map((option) => option.shape.type.value)

    expect(TELEMETRY_EVENT_TYPES).toEqual(stored)
  })

  it("names each type once", () => {
    expect(new Set(TELEMETRY_EVENT_TYPES).size).toBe(TELEMETRY_EVENT_TYPES.length)
  })
})
