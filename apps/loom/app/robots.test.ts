import { describe, expect, it } from "vitest"

import { PRODUCT_SURFACES, siteOrigin } from "@/app/(marketing)/_lib/site"
import { crawlableSurfaces } from "@/app/(marketing)/sitemap"

import robots, { disallowedPaths } from "./robots"

/**
 * The guarantee `(marketing)/sitemap.test.ts` named and could not hold.
 *
 * Its comment says it plainly: the most valuable assertion about these two maps
 * is *that what the sitemap declines to list is exactly what robots disallows*,
 * and there was no `robots.txt` to assert it against. There is now, and the
 * two halves are derived from one field, so the pair either agrees or fails
 * here.
 *
 * What this file deliberately does **not** claim is that any of it is served.
 * Eleven assertions of exactly this kind passed against a `robots.ts` that the
 * build never read (0190). `pnpm prerender:check` is what holds that, and these
 * are the assertions that are worth making once it does.
 */

describe("robots", () => {
  it("keeps crawlers off exactly the surfaces the sitemap declines to list", () => {
    const listed = crawlableSurfaces.map((surface) => surface.path)

    expect([...disallowedPaths].sort()).toEqual(
      PRODUCT_SURFACES.filter((surface) => !listed.includes(surface.path))
        .map((surface) => surface.path)
        .sort()
    )

    expect(disallowedPaths.length).toBeGreaterThan(0)
  })

  it("names every door by the field rather than by a list", () => {
    for (const surface of PRODUCT_SURFACES) {
      expect(disallowedPaths.includes(surface.path)).toBe(surface.guarded)
    }
  })

  it("points at the sitemap at the same origin the sitemap builds its own links from", () => {
    expect(robots().sitemap).toBe(`${siteOrigin()}/sitemap.xml`)
  })

  it("lets everything else through, which is the whole of what a marketing site wants", () => {
    const rules = robots().rules

    expect(Array.isArray(rules)).toBe(false)
    expect(rules).toMatchObject({ userAgent: "*", allow: "/" })
  })
})

/**
 * Which deployments get crawled at all, approved by the maintainer on
 * 27 September.
 *
 * `isPublicDeployment` is asserted on its own in
 * `(marketing)/_lib/crawling.test.ts`; what this holds is the thing that file
 * cannot — **that the file Next actually serves changes with it**, and changes
 * the way round that is safe. A preview is told to go away and is handed no
 * sitemap, because pointing a crawler that has just been refused at a map of
 * where to go is a contradiction it resolves in whichever order it read them.
 */
describe("robots, on a deployment that is not for finding", () => {
  const withEnv = <T,>(value: string | undefined, read: () => T): T => {
    const before = process.env["VERCEL_ENV"]

    if (value === undefined) delete process.env["VERCEL_ENV"]
    else process.env["VERCEL_ENV"] = value

    try {
      return read()
    } finally {
      if (before === undefined) delete process.env["VERCEL_ENV"]
      else process.env["VERCEL_ENV"] = before
    }
  }

  it("keeps a preview out of the index entirely", () => {
    const served = withEnv("preview", robots)

    expect(served.rules).toEqual({ userAgent: "*", disallow: "/" })
  })

  it("hands a preview no sitemap to follow", () => {
    expect(withEnv("preview", robots).sitemap).toBeUndefined()
  })

  it("crawls production as it always did", () => {
    const served = withEnv("production", robots)

    expect(served.rules).toEqual({ userAgent: "*", allow: "/", disallow: [...disallowedPaths] })
    expect(served.sitemap).toBeDefined()
  })

  /**
   * The negative case this rule exists to get right: a self-hosted Loom site
   * has no `VERCEL_ENV` and keeps exactly the behaviour it had before.
   */
  it("leaves a deployment Vercel says nothing about alone", () => {
    expect(withEnv(undefined, robots).sitemap).toBeDefined()
  })
})
