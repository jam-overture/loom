import { describe, expect, it } from "vitest"

import {
  describeSessionProblem,
  mintSession,
  readSession,
  SESSION_TTL_MS,
  timingSafeEqual,
} from "./session"

const SECRET = "a-secret-long-enough-to-sign-with-0123456789"
const OTHER_SECRET = "a-different-secret-long-enough-to-sign-9876"
const ISSUED_AT = 1_770_000_000_000

describe("mintSession / readSession", () => {
  it("reads back the actor it was minted for", async () => {
    const token = await mintSession("reviewer:ana", ISSUED_AT, SECRET)
    const session = await readSession(token, SECRET, ISSUED_AT + 1000)

    expect(session.ok && session.value).toEqual({
      actor: "reviewer:ana",
      issuedAt: ISSUED_AT,
      expiresAt: ISSUED_AT + SESSION_TTL_MS,
    })
  })

  /** An email is what a host reaches for first, and `@` is not base64. */
  it("survives an actor with characters a URL would escape", async () => {
    const token = await mintSession("ana+review@example.com", ISSUED_AT, SECRET)
    const session = await readSession(token, SECRET, ISSUED_AT)

    expect(session.ok && session.value.actor).toBe("ana+review@example.com")
  })

  /**
   * The attack the signature exists to stop: keep the shape, change the name.
   * Without verification this is how anyone becomes anyone.
   */
  it("refuses a token whose actor was edited", async () => {
    const token = await mintSession("ana", ISSUED_AT, SECRET)
    const [version, , issuedAt, signature] = token.split(".")
    const forged = [version, btoa("bo").replace(/=+$/, ""), issuedAt, signature].join(".")

    const session = await readSession(forged, SECRET, ISSUED_AT)

    expect(session.ok).toBe(false)
    expect(!session.ok && session.error.code).toBe("bad-signature")
  })

  it("refuses a token whose issue time was pushed forward", async () => {
    const token = await mintSession("ana", ISSUED_AT, SECRET)
    const [version, actor, , signature] = token.split(".")
    const forged = [version, actor, String(ISSUED_AT + SESSION_TTL_MS), signature].join(".")

    expect((await readSession(forged, SECRET, ISSUED_AT)).ok).toBe(false)
  })

  /** What a rotated secret looks like: every outstanding session stops working. */
  it("refuses a token signed by another deployment's secret", async () => {
    const token = await mintSession("ana", ISSUED_AT, OTHER_SECRET)
    const session = await readSession(token, SECRET, ISSUED_AT)

    expect(!session.ok && session.error.code).toBe("bad-signature")
  })

  it("expires exactly at the end of the window, not after it", async () => {
    const token = await mintSession("ana", ISSUED_AT, SECRET)

    expect((await readSession(token, SECRET, ISSUED_AT + SESSION_TTL_MS - 1)).ok).toBe(true)

    const expired = await readSession(token, SECRET, ISSUED_AT + SESSION_TTL_MS)
    expect(!expired.ok && expired.error.code).toBe("expired")
  })

  it.each([
    ["empty", ""],
    ["one segment", "nonsense"],
    ["too few segments", "v1.YWJj.123"],
    ["an unknown version", "v2.YWJj.123.c2ln"],
    ["a non-numeric issue time", "v1.YWJj.later.c2ln"],
    ["a signature that is not base64url", "v1.YWJj.123.not base64!"],
  ])("refuses %s as malformed", async (_name, token) => {
    const session = await readSession(token, SECRET, ISSUED_AT)

    expect(!session.ok && session.error.code).toBe("malformed")
  })

  /**
   * Malformed and forged stay distinguishable: a rotated secret and a garbage
   * cookie are different operational events, and one message for both would
   * hide the first.
   */
  it("tells a well-formed forgery apart from an unreadable token", async () => {
    const forged = await readSession("v1.YWJj.123.AAAA", SECRET, ISSUED_AT)
    const unreadable = await readSession("v1.YWJj.123", SECRET, ISSUED_AT)

    expect(!forged.ok && forged.error.code).toBe("bad-signature")
    expect(!unreadable.ok && unreadable.error.code).toBe("malformed")
  })

  /**
   * Signature before expiry, in that order. Expiry is read out of the token, so
   * a forgery that claimed a distant one must still be refused as a forgery
   * rather than being waved past the check that has not run yet.
   */
  it("calls a forged token forged even when its claimed window is open", async () => {
    const forged = await readSession(`v1.YWJj.${ISSUED_AT + SESSION_TTL_MS}.AAAA`, SECRET, ISSUED_AT)

    expect(!forged.ok && forged.error.code).toBe("bad-signature")
  })
})

describe("timingSafeEqual", () => {
  it("is true only for identical bytes", () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true)
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false)
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2]))).toBe(false)
    expect(timingSafeEqual(new Uint8Array([]), new Uint8Array([]))).toBe(true)
  })

  /** The property that matters: a difference in the last byte is still caught. */
  it("does not stop at the first differing byte", () => {
    const left = new Uint8Array(64).fill(7)
    const right = new Uint8Array(64).fill(7)
    right[63] = 8

    expect(timingSafeEqual(left, right)).toBe(false)
  })
})

describe("describeSessionProblem", () => {
  it("says what to do about each problem", () => {
    expect(describeSessionProblem({ code: "expired", expiredAt: ISSUED_AT })).toContain("Sign in again")
    expect(describeSessionProblem({ code: "bad-signature" })).toContain("Sign in again")
    expect(describeSessionProblem({ code: "malformed" })).toMatch(/not one this portal issued/)
  })
})
