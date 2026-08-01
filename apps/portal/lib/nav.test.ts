import { describe, expect, it } from "vitest"

import { isNavItemActive } from "./nav"

describe("isNavItemActive", () => {
  it("matches a path against itself", () => {
    expect(isNavItemActive("/history", "/history")).toBe(true)
  })

  it("matches a child route against its section", () => {
    expect(isNavItemActive("/trees/t_abc", "/trees")).toBe(true)
  })

  it("does not match a different section", () => {
    expect(isNavItemActive("/history", "/activity")).toBe(false)
  })

  /**
   * The reason this is a function rather than an inline `startsWith`: a raw
   * prefix makes any route that merely begins with another's name light up the
   * wrong nav item, and nothing catches it until two routes collide.
   */
  it("does not match a route that merely shares a prefix", () => {
    expect(isNavItemActive("/trees-archive", "/trees")).toBe(false)
    expect(isNavItemActive("/historian", "/history")).toBe(false)
  })

  it("treats the root as exact so it does not claim every path", () => {
    expect(isNavItemActive("/", "/")).toBe(true)
    expect(isNavItemActive("/history", "/")).toBe(false)
  })

  it("matches a tree's own route against the root section it belongs to", () => {
    expect(isNavItemActive("/trees/t_abc", "/trees")).toBe(true)
    expect(isNavItemActive("/trees", "/trees")).toBe(true)
  })
})
