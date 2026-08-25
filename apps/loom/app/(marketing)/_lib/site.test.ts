import { existsSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  DEFAULT_THEME,
  DEMO,
  DOCS,
  internalHref,
  otherThemes,
  PORTAL,
  PRODUCT_SURFACES,
  readThemeName,
  siteOrigin,
  SITE_ROUTES,
  SITE_THEME_NAMES,
  SITE_THEMES,
  surfaceHref,
} from "./site"

describe("the palette a visitor arrives on", () => {
  it("is the house theme, which is the minimal one", () => {
    expect(DEFAULT_THEME).toBe("minimal")
    expect(SITE_THEMES[DEFAULT_THEME].selection).toEqual({
      palette: "minimal",
      fontPack: "minimal-sans",
      stylePreset: "precise",
    })
  })

  it("reads a known name from the query string", () => {
    for (const name of SITE_THEME_NAMES) expect(readThemeName(name)).toBe(name)
  })

  it("falls back to the default rather than failing", () => {
    expect(readThemeName(undefined)).toBe(DEFAULT_THEME)
    expect(readThemeName("")).toBe(DEFAULT_THEME)
    expect(readThemeName("chartreuse")).toBe(DEFAULT_THEME)
  })

  it("takes the first of a repeated parameter", () => {
    expect(readThemeName(["bold", "editorial"])).toBe("bold")
  })

  it("names a registered triple for each", () => {
    for (const theme of Object.values(SITE_THEMES)) {
      expect(Object.keys(theme.selection).sort()).toEqual(["fontPack", "palette", "stylePreset"])
      expect(theme.label.length).toBeGreaterThan(0)
    }
  })

  /**
   * The switcher's list, held to the palette list. Offering *every other*
   * palette is what stops a third one being registered and never reachable —
   * the failure the binary toggle this replaced would have had silently.
   */
  it("offers every palette but the one being worn", () => {
    for (const name of SITE_THEME_NAMES) {
      const others = otherThemes(name)

      expect(others).not.toContain(name)
      expect([...others, name].sort()).toEqual([...SITE_THEME_NAMES].sort())
    }
  })
})

describe("where the deployment thinks it is", () => {
  it("prefers a pinned origin, without its trailing slash", () => {
    expect(siteOrigin({ LOOM_SITE_ORIGIN: "https://loom.example/", VERCEL_URL: "x.vercel.app" })).toBe(
      "https://loom.example"
    )
  })

  it("uses the deployment's own host when nothing is pinned", () => {
    expect(siteOrigin({ VERCEL_URL: "loom-abc123.vercel.app" })).toBe(
      "https://loom-abc123.vercel.app"
    )
  })

  it("falls back to localhost, so `next dev` links to itself", () => {
    expect(siteOrigin({})).toBe("http://localhost:3000")
  })
})

describe("an internal link", () => {
  const origin = "https://loom.example"

  it("is absolute, because a tree cannot hold a relative one", () => {
    expect(internalHref(origin, "/how-it-works")).toBe("https://loom.example/how-it-works")
  })

  it("carries the palette forward, so navigating does not re-theme the site", () => {
    expect(internalHref(origin, "/how-it-works", "bold")).toBe(
      "https://loom.example/how-it-works?theme=bold"
    )
  })

  it("resolves the site root", () => {
    expect(internalHref(origin, "/")).toBe("https://loom.example/")
  })
})

describe("the routes", () => {
  it("are distinct, and each has somewhere to be linked from", () => {
    const paths = SITE_ROUTES.map((route) => route.path)

    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toContain("/")
  })

  it("each say what the page is, for the tab and the search result", () => {
    for (const route of SITE_ROUTES) {
      expect(route.title.length).toBeGreaterThan(0)
      expect(route.description.length).toBeGreaterThan(40)
      expect(route.label.length).toBeGreaterThan(0)
    }
  })
})

/**
 * The rest of the product, which this lane may point at and may not build.
 *
 * The assertions are about the boundary rather than about the destinations: a
 * surface is a path on this origin (0067), it is somebody else's front door,
 * and it is not a page this routine is responsible for.
 */
