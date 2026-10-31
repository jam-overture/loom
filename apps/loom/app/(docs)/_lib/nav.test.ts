import { describe, expect, it } from "vitest"

import {
  DOCS_LANDING_SLUG,
  docsEntryAt,
  docsEntryPoint,
  docsHref,
  docsLandingOf,
  docsNeighbours,
  docsOrder,
  docsPagesIn,
  docsSectionAt,
  docsSections,
  writtenDocsSections,
  type DocsSection,
} from "./nav"

describe("the navigation model", () => {
  it("gives every page a unique href", () => {
    const hrefs = docsOrder.map((entry) => entry.href)

    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it("lists no section without pages", () => {
    expect(docsSections.every((section) => section.pages.length > 0)).toBe(true)
  })

  it("keeps reading order the order the sections declare", () => {
    const first = docsSections[0]?.pages[0]

    expect(docsOrder[0]?.href).toBe(docsHref("getting-started", first?.slug ?? ""))
  })

  it("finds the entry behind an href", () => {
    const entry = docsEntryAt("/docs/getting-started/introduction")

    expect(entry?.page.title).toBe("Introduction")
    expect(entry?.section.title).toBe("Getting started")
  })

  it("knows nothing about an href it does not have", () => {
    expect(docsEntryAt("/docs/getting-started/nowhere")).toBeUndefined()
    expect(docsNeighbours("/docs/getting-started/nowhere")).toEqual({})
  })

  it("leaves the first page with no previous and the last with no next", () => {
    const first = docsOrder[0]
    const last = docsOrder[docsOrder.length - 1]

    expect(docsNeighbours(first?.href ?? "").previous).toBeUndefined()
    expect(docsNeighbours(last?.href ?? "").next).toBeUndefined()
  })

  it("walks forwards and backwards to the same pair", () => {
    const [, second] = docsOrder
    const here = second?.href ?? ""
    const { previous, next } = docsNeighbours(here)

    expect(previous?.href).toBe(docsOrder[0]?.href)
    expect(docsNeighbours(next?.href ?? "").previous?.href).toBe(here)
  })

  it("crosses a section boundary rather than stopping at it", () => {
    const boundary = docsOrder.findIndex(
      (entry, index) => index > 0 && entry.section !== docsOrder[index - 1]?.section
    )

    expect(boundary).toBeGreaterThan(0)
    expect(docsNeighbours(docsOrder[boundary - 1]?.href ?? "").next?.href).toBe(
      docsOrder[boundary]?.href
    )
  })

  /**
   * It is the first page *inside* the first section, which stopped being
   * `docsOrder[0]` the day every written section got a page of its own.
   *
   * The distinction is the one thing a stranger feels here. A section's own page
   * lists what is in the section; the page after it is the one with a tree on it
   * and an explanation of what Loom is. A reader arriving at the documentation
   * for the first time is owed the second, which is the address `/docs` has
   * pointed at all along.
   */
  it("enters at the first page inside the first section, not at its landing page", () => {
    const first = docsOrder[0]

    expect(first?.page.slug).toBe(DOCS_LANDING_SLUG)
    expect(docsEntryPoint()).not.toBe(first?.href)
    expect(docsEntryPoint()).toBe(docsOrder[1]?.href)
    expect(docsEntryAt(docsEntryPoint())?.page.slug).not.toBe(DOCS_LANDING_SLUG)
  })

  it("gives every page a summary that reads as a sentence", () => {
    for (const { page } of docsOrder) {
      expect(page.summary.length).toBeGreaterThan(20)
      expect(page.summary.endsWith(".")).toBe(true)
    }
  })
})

/**
 * A page that is its section.
 *
 * The API reference is the one section with one today, and what these hold is
 * the shape rather than that section: a landing page's address is the
 * section's, it is reached by the pager like any other page, and it is not one
 * of the pages the rail lists underneath the section's name.
 */
describe("a section's own page", () => {
  const sectionAt = (slug: string): DocsSection => {
    const section = docsSectionAt(slug)

    if (section === undefined) throw new Error(`loom: there is no ${slug} section`)

    return section
  }

  const reference = sectionAt("api-reference")

  it("is addressed as the section, with no segment of its own", () => {
    expect(docsHref("api-reference", DOCS_LANDING_SLUG)).toBe("/docs/api-reference")
    expect(docsHref("api-reference", "runtime")).toBe("/docs/api-reference/runtime")
  })

  it("is found at that address like any other page", () => {
    const entry = docsEntryAt("/docs/api-reference")

    expect(entry?.section.slug).toBe("api-reference")
    expect(entry?.page.slug).toBe(DOCS_LANDING_SLUG)
  })

  it("comes first in its section, so the pager reaches it before the doors", () => {
    const landing = docsOrder.findIndex((entry) => entry.href === "/docs/api-reference")
    const firstDoor = docsOrder.findIndex((entry) => entry.href === "/docs/api-reference/runtime")

    expect(landing).toBeGreaterThan(-1)
    expect(landing).toBeLessThan(firstDoor)
    expect(docsNeighbours("/docs/api-reference").next?.href).toBe("/docs/api-reference/runtime")
  })

  it("is not one of the pages listed under the section's name", () => {
    const inside = docsPagesIn(reference)

    expect(inside).toHaveLength(reference.pages.length - 1)
    expect(inside.some((page) => page.slug === DOCS_LANDING_SLUG)).toBe(false)
  })

  /**
   * **Every section has one now**, which is the change of 25 October. Until
   * then the reference was the only section with a page of its own and the four
   * written sections each had an address that served a 404.
   *
   * The two halves either side of it are what the rest of the site reads: a
   * section is asked for its landing page by `docsLandingOf`, and the pages
   * *inside* it never include that page — so the rail lists what is under the
   * section's name without listing the name twice.
   */
  it("is what every section is asked for, and is never one of the pages inside it", () => {
    expect(docsLandingOf(reference)?.title).toBe("API reference")

    for (const section of docsSections) {
      const landing = docsLandingOf(section)

      expect(landing, section.slug).toBeDefined()
      expect(landing?.title, section.slug).toBe(section.title)
      expect(docsPagesIn(section), section.slug).toHaveLength(section.pages.length - 1)
      expect(
        docsPagesIn(section).some((page) => page.slug === DOCS_LANDING_SLUG),
        section.slug
      ).toBe(false)
    }
  })

  /**
   * The written sections' landing pages are addressed the same way the
   * reference's is, and `docsSectionAt` is how anything finds the section a
   * page belongs to by name.
   */
  it("is addressed as the section on every written section too", () => {
    for (const section of writtenDocsSections) {
      expect(docsHref(section.slug, DOCS_LANDING_SLUG), section.slug).toBe(`/docs/${section.slug}`)
      expect(docsEntryAt(`/docs/${section.slug}`)?.page.slug, section.slug).toBe(DOCS_LANDING_SLUG)
      expect(docsSectionAt(section.slug), section.slug).toBe(section)
    }

    expect(docsSectionAt("nothing-is-called-this")).toBeUndefined()
  })

  it("counts the doors in its heading rather than spelling the number", () => {
    expect(docsLandingOf(reference)?.heading).toBe(`All ${docsPagesIn(reference).length} imports`)
  })
})
