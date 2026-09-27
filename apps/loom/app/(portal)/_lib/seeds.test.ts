import { describe, expect, it } from "vitest"

import type { TreeId } from "@jam-overture/loom"

import { seedTree } from "./seed"
import { isAuditable, seedFor } from "./seeds"

describe("seedFor", () => {
  it("knows the tree this portal seeds", () => {
    expect(seedFor(seedTree().treeId)).toEqual(seedTree())
  })

  /**
   * A seed is only a seed at revision 0. Handing `auditSnapshot` anything later
   * would fold a log onto a tree that already contains part of it.
   */
  it("hands back a tree at revision 0", () => {
    expect(seedFor(seedTree().treeId)?.revision).toBe(0)
  })

  it("does not invent a seed for a tree it never created", () => {
    expect(seedFor("t_elsewhere" as TreeId)).toBeUndefined()
  })

  it("returns the same seed every time, so an audit is repeatable", () => {
    expect(seedFor(seedTree().treeId)).toBe(seedFor(seedTree().treeId))
  })
})

describe("isAuditable", () => {
  it("is true exactly when a seed is known", () => {
    expect(isAuditable(seedTree().treeId)).toBe(true)
    expect(isAuditable("t_elsewhere" as TreeId)).toBe(false)
  })
})
