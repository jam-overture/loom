import { describe, expect, it } from "vitest"

import { siteQuestions } from "@/app/(marketing)/_lib/questions"
import {
  HOME,
  internalHref,
  PRODUCT_SURFACES,
  SITE_ROUTES,
  siteOrigin,
} from "@/app/(marketing)/_lib/site"

import { GET } from "./route"

/**
 * The map for something that arrived to read rather than to crawl.
 *
 * Everything asserted here is the same property the sitemap's tests assert and
 * for the same reason: **nothing in this file may hold a path, a title or an
 * answer of its own.** A hand-written summary of a site is wrong within a
 * fortnight and never says so, and a stale one read by an assistant is worse
 * than none — it is this site telling somebody, confidently, about a page that
 * is gone.
 */

const body = async (): Promise<string> => GET().text()

describe("the file a language model is pointed at", () => {
  it("is plain text, and says which text", async () => {
    expect(GET().headers.get("content-type")).toBe("text/plain; charset=utf-8")
  })

  it.each(SITE_ROUTES)("names $path with the description the page carries", async (route) => {
    const text = await body()

    expect(text).toContain(internalHref(siteOrigin(), route.path))
    expect(text).toContain(route.description)
  })

  /**
   * The same field that keeps the portal out of the sitemap and off the header's
   * menu keeps it out of here. A guarded surface named in this file is a door
   * an assistant would send somebody to.
   */
  it("points at every open surface and no guarded one", async () => {
    const text = await body()

    for (const surface of PRODUCT_SURFACES) {
      expect({ surface: surface.label, named: text.includes(`](${siteOrigin()}${surface.path})`) }).toEqual(
        { surface: surface.label, named: !surface.guarded }
      )
    }
  })

  /**
   * The questions are the only text on this site written to survive being
   * lifted away from the page, which is exactly what an assistant does to it.
   */
  it("carries every question and every answer, word for word", async () => {
    const text = await body()

    for (const entry of siteQuestions()) {
      expect(text).toContain(entry.question)
      expect(text).toContain(entry.answer)
    }
  })

  it("opens by saying what the product is, in the front door's own words", async () => {
    const text = await body()

    expect(text.startsWith("# Loom")).toBe(true)
    expect(text).toContain(HOME.description)
  })

  /**
   * The drift guard, and the only assertion here that fails on a *new* page
   * rather than a changed one: a route added to the site and missing from this
   * file would otherwise be invisible, because every other assertion above
   * iterates the routes this file was built from.
   */
  it("names as many pages as the site has", async () => {
    const text = await body()
    const listed = [...text.matchAll(/^- \[/gm)]

    expect(listed.length).toBe(
      SITE_ROUTES.length + PRODUCT_SURFACES.filter((surface) => !surface.guarded).length + 1
    )
  })
})
