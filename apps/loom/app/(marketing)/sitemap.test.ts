import { describe, expect, it } from "vitest"

import { PRODUCT_SURFACES, SITE_ROUTES, siteOrigin } from "./_lib/site"
import sitemap, { crawlableSurfaces } from "./sitemap"

/**
 * The two maps nobody looks at.
 *
 * Every other navigation guarantee in this lane is held by `chrome.test.ts`,
 * which can lean on the fact that a person would notice: a footer that lost a
 * group, or a menu that pointed at nothing, is wrong on a screen somebody
 * loads. These two files are wrong in silence — a page missing from the sitemap
 * is missing for as long as nobody thinks to read an XML file, and a
 * `robots.txt` that disallowed the whole site would be a catastrophe that no
 * page of this site would look any different for.
 *
 * So the assertions here are the ones a reader would otherwise have been the
 * instrument for.
 *
 * There is no `robots.txt` to assert beside it. One was written and this
 * application cannot serve it (filed 24 September), so the guarantee that would
 * have been the most valuable here — that what the sitemap declines to list is
 * exactly what robots disallows — is not assertable yet. What is left is the
 * half of it this file can hold on its own: that a surface with a door on it is
 * kept out, by the field rather than by a list.
 */

const origin = siteOrigin()

const urls = (): readonly string[] => sitemap().map((page) => page.url)

describe("the sitemap", () => {
  it("carries every page of this site, and each of them once", () => {
    const listed = urls()

    for (const route of SITE_ROUTES) {
      expect(listed).toContain(`${origin}${route.path === "/" ? "/" : route.path}`)
    }

    expect(new Set(listed).size).toBe(listed.length)
  })

  it("is exactly the site's pages and the surfaces without a door, and nothing else", () => {
    expect(urls()).toHaveLength(SITE_ROUTES.length + crawlableSurfaces.length)
  })

  it("points a crawler at every surface it can actually get into", () => {
    const listed = urls()

    for (const surface of PRODUCT_SURFACES.filter((each) => !each.guarded)) {
      expect(listed).toContain(`${origin}${surface.path}`)
    }
  })

  /**
   * The half of the pair that is worth more than the half above it. A sitemap
   * that lists a page which is not there costs a crawler one request; a sitemap
   * that sends every search engine to a sign-in page puts a door in front of
   * every reader who searches for this product by name.
   */
  it("leaves out every surface that has a door on it", () => {
    const listed = urls()

    for (const surface of PRODUCT_SURFACES.filter((each) => each.guarded)) {
      expect(listed).not.toContain(`${origin}${surface.path}`)
    }

    expect(PRODUCT_SURFACES.some((surface) => surface.guarded)).toBe(true)
  })

  it("gives every address absolute and origin-qualified, as a sitemap has to", () => {
    for (const url of urls()) {
      expect(url.startsWith(`${origin}/`)).toBe(true)
      expect(() => new URL(url)).not.toThrow()
    }
  })

  /**
   * The palette is a way of looking at a page rather than another page, and
   * `pageMetadata` already says so with a canonical tag pointing at the bare
   * address. A sitemap listing `?theme=bold` beside it would be this site
   * telling a search engine the opposite of what its own pages' canonicals say
   * — thirty addresses for ten pages, and the disagreement decided by whichever
   * the crawler read second.
   */
  it("names no palette, so it agrees with the canonical every page already sets", () => {
    for (const url of urls()) {
      expect(new URL(url).search).toBe("")
    }
  })

  /**
   * The decision written out at the head of `sitemap.ts`, pinned so that it is
   * reversed deliberately rather than by somebody adding "the missing fields".
   * Each of the three is a claim this deployment has no way to make truthfully.
   */
  it("claims nothing about a page it cannot know", () => {
    for (const page of sitemap()) {
      expect(page.lastModified).toBeUndefined()
      expect(page.changeFrequency).toBeUndefined()
      expect(page.priority).toBeUndefined()
      expect(Object.keys(page)).toEqual(["url"])
    }
  })
})
