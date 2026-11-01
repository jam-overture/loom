import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { DYNAMIC, GOVERNED_ROUTES } from "./governed"
import { HOME } from "./site"

/**
 * The guarantee 0259 makes, held by something that can go red.
 *
 * `governed.ts` has the whole argument. The short of it is that these pages
 * are stored trees the portal governs, a prerendered page reads its row once
 * at build time, and until 1 November nothing on this surface said so — the
 * palette's `searchParams` read was holding it up by accident, in two places,
 * one of which is not in the page file.
 *
 * So this reads the route files themselves. A test that imported them would
 * be asserting that a constant this repository wrote equals itself; what
 * matters is the literal Next.js reads when it decides how to serve the
 * segment, and that is text in a particular file.
 */

/** The file Next.js resolves for a route of this site. */
const routeFile = (path: string): string =>
  path === HOME.path ? "page.tsx" : `${path.replace(/^\//, "")}/page.tsx`

const sourceOf = (path: string): string =>
  readFileSync(fileURLToPath(new URL(`../${routeFile(path)}`, import.meta.url)), "utf8")

describe("every page the portal governs", () => {
  /**
   * The declaration, as a literal in the file that is governed by it.
   *
   * `force-dynamic` rather than any other value: a route that merely reads
   * something request-scoped is served on demand as a *consequence*, which is
   * the arrangement that was in place until today and is the one that was a
   * single edit from gone.
   */
  it.each(GOVERNED_ROUTES.map((route) => [route.path] as const))(
    "declares that %s is served per request",
    (path) => {
      expect(sourceOf(path)).toContain(`export const dynamic = "${DYNAMIC}"`)
    }
  )

  /**
   * The reason, beside the declaration.
   *
   * A bare `force-dynamic` with nothing near it is the kind of line a later
   * run deletes while cleaning up a performance problem, which is exactly the
   * run this file exists to stop. It has to name the record that requires it.
   */
  it.each(GOVERNED_ROUTES.map((route) => [route.path] as const))(
    "says why, beside it, on %s",
    (path) => {
      expect(sourceOf(path)).toMatch(/0259/)
    }
  )

  /**
   * Both reads, named where somebody looking at one of them would see the
   * other.
   *
   * This is the case that would have saved the measurement: removing the
   * page's own `searchParams` read leaves the route `ƒ`, because
   * `generateMetadata` still awaits one. A run that tested the page alone
   * would conclude the palette was load-bearing in the component and move it
   * out of there with no symptom at all.
   */
  it.each(GOVERNED_ROUTES.map((route) => [route.path] as const))(
    "names generateMetadata as the other reader, on %s",
    (path) => {
      expect(sourceOf(path)).toContain("generateMetadata")
    }
  )
})

describe("the list this check sweeps", () => {
  /**
   * Every page of the site, rather than a list somebody maintains. A fourth
   * page is covered on the day it is added.
   */
  it("is every route of this site", () => {
    expect(GOVERNED_ROUTES.map((route) => route.path)).toEqual([
      "/",
      "/why-use-it",
      "/what-you-run",
    ])
  })

  it("names a file that exists for each of them", () => {
    for (const route of GOVERNED_ROUTES) {
      expect(() => sourceOf(route.path)).not.toThrow()
    }
  })
})
