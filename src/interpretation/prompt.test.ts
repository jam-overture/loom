import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import { buildIntent } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"

import { buildUserMessage, hashPrompt, INTERPRETER_SYSTEM_PROMPT } from "./prompt.js"

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
