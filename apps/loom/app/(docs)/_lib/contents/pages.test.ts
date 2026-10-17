import { describe, expect, it } from "vitest"

import { docsHref, docsOrder, writtenDocsSections } from "../nav"
import { readPageHeadings } from "../search/headings"

import { HREFS_WITH_SECTIONS } from "./pages"

/**
 * The set a layout reserves a height from, held against the pages themselves.
 *
 * Two of the three tests below are the ones that matter, and neither is about
 * the list being correct today — a list derived from the files is correct today
 * by construction. They are about the two ways it could **become** wrong:
 *
 * 1. somebody writes a page whose headings all come from a component, which is
 *    the one page shape this derivation cannot see;
 * 2. somebody puts a generated address in it, which would put a permanent empty
 *    control above seventeen pages that have nothing to list.
 */
describe("the addresses that have a contents list", () => {
  it("holds every written page, because every written page has sections", () => {
    const written = writtenDocsSections.flatMap((section) =>
      section.pages.map((page) => docsHref(section.slug, page.slug))
    )

    expect([...HREFS_WITH_SECTIONS]).toEqual(written)
  })

  /**
   * The guard, and the reason this file exists.
   *
   * `HREFS_WITH_SECTIONS` reads the markdown, and the markdown is a **lower
   * bound** on what a page renders: two *Architecture* pages get most of their
   * headings from a component. A lower bound answers *are there any?* correctly
   * for every page that has at least one heading of its own, and gets it wrong
   * for a page that has none — which would be a page offered no contents
   * control while having thirteen places to land.
   *
   * No page on this site is that shape. This says so in a sentence naming the
   * page, so the next one fails here rather than on the page.
   */
  it("would notice a written page whose headings all come from a component", () => {
    const withoutOwnHeadings = writtenDocsSections.flatMap((section) =>
      section.pages.flatMap((page) =>
        readPageHeadings(section.slug, page.slug).length === 0
          ? [docsHref(section.slug, page.slug)]
          : []
      )
    )

    expect(withoutOwnHeadings).toEqual([])
  })

  it("holds no generated page, which has no heading anything can land on", () => {
    const generated = docsOrder
      .filter((entry) => entry.section.source === "generated")
      .map((entry) => entry.href)

    expect(generated.length).toBeGreaterThan(0)
    expect(HREFS_WITH_SECTIONS.filter((href) => generated.includes(href))).toEqual([])
  })

  it("holds addresses the site actually serves", () => {
    const served = docsOrder.map((entry) => entry.href)

    expect(HREFS_WITH_SECTIONS.filter((href) => !served.includes(href))).toEqual([])
  })
})
