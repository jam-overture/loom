import { describe, expect, it } from "vitest"

import { SHARED_SUBJECT } from "@/app/(portal)/_lib/auth/subject"

import { subjectOf } from "./subject"

const from = (forwardedFor?: string): Request =>
  new Request("https://loom.test/api/reader-signals", {
    method: "POST",
    headers: forwardedFor === undefined ? {} : { "x-forwarded-for": forwardedFor },
  })

describe("subjectOf", () => {
  it("gives one caller one key", async () => {
    const [first, second] = await Promise.all([
      subjectOf(from("203.0.113.4"), 1),
      subjectOf(from("203.0.113.4"), 1),
    ])

    expect(first).toBe(second)
  })

  it("gives two callers two keys", async () => {
    expect(await subjectOf(from("203.0.113.4"), 1)).not.toBe(await subjectOf(from("203.0.113.5"), 1))
  })

  /** The address is read off a header and dropped inside the function. */
  it("never returns the address it read", async () => {
    const key = await subjectOf(from("203.0.113.4"), 1)

    expect(key).not.toContain("203.0.113.4")
    expect(key).toMatch(/^[0-9a-f]{64}$/)
  })

  /**
   * A forwarded-for list is appended to by each hop, so the entries on the left
   * are the ones the caller could have invented. Counting from the right is the
   * only reading they cannot steer — and a caller who could steer it would get a
   * fresh rate-limit bucket on every request.
   */
  it("counts from the right, so a caller cannot choose their own bucket", async () => {
    const trusted = await subjectOf(from("203.0.113.4"), 1)

    expect(await subjectOf(from("198.51.100.9, 203.0.113.4"), 1)).toBe(trusted)
    expect(await subjectOf(from("1.1.1.1, 2.2.2.2, 203.0.113.4"), 1)).toBe(trusted)
  })

  it("reads further left when more proxies are trusted", async () => {
    const deep = await subjectOf(from("198.51.100.9, 203.0.113.4"), 2)

    expect(deep).toBe(await subjectOf(from("198.51.100.9"), 1))
  })

  /** Nowhere to count means everyone counts together, which is the strict direction. */
  it("shares one key when there is no address", async () => {
    expect(await subjectOf(from(), 1)).toBe(SHARED_SUBJECT)
    expect(await subjectOf(from("198.51.100.9"), 2)).toBe(SHARED_SUBJECT)
  })
})
