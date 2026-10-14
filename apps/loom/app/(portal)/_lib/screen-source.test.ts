import { describe, expect, it } from "vitest"

import { isForwarding, portalFile, portalScreens, screenSource } from "./screen-source"

describe("portalScreens", () => {
  const screens = portalScreens()

  it("finds a screen for every route the portal serves", () => {
    const routes = screens.map((screen) => screen.route)

    expect(routes).toContain("/portal")
    expect(routes).toContain("/portal/new")
    expect(routes).toContain("/portal/preview")
    expect(routes).toContain("/portal/preview/[project]")
    expect(routes).toContain("/portal/sign-in")
  })

  it("keeps a dynamic segment as Next writes it, rather than resolving it", () => {
    expect(screens.map((screen) => screen.route)).toContain(
      "/portal/preview/[project]/pages/[tree]"
    )
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
   * The distinction above, asserted against a real file rather than a string —
   * this is the case a heuristic on `redirect(` got wrong, and a fixture cannot
   * go stale the way the source can.
   *
   * **It read a 308 shim and the front door in turn, and now reads neither.**
   * Unit 0 deleted the four renamed-route shims on 13 October, which left the
   * front door as the group's only forward; the morning after, the maintainer
   * signed in and landed in the prototype, so the front door became a screen
   * that reads the store. The surviving half of the pair is the one that was
   * always the subtler claim: a page that calls `redirect` is still a screen.
   */
  it("does not call the sign-in page a forward, though it redirects", () => {
    const landing = screenSource(portalFile("portal", "sign-in", "page.tsx"))

    expect(isForwarding(landing)).toBe(false)
    /* Guards the guard: the file really does call `redirect`. */
    expect(landing).toContain("redirect(")
  })

  /**
   * The other half, as a fact about the group rather than about one file: every
   * page here is a screen. The helper stays because `every-screen.test.ts`
   * filters with it and unit 3 may well add a forward back; the day it does,
   * this says so rather than letting a page quietly skip the sweeps that ask
   * what a screen owes a reader.
   */
  it("finds no forwarding page in the group at all", () => {
    const forwards = portalScreens()
      .filter((screen) => isForwarding(screenSource(screen.file)))
      .map((screen) => screen.route)

    expect(forwards).toEqual([])
  })
})
