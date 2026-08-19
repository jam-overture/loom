import { describe, expect, it } from "vitest"

import { describeSubmissionError, parseSubmission } from "./declaration.js"

describe("parseSubmission", () => {
  it("reads the endpoint a node posts to", () => {
    const parsed = parseSubmission({ to: "contact.enquiry" })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.value.to).toBe("contact.enquiry")
  })

  it("refuses an endpoint id that is not dot-namespaced kebab-case", () => {
    expect(parseSubmission({ to: "Contact_Enquiry" }).ok).toBe(false)
    expect(parseSubmission({ to: "" }).ok).toBe(false)
  })

  it("refuses a bare id string, so the declaration can grow a key later", () => {
    expect(parseSubmission("contact.enquiry").ok).toBe(false)
  })

  it("refuses anything that is not an object with `to`", () => {
    expect(parseSubmission(null).ok).toBe(false)
    expect(parseSubmission(["contact.enquiry"]).ok).toBe(false)
    expect(parseSubmission({}).ok).toBe(false)
  })

  /**
   * The address is the thing this seam exists to keep out of the tree, so a
   * declaration that carries one is refused rather than partially honoured.
   */
  it("refuses a declaration that tries to carry an address", () => {
    expect(parseSubmission({ to: "contact.enquiry", action: "https://evil.test/collect" }).ok).toBe(
      false
    )
  })

  it("names the offending path in a way a person can act on", () => {
    const parsed = parseSubmission({ to: 7 })

    expect(parsed.ok).toBe(false)
    if (parsed.ok) return

    expect(describeSubmissionError(parsed.error)).toContain("to")
  })

  it("names the key itself when the whole declaration is the problem", () => {
    const parsed = parseSubmission("contact.enquiry")

    expect(parsed.ok).toBe(false)
    if (parsed.ok) return

    expect(parsed.error.path).toBe("loom:submit")
  })
})
