import { describe, expect, it } from "vitest"

import { nodeIdSchema, sequentialIdFactory } from "../ids.js"
import { err, type Result } from "../result.js"
import { gate } from "../runtime/gate.js"
import { catalogueOf } from "../sdk/catalogue.js"
import { fixedPolicy } from "../runtime/policy-source.js"
import { defaultGatePolicy } from "../runtime/policy.js"
import { composeChange } from "../runtime/pipeline.js"
import { assessChange } from "../runtime/assessment.js"
import type { EditIntent } from "../runtime/intent.js"
import type { RepairRequest } from "../runtime/interpreter.js"
import type { ProposedChange } from "../runtime/proposal.js"
import {
  buildIntent,
  buildProposal,
  collectingEventSink,
  fixedClock,
  scriptedModelClient,
  FIXED_INSTANT,
} from "../testing/doubles.js"
import { testRegistry } from "../testing/definitions.js"
import { sampleTree } from "../testing/fixtures.js"
import {
  CONFIGURE_CARD_REPLY,
  FOREIGN_ID_REPLY,
  INSERT_NOTE_REPLY,
  INSERT_SLOT_REPLY,
  NON_OBJECT_PROPS_REPLY,
  NOT_UNDERSTOOD_REPLY,
  NO_CHANGE_REPLY,
  OFF_SCHEMA_REPLY,
  TRUNCATED_REPLY,
  UNDECODABLE_PROP_REPLY,
} from "../testing/model-replies.js"
import { applyDelta } from "../tree/apply.js"

import type { ModelClientError, ModelCompletion } from "./client.js"
import { DEFAULT_EFFORT, DEFAULT_INTERPRETER_MODEL, modelInterpreter } from "./interpreter.js"
import { INTERPRETER_SYSTEM_PROMPT } from "./prompt.js"
import { interpretationReplyJsonSchema } from "./schema.js"

const harness = (reply: string | Result<ModelCompletion, ModelClientError>) => {
  const { tree, ids } = sampleTree()
  const idFactory = sequentialIdFactory("x")
  const client = scriptedModelClient(reply)
  const interpreter = modelInterpreter({ client, idFactory, clock: fixedClock() })
  const intent = buildIntent(idFactory, {
    treeId: tree.treeId,
    baseRevision: tree.revision,
    utterance: "add a note to the footer saying Thanks for visiting",
  })

  return { tree, ids, client, interpreter, intent, idFactory }
}

describe("modelInterpreter — request assembly", () => {
  it("sends the constant system prompt, the outline, and the output schema", async () => {
    const { interpreter, intent, tree, client } = harness(INSERT_NOTE_REPLY)
    await interpreter.interpret(intent, tree)

    const [request] = client.requests
    expect(request?.system).toBe(INTERPRETER_SYSTEM_PROMPT)
    expect(request?.userMessage).toContain("n_6 element loom.footer")
    expect(request?.outputSchema["anyOf"]).toBeDefined()
  })

  it("defaults to the configured model, ceiling, and effort", async () => {
    const { interpreter, intent, tree, client } = harness(INSERT_NOTE_REPLY)
    await interpreter.interpret(intent, tree)

    const [request] = client.requests
    expect(request?.model).toBe(DEFAULT_INTERPRETER_MODEL)
    expect(request?.effort).toBe(DEFAULT_EFFORT)
    expect(request?.maxTokens).toBeGreaterThan(4096)
  })

  it("tells the model what this deployment can build with, when a catalogue is configured", async () => {
    const { tree } = sampleTree()
    const idFactory = sequentialIdFactory("x")
    const client = scriptedModelClient(INSERT_NOTE_REPLY)
    const interpreter = modelInterpreter({
      client,
      idFactory,
      clock: fixedClock(),
      catalogue: catalogueOf(testRegistry()),
    })

    const interpreted = await interpreter.interpret(
      buildIntent(idFactory, { treeId: tree.treeId, baseRevision: tree.revision }),
      tree
    )

    expect(client.requests[0]?.userMessage).toContain("Primitives this deployment has registered")
    expect(client.requests[0]?.userMessage).toContain("- loom.card")

    /**
     * The catalogue is part of what was asked, so it is part of what the prompt
     * hash attests to — two deployments with different registries cannot produce
     * the same provenance for the same utterance.
     */
    const withoutCatalogue = await harness(INSERT_NOTE_REPLY).interpreter.interpret(
      buildIntent(sequentialIdFactory("y"), { treeId: tree.treeId, baseRevision: tree.revision }),
      tree
    )

    expect(interpreted.ok && withoutCatalogue.ok).toBe(true)
    expect(interpreted.ok && interpreted.value.provenance.promptHash).not.toBe(
      withoutCatalogue.ok && withoutCatalogue.value.provenance.promptHash
    )
  })

  it("honours an overridden model and effort", async () => {
    const { tree } = sampleTree()
    const idFactory = sequentialIdFactory("x")
    const client = scriptedModelClient(INSERT_NOTE_REPLY)
    const interpreter = modelInterpreter({
      client,
      idFactory,
      clock: fixedClock(),
      model: "claude-sonnet-5",
      effort: "low",
      maxTokens: 2048,
    })

    await interpreter.interpret(
      buildIntent(idFactory, { treeId: tree.treeId, baseRevision: tree.revision }),
      tree
    )

    expect(client.requests[0]?.model).toBe("claude-sonnet-5")
    expect(client.requests[0]?.effort).toBe("low")
    expect(client.requests[0]?.maxTokens).toBe(2048)
  })
})

