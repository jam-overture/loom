import { describe, expect, it } from "vitest"

import { apiEntries } from "../api/reference"
import { docsHref, docsSections } from "../nav"

import {
  everyPageSummary,
  generatedPageWords,
  repeatedSummarySentence,
  summariesRepeatedIn,
  summaryAudit,
} from "./generated"

/**
 * The words the reference pages contribute to the search box.
 *
 * Two failures matter here and they pull in opposite directions. **A band that
 * is not read** is the one this file was written for: the reference grew five
 * bands of argued prose and a front door made of it, and every sentence was
 * invisible to the search box for three days. **The signatures coming in** is
 * the other, and it is worse: a thousand names and their doc comments in a
 * page's body would outrank the export a reader typed letter-for-letter, which
 * is the ranking the whole index is arranged around.
 *
 * So the sentences are asserted present by their own words, and the names are
 * asserted absent by every name the package publishes.
 */

const words = generatedPageWords()

const generatedPages = docsSections
  .filter((section) => section.source === "generated")
  .flatMap((section) => section.pages.map((page) => docsHref(section.slug, page.slug)))

const bodyOf = (href: string): string => words.get(href) ?? ""

describe("every page in a generated section", () => {
  it("has words, which is the whole of the point", () => {
    expect(generatedPages.length).toBeGreaterThan(10)

    for (const href of generatedPages) {
      expect(bodyOf(href).length, href).toBeGreaterThan(400)
    }
  })

  it("has words and nothing else — no tag, no attribute, no expression left in", () => {
    for (const href of generatedPages) {
      const body = bodyOf(href)

      expect(body, href).not.toContain("<")
      expect(body, href).not.toContain("className")
      expect(body, href).not.toContain("  ")
      expect(body.trim(), href).toBe(body)
    }
  })

  /**
   * The guard against the failure that would cost every reader of the site.
   *
   * `Group` marks itself `data-search="off"` and the walker honours it; this is
   * what says so from the outside, against the package's own list of names
   * rather than against a sample. A body that picked up the signatures would
   * still read like prose, still pass every other test here, and would quietly
   * put a reference page above the export a reader searched for by name.
   */
  it("carries no published name, because the names have an index of their own", () => {
    const published = apiEntries.flatMap((entry) =>
      entry.groups.flatMap((group) => group.symbols.map((symbol) => symbol.name))
    )

    /* Short names are words as well — `id`, `of` — and a substring search for
       them says nothing. The long ones are the ones only a signature list could
       have put in a sentence. */
    const distinctive = [...new Set(published)].filter((name) => name.length >= 8)

    expect(distinctive.length).toBeGreaterThan(300)

    for (const href of generatedPages) {
      const body = bodyOf(href)
      const found = distinctive.filter((name) => body.includes(name))

      expect(found, `${href} names ${found.join(", ")}`).toEqual([])
    }
  })
})

describe("the front door of the reference", () => {
  const front = () => bodyOf(docsHref("api-reference", ""))

  it("carries the paragraph a reader arrives asking for", () => {
    expect(front()).toContain("Loom is one package")
    expect(front()).toContain("which one you write decides what your program loads")
  })

  it("carries the argument only this page makes, which is the one nothing could find", () => {
    expect(front()).toContain("No import has everything behind it")
    expect(front()).toContain("share no name at all")
    expect(front()).toContain("it is almost certainly behind one you have not opened")
  })

  /**
   * **The specifier, and not the sentence under it.**
   *
   * This assertion used to read *carries each door's own sentence* and expect
   * *"The starter library"* in this body. It was wrong in the one way an
   * assertion about an index can be: the sentence it wanted here is the
   * `@jam-overture/loom-primitives` page's own summary, which the contents
   * file carries under that page and ranks above any body match. Holding it
   * here held **eighteen summaries in the index twice**, and the second copy
   * answers a query about one door with the page that lists all of them.
   *
   * What a reader types is the specifier, and that is what this body keeps.
   * The sentence is still on the screen; it is the search box that has stopped
   * being told it twice. `summariesRepeatedIn` below is the general form.
   */
  it("carries the specifier a reader types, and not the summary the door's own page already has", () => {
    /* The starter library, under the package it ships as rather than the
       subpath this workspace reaches it through — `_lib/packages.ts`. */
    expect(front()).toContain("@jam-overture/loom-primitives")
    expect(front()).not.toContain("The starter library")
  })

  it("carries no door's summary and no door's name count", () => {
    const doors = docsSections
      .filter((section) => section.slug === "api-reference")
      .flatMap((section) => section.pages.filter((page) => page.slug !== ""))

    expect(doors.length).toBeGreaterThan(15)

    for (const door of doors) expect(front(), door.slug).not.toContain(door.summary)

    /*
     * The counts: eighteen digits read off the package, so eighteen things
     * that move when another lane publishes a name. `600 names` is a label
     * beside a row rather than a query.
     *
     * Asserted as *no specifier is followed by a number*, which is the shape
     * of a row and nothing else on the page. The whole-package figures stay
     * indexed and should — *this package publishes 1,897 names in all* is a
     * sentence somebody wrote here, and the argument around it is the one
     * thing only this page says.
     */
    expect(front()).not.toMatch(/@jam-overture\/[\w./-]+\s+\d/)
  })
})

