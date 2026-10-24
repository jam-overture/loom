import { describe, expect, it } from "vitest"

import { turnedAwayOf } from "./turned-away"

const AT = Date.UTC(2026, 9, 24, 17, 5)

describe("turnedAwayOf", () => {
  it("says nothing was turned away as a nought with no lines", () => {
    expect(turnedAwayOf([])).toEqual({ refused: 0, lines: [] })
  })

  it("adds every reason into one figure", () => {
    expect(
      turnedAwayOf([
        { reason: "wrong-site", refused: 3, lastAt: AT, lastOrigin: "https://loomjs.org" },
        { reason: "unreadable", refused: 1, lastAt: AT, lastOrigin: null },
      ]).refused
    ).toBe(4)
  })

  /** The case the maintainer hit on 21 October: the bare domain against a project naming www. */
  it("names the site a refused delivery came from, and where to change the address", () => {
    const [line] = turnedAwayOf([
      { reason: "wrong-site", refused: 12, lastAt: AT, lastOrigin: "https://loomjs.org" },
    ]).lines

    expect(line).toBe(
      "12 deliveries came from a site this project does not take signals from, the latest from https://loomjs.org on 24 October 2026 at 17:05 UTC. If that is your site, change the address in Settings."
    )
  })

  it("says one delivery as one", () => {
    const [line] = turnedAwayOf([
      { reason: "closed", refused: 1, lastAt: AT, lastOrigin: null },
    ]).lines

    expect(line).toMatch(/^1 delivery arrived after this project was closed/)
  })

  it("says a refusal that named no site came from somewhere else", () => {
    const [line] = turnedAwayOf([
      { reason: "wrong-site", refused: 2, lastAt: AT, lastOrigin: null },
    ]).lines

    expect(line).toMatch(/^2 deliveries named no site/)
  })

  it("points an unreadable delivery at the snippet", () => {
    const [line] = turnedAwayOf([
      { reason: "unreadable", refused: 5, lastAt: AT, lastOrigin: null },
    ]).lines

    expect(line).toContain("Connect your site")
  })
})
