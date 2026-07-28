import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { buildProposal, FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import type { TreeDelta } from "../tree/delta.js"

import { proposedChangeSchema, provenanceSchema } from "./proposal.js"

const spare = sequentialIdFactory("prop")

const proposalFixture = () => {
  const { tree, ids } = sampleTree()
  const delta: TreeDelta = {
    deltaId: spare.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: [{ op: "remove", nodeId: ids.footer }],
  }

  return buildProposal(spare, { intentId: spare.intentId(), delta })
}

describe("provenanceSchema", () => {
  it("accepts a full record", () => {
    const parsed = provenanceSchema.safeParse({
      origin: "user-instruction",
      actor: "user_42",
      interpreter: "claude-opus-5",
      promptHash: "sha256-abc",
      confidence: 0.82,
      interpretedAt: FIXED_INSTANT,
    })

    expect(parsed.success).toBe(true)
  })

  it("requires an interpreter, so every delta is attributable", () => {
    const parsed = provenanceSchema.safeParse({
      origin: "user-instruction",
      confidence: 0.8,
      interpretedAt: FIXED_INSTANT,
    })

    expect(parsed.success).toBe(false)
  })

  it("rejects a confidence outside 0..1", () => {
    const base = {
      origin: "user-instruction",
      interpreter: "scripted",
      interpretedAt: FIXED_INSTANT,
    }

    expect(provenanceSchema.safeParse({ ...base, confidence: 1.2 }).success).toBe(false)
    expect(provenanceSchema.safeParse({ ...base, confidence: -0.1 }).success).toBe(false)
  })

  it("rejects an unknown origin", () => {
    const parsed = provenanceSchema.safeParse({
      origin: "vibes",
      interpreter: "scripted",
      confidence: 0.8,
      interpretedAt: FIXED_INSTANT,
    })

    expect(parsed.success).toBe(false)
  })

  it("rejects a non-ISO timestamp", () => {
    const parsed = provenanceSchema.safeParse({
      origin: "developer",
      interpreter: "scripted",
      confidence: 0.8,
      interpretedAt: "yesterday",
    })

    expect(parsed.success).toBe(false)
  })
})

describe("proposedChangeSchema", () => {
  it("round-trips a proposal through JSON", () => {
    const proposal = proposalFixture()
    const parsed = proposedChangeSchema.safeParse(JSON.parse(JSON.stringify(proposal)))

    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data).toEqual(proposal)
  })

  it("rejects a proposal carrying a malformed delta", () => {
    const proposal = proposalFixture()
    const parsed = proposedChangeSchema.safeParse({
      ...proposal,
      delta: { ...proposal.delta, operations: [] },
    })

    expect(parsed.success).toBe(false)
  })

  it("requires a rationale, so a proposal always explains itself", () => {
    const proposal = proposalFixture()

    expect(proposedChangeSchema.safeParse({ ...proposal, rationale: "" }).success).toBe(false)
  })
})