describe("a page about one import", () => {
  const react = () => bodyOf(docsHref("api-reference", "react"))

  it("carries what a reader has to install before the import will run", () => {
    expect(react()).toContain("the import itself fails")
  })

  it("carries where the door stands among the others", () => {
    expect(react()).toContain("The imports do not nest")
    expect(react()).toContain("names this package publishes")
  })

  it("carries its own opening paragraph, which used to live in the route", () => {
    expect(react()).toContain("Everything below is exported from that import")
  })

  it("does not carry the list of pages beside it, which is navigation", () => {
    /* Those page titles are in the index already, each under the page it names.
       A reference page that carried them too would answer a query about another
       page — which is what `data-search="off"` on that list is for. */
    expect(react()).toContain("Start with the prose")
    expect(react()).not.toContain("Rendering a tree")
  })
})

/**
 * The rule that notices the next instance, held against made-up pages.
 *
 * The site's own answer is **nothing**, which is what the last block here
 * asserts and also what makes it worthless on its own: a reader that always
 * returned an empty list would pass it. So the rule is exercised against
 * summaries and bodies written for the purpose, the way `plain.ts` is, and the
 * real site is asked the same question afterwards.
 */
describe("a summary the index would hold twice", () => {
  const bodies = (entries: readonly (readonly [string, string])[]) => new Map(entries)

  it("is found, and names the page it belongs to and the body that repeats it", () => {
    const { repeats } = summariesRepeatedIn(
      [{ href: "/docs/api-reference/signals", summary: "Reader signals, and the parser." }],
      bodies([["/docs/api-reference", "Every door on the site. Reader signals, and the parser. 610 names."]])
    )

    expect(repeats).toEqual([
      {
        page: "/docs/api-reference/signals",
        indexedUnder: "/docs/api-reference",
        summary: "Reader signals, and the parser.",
      },
    ])
  })

  it("is not found where a body merely writes about the same subject", () => {
    expect(
      summariesRepeatedIn(
        [{ href: "/docs/api-reference/signals", summary: "Reader signals, and the parser." }],
        bodies([["/docs/api-reference", "Reader signals have a door of their own, and a parser behind it."]])
      ).repeats
    ).toEqual([])
  })

  it("is found once per body, so a sentence in two bodies is two repeats", () => {
    const { repeats } = summariesRepeatedIn(
      [{ href: "/docs/a", summary: "One line." }],
      bodies([
        ["/docs/api-reference", "Before. One line. After."],
        ["/docs/api-reference/door", "One line."],
        ["/docs/api-reference/other", "Nothing of the sort."],
      ])
    )

    expect(repeats.map((repeat) => repeat.indexedUnder)).toEqual([
      "/docs/api-reference",
      "/docs/api-reference/door",
    ])
  })

  /**
   * A page with no summary is a page the contents file describes by title
   * alone, which `build.test.ts` holds against elsewhere. Here it matters for a
   * duller reason: `"".includes` is true of every string, so an empty summary
   * would report every body on the site as a repeat of nothing.
   */
  it("is not reported for a page with no summary at all", () => {
    expect(
      summariesRepeatedIn(
        [
          { href: "/docs/a", summary: "" },
          { href: "/docs/b", summary: "   " },
        ],
        bodies([["/docs/api-reference", "Any words at all."]])
      ).repeats
    ).toEqual([])
  })

  /**
   * **What was compared comes back with the answer, and off the same
   * arguments.**
   *
   * Three mutations are the reason this is asserted rather than assumed, and
   * all three were survivors of the shape this replaced: the comparison handed
   * an empty map while a `bodies: number` beside it still counted the real
   * ones, and either count replaced by the literal a test expected. A count is
   * a claim about a comparison; these are the comparison's own two sides.
   */
  it("says which pages and which bodies the answer is about", () => {
    const audit = summariesRepeatedIn(
      [
        { href: "/docs/a", summary: "One line." },
        { href: "/docs/b", summary: "Another." },
      ],
      bodies([
        ["/docs/api-reference", "Nothing of the sort."],
        ["/docs/api-reference/door", "Nor here."],
      ])
    )

    expect(audit.repeats).toEqual([])
    expect(audit.pages).toEqual(["/docs/a", "/docs/b"])
    expect(audit.bodies).toEqual(["/docs/api-reference", "/docs/api-reference/door"])
  })

  it("prints the body, the page and the one attribute that fixes it, in that order", () => {
    expect(
      repeatedSummarySentence({
        page: "/docs/api-reference/signals",
        indexedUnder: "/docs/api-reference",
        summary: "Reader signals, and the parser.",
      })
    ).toBe(
      'loom: /docs/api-reference prints the summary of /docs/api-reference/signals into its indexed words, so the search box holds that one sentence twice and answers it with the wrong page. Mark the region data-search="off": "Reader signals, and the parser."'
    )
  })
})