describe("modelInterpreter — a proposal it understood", () => {
  it("produces a delta whose inserted nodes were named by the runtime", async () => {
    const { interpreter, intent, tree } = harness(INSERT_NOTE_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok).toBe(true)
    if (!interpreted.ok) return

    const [operation] = interpreted.value.delta.operations
    expect(operation?.op).toBe("insert")
    if (operation?.op !== "insert") return

    expect(operation.node.id).toMatch(/^n_x\d+$/)
    expect(operation.node.kind === "element" && operation.node.props).toEqual({
      tone: "quiet",
      dismissible: false,
    })
  })

  it("produces a delta that applies to the tree it was interpreted against", async () => {
    const { interpreter, intent, tree } = harness(INSERT_NOTE_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)
    if (!interpreted.ok) throw new Error("expected a proposal")

    const applied = applyDelta(tree, interpreted.value.delta)

    expect(applied.ok).toBe(true)
    expect(applied.ok && applied.value.revision).toBe(1)
  })

  it("records provenance without recording the prompt", async () => {
    const { interpreter, intent, tree } = harness(INSERT_NOTE_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)
    if (!interpreted.ok) throw new Error("expected a proposal")

    expect(interpreted.value.provenance).toEqual({
      origin: "user-instruction",
      interpreter: "claude-test-1",
      authoredBy: "model",
      promptHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      confidence: 0.86,
      interpretedAt: FIXED_INSTANT,
    })
    expect(JSON.stringify(interpreted.value.provenance)).not.toContain("footer")
  })

  /**
   * The actor is copied from the ask, never read off the reply. A model that
   * claimed an identity would be authoring the one field the audit trail exists
   * to trust (0027).
   */
  it("carries the intent's actor into provenance", async () => {
    const { tree } = sampleTree()
    const idFactory = sequentialIdFactory("x")
    const interpreter = modelInterpreter({
      client: scriptedModelClient(INSERT_NOTE_REPLY),
      idFactory,
      clock: fixedClock(),
    })

    const interpreted = await interpreter.interpret(
      buildIntent(idFactory, {
        treeId: tree.treeId,
        baseRevision: tree.revision,
        actor: "reviewer:ana",
      }),
      tree
    )

    expect(interpreted.ok && interpreted.value.provenance.actor).toBe("reviewer:ana")
  })

  it("leaves the actor absent when the intent named none", async () => {
    const { interpreter, intent, tree } = harness(INSERT_NOTE_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok && "actor" in interpreted.value.provenance).toBe(false)
  })

  it("attributes the proposal to the intent that caused it", async () => {
    const { interpreter, intent, tree } = harness(INSERT_NOTE_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok && interpreted.value.intentId).toBe(intent.intentId)
    expect(interpreted.ok && interpreted.value.proposalId).toMatch(/^p_x\d+$/)
  })

  it("decodes a configure proposal, including a json-encoded prop", async () => {
    const { interpreter, intent, tree } = harness(CONFIGURE_CARD_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)
    if (!interpreted.ok) throw new Error("expected a proposal")

    expect(interpreted.value.delta.operations[0]).toEqual({
      op: "configure",
      nodeId: "n_4",
      set: { elevation: 0, padding: { x: 2, y: 1 } },
      unset: ["variant"],
    })
  })

  it("authors the delta against the revision the intent named, not the tree it saw", async () => {
    const { tree } = sampleTree()
    const idFactory = sequentialIdFactory("x")
    const client = scriptedModelClient(INSERT_NOTE_REPLY)
    const interpreter = modelInterpreter({ client, idFactory, clock: fixedClock() })
    const staleIntent = buildIntent(idFactory, { treeId: tree.treeId, baseRevision: 0 })
    const movedTree = { ...tree, revision: 4 }

    const interpreted = await interpreter.interpret(staleIntent, movedTree)
    if (!interpreted.ok) throw new Error("expected a proposal")

    expect(interpreted.value.delta.baseRevision).toBe(0)
    const applied = applyDelta(movedTree, interpreted.value.delta)
    expect(applied.ok).toBe(false)
    expect(applied.ok ? "" : applied.error.code).toBe("revision-mismatch")
  })
})

