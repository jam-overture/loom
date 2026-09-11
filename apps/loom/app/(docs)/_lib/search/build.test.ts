import { gzipSync } from "node:zlib"

import { describe, expect, it } from "vitest"

import { apiEntries } from "../api/reference"
import { docsHref, docsOrder, writtenDocsSections } from "../nav"

import { buildSearchIndex, searchCode, searchIndexWithoutText, searchProse } from "./build"
import { readPageHeadings } from "./headings"
import { parseSearchIndex, withCode, withProse } from "./model"

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

    const prose = new Map(searchProse().bodies)
    const hasProse = (entry: { readonly href: string }): boolean => (prose.get(entry.href) ?? "") !== ""

    const pagesWithProse = index.entries.filter(
      (entry) => entry.kind === "page" && written.has(entry.href) && hasProse(entry)
    )

    const headingsWithProse = index.entries.filter((entry) => entry.kind === "heading" && hasProse(entry))

    expect(pagesWithProse.length).toBe(written.size)
    expect(headingsWithProse.length).toBeGreaterThan(40)
  })

  it("carries no words for a name, whose words are its signature", () => {
    const prose = new Map(searchProse().bodies)

    for (const entry of index.entries.filter((entry) => entry.kind === "export")) {
      expect(prose.get(entry.href), entry.href).toBeUndefined()
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
    for (const entry of searchIndexWithoutText().entries) {
      expect(entry.body, entry.href).toBe("")
      expect(entry.code, entry.href).toBe("")
    }
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
   * **Four pages arrived at once and hit it**, at 46.7 KB against the 48. So the
   * index was split rather than the number raised, and what is capped now is
   * each file separately — which is the only way the caps stay meaningful,
   * because the files grow at different speeds and for different reasons.
   *
   * **Indexing the code was the third file**, and it is the cheap one: 13.4 KB
   * raw and **3.9 KB compressed** over 39 entries, about a ninth of what the
   * words cost. The reason is worth recording, because it is the opposite of
   * what a glance at the site suggests — the blocks are the same handful of
   * imports and calls written out again and again, and repetition is what
   * compresses. The expensive half of a search index is prose, which is why the
   * prose is the half that had to be split off and why the code could simply be
   * added.
   */
  it("stays small enough to send", () => {
    const entries = JSON.stringify(searchIndexWithoutText())
    const prose = JSON.stringify(searchProse())
    const code = JSON.stringify(searchCode())

    // What a reader waits for: the table of contents and the runtime's surface.
    // It grows when a page is added or an export is published, which is slowly.
    expect(gzipSync(entries).length).toBeLessThan(20_000)
    expect(entries.length).toBeLessThan(200_000)

    // What nobody waits for. It grows every time anybody writes a paragraph, so
    // it has the room — and the day it runs out, it shards by section rather
    // than taking the number up again.
    expect(gzipSync(prose).length).toBeLessThan(60_000)
    expect(prose.length).toBeLessThan(200_000)

    // The blocks. Capped an order of magnitude below the words rather than
    // beside them, because a code file that ever approached the prose file
    // would mean something changed about how this site is written — a page
    // pasting a generated file in, most likely — and that is worth a red test
    // rather than a quiet doubling of what a reader downloads.
    expect(gzipSync(code).length).toBeLessThan(12_000)
    expect(code.length).toBeLessThan(60_000)
  })

  /**
   * The two halves are one index or they are nothing.
   *
   * The prose travels keyed by `href`, so an entry whose href the prose file
   * does not recognise silently keeps an empty body — which would be a search
   * box quietly missing its fourth band with every test still green. This is the
   * check that the seam holds: put the halves back together and you have what
   * `buildSearchIndex` said in the first place.
   */
  it("comes apart and goes back together without losing a word or a line", () => {
    expect(withCode(withProse(searchIndexWithoutText(), searchProse()), searchCode())).toEqual(index)
  })

  /**
   * And in either order, because they arrive in whichever order the network
   * hands them over.
   */
  it("does not mind which of the two lands first", () => {
    expect(withProse(withCode(searchIndexWithoutText(), searchCode()), searchProse())).toEqual(index)
  })

  it("keys the words and the code by an href that names exactly one entry", () => {
    const hrefs = searchProse().bodies.map(([href]) => href)
    const blocks = searchCode().blocks.map(([href]) => href)

    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(new Set(blocks).size).toBe(blocks.length)
  })

  /**
   * The claim the index is for, against the site rather than a fixture: the
   * page that shows a stranger how to install the runtime carries the command
   * in its code, and the reference pages carry none at all.
   */
  it("carries the code of a page that has blocks, and none for a name", () => {
    const withCodeOnIt = index.entries.filter((entry) => entry.code !== "")

    expect(withCodeOnIt.length).toBeGreaterThan(20)

    for (const entry of index.entries.filter((entry) => entry.kind === "export")) {
      expect(entry.code, entry.href).toBe("")
    }
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
