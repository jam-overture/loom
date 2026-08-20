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
})
