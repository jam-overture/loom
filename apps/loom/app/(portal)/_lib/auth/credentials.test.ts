import { describe, expect, it } from "vitest"

import { credentialFaultFor, emailSchema, readAllowedEmails, readCredentials } from "./credentials"

describe("an email address", () => {
  /** One person, one actor, whatever case they typed it in. */
  it("is lowercased and trimmed into the actor it signs in as", () => {
    expect(emailSchema.parse("  Ana@Example.COM ")).toBe("ana@example.com")
  })

  it("refuses something that is not an address", () => {
    expect(emailSchema.safeParse("ana").success).toBe(false)
  })
})

describe("who may have an account", () => {
  it("is nobody when the variable is unset", () => {
    expect(readAllowedEmails(undefined).size).toBe(0)
  })

  it("reads a list, in any case and spacing", () => {
    expect([...readAllowedEmails(" Ana@Example.com, bo@example.com ,")]).toEqual([
      "ana@example.com",
      "bo@example.com",
    ])
  })

  /** One typo must not lock out every other person on the list. */
  it("drops an entry that is not an address and keeps the rest", () => {
    expect([...readAllowedEmails("not-an-address,ana@example.com")]).toEqual(["ana@example.com"])
  })
})

describe("what a person types", () => {
  it("takes an address and a long enough password", () => {
    expect(readCredentials({ email: "Ana@example.com", password: "correct horse" })).toEqual({
      ok: true,
      value: { email: "ana@example.com", password: "correct horse" },
    })
  })

  it("reports every fault at once, each under its own field", () => {
    const read = readCredentials({ email: "ana", password: "short" })

    expect(read.ok).toBe(false)
    if (read.ok) return

    expect(credentialFaultFor(read.faults, "email")).toBe(
      "That does not look like an email address."
    )
    expect(credentialFaultFor(read.faults, "password")).toBe("Use at least 12 characters.")
  })

  it("does not take a field that is not text", () => {
    expect(readCredentials({ email: null, password: 7 }).ok).toBe(false)
  })
})
