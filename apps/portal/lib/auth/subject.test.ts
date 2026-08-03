import { describe, expect, it } from "vitest"

import {
  clientAddress,
  DEFAULT_TRUSTED_HOPS,
  resolveTrustedHops,
  SHARED_SUBJECT,
  subjectFor,
} from "./subject"

const SECRET = "s".repeat(32)

describe("clientAddress", () => {
  it("reads the entry the nearest trusted proxy wrote", () => {
    expect(clientAddress("203.0.113.7", 1)).toBe("203.0.113.7")
  })

  /**
   * The case the whole module is shaped around. A caller who sends their own
   * forwarded-for header prepends to the list, so the leftmost entry — the
   * reading most examples show — is a value they chose. Taking it would let
   * anyone reset their own count on every request.
   */
  it("ignores entries a caller could have written themselves", () => {
    expect(clientAddress("10.0.0.1, 198.51.100.4, 203.0.113.7", 1)).toBe("203.0.113.7")
  })

  it("counts back by the number of proxies actually in front", () => {
    expect(clientAddress("10.0.0.1, 198.51.100.4, 203.0.113.7", 2)).toBe("198.51.100.4")
  })

  it("tolerates the spacing a header is written with", () => {
    expect(clientAddress("  10.0.0.1 ,203.0.113.7  ", 1)).toBe("203.0.113.7")
  })

  it("has no address when the header is absent", () => {
    expect(clientAddress(null, 1)).toBeNull()
    expect(clientAddress("", 1)).toBeNull()
  })

  /**
   * Fewer entries than configured proxies means the request did not arrive the
   * way this deployment expects. Reading the leftmost entry anyway would be
   * reading a hop nearer the caller than the one that was trusted.
   */
  it("has no address when the list is shorter than the proxies in front of it", () => {
    expect(clientAddress("203.0.113.7", 2)).toBeNull()
  })
})

describe("resolveTrustedHops", () => {
  it("assumes one proxy when nothing is configured", () => {
    expect(resolveTrustedHops(undefined)).toBe(DEFAULT_TRUSTED_HOPS)
  })

  it("takes a count when one is given", () => {
    expect(resolveTrustedHops(" 2 ")).toBe(2)
  })

  /**
   * A typo falls back to one rather than refusing to serve. One over-collects
   * attempts into a shared bucket; a larger number would read an entry the
   * caller controls, so the safe direction to be wrong in is downwards.
   */
  it("falls back to one for anything that is not a count", () => {
    expect(resolveTrustedHops("lots")).toBe(1)
    expect(resolveTrustedHops("0")).toBe(1)
    expect(resolveTrustedHops("-3")).toBe(1)
    expect(resolveTrustedHops("1.5")).toBe(1)
    expect(resolveTrustedHops("")).toBe(1)
  })
})

describe("subjectFor", () => {
  it("gives the same subject for the same address", async () => {
    expect(await subjectFor("203.0.113.7", SECRET)).toBe(await subjectFor("203.0.113.7", SECRET))
  })

  it("gives different subjects to different addresses", async () => {
    expect(await subjectFor("203.0.113.7", SECRET)).not.toBe(
      await subjectFor("203.0.113.8", SECRET)
    )
  })

  /**
   * The privacy property, and the reason the digest is keyed: an unkeyed hash of
   * an address is a reversible encoding of it, because the whole IPv4 space fits
   * in an afternoon's work.
   */
  it("does not contain the address it stands for", async () => {
    expect(await subjectFor("203.0.113.7", SECRET)).not.toContain("203.0.113.7")
  })

  it("means nothing outside the deployment that made it", async () => {
    expect(await subjectFor("203.0.113.7", SECRET)).not.toBe(
      await subjectFor("203.0.113.7", "d".repeat(32))
    )
  })

  it("counts attempts with no establishable origin together", async () => {
    expect(await subjectFor(null, SECRET)).toBe(SHARED_SUBJECT)
  })
})
