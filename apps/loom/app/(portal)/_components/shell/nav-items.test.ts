import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { NAV_GROUPS } from "./nav-items"

/**
 * A nav item is a claim that a route exists, and until this test that claim was
 * unchecked — three of four items pointed at 404s on a deployed portal. Reading
 * the filesystem is cruder than reading Next's route manifest, but the manifest
 * only exists after a build, and a test that needs a build to run is a test that
 * stops being run.
 */
const APP = join(process.cwd(), "app")

/**
 * A route group contributes nothing to a URL, so `/portal/pages` is on disk at
 * `app/(portal)/portal/pages` — the group is where the file is, the segment is
 * what a reader types, and only the second half appears in an `href`.
 *
 * Which group holds it is therefore not something an `href` can be read for, and
 * as of the demo's move to `/demo` the rail points at two of them. So the search
 * is over every group rather than the portal's own: a nav item that left this
 * surface is still a claim that a route exists, and checking it only where this
 * lane's files live would report a working link as broken and — worse, the next
 * time — a broken one as unverifiable.
 */
const GROUPS = (): readonly string[] =>
  readdirSync(APP, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("("))
    .map((entry) => join(APP, entry.name))

const routeExists = (href: string): boolean =>
  GROUPS().some((group) => existsSync(join(group, href.replace(/^\//, ""), "page.tsx")))

describe("NAV_GROUPS", () => {
  const items = NAV_GROUPS.flat()

  it("points every item at a route that exists", () => {
    const broken = items.filter((item) => !routeExists(item.href)).map((item) => item.href)

    expect(broken).toEqual([])
  })

  it("has no duplicate destinations", () => {
    const hrefs = items.map((item) => item.href)

    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  /** Guards the guard: a broken href must actually be detected as broken. */
  it("detects a route that does not exist", () => {
    expect(routeExists("/nowhere")).toBe(false)
    expect(routeExists("/portal/pages")).toBe(true)
  })

  /**
   * The reason the search widened, asserted rather than assumed. `/demo` is
   * served by `app/(demo)/demo/page.tsx` and nothing under `(portal)`, so a
   * check scoped to this lane's own group would call the rail's demo entry
   * broken — and the fix for that failing test is not to point the rail back at
   * a redirect.
   */
  it("finds a route served by another surface's route group", () => {
    expect(GROUPS().length).toBeGreaterThan(1)
    expect(routeExists("/demo")).toBe(true)
    expect(items.some((item) => item.href === "/demo")).toBe(true)
  })
})
