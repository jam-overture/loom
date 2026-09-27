import { describe, expect, it } from "vitest"

import { apiEntries } from "../api/reference"
import { docsHref, docsSections } from "../nav"

import { generatedPageWords } from "./generated"

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

  it("carries each door's own sentence, and the specifier it is about", () => {
    expect(front()).toContain("@jam-overture/loom/primitives")
    expect(front()).toContain("The starter library")
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
