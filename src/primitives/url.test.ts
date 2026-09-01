import { describe, expect, it } from "vitest"

import { linkUrlSchema, mediaUrlSchema } from "./url.js"

const accepts = (schema: typeof linkUrlSchema, value: string): boolean => schema.safeParse(value).success

const messageFrom = (schema: typeof linkUrlSchema, value: string): string => {
  const parsed = schema.safeParse(value)
  if (parsed.success) throw new Error(`expected ${value} to be refused`)

  return parsed.error.issues.map((issue) => issue.message).join("; ")
}

describe("the scheme allowlist", () => {
  it("takes the schemes a call to action may point at", () => {
    for (const value of ["https://example.com/pricing", "http://example.com", "mailto:hi@example.com", "tel:+15551234"]) {
      expect(accepts(linkUrlSchema, value)).toBe(true)
    }
  })

  it("refuses a scheme that executes, which is the whole reason the allowlist exists", () => {
    for (const value of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox"]) {
      expect(accepts(linkUrlSchema, value)).toBe(false)
      expect(accepts(mediaUrlSchema, value)).toBe(false)
    }
  })

  it("keeps media narrower than a link", () => {
    expect(accepts(linkUrlSchema, "mailto:hi@example.com")).toBe(true)
    expect(accepts(mediaUrlSchema, "mailto:hi@example.com")).toBe(false)
  })
})

describe("a destination on the site's own origin", () => {
  it("takes a path beginning with a slash, which is what a site's own links are", () => {
    for (const value of ["/", "/pricing", "/docs/getting-started", "/search?q=loom", "/docs/a#install"]) {
      expect(accepts(linkUrlSchema, value)).toBe(true)
      expect(accepts(mediaUrlSchema, value)).toBe(true)
    }
  })

  /**
   * Each of these begins with a slash and reaches another origin. They are the
   * reason the check resolves the value rather than matching its shape: a rule
   * spelled "starts with one slash and not two" admits the last three, because
   * the URL parser treats a backslash as a slash and strips tabs and newlines
   * before it decides where the authority begins.
   */
  it("refuses a path that leaves the origin, including the three that look like they do not", () => {
    for (const value of ["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example"]) {
      expect(accepts(linkUrlSchema, value)).toBe(false)
      expect(accepts(mediaUrlSchema, value)).toBe(false)
    }
  })

  it("refuses a leading tab, which the parser strips before it reads the slashes", () => {
    expect(accepts(linkUrlSchema, "\t//evil.example")).toBe(false)
  })

  it("takes a path whose dot segments resolve back onto the origin", () => {
    expect(accepts(linkUrlSchema, "/..//evil.example")).toBe(true)
    expect(new URL("/..//evil.example", "https://real.example").origin).toBe("https://real.example")
  })

  /**
   * 0053's objection, which this keeps: a tree is mounted at a path it does not
   * know, so `pricing` names a different document per route while `/pricing`
   * names one.
   */
  it("refuses a document-relative path, which means something different per route", () => {
    for (const value of ["pricing", "./pricing", "../pricing"]) {
      expect(accepts(linkUrlSchema, value)).toBe(false)
    }
  })

  it("refuses a fragment on its own, because no primitive emits an id for one to reach", () => {
    expect(accepts(linkUrlSchema, "#pricing")).toBe(false)
  })

  it("refuses an empty destination rather than reading it as this page", () => {
    expect(accepts(linkUrlSchema, "")).toBe(false)
  })

  it("says both of the things a destination may be when it refuses one that is neither", () => {
    expect(messageFrom(linkUrlSchema, "pricing")).toBe("must be an absolute URL, or a path beginning with / on this site")
  })

  it("still names the scheme when the scheme is what was wrong", () => {
    expect(messageFrom(linkUrlSchema, "ftp://files.example.com")).toContain("scheme ftp: is not allowed here")
  })

  /**
   * The origin the check resolves against is a detail of the check, and 0053
   * requires validation to be a predicate and never a codec. So an accepted
   * path comes back exactly as the tree wrote it, with no origin on the front
   * of it — the page stays a function of the tree rather than of what the
   * validator decided the tree meant.
   */
  it("hands the path back as written, rather than the URL it resolved to", () => {
    expect(linkUrlSchema.parse("/pricing")).toBe("/pricing")
    expect(mediaUrlSchema.parse("/logo.svg")).toBe("/logo.svg")
    expect(linkUrlSchema.parse("https://example.com/pricing")).toBe("https://example.com/pricing")
  })
})
