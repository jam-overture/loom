import { describe, expect, it } from "vitest"

import { deltaIdSchema, nodeIdSchema, randomIdFactory, sequentialIdFactory, treeIdSchema } from "./ids.js"

describe("id schemas", () => {
  it("accepts prefixed lowercase-alphanumeric bodies", () => {
    expect(nodeIdSchema.safeParse("n_a1b2c3").success).toBe(true)
    expect(treeIdSchema.safeParse("t_1").success).toBe(true)
    expect(deltaIdSchema.safeParse("d_zzz").success).toBe(true)
  })

  it("rejects wrong prefixes, so a DeltaId cannot pass as a NodeId", () => {
    expect(nodeIdSchema.safeParse("d_a1b2c3").success).toBe(false)
    expect(treeIdSchema.safeParse("n_a1b2c3").success).toBe(false)
  })

  it("rejects uppercase, separators, and empty bodies", () => {
    expect(nodeIdSchema.safeParse("n_A1").success).toBe(false)
    expect(nodeIdSchema.safeParse("n_a-1").success).toBe(false)
    expect(nodeIdSchema.safeParse("n_").success).toBe(false)
    expect(nodeIdSchema.safeParse("a1b2c3").success).toBe(false)
  })
})

describe("sequentialIdFactory", () => {
  it("counts each kind independently and reproducibly", () => {
    const first = sequentialIdFactory()
    expect([first.nodeId(), first.nodeId(), first.treeId(), first.deltaId()]).toEqual([
      "n_1",
      "n_2",
      "t_1",
      "d_1",
    ])

    const second = sequentialIdFactory()
    expect(second.nodeId()).toBe("n_1")
  })

  it("keeps namespaced factories from colliding with the default one", () => {
    const base = sequentialIdFactory()
    const namespaced = sequentialIdFactory("spare")

    expect(base.nodeId()).toBe("n_1")
    expect(namespaced.nodeId()).toBe("n_spare1")
  })
})

describe("randomIdFactory", () => {
  it("mints ids that satisfy their own schema", () => {
    expect(nodeIdSchema.safeParse(randomIdFactory.nodeId()).success).toBe(true)
    expect(treeIdSchema.safeParse(randomIdFactory.treeId()).success).toBe(true)
    expect(deltaIdSchema.safeParse(randomIdFactory.deltaId()).success).toBe(true)
  })

  it("does not collide across a large batch", () => {
    const minted = Array.from({ length: 5_000 }, () => randomIdFactory.nodeId())
    expect(new Set(minted).size).toBe(minted.length)
  })
})
