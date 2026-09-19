import { gzipSync } from "node:zlib"

import { describe, expect, it } from "vitest"

import { apiSlugFor } from "../api/model"
import { apiEntries } from "../api/reference"
import { docsHref, docsOrder, writtenDocsSections } from "../nav"

import { buildSearchIndex, searchCode, searchContents, searchNames, searchProse } from "./build"
import { readPageHeadings } from "./headings"
import { namesToEntries, parseSearchIndex, parseSearchNames, withCode, withNames, withProse } from "./model"

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

/**
 * The first file as a browser really receives it: serialised, parsed, and with
 * the fields it left out filled back in.
 *
 * The two reassembly tests below go through here rather than through
 * `searchIndexWithoutText` directly, because the thing they are checking is a
 * seam a *network* sits in the middle of. Comparing the builder's own object to
 * the builder's own object would have gone on passing on the day the file
 * stopped carrying a field.
 */
const arrived = () => parseSearchIndex(JSON.parse(JSON.stringify(searchContents())))

/** The names file the same way: serialised, sent, parsed. */
const arrivedNames = () => parseSearchNames(JSON.parse(JSON.stringify(searchNames())))

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
    for (const entry of searchContents().entries) {
      expect(entry.body, entry.href).toBeUndefined()
      expect(entry.code, entry.href).toBeUndefined()
    }
  })

  /**
   * And says nothing where there is nothing to say.
   *
   * The three text fields are left out rather than emptied, which is worth a
   * test of its own because it is the only thing standing between this file and
   * the 38 KB of `""` it used to carry. A builder that went back to spreading
   * the whole entry would pass every other test here.
   */
  it("writes down no field that would arrive empty", () => {
    const written = JSON.stringify(searchContents())

    expect(written).not.toContain('"body"')
    expect(written).not.toContain('"code"')
    expect(written).not.toContain('"summary":""')
  })

  /**
   * Not a style rule — a bill. This ships to every reader who opens the box, so
   * the number is asserted rather than assumed, and a change that doubles it
   * has to be a change somebody decided to make.
   *
   * **Indexing the prose was the first such change**, and the file has been
   * split twice since, both times for the same reason and along the same kind
   * of line: *these two things grow at different speeds, for different reasons,
   * and one number over both is a number that tells nobody which.*
   *
   * | | Uncompressed | gzip | grows when |
   * | --- | --- | --- | --- |
   * | Contents — 206 pages and headings | 38.8 KB | **7.4 KB** | somebody writes a page here |
   * | Names — 1,067 published exports | 20.2 KB | 6.1 KB | any lane exports something |
   * | Prose | 168.6 KB | 53.6 KB | anybody writes a paragraph |
   * | Code | 22.3 KB | 6.2 KB | anybody adds a block |
   *
   * **Only the first row is waited for.** That is what every one of these
   * numbers is ultimately about, and it is why they are four caps rather than
   * one: a reader who opens the box and types waits for 7.4 KB, and the other
   * three land underneath the results as they arrive.
   *
   * ### Why the names had to leave
   *
   * They were in the first file until 19 September, and they were **78% of it
   * raw, 60% of it compressed**. So the payload a reader sat in front of grew every time any lane in
   * this repository exported a function — which this surface does not do, does
   * not decide, and cannot see coming. It had reached **19,281 bytes against a
   * 20,000-byte cap: 719 bytes of headroom, about sixty more exports for the
   * whole repository**, and two lanes had already filed it. The framework lane
   * raised the raw ceiling from outside this lane in September to keep
   * `pnpm verify` green for four surfaces, and said in the finding that the
   * compressed cap was the one that would fire next. It was.
   *
   * The remedy was written in this comment long before it was needed — *the run
   * that hits it should split the index rather than raise the number* — and
   * nothing about it is new except which line to split along.
   *
   * ### And why the names file is small
   *
   * 1,067 names cost 20 KB here and cost 138 KB in the file they left, because
   * what is written down is **a name and not an address**. An export's address
   * is its entry point and its own name put through two functions; those two
   * functions are the ones the reference pages use, they run in a browser, and
   * `namesToEntries` rebuilds every address on arrival. The 118 KB that went
   * away was `/docs/api-reference/runtime#s-` written out a thousand times.
   *
   * ### Which cap is whose
   *
   * The **contents** cap is this lane's in both directions: it moves when this
   * surface writes a page, and this surface is the one that would raise it.
   *
   * The **names** cap is this lane's number about somebody else's growth, and
   * that is the shape three findings in one day called out as the problem. So
   * it is two numbers rather than one. The per-name figure is the one this lane
   * can defend and the one a regression would show up in — a summary creeping
   * back in, an anchor scheme getting longer — and it does not move when the
   * runtime publishes more. The total is a **shard trigger and nothing else**:
   * when it fires, this file is already grouped by entry point and the browser
   * already knows which entry point a reader is looking at, so the answer is to
   * serve them per entry point rather than to take the number up again.
   */
  it("stays small enough to send", () => {
    const contents = JSON.stringify(searchContents())
    const names = JSON.stringify(searchNames())
    const prose = JSON.stringify(searchProse())
    const code = JSON.stringify(searchCode())

    // What a reader waits for, and now the only thing they wait for: this
    // site's own pages and the headings on them. It grows when somebody writes
    // a page here, which is this lane, slowly, and visibly.
    expect(gzipSync(contents).length).toBeLessThan(12_000)
    expect(contents.length).toBeLessThan(60_000)

    // The runtime's surface. Nobody waits for it, and the count is nobody's
    // here to hold down — see the comment above for why this is two numbers.
    expect(names.length / namesToEntries(searchNames()).length).toBeLessThan(24)
    expect(gzipSync(names).length).toBeLessThan(12_000)
    expect(names.length).toBeLessThan(40_000)

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
   * The split, as the property it was made for.
   *
   * Everything above is a number, and a number can be satisfied by a smaller
   * site as easily as by a correct split. This is the claim underneath them:
   * **the file a reader waits for contains nothing that another lane's work can
   * grow.** A builder that quietly put the names back would pass every cap here
   * for months and fail this on the first run.
   */
  it("keeps the runtime's surface out of the file a reader waits for", () => {
    for (const entry of searchContents().entries) {
      expect(entry.kind, entry.href).not.toBe("export")
    }

    expect(searchContents().entries.length).toBeGreaterThan(100)
  })

  /**
   * And the names file writes down no address at all.
   *
   * The 118 KB this saves is the whole argument for the shape, so it is worth a
   * test rather than a comment: a run that "simplified" this file back into a
   * list of entries would take the payload straight back up, and every other
   * test here would still pass.
   */
  it("writes down names rather than addresses", () => {
    expect(JSON.stringify(searchNames())).not.toContain("/docs/api-reference/")
  })

  /**
   * The addresses it does not write down are still the right ones.
   *
   * This is the failure the whole file is built to prevent, arriving by a new
   * route: the browser now *computes* every export result's href, so an anchor
   * scheme that changed on the reference pages and not here would be a search
   * box where a thousand results 404. Held against the reference itself rather
   * than against the builder's own output.
   */
  it("rebuilds an address a reference page really serves", () => {
    const published = new Set(
      apiEntries.flatMap((entry) =>
        entry.groups.flatMap((group) =>
          group.symbols.map((symbol) => `/docs/api-reference/${apiSlugFor(entry.specifier)}#s-${symbol.name}`)
        )
      )
    )

    const rebuilt = namesToEntries(arrivedNames())

    expect(rebuilt.length).toBe(published.size)

    for (const entry of rebuilt) {
      expect(published.has(entry.href), entry.href).toBe(true)
    }
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
    expect(withCode(withProse(withNames(arrived(), arrivedNames()), searchProse()), searchCode())).toEqual(
      index
    )
  })

  /**
   * And in any order, because they arrive in whichever order the network hands
   * them over.
   *
   * The names last is the interesting one and the reason this is not just
   * symmetry: the other two fold text **onto** entries, so folding them before
   * the rows they belong to exist is exactly the ordering that could quietly
   * drop a band. It cannot here — a published name has neither prose nor code —
   * and that is a claim worth holding rather than a thing to remember.
   */
  it("does not mind which of the four lands first", () => {
    expect(withNames(withProse(withCode(arrived(), searchCode()), searchProse()), arrivedNames())).toEqual(
      index
    )
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
