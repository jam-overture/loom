import { describe, expect, it } from "vitest"

import { isMissingColumn } from "./missing-column"

describe("isMissingColumn", () => {
  it("knows Postgres's undefined column, however deep it is wrapped", () => {
    expect(isMissingColumn({ code: "42703" })).toBe(true)
    expect(isMissingColumn(new Error("query failed", { cause: { code: "42703" } }))).toBe(true)
    expect(
      isMissingColumn(
        new Error("outer", { cause: new Error("inner", { cause: { code: "42703" } }) })
      )
    ).toBe(true)
  })

  it("is not fooled by any other failure", () => {
    expect(isMissingColumn({ code: "42P01" })).toBe(false)
    expect(isMissingColumn(new Error("connection refused"))).toBe(false)
    expect(isMissingColumn("42703")).toBe(false)
    expect(isMissingColumn(null)).toBe(false)
  })
})
