import { describe, expect, it } from "vitest"

import { DEFAULT_LANDING, DEMO_PATH, isPublicPath, safeReturnPath, SIGN_IN_PATH } from "./paths"

describe("isPublicPath", () => {
  it("lets the sign-in page through", () => {
    expect(isPublicPath(SIGN_IN_PATH)).toBe(true)
  })

  /**
   * The demo is meant to be reachable by someone with no account, and its own
   * server actions live under the same path — so the whole segment is public,
   * not only the page.
   */
  it("lets the demo and its actions through", () => {
    expect(isPublicPath(DEMO_PATH)).toBe(true)
    expect(isPublicPath(`${DEMO_PATH}/anything`)).toBe(true)
  })

  it("does not let anything else through", () => {
    const guarded = [
      "/",
      "/portal/pages",
      "/portal/pages/t_1",
      "/portal/activity",
      "/portal/history",
      "/demos",
    ]

    for (const path of guarded) {
      expect(isPublicPath(path), path).toBe(false)
    }
  })

  /**
   * The same segment-boundary rule the nav uses: a bare prefix test would make
   * `/portal/sign-in` claim `/sign-inbox`, and here that would open a route.
   */
  it("does not let a path that merely starts with the same letters through", () => {
    expect(isPublicPath("/sign-inbox")).toBe(false)
  })

  /**
   * No longer hypothetical: `/portal/sign-ins` is a real operator page one character
   * away from the one route that needs no session, and it reports on the state
   * of the throttle. The rule above is what keeps them apart, so the real
   * neighbour is named here rather than left to a generic case.
   */
  it("keeps the sign-in report behind a session, next door though it is", () => {
    expect(isPublicPath("/portal/sign-ins")).toBe(false)
  })
})

describe("DEFAULT_LANDING", () => {
  /**
   * Where a reviewer with no particular destination is put. It was the page
   * list; it is the front door, because the first thing to tell somebody who
   * has just signed in is whether anything is waiting for them rather than
   * where it might be.
   */
  it("lands a fresh sign-in on the queue rather than on a list of places", () => {
    expect(DEFAULT_LANDING).toBe("/portal")
  })

  /** It has to be somewhere a session is required, or signing in achieves nothing. */
  it("is not a public path", () => {
    expect(isPublicPath(DEFAULT_LANDING)).toBe(false)
  })
})

describe("safeReturnPath", () => {
  it("returns the path it was given", () => {
    expect(safeReturnPath("/portal/pages/t_1")).toBe("/portal/pages/t_1")
    expect(safeReturnPath("/portal/history?tree=t_1")).toBe("/portal/history?tree=t_1")
  })

  it("falls back when there is nothing to return to", () => {
    expect(safeReturnPath(undefined)).toBe(DEFAULT_LANDING)
    expect(safeReturnPath(null)).toBe(DEFAULT_LANDING)
    expect(safeReturnPath("")).toBe(DEFAULT_LANDING)
  })

  /**
   * The case a leading-slash check alone would miss: a browser reads
   * `//evil.example` as protocol-relative, so this is a full redirect off-site
   * from a link that looks like the portal's own.
   */
  it("refuses a protocol-relative path", () => {
    expect(safeReturnPath("//evil.example/steal")).toBe(DEFAULT_LANDING)
    expect(safeReturnPath("/\\evil.example")).toBe(DEFAULT_LANDING)
  })

  it("refuses an absolute URL", () => {
    expect(safeReturnPath("https://evil.example")).toBe(DEFAULT_LANDING)
    expect(safeReturnPath("javascript:alert(1)")).toBe(DEFAULT_LANDING)
  })

  /** Signing in only to be sent back to sign in is a loop, not a destination. */
  it("refuses to send a freshly signed-in reviewer back to the sign-in page", () => {
    expect(safeReturnPath(SIGN_IN_PATH)).toBe(DEFAULT_LANDING)
    expect(safeReturnPath(`${SIGN_IN_PATH}?from=%2Ftrees`)).toBe(DEFAULT_LANDING)
  })
})
