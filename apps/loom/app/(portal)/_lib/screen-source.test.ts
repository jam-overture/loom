import { describe, expect, it } from "vitest"

import { isForwarding, portalFile, portalScreens, screenSource } from "./screen-source"

describe("portalScreens", () => {
  const screens = portalScreens()

  it("finds a screen for every route the portal serves", () => {
    const routes = screens.map((screen) => screen.route)

    expect(routes).toContain("/portal")
    expect(routes).toContain("/portal/pages")
    expect(routes).toContain("/portal/pages/[treeId]")
    expect(routes).toContain("/portal/rules")
    expect(routes).toContain("/portal/sign-in")
  })

  it("keeps a dynamic segment as Next writes it, rather than resolving it", () => {
    expect(screens.map((screen) => screen.route)).toContain("/portal/trees/[[...rest]]")
  })

  it("returns each screen once, in route order", () => {
    const routes = screens.map((screen) => screen.route)

    expect(new Set(routes).size).toBe(routes.length)
    expect([...routes].sort((left, right) => left.localeCompare(right))).toEqual(routes)
  })

  it("points every screen at a file that reads", () => {
    for (const screen of screens) expect(screenSource(screen.file).length).toBeGreaterThan(0)
  })

  /**
   * A route group contributes nothing to a URL, so the `(portal)` segment must
   * not appear in a route. Getting this wrong would make every route in the list
   * a path no reader can type, and nothing else here would notice.
   */
  it("leaves the route group out of the route", () => {
    for (const screen of screens) expect(screen.route).not.toContain("(portal)")
  })
})

describe("screenSource", () => {
  it("strips block and line comments, so a warning cannot fail the thing it warns about", () => {
    const source = screenSource(portalFile("portal", "page.tsx"))

    expect(source).not.toContain("/*")
    expect(source).not.toContain("*/")
  })
})

describe("isForwarding", () => {
  it("calls a file that renders nothing a forward", () => {
    expect(isForwarding("const A = async () => { permanentRedirect('/portal/pages') }")).toBe(true)
  })

  it("does not call a screen a forward merely because it can redirect", () => {
    expect(isForwarding("if (actor !== null) redirect(to)\nreturn <SignInHero />")).toBe(false)
  })

  /**
   * The distinction above, asserted against the two real files rather than
   * against a string — this is the case a heuristic on `redirect(` got wrong,
   * and a fixture cannot go stale the way the source can.
   */
  it("separates the portal's 308s from the one page a signed-out visitor lands on", () => {
    const forward = screenSource(portalFile("portal", "trees", "[[...rest]]", "page.tsx"))
    const landing = screenSource(portalFile("portal", "sign-in", "page.tsx"))

    expect(isForwarding(forward)).toBe(true)
    expect(isForwarding(landing)).toBe(false)
    /* Guards the guard: the second file really does call `redirect`. */
    expect(landing).toContain("redirect(")
  })
})