/**
 * `discards` raises stakes and can only ever make the Gate stricter (0035), so
 * it is safe to accept as a declaration — but only from something that computed
 * it from a log. A model has no log, so the guarantee is structural: the reply
 * grammar has no production for it and this interpreter never writes the field.
 */
describe("modelInterpreter — what a model may not declare", () => {
  it("never sets discards on a proposal, whatever the reply said", async () => {
    const { interpreter, intent, tree } = harness(INSERT_NOTE_REPLY)

    const proposal = await interpreter.interpret(intent, tree)
    if (!proposal.ok) throw new Error("expected a proposal")

    expect(proposal.value.discards).toBeUndefined()
  })

  it("does not offer the field in the schema the reply is constrained to", () => {
    expect(JSON.stringify(interpretationReplyJsonSchema())).not.toContain("discard")
  })
})

describe("modelInterpreter — answers that are not proposals", () => {
  it("reports no-change-needed when the model says the tree already satisfies the intent", async () => {
    const { interpreter, intent, tree } = harness(NO_CHANGE_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok).toBe(false)
    expect(interpreted.ok ? "" : interpreted.error.code).toBe("no-change-needed")
    expect(interpreted.ok ? "" : interpreted.error.detail).toContain("already has a header")
  })

  it("reports not-understood when the model cannot read the intent", async () => {
    const { interpreter, intent, tree } = harness(NOT_UNDERSTOOD_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("not-understood")
  })
})

describe("modelInterpreter — answers it cannot use", () => {
  it("reports a malformed proposal rather than throwing on invalid JSON", async () => {
    const { interpreter, intent, tree } = harness("not json at all")
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("malformed-proposal")
    expect(interpreted.ok ? "" : interpreted.error.detail).toContain("not valid JSON")
  })

  it("reports a malformed proposal on a truncated reply", async () => {
    const { interpreter, intent, tree } = harness(TRUNCATED_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("malformed-proposal")
  })

  it("reports a malformed proposal when the reply misses the schema", async () => {
    const { interpreter, intent, tree } = harness(OFF_SCHEMA_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("malformed-proposal")
    expect(interpreted.ok ? "" : interpreted.error.detail).toContain("confidence")
  })

  it("refuses an id the scheme does not permit", async () => {
    const { interpreter, intent, tree } = harness(FOREIGN_ID_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("malformed-proposal")
  })

  it("reports a prop bag the runtime cannot parse", async () => {
    const { interpreter, intent, tree } = harness(UNDECODABLE_PROP_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("malformed-proposal")
    expect(interpreted.ok ? "" : interpreted.error.detail).toContain("not parseable JSON")
  })

  it("reports a prop bag that parses to something other than an object", async () => {
    const { interpreter, intent, tree } = harness(NON_OBJECT_PROPS_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("malformed-proposal")
    expect(interpreted.ok ? "" : interpreted.error.detail).toContain("must be a JSON object")
  })

  /**
   * The reply schema no longer offers slot as an insertable kind (0014), so a
   * model that proposes one is off-schema rather than something the runtime has
   * to decide what to do with.
   */
  it("refuses an inserted slot, which is no longer a kind a proposal may introduce", async () => {
    const { interpreter, intent, tree } = harness(INSERT_SLOT_REPLY)
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("malformed-proposal")
  })
})

describe("modelInterpreter — client failures", () => {
  it("treats an unavailable model as unavailable, not as a rejected proposal", async () => {
    const { interpreter, intent, tree } = harness(err({ code: "unavailable", detail: "429 from upstream" }))
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("interpreter-unavailable")
    expect(interpreted.ok ? "" : interpreted.error.detail).toContain("429")
  })

  it("keeps a request the service rejected apart from one it could not serve", async () => {
    const { interpreter, intent, tree } = harness(
      err({ code: "rejected", detail: "400 invalid_request_error" })
    )
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("interpreter-request-rejected")
    expect(interpreted.ok ? "" : interpreted.error.detail).toContain("400")
  })

  it("reports a deployment that cannot reach a model as misconfigured", async () => {
    const { interpreter, intent, tree } = harness(
      err({ code: "misconfigured", detail: "401 authentication_error" })
    )
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("interpreter-misconfigured")
    expect(interpreted.ok ? "" : interpreted.error.detail).toContain("401")
  })

  it("keeps a declined request apart from an unavailable one", async () => {
    const { interpreter, intent, tree } = harness(err({ code: "refused", detail: "cyber" }))
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("refused")
    expect(interpreted.ok ? "" : interpreted.error.detail).toContain("cyber")
  })

  it("treats a cut-off reply as malformed rather than absent", async () => {
    const { interpreter, intent, tree } = harness(err({ code: "incomplete", detail: "hit the ceiling" }))
    const interpreted = await interpreter.interpret(intent, tree)

    expect(interpreted.ok ? "" : interpreted.error.code).toBe("malformed-proposal")
  })
})

describe("modelInterpreter — through the composition runtime", () => {
  it("drives a model-authored change all the way to an applied tree", async () => {
    const { tree } = sampleTree()
    const idFactory = sequentialIdFactory("x")
    const events = collectingEventSink()
    const runtime = {
      interpreter: modelInterpreter({
        client: scriptedModelClient(INSERT_NOTE_REPLY),
        idFactory,
        clock: fixedClock(),
      }),
      policySource: fixedPolicy(defaultGatePolicy),
      events,
      clock: fixedClock(),
      idFactory,
    }

    const outcome = await composeChange(
      runtime,
      tree,
      buildIntent(idFactory, { treeId: tree.treeId, baseRevision: tree.revision })
    )

    expect(outcome.kind).toBe("applied")
    expect(events.types()).toEqual([
      "intent-received",
      "policy-resolved",
      "change-proposed",
      "change-assessed",
      "disposition-decided",
      "change-applied",
    ])
  })

  it("records a model that did not understand as an interpretation failure", async () => {
    const { tree } = sampleTree()
    const idFactory = sequentialIdFactory("x")
    const events = collectingEventSink()

    const outcome = await composeChange(
      {
        interpreter: modelInterpreter({
          client: scriptedModelClient(NOT_UNDERSTOOD_REPLY),
          idFactory,
          clock: fixedClock(),
        }),
        policySource: fixedPolicy(defaultGatePolicy),
        events,
        clock: fixedClock(),
        idFactory,
      },
      tree,
      buildIntent(idFactory, { treeId: tree.treeId, baseRevision: tree.revision })
    )

    expect(outcome.kind).toBe("not-interpreted")
    expect(events.types()).toEqual([
      "intent-received",
      "policy-resolved",
      "interpretation-failed",
    ])
  })

  it("lets the Gate judge a model proposal on the same terms as any other", async () => {
    const { tree } = sampleTree()
    const idFactory = sequentialIdFactory("x")
    const interpreter = modelInterpreter({
      client: scriptedModelClient(CONFIGURE_CARD_REPLY),
      idFactory,
      clock: fixedClock(),
    })
    const interpreted = await interpreter.interpret(
      buildIntent(idFactory, { treeId: tree.treeId, baseRevision: tree.revision }),
      tree
    )
    if (!interpreted.ok) throw new Error("expected a proposal")

    const policy = defaultGatePolicy
    const assessed = assessChange(tree, interpreted.value, policy, idFactory.deltaId())
    if (!assessed.ok) throw new Error("expected an assessment")

    expect(gate(assessed.value, policy).kind).toBe("accepted")
  })
})

describe("modelInterpreter — repairing a refusal", () => {
  const repairRequestFor = (refused: ProposedChange, intent: EditIntent): RepairRequest => ({
    intent,
    refused,
    disposition: {
      kind: "rejected",
      reason: { code: "stakes-at-refusal-floor", detail: "removes 14 nodes" },
      stakes: "critical",
      reversible: true,
      confidence: 0.9,
      policyId: "default",
    },
  })

  it("shows the model what was refused and why, on the same system prompt", async () => {
    const { interpreter, intent, tree, client } = harness(INSERT_NOTE_REPLY)
    const first = await interpreter.interpret(intent, tree)
    if (!first.ok) throw new Error("expected a proposal")

    await interpreter.repair(repairRequestFor(first.value, intent), tree)

    const [initial, repair] = client.requests
    expect(client.requests).toHaveLength(2)
    expect(repair?.system).toBe(initial?.system)
    expect(repair?.userMessage).toContain("it was refused")
    expect(repair?.userMessage).toContain("removes 14 nodes")
  })

  it("produces a proposal on the same terms as a first interpretation", async () => {
    const { interpreter, intent, tree } = harness(CONFIGURE_CARD_REPLY)
    const first = await interpreter.interpret(intent, tree)
    if (!first.ok) throw new Error("expected a proposal")

    const repaired = await interpreter.repair(repairRequestFor(first.value, intent), tree)
    if (!repaired.ok) throw new Error("expected a repaired proposal")

    expect(repaired.value.intentId).toBe(intent.intentId)
    expect(repaired.value.delta.operations[0]?.op).toBe("configure")
    expect(repaired.value.provenance.confidence).toBe(0.71)
  })

  it("does not stamp repairOf itself — that is the runtime's to record", async () => {
    const { interpreter, intent, tree } = harness(CONFIGURE_CARD_REPLY)
    const first = await interpreter.interpret(intent, tree)
    if (!first.ok) throw new Error("expected a proposal")

    const repaired = await interpreter.repair(repairRequestFor(first.value, intent), tree)

    expect(repaired.ok && repaired.value.repairOf).toBeUndefined()
  })

  it("can decline to repair, which is not a malformed answer", async () => {
    const { interpreter, intent, tree } = harness(NOT_UNDERSTOOD_REPLY)
    const proposal = buildProposal(sequentialIdFactory("r"), {
      intentId: intent.intentId,
      delta: {
        deltaId: sequentialIdFactory("r").deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: [{ op: "remove", nodeId: nodeIdSchema.parse("n_4") }],
      },
    })

    const repaired = await interpreter.repair(repairRequestFor(proposal, intent), tree)

    expect(repaired.ok ? "" : repaired.error.code).toBe("not-understood")
  })
})
