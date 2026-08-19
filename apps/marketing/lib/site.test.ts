import { describe, expect, it } from "vitest"

import {
  DEFAULT_THEME,
  internalHref,
  otherTheme,
  readThemeName,
  siteOrigin,
  SITE_ROUTES,
  SITE_THEMES,
} from "./site"

describe("the palette a visitor arrives on", () => {
  it("reads a known name from the query string", () => {
    expect(readThemeName("bold")).toBe("bold")
    expect(readThemeName("editorial")).toBe("editorial")
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
    for (const selection of Object.values(SITE_THEMES)) {
      expect(Object.keys(selection).sort()).toEqual(["fontPack", "palette", "stylePreset"])
    }
  })

  it("has an other one, both ways", () => {
    expect(otherTheme("editorial")).toBe("bold")
    expect(otherTheme("bold")).toBe("editorial")
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
