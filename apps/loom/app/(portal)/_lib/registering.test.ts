import { describe, expect, it } from "vitest"

import { faultFor, hostFrom, readRegistration } from "./registering"

describe("the host somebody typed", () => {
  it("takes a bare host as it is", () => {
    expect(hostFrom("shop.example.com")).toBe("shop.example.com")
  })

  /**
   * The case the field exists to be kind about. People paste addresses, and a
   * form that refuses `https://shop.example.com/` is refusing the right answer
   * in the wrong clothes.
   */
  it("takes a pasted address and keeps the host out of it", () => {
    expect(hostFrom("https://shop.example.com/pricing?from=email")).toBe("shop.example.com")
  })

  it("keeps a port, which is a real thing to run on", () => {
    expect(hostFrom("localhost:3000")).toBe("localhost:3000")
  })

  it("lowercases, because a host is not case sensitive and a list is", () => {
    expect(hostFrom("Shop.Example.COM")).toBe("shop.example.com")
  })

  it("is absent when nothing was typed", () => {
    expect(hostFrom("   ")).toBeUndefined()
  })
})

describe("what somebody filled in", () => {
  it("takes a name and nothing else", () => {
    const read = readRegistration({ name: "The bakery", host: "", project: "" })

    expect(read.ok && read.value).toEqual({ name: "The bakery", host: undefined, joining: undefined })
  })

  it("trims the name, so a stray space is not part of it forever", () => {
    const read = readRegistration({ name: "  The bakery  ", host: "", project: "" })

    expect(read.ok && read.value.name).toBe("The bakery")
  })

  it("refuses a name that is only whitespace", () => {
    const read = readRegistration({ name: "   ", host: "", project: "" })

    expect(read.ok).toBe(false)
    expect(!read.ok && faultFor(read.faults, "name")).toContain("Give it a name")
  })

  it("refuses a host that is not one", () => {
    const read = readRegistration({ name: "Fine", host: "not a host at all", project: "" })

    expect(read.ok).toBe(false)
    expect(!read.ok && faultFor(read.faults, "host")).toContain("shop.example.com")
  })

  /**
   * A form that refuses one field at a time makes somebody submit three times to
   * learn three things they could have been told at once.
   */
  it("reports every fault at once rather than the first", () => {
    const read = readRegistration({ name: "", host: "not a host", project: "" })

    expect(read.ok).toBe(false)
    expect(!read.ok && read.faults.map((fault) => fault.field)).toEqual(["name", "host"])
  })

  it("joins an existing project when one was chosen", () => {
    const read = readRegistration({ name: "Fine", host: "", project: "prj_abc" })

    expect(read.ok && read.value.joining).toBe("prj_abc")
  })

  it("makes a new project when 'new' was chosen", () => {
    const read = readRegistration({ name: "Fine", host: "", project: "new" })

    expect(read.ok && read.value.joining).toBeUndefined()
  })

  it("does not fall over on fields that are not strings", () => {
    const read = readRegistration({ name: undefined, host: null, project: 7 })

    expect(read.ok).toBe(false)
    expect(!read.ok && faultFor(read.faults, "name")).toBeDefined()
  })
})
