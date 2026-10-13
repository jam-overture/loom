import { describe, expect, it } from "vitest"

import { isNavItemActive } from "./nav"

describe("isNavItemActive", () => {
  it("matches a path against itself", () => {
    expect(isNavItemActive("/portal/history", "/portal/history")).toBe(true)
  })

  it("matches a child route against its section", () => {
    expect(isNavItemActive("/portal/pages/t_abc", "/portal/pages")).toBe(true)
  })

  it("does not match a different section", () => {
    expect(isNavItemActive("/portal/history", "/portal/activity")).toBe(false)
  })

  /**
   * The reason this is a function rather than an inline `startsWith`: a raw
   * prefix makes any route that merely begins with another's name light up the
   * wrong nav item, and nothing catches it until two routes collide.
   */
  it("does not match a route that merely shares a prefix", () => {
    expect(isNavItemActive("/portal/pages-archive", "/portal/pages")).toBe(false)
    expect(isNavItemActive("/historian", "/portal/history")).toBe(false)
  })

  it("treats the root as exact so it does not claim every path", () => {
    expect(isNavItemActive("/", "/")).toBe(true)
    expect(isNavItemActive("/portal/history", "/")).toBe(false)
  })

  it("matches a tree's own route against the root section it belongs to", () => {
    expect(isNavItemActive("/portal/pages/t_abc", "/portal/pages")).toBe(true)
    expect(isNavItemActive("/portal/pages", "/portal/pages")).toBe(true)
  })

  /**
   * `/portal` is a screen and also the prefix of every other route in the rail.
   * Without `exact` it is the active item on every page in the portal, and a
   * rail with two items lit is a rail that says nothing.
   */
  it("lets a screen claim its own path and nothing under it", () => {
    expect(isNavItemActive("/portal", "/portal", true)).toBe(true)
    expect(isNavItemActive("/portal/history", "/portal", true)).toBe(false)
    expect(isNavItemActive("/portal/history", "/portal")).toBe(true)
  })
})

/**
 * Two entries that are the same screen in two states, which is what `Pages`
 * became on 13 October.
 *
 * A rail comparing paths alone lights both of them on either one, which is a
 * rail saying *you are in two places* — worse than no highlight at all.
 */
describe("an href that carries a query", () => {
  const keys = ["filter"]

  it("lights the filtered entry when the filter is on", () => {
    expect(
      isNavItemActive("/portal/pages", "/portal/pages?filter=waiting", true, {
        search: "filter=waiting",
        keys,
      })
    ).toBe(true)
  })

  it("leaves the filtered entry dark when it is not", () => {
    expect(
      isNavItemActive("/portal/pages", "/portal/pages?filter=waiting", true, { search: "", keys })
    ).toBe(false)
  })

  /** The half that is easy to forget: an unfiltered entry is not always active. */
  it("leaves the unfiltered entry dark while a filter is on", () => {
    expect(
      isNavItemActive("/portal/pages", "/portal/pages", true, { search: "filter=waiting", keys })
    ).toBe(false)
  })

  it("lights the unfiltered entry when no filter is on", () => {
    expect(isNavItemActive("/portal/pages", "/portal/pages", true, { search: "", keys })).toBe(true)
  })

  /**
   * A cursor is the screen's own business. A rail that compared it would go
   * dark the moment somebody turned a page, which is why the keys it is
   * answerable for are passed in rather than read off the URL.
   */
  it("ignores a parameter it was not given to compare", () => {
    expect(
      isNavItemActive("/portal/pages", "/portal/pages", true, { search: "after=t_abc", keys })
    ).toBe(true)
  })

  /** Nothing changes for the rest of the rail, which passes no keys at all. */
  it("compares paths alone when there are no keys to compare", () => {
    expect(isNavItemActive("/portal/activity", "/portal/activity")).toBe(true)
    expect(isNavItemActive("/portal/activity", "/portal/activity", false, { search: "kind=gate" })).toBe(
      true
    )
  })
})
