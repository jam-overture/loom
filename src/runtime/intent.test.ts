import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema } from "../ids.js"
import { buildIntent, FIXED_INSTANT } from "../testing/doubles.js"

import { editIntentSchema } from "./intent.js"

const spare = sequentialIdFactory("int")
const treeId = treeIdSchema.parse("t_intent")

describe("editIntentSchema", () => {
  it("round-trips an intent through JSON", () => {
    const intent = buildIntent(spare, { treeId, baseRevision: 3 })
    const parsed = editIntentSchema.safeParse(JSON.parse(JSON.stringify(intent)))

    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data).toEqual(intent)
  })

  it("accepts an optional scope so an intent can name a subtree", () => {
    const intent = buildIntent(spare, { treeId, baseRevision: 0 })
    const parsed = editIntentSchema.safeParse({ ...intent, scopeNodeId: "n_scoped" })

    expect(parsed.success && parsed.data.scopeNodeId).toBe("n_scoped")
  })

  /**
   * Optional because a `system-signal` has no one to name — not so a host may
   * skip it for a human ask (0027).
   */
  it("accepts an actor, and does not require one", () => {
    const intent = buildIntent(spare, { treeId, baseRevision: 0, actor: "reviewer:ana" })

    expect(editIntentSchema.safeParse(intent).success).toBe(true)
    expect(editIntentSchema.safeParse({ ...intent, actor: undefined }).success).toBe(true)
  })

  /** An empty actor is a host that meant to name someone and did not. */
  it("rejects an empty actor rather than treating it as absent", () => {
    const intent = buildIntent(spare, { treeId, baseRevision: 0 })

    expect(editIntentSchema.safeParse({ ...intent, actor: "" }).success).toBe(false)
  })

  it("rejects an empty utterance, which nothing could interpret", () => {
    const intent = buildIntent(spare, { treeId, baseRevision: 0 })

    expect(editIntentSchema.safeParse({ ...intent, utterance: "" }).success).toBe(false)
  })

  it("rejects an unknown origin", () => {
    const intent = buildIntent(spare, { treeId, baseRevision: 0 })

    expect(editIntentSchema.safeParse({ ...intent, origin: "telepathy" }).success).toBe(false)
  })

  it("rejects a malformed scope node id", () => {
    const intent = buildIntent(spare, { treeId, baseRevision: 0 })

    expect(editIntentSchema.safeParse({ ...intent, scopeNodeId: "d_1" }).success).toBe(false)
  })

  it("requires an observation timestamp", () => {
    const parsed = editIntentSchema.safeParse({
      intentId: spare.intentId(),
      treeId,
      baseRevision: 0,
      origin: "user-instruction",
      utterance: "tidy this up",
    })

    expect(parsed.success).toBe(false)
    expect(FIXED_INSTANT).toMatch(/Z$/)
  })
})
