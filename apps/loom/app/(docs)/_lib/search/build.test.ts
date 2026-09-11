import { gzipSync } from "node:zlib"

import { describe, expect, it } from "vitest"

import { apiEntries } from "../api/reference"
import { docsHref, docsOrder, writtenDocsSections } from "../nav"

import { buildSearchIndex, buildSearchProse } from "./build"
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
   * The prose, in the index rather than only on the page.
   *
   * The counts are floors rather than exact numbers on purpose: another lane
   * writing a page must not turn this file red, and what these tests are for is
   * a build that silently stopped reading the pages at all — which is what a
   * renamed directory or a moved route group would look like.
   */
  it("carries the words under every written page and every heading on one", () => {
    const written = new Set(
      writtenDocsSections.flatMap((section) => section.pages.map((page) => docsHref(section.slug, page.slug)))
    )

    const prose = buildSearchProse()
    const hasProse = (entry: { readonly href: string }): boolean => (prose[entry.href] ?? "") !== ""

    const pagesWithProse = index.entries.filter(
      (entry) => entry.kind === "page" && written.has(entry.href) && hasProse(entry)
    )

    const headingsWithProse = index.entries.filter((entry) => entry.kind === "heading" && hasProse(entry))

    expect(pagesWithProse.length).toBe(written.size)
    expect(headingsWithProse.length).toBeGreaterThan(40)
  })

  it("carries no words for a name, whose words are its signature", () => {
    const prose = buildSearchProse()

    for (const entry of index.entries.filter((entry) => entry.kind === "export")) {
      expect(prose[entry.href], entry.href).toBeUndefined()
    }
  })

  /**
   * The half that ships first carries no words at all — that is the split.
   *
   * Asserted rather than assumed, because the failure it guards against is a
   * builder that quietly started inlining the prose again and put the whole
   * payload back in the first fetch, which nothing else here would notice.
   */
  it("keeps the words out of the half that ships first", () => {
    for (const entry of index.entries) expect(entry.body, entry.href).toBe("")
  })

  /**
   * Not a style rule — a bill. This ships to every reader who opens the box, so
   * the number is asserted rather than assumed, and a change that doubles it
   * has to be a change somebody decided to make.
   *
   * **Indexing the prose was that change**, and this is where its price is
   * recorded. Measured the day it landed, with the 13 written pages of the time:
   *
   * | | Uncompressed | gzip |
   * | --- | --- | --- |
   * | Titles, headings and 801 names | 143 KB | 12.1 KB |
   * | With the prose under each of them | 191 KB | 30.5 KB |
   *
   * The compressed figure is the one that leaves the server, which is why it is
   * asserted first: prose repeats itself and compresses about four times better
   * than a table of unique identifiers, so the honest cost of finding a sentence
   * is **18 KB, once, for a reader who opened the box** — not the 47 KB the raw
   * number suggests. Both are capped, because a payload that stopped
   * compressing would be a change worth noticing too.
   *
   * The headroom is deliberate and finite: five more pages fit under it, fifty
   * do not, and the run that hits it should split the index rather than raise
   * the number.
   *
   * **Five more pages landed, and the number was raised anyway — read this
   * before doing it again.** On 11 September the written pages went from 13 to
   * 18 and the uncompressed figure reached 246,246 against a 240,000 cap. The
   * compressed one, which is the bill, was 44,620 of 48,000.
   *
   * Only the uncompressed cap moved, to 260,000, and only because of what the
   * two numbers say together. That cap's stated job is to notice **a payload
   * that stopped compressing**; the ratio here is 5.5x, better than the 4x this
   * comment records as normal, so it fired for growth rather than for the
   * regression it watches for. The cap that measures what leaves the server was
   * not touched and must not be.
   *
   * **The split happened on 11 September, one page later.** The raise bought
   * exactly what it was predicted to: the nineteenth page took gzip to 47,501
   * of 48,000, which left 499 bytes and no honest number to raise.
   *
   * So the index is two files now, and this is what that bought — measured the
   * day it landed, with 19 written pages:
   *
   * | | Uncompressed | gzip |
   * | --- | --- | --- |
   * | Titles, headings and names — the first fetch | 170 KB | **15.6 KB** |
   * | The words under them — the second | 102 KB | 33.8 KB |
   *
   * The number that matters went from 47.5 KB to 15.6 KB, because the two
   * halves are wanted at different moments: headings answer a reader who has
   * typed two letters, and sentences are only wanted once they have typed
   * enough to be looking for one. Both are still capped, and the first is
   * capped tightly, because it is the one every reader who opens the box pays
   * for.
   */
  it("stays small enough to send", () => {
    expect(gzipSync(JSON.stringify(index)).length).toBeLessThan(24_000)
    expect(JSON.stringify(index).length).toBeLessThan(220_000)

    const prose = buildSearchProse()

    expect(gzipSync(JSON.stringify(prose)).length).toBeLessThan(48_000)
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
