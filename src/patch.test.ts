import { describe, expect, it } from "vitest"

import { applyPatch, type PatchOf } from "./patch.js"

type Row = {
  readonly id: string
  readonly name: string
  readonly host?: string
}

const row: Row = { id: "r_1", name: "Before", host: "old.example.com" }

describe("applyPatch", () => {
  it("leaves a field the patch does not mention alone", () => {
    expect(applyPatch(row, { name: "After" })).toEqual({
      id: "r_1",
      name: "After",
      host: "old.example.com",
    })
  })

  it("reads an absent field as unchanged, so a caller may pass what it read", () => {
    const read: PatchOf<Row> = { name: undefined, host: undefined }

    expect(applyPatch(row, read)).toEqual(row)
  })

  it("sets a field the subject did not have", () => {
    const { host: _none, ...rest } = row
    const without: Row = rest

    expect(applyPatch(without, { host: "shop.example.com" })).toEqual({
      id: "r_1",
      name: "Before",
      host: "shop.example.com",
    })
  })

  /**
   * The state the three-way patch exists for, and the reason it is a key
   * removal rather than an `undefined`: what comes back has to be what a row
   * that never had the field looks like, which `toStrictEqual` is the assertion
   * that can tell apart.
   */
  it("clears a field on null, by removing the key rather than holding undefined", () => {
    const cleared = applyPatch(row, { host: null })

    expect(cleared).toStrictEqual({ id: "r_1", name: "Before" })
    expect("host" in cleared).toBe(false)
  })

  it("clears a field that was already absent without inventing one", () => {
    const { host: _none, ...rest } = row
    const without: Row = rest

    expect(applyPatch(without, { host: null })).toStrictEqual({ id: "r_1", name: "Before" })
  })

  it("sets one field and clears another in one call", () => {
    expect(applyPatch(row, { name: "After", host: null })).toStrictEqual({
      id: "r_1",
      name: "After",
    })
  })

  it("applies nothing for an empty patch", () => {
    expect(applyPatch(row, {})).toStrictEqual(row)
  })

  it("does not modify the subject", () => {
    applyPatch(row, { name: "After", host: null })

    expect(row).toStrictEqual({ id: "r_1", name: "Before", host: "old.example.com" })
  })
})