describe("the rest of the product", () => {
  it("is on this origin, because the four surfaces are one application", () => {
    for (const surface of PRODUCT_SURFACES) {
      expect(surface.path.startsWith("/")).toBe(true)
      expect(surface.path.startsWith("//")).toBe(false)
      expect(surfaceHref("https://loom.example", surface)).toBe(
        `https://loom.example${surface.path}`
      )
    }
  })

  it("is never one of this site's own pages", () => {
    const routes = SITE_ROUTES.map((route) => route.path)

    for (const surface of PRODUCT_SURFACES) expect(routes).not.toContain(surface.path)
  })

  it("names each in words a visitor who has never heard of Loom would use", () => {
    for (const surface of PRODUCT_SURFACES) {
      expect(surface.label.length).toBeGreaterThan(0)
      expect(surface.blurb.length).toBeGreaterThan(40)
    }
  })

  /**
   * The portal is behind a sign-in enforced in `proxy.ts` (0070), so a front
   * door that offered it as one more page to read would be making a promise the
   * deployment breaks. The flag is what the header and the band read to say so.
   */
  it("says which of them a visitor can reach without signing in", () => {
    expect(DOCS.guarded).toBe(false)
    expect(PORTAL.guarded).toBe(true)

    /**
     * The words moved out of the portal's blurb and into its cost on
     * 25 August — *costs you an account* rather than a clause at the end of a
     * sentence — so the check moved with them, and grew while it was moving.
     *
     * It held one surface in one direction: that the portal's blurb said
     * *sign* somewhere. That would pass a site where every card warned about
     * signing in, which is the failure worth catching now that the warning is
     * a short phrase in a fixed position rather than a clause someone has to
     * write deliberately. Both directions, across all four.
     */
    for (const surface of PRODUCT_SURFACES) {
      const read = `${surface.blurb} ${surface.cost}`.toLowerCase()

      expect(/\bsign|\baccount\b/.test(read)).toBe(surface.guarded)
    }
  })

  it("does not carry this site's palette into a surface that does not read it", () => {
    for (const surface of PRODUCT_SURFACES) {
      expect(surfaceHref("https://loom.example", surface)).not.toContain("theme=")
    }
  })

  /**
   * The demonstration is the one surface that is the product rather than a
   * description of it, so it is offered first — and it can only be offered at
   * all because it costs a visitor nothing.
   *
   * `Loom demo` moved it to a public `/demo` on 21 August and filed the three
   * facts that make it safe to put on the busiest page the project has: it
   * works with no model configured, a page view allocates nothing per visitor,
   * and the first click is one button. The flag below is the only one of the
   * three this lane can assert from here; the other two are that lane's, and
   * they are why the link exists.
   */
  it("leads with the one a visitor can try without an account", () => {
    expect(PRODUCT_SURFACES[0]).toBe(DEMO)
    expect(DEMO.guarded).toBe(false)
  })

  /**
   * Every surface is offered before any door, and the guarded one is last.
   *
   * The order is meant to ascend by what it asks of the reader, and the only
   * part of that a test can hold is the end of it: a visitor should have been
   * shown everywhere they can go before they are shown somewhere they cannot.
   */
  it("offers every open surface before the one behind a sign-in", () => {
    const guardedAt = PRODUCT_SURFACES.findIndex((surface) => surface.guarded)

    expect(guardedAt).toBeGreaterThanOrEqual(0)
    expect(PRODUCT_SURFACES.slice(0, guardedAt).every((surface) => !surface.guarded)).toBe(true)
    expect(PRODUCT_SURFACES.slice(guardedAt).every((surface) => surface.guarded)).toBe(true)
  })
})

/**
 * A surface this site points at is a page that exists on this deployment.
 *
 * This is the assertion the lane did not have, and the reason it is worth
 * having is on the record. The demonstration lived at `/portal/demo` and moved
 * to `/demo` on 21 August; the finding that reported the move discovered
 * something larger than a stale link, which was that **there was no link at
 * all** — so nothing here broke, and nothing here would have.
 *
 * A path is the whole of the contract between this lane and another one (0067):
 * a surface is somebody else's front door and this routine may point at it and
 * nothing more. That makes it exactly the kind of agreement that rots silently,
 * because the lane that moves a route is not the lane that links to it, and a
 * marketing page linking into a 404 is invisible to every test either lane has.
 *
 * It is checked against the route groups rather than by fetching anything: the
 * four surfaces are one Next application (0067), a route group contributes
 * nothing to a URL, so `/docs` is served by `(docs)/docs/page.tsx` and the file
 * being there is the same fact as the page answering.
 */
describe("every surface named here", () => {
  /** `app/`, from `app/(marketing)/_lib/`. The route groups are its children. */
  const app = fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, "")

  const routeGroups = (): readonly string[] =>
    readdirSync(app, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("("))
      .map((entry) => entry.name)

  it.each(PRODUCT_SURFACES)("$label has a page on this deployment at $path", (surface) => {
    const segment = surface.path.replace(/^\//, "")
    const serving = routeGroups().filter((group) =>
      existsSync(`${app}/${group}/${segment}/page.tsx`)
    )

    expect(serving).toHaveLength(1)
  })
})
