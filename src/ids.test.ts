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

  /**
   * The namespace used to be interpolated and only the *result* validated, so a
   * hyphen was accepted here and refused several frames later inside whichever
   * builder minted first. These say the refusal arrives at the call.
   */
  it("refuses a namespace that could never appear in an id, at the call rather than the first mint", () => {
    for (const illegal of ["set-n-q1", "Set", "set_n", "sét"]) {
      expect(() => sequentialIdFactory(illegal), illegal).toThrow(/sequentialIdFactory/)
    }
  })

  it("refuses a namespace with no room left for the counter", () => {
    expect(() => sequentialIdFactory("a".repeat(24))).not.toThrow()
    expect(() => sequentialIdFactory("a".repeat(25))).toThrow(/at most 24/)
  })

  it("names the namespace, the rule and a namespace that would have worked", () => {
    expect(() => sequentialIdFactory("set-n-q1")).toThrow(/"set-n-q1"/)
    expect(() => sequentialIdFactory("set-n-q1")).toThrow(/lowercase letters and digits/)
    expect(() => sequentialIdFactory("set-n-q1")).toThrow(/Try "setnq1"/)
  })

  it("tells a caller whose namespace has nothing legal in it to drop the argument", () => {
    expect(() => sequentialIdFactory("--")).toThrow(/pass no namespace at all/)
  })

  /**
   * The bound has to hold for the last id as well as the first, which is the
   * reason it is shorter than a body rather than equal to it.
   */
  it("stays legal at the far end of a long run", () => {
    const factory = sequentialIdFactory("a".repeat(24))

    for (let index = 0; index < 1_000; index += 1) factory.nodeId()

    expect(nodeIdSchema.safeParse(factory.nodeId()).success).toBe(true)
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