describe("the summaries this site's index holds", () => {
  const audit = summaryAudit()

  /**
   * **Both sides are real, and named, before the answer below is believed.**
   *
   * Asserted as membership rather than as a count, because a count is what a
   * mutation can fabricate: `pages: 51` passed a `toBeGreaterThan(50)` while
   * the comparison looked at nothing.
   */
  it("is asked of every page on the site and every body a generated page has", () => {
    expect(audit.pages).toContain("/docs/api-reference/signals")
    expect(audit.pages).toContain("/docs/getting-started/introduction")
    expect(audit.pages).toContain("/docs/architecture/decision-records")
    expect(audit.pages.length).toBe(everyPageSummary().length)

    expect(audit.bodies).toContain("/docs/api-reference")
    expect(audit.bodies).toContain("/docs/api-reference/signals")
    expect(audit.bodies).toContain("/docs/api-reference/cli")

    expect(everyPageSummary().filter(({ summary }) => summary.trim() === "")).toEqual([])
  })

  /**
   * The bodies are not merely named, they hold the words.
   *
   * A list of addresses says a map was handed over; it does not say the map
   * holds the sentences the reference pages really contribute. So a sentence
   * only the front door says is handed in as if it were some page's summary,
   * and the real bodies have to find it in the real place.
   */
  it("compares against the words the reference pages really contribute", () => {
    const { repeats } = summariesRepeatedIn(
      [{ href: "/docs/invented", summary: "Loom is one package" }],
      generatedPageWords()
    )

    expect(repeats.map((repeat) => repeat.indexedUnder)).toEqual(["/docs/api-reference"])
  })

  /**
   * **Eighteen before this shipped, and the eighteen were the doors.** The
   * front door printed each door's summary under its specifier, and the
   * contents file already carries every one of them under the page it is
   * about — so one sentence was in the index twice and the second copy
   * answered a query about one import with the page that lists all of them.
   *
   * 654 compressed bytes of a cap with 267 left on it, measured against `main`
   * at `d1c3db5`. The remedy is `data-search="off"` on the row's sentence and
   * its count, which is why both of those are now absent above.
   */
  it("holds no page's summary twice", () => {
    expect(audit.repeats.map(repeatedSummarySentence)).toEqual([])
  })
})
