import { describe, expect, it } from "vitest"

import { single } from "./query"

describe("single", () => {
  it("is the value of a key given once", () => {
    expect(single("g_1")).toBe("g_1")
  })

  it("is nothing for a key not given, or given more than once", () => {
    expect(single(undefined)).toBeUndefined()
    expect(single(["g_1", "g_2"])).toBeUndefined()
  })
})
