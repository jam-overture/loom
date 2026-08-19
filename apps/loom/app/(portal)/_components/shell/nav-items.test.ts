import { existsSync } from "node:fs"
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
const GROUP = join(process.cwd(), "app", "(portal)")

/**
 * A route group contributes nothing to a URL, so `/portal/trees` is on disk at
 * `app/(portal)/portal/trees` — the group is where the file is, the segment is
 * what a reader types, and only the second half appears in an `href`.
 */
const routeExists = (href: string): boolean =>
  existsSync(join(GROUP, href.replace(/^\//, ""), "page.tsx"))

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
    expect(routeExists("/portal/trees")).toBe(true)
  })
})
