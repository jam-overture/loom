import { describe, expect, it } from "vitest"

import { docsHref, docsOrder, docsSections } from "../nav"

import type { SearchIndex, SearchEntry } from "./model"
import { docsSectionOfPath, proseSectionsIn } from "./shards"

/**
 * Which file of words an address belongs to.
 *
 * The thing worth guarding here is not that these three functions do what they
 * say — it is that **the browser's idea of a docs address and the builder's are
 * the same idea**. The builder decides which file a body is written into; the
 * browser decides which file to ask for. If those two ever disagreed the
 * symptom would be a search box whose prose fetches 404 while every test in
 * this repository stayed green, because a path in a JSON file is just a string.
 *
 * So the first block below is held against `docsHref` and the site's real
 * pages rather than against examples somebody typed.
 */

const entry = (href: string): SearchEntry => ({
  href,
  title: href,
  context: "",
  kind: "page",
  summary: "",
  body: "",
  code: "",
  family: "",
})

const indexOf = (...hrefs: readonly string[]): SearchIndex => ({ entries: hrefs.map(entry) })

describe("the section an address is in", () => {
  it("is the one that built it, for every page on the site", () => {
    for (const section of docsSections) {
      for (const page of section.pages) {
        expect(docsSectionOfPath(docsHref(section.slug, page.slug)), page.slug).toBe(section.slug)
      }
    }

    expect(docsOrder.length).toBeGreaterThan(20)
  })

  it("survives the fragment a heading and an export carry", () => {
    expect(docsSectionOfPath("/docs/the-runtime/what-the-gate-decides#the-two-questions")).toBe(
      "the-runtime"
    )
    expect(docsSectionOfPath("/docs/api-reference/runtime#s-applyDelta")).toBe("api-reference")
  })

  /**
   * The addresses that have no section, which is what the browser meets when a
   * reader opens the box from somewhere that is not a docs page.
   *
   * Each of these would otherwise become a request for a file that does not
   * exist — `/docs/search-index/prose/undefined` being the one that would have
   * looked most like a bug and least like one.
   */
  it("is nothing where there is not one", () => {
    for (const path of ["/docs", "/docs/", "/", "", "/portal/trees", "#somewhere"]) {
      expect(docsSectionOfPath(path), path).toBeUndefined()
    }
  })
})

describe("the sections to ask for", () => {
  it("are the ones the table of contents mentions, in reading order, once each", () => {
    const sections = proseSectionsIn(
      indexOf(
        "/docs/getting-started/introduction",
        "/docs/getting-started/quickstart",
        "/docs/the-runtime/proposing-a-change",
        "/docs/getting-started/installation",
        "/docs/api-reference/runtime#s-applyDelta"
      )
    )

    expect(sections).toEqual(["getting-started", "the-runtime", "api-reference"])
  })

  /**
   * The list is read off the contents file rather than from `nav.ts`, so the
   * property that matters is that it really covers the site — a builder that
   * quietly stopped emitting a section's pages would otherwise mean a section
   * whose words are never asked for and whose sentences are never findable,
   * with nothing anywhere going red.
   */
  it("cover every section the site has, when read off the real table of contents", () => {
    const sections = proseSectionsIn(indexOf(...docsOrder.map((page) => page.href)))

    expect([...sections].sort()).toEqual([...docsSections.map((section) => section.slug)].sort())
  })

  it("ignore an address from another surface", () => {
    expect(proseSectionsIn(indexOf("/portal/trees", "/lessons/1"))).toEqual([])
  })
})
