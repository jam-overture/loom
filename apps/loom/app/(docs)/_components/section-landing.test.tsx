import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { docsHref, docsPagesIn, writtenDocsSections } from "@/app/(docs)/_lib/nav"

import { PagesInThisSection, pagesInReadingOrder } from "./section-landing"

/**
 * The list a section's own page shows, held against the navigation it is read
 * from.
 *
 * There is one failure worth writing tests for here and it is not a rendering
 * one: a list of the site's own addresses that has quietly stopped agreeing with
 * the rail. It would look perfectly correct — titles, sentences, links that all
 * resolve — and send a reader through the section in an order nothing else on
 * the site uses. So every assertion below compares what was drawn with what
 * `nav.ts` says, rather than with anything typed here.
 */

const listOf = (slug: string) => render(<PagesInThisSection section={slug} />)

const anchorsIn = (container: HTMLElement): readonly { href: string; text: string }[] =>
  [...container.querySelectorAll("a")].map((anchor) => ({
    href: anchor.getAttribute("href") ?? "",
    text: anchor.textContent ?? "",
  }))

describe("the pages a section lists on its own page", () => {
  it("is being asked about every written section, so the checks below are not empty", () => {
    expect(writtenDocsSections.length).toBeGreaterThan(0)

    for (const section of writtenDocsSections) {
      expect(docsPagesIn(section).length, section.slug).toBeGreaterThan(0)
    }
  })

  it("lists exactly the section's pages, in reading order", () => {
    for (const section of writtenDocsSections) {
      const { container } = listOf(section.slug)
      const expected = docsPagesIn(section).map((page) => ({
        href: docsHref(section.slug, page.slug),
        text: page.title,
      }))

      expect(anchorsIn(container), section.slug).toEqual(expected)
    }
  })

  it("carries each page's own one-line summary", () => {
    for (const section of writtenDocsSections) {
      const { container } = listOf(section.slug)

      for (const page of docsPagesIn(section)) {
        expect(container.textContent, `${section.slug}/${page.slug}`).toContain(page.summary)
      }
    }
  })

  /**
   * The section's own page is not in its own list. It is the page the reader is
   * standing on, and a link to it would be the one link on this site that goes
   * nowhere a reader wanted.
   */
  it("leaves out the page it is on", () => {
    for (const section of writtenDocsSections) {
      const { container } = listOf(section.slug)

      expect(
        anchorsIn(container).some((anchor) => anchor.href === `/docs/${section.slug}`),
        section.slug
      ).toBe(false)
    }
  })

  /** Counted off the navigation, which is the whole reason it is not written. */
  it("says how many pages there are rather than spelling the number", () => {
    for (const section of writtenDocsSections) {
      const { container } = listOf(section.slug)

      expect(container.textContent, section.slug).toContain(
        pagesInReadingOrder(docsPagesIn(section).length)
      )
    }
  })

  it("says page in the singular, for the section that has one", () => {
    expect(pagesInReadingOrder(1)).toBe("1 page, in reading order.")
    expect(pagesInReadingOrder(7)).toBe("7 pages, in reading order.")
  })

  /**
   * A slug nothing matches fails while somebody is looking at the file rather
   * than serving an empty list, which is `pageMetadata`'s idiom for the same
   * mistake.
   */
  it("refuses a section the documentation does not have", () => {
    expect(() => listOf("nothing-is-called-this")).toThrow(/nothing-is-called-this/)
  })
})
