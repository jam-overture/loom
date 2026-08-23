import { describe, expect, it } from "vitest"

import { apiEntries } from "../api/reference"
import { docsHref, docsOrder, writtenDocsSections } from "../nav"

import { buildSearchIndex } from "./build"
import { readPageHeadings } from "./headings"
import { parseSearchIndex } from "./model"

/**
 * The index, held against the site it claims to describe.
 *
 * One failure matters more than everything else here and it is the first test:
 * **a result that goes nowhere.** A search box that offers a reader a page and
 * then 404s them is worse than no search box, and nothing at build time would
 * notice, because a link in an index is just a string.
 *
 * So every href the index can offer is decomposed and checked against the
 * navigation and against the headings really on the page — which is the same
 * bargain `content.test.ts` strikes for the rail, applied to the other list of
 * links the site now holds.
 */

const index = buildSearchIndex()

const hrefs = new Set(docsOrder.map((entry) => entry.href))

const split = (href: string): { readonly path: string; readonly fragment?: string } => {
  const at = href.indexOf("#")

  return at === -1 ? { path: href } : { path: href.slice(0, at), fragment: href.slice(at + 1) }
}

describe("every link the search can offer", () => {
  it("points at a page the navigation lists", () => {
    for (const entry of index.entries) {
      expect(hrefs.has(split(entry.href).path), entry.href).toBe(true)
    }
  })

  it("points at a heading that is really on the page, where it names one", () => {
    const headingHrefs = index.entries.filter((entry) => entry.kind === "heading")

    expect(headingHrefs.length).toBeGreaterThan(20)

    const anchorsByPath = new Map(
      writtenDocsSections.flatMap((section) =>
        section.pages.map(
          (page) =>
            [
              docsHref(section.slug, page.slug),
              new Set(readPageHeadings(section.slug, page.slug).map((heading) => heading.anchor)),
            ] as const
        )
      )
    )

    for (const entry of headingHrefs) {
      const { path: pagePath, fragment: anchor } = split(entry.href)

      expect(anchorsByPath.get(pagePath)?.has(anchor ?? ""), entry.href).toBe(true)
    }
  })

  it("points at an export the reference really publishes, where it names one", () => {
    const published = new Set(
      apiEntries.flatMap((entry) => entry.groups.flatMap((group) => group.symbols.map((s) => s.name)))
    )

    const exports = index.entries.filter((entry) => entry.kind === "export")

    expect(exports.length).toBeGreaterThan(500)

    for (const entry of exports) {
      expect(published.has(entry.title), entry.href).toBe(true)
      expect(split(entry.href).fragment, entry.href).toBe(`s-${entry.title}`)
    }
  })
})

describe("what the index contains", () => {
  it("holds every page in the navigation, generated sections included", () => {
    const pages = index.entries.filter((entry) => entry.kind === "page")

    expect(pages.map((page) => page.href).sort()).toEqual([...hrefs].sort())
  })

  it("gives every entry something for a reader to read", () => {
    for (const entry of index.entries) {
      expect(entry.title.length, entry.href).toBeGreaterThan(0)
      expect(entry.context.length, entry.href).toBeGreaterThan(0)
    }
  })

  it("offers no two results for the same place", () => {
    const seen = index.entries.map((entry) => entry.href)

    expect(new Set(seen).size).toBe(seen.length)
  })

  it("survives the round trip it actually makes, which is through JSON", () => {
    expect(parseSearchIndex(JSON.parse(JSON.stringify(index)))).toEqual(index)
  })

  /**
   * Not a style rule — a bill. This ships to every reader who opens the box, so
   * the number is asserted rather than assumed, and a change that doubles it
   * has to be a change somebody decided to make.
   */
  it("stays small enough to send", () => {
    expect(JSON.stringify(index).length).toBeLessThan(150_000)
  })
})

describe("the index as it arrives in a browser", () => {
  it("refuses a body that is not one", () => {
    expect(() => parseSearchIndex("<!doctype html>")).toThrow(/search index/)
    expect(() => parseSearchIndex({})).toThrow(/search index/)
  })

  it("drops an entry it cannot read rather than passing it on", () => {
    const parsed = parseSearchIndex({ entries: [{ href: "/docs", title: "x" }] })

    expect(parsed.entries).toEqual([])
  })
})
