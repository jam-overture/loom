import { describe, expect, it } from "vitest"

import {
  collapse,
  internalLinksIn,
  quotationsIn,
  servableHrefs,
  writtenPages,
} from "./cross-references"

/**
 * Every pointer one page aims at another, followed.
 *
 * `content.test.ts` next door holds the navigation against the pages on disk,
 * which catches a page nobody links to and a link to a page nobody wrote. It
 * cannot catch either of the failures here, because both are inside the prose:
 * an address in a sentence that no longer resolves, and a claim about what
 * another page *says* that the other page has stopped saying.
 *
 * The second is the one worth the file. A stale link is at least visible to the
 * reader who clicks it; a stale quotation is invisible to everybody, because
 * the page carrying it goes on reading beautifully and the page it misquotes
 * goes on being right.
 */

const pages = writtenPages()

describe("the addresses the pages link to", () => {
  it("finds some, so the check below is not passing on an empty list", () => {
    expect(pages.flatMap((page) => internalLinksIn(page.source)).length).toBeGreaterThanOrEqual(3)
  })

  it("point at something the site serves", () => {
    const servable = servableHrefs()

    for (const page of pages) {
      for (const href of internalLinksIn(page.source)) {
        const target = href.split("#")[0] ?? href

        expect(servable.has(target), `${page.id} links to ${href}`).toBe(true)
      }
    }
  })

  it("never point at the page they are on", () => {
    for (const page of pages) {
      for (const href of internalLinksIn(page.source)) {
        expect(href.split("#")[0], `${page.id} links to itself`).not.toBe(page.href)
      }
    }
  })
})

describe("the sentences one page quotes from another", () => {
  const quotations = pages.flatMap((page) => quotationsIn(page))

  it("finds some, so the check below is not passing on an empty list", () => {
    expect(quotations.length).toBeGreaterThanOrEqual(1)
  })

  /**
   * The check this file exists for. A page that rests an argument on another
   * page's words has to be quoting words that are there — and when the other
   * page is rewritten, the failure lands on the page making the claim rather
   * than on the reader who believed it.
   */
  it("are still in the page they say they came from", () => {
    const sourceOf = new Map(pages.map((page) => [page.href, page.source]))

    for (const quotation of quotations) {
      const source = sourceOf.get(quotation.source)

      expect(source, `${quotation.from} quotes ${quotation.source}, which is not a written page`)
        .toBeDefined()

      expect(
        source === undefined ? "" : collapse(source),
        `${quotation.from} quotes "${quotation.quoted}" from ${quotation.source}`
      ).toContain(quotation.quoted)
    }
  })

  /**
   * A mutation check written down rather than done by hand: the rule above has
   * to reject a sentence the other page does not contain, or it is decoration.
   */
  it("would notice a sentence the other page does not contain", () => {
    const source = pages.find((page) => page.href === "/docs/the-runtime/connecting-a-model")?.source

    expect(source).toBeDefined()
    expect(collapse(source ?? "")).not.toContain("must not walk into calibration as a perfect record")
  })
})
