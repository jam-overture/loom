import { describe, expect, it } from "vitest"

import { deltaIdSchema, nodeIdSchema, sequentialIdFactory, type NodeId } from "../ids.js"
import { catalogueOf } from "../sdk/catalogue.js"
import type { RepairRequest } from "../runtime/interpreter.js"
import { testRegistry } from "../testing/definitions.js"
import { buildIntent, buildProposal } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"

import { buildRepairMessage, buildUserMessage, hashPrompt, INTERPRETER_SYSTEM_PROMPT } from "./prompt.js"

const intentFor = (utterance: string, scopeNodeId?: NodeId) => {
  const { tree } = sampleTree()
  const base = buildIntent(sequentialIdFactory("i"), {
    treeId: tree.treeId,
    baseRevision: tree.revision,
    utterance,
  })

  return scopeNodeId ? { ...base, scopeNodeId } : base
}

describe("buildUserMessage", () => {
  it("carries the outline, the origin, and the utterance", () => {
    const { tree } = sampleTree()
    const message = buildUserMessage(intentFor("add a footer note"), tree)

    expect(message).toContain("n_7 element loom.page")
    expect(message).toContain("Request (user-instruction): add a footer note")
  })

  it("names the scope only when the intent has one", () => {
    const { tree, ids } = sampleTree()

    expect(buildUserMessage(intentFor("make this quieter", ids.card), tree)).toContain(
      `Confine the change to the subtree rooted at ${ids.card}`
    )
    expect(buildUserMessage(intentFor("make this quieter"), tree)).not.toContain("Confine the change")
  })
})

describe("the catalogue block", () => {
  const catalogue = catalogueOf(testRegistry())

  it("is absent when the host wired no catalogue", () => {
    const message = buildUserMessage(intentFor("add a footer note"), sampleTree().tree)

    expect(message).not.toContain("registered")
    expect(message.startsWith("Current tree:")).toBe(true)
  })

  it("leads the message, ahead of the tree and the request", () => {
    const message = buildUserMessage(intentFor("add a footer note"), sampleTree().tree, catalogue)

    expect(message.indexOf("Primitives this deployment has registered")).toBeLessThan(
      message.indexOf("Current tree:")
    )
    expect(message).toContain("- loom.card — A bounded block of related content. props: elevation?, variant")
  })

  it("tells the model that a type outside the list will not render", () => {
    const message = buildUserMessage(intentFor("add a buy button"), sampleTree().tree, catalogue)

    expect(message).toContain("Insert only primitives from that list")
  })

  /** An empty registry is not a list of nothing; it is nothing to say. */
  it("is absent for an empty catalogue rather than an empty heading", () => {
    const message = buildUserMessage(intentFor("add a footer note"), sampleTree().tree, [])

    expect(message.startsWith("Current tree:")).toBe(true)
  })

  it("reaches a repair, so a revision is bound by the same list", () => {
    const { tree } = sampleTree()
    const intent = intentFor("delete the card")

    const request: RepairRequest = {
      intent,
      refused: buildProposal(sequentialIdFactory("r"), {
        intentId: intent.intentId,
        delta: {
          deltaId: deltaIdSchema.parse("d_r1"),
          treeId: tree.treeId,
          baseRevision: tree.revision,
          operations: [{ op: "remove", nodeId: nodeIdSchema.parse("n_4") }],
        },
      }),
      disposition: {
        kind: "rejected",
        reason: { code: "stakes-at-refusal-floor", detail: "destroys a protected primitive" },
        stakes: "critical",
        reversible: true,
        confidence: 0.9,
      },
    }

    expect(buildRepairMessage(request, tree, catalogue)).toContain("Primitives this deployment has registered")
  })
})

describe("INTERPRETER_SYSTEM_PROMPT", () => {
  it("states the two identity rules the runtime depends on", () => {
    expect(INTERPRETER_SYSTEM_PROMPT).toContain("Never invent an id")
    expect(INTERPRETER_SYSTEM_PROMPT).toContain("Never give an id to a node you are inserting")
  })
})

describe("hashPrompt", () => {
  it("is stable for the same prompt", async () => {
    const first = await hashPrompt("system", "user")
    const second = await hashPrompt("system", "user")

    expect(first).toBe(second)
    expect(first).toMatch(/^[0-9a-f]{64}$/)
  })

  it("separates the two halves so a shifted boundary changes the hash", async () => {
    expect(await hashPrompt("ab", "c")).not.toBe(await hashPrompt("a", "bc"))
  })

  it("carries no prompt text", async () => {
    expect(await hashPrompt(INTERPRETER_SYSTEM_PROMPT, "delete everything")).not.toContain("delete")
  })
})

describe("buildRepairMessage", () => {
  const requestFor = () => {
    const { tree, ids } = sampleTree()
    const idFactory = sequentialIdFactory("p")
    const intent = buildIntent(idFactory, {
      treeId: tree.treeId,
      baseRevision: tree.revision,
      utterance: "delete the card",
    })

    const refused = buildProposal(idFactory, {
      intentId: intent.intentId,
      delta: {
        deltaId: idFactory.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: [{ op: "remove", nodeId: ids.card }],
      },
      rationale: "the card is what was named",
    })

    const request: RepairRequest = {
      intent,
      refused,
      disposition: {
        kind: "rejected",
        reason: { code: "stakes-at-refusal-floor", detail: "destroys a protected primitive" },
        stakes: "critical",
        reversible: true,
        confidence: 0.9,
      },
    }

    return { request, tree }
  }

  it("restates the request, the refused delta, and the reason", () => {
    const { request, tree } = requestFor()
    const message = buildRepairMessage(request, tree)

    expect(message).toContain("Request (user-instruction): delete the card")
    expect(message).toContain("1. remove n_4 and its subtree")
    expect(message).toContain("stakes-at-refusal-floor: destroys a protected primitive")
    expect(message).toContain("the card is what was named")
  })

  it("still shows the tree, so a repair is proposed against what exists now", () => {
    const { request, tree } = requestFor()

    expect(buildRepairMessage(request, tree)).toContain("n_7 element loom.page")
  })

  it("offers not-understood as an answer rather than demanding a weaker change", () => {
    const { request, tree } = requestFor()

    expect(buildRepairMessage(request, tree)).toContain("not-understood")
  })
})

describe("INTERPRETER_SYSTEM_PROMPT on repair", () => {
  it("forbids slicing a refused change into a smaller piece of the same thing", () => {
    expect(INTERPRETER_SYSTEM_PROMPT).toContain("one revision")
    expect(INTERPRETER_SYSTEM_PROMPT).toContain("must not be the same change split into a smaller piece")
  })
})
