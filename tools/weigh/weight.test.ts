import { describe, expect, it } from "vitest"

import { describeWeight } from "./describe.js"
import { styleTexts } from "./style.js"
import { weighDocument } from "./weight.js"

const asFlightPayload = (text: string): string =>
  JSON.stringify(text).slice(1, -1).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")

const LIBRARY = [
  "@media (prefers-reduced-motion: reduce) {",
  "  .loom-halo-trace { animation: none; }",
  "}",
  ".loom-trend-plot > .loom-stat { grid-auto-columns: minmax(3.5rem, 1fr); }",
].join("\n")

const DOCUMENT_THEME = ".loom-document-palette { --loom-fg-muted: #555 }"

const page = (copies: number): string =>
  [
    "<!doctype html><html><head>",
    `<style href="loom-primitives">${LIBRARY}</style>`,
    `<style>${DOCUMENT_THEME}</style>`,
    "</head><body><main>a page</main>",
    ...Array.from({ length: copies }, () => `<script>self.__next_f.push([1,"${asFlightPayload(LIBRARY)}"])</script>`),
    "</body></html>",
  ].join("")

describe("styleTexts", () => {
  it("reads every style element's content, in document order", () => {
    expect(styleTexts(page(0))).toEqual([LIBRARY, DOCUMENT_THEME])
  })

  it("is empty for a document with no styles", () => {
    expect(styleTexts("<p>nothing</p>")).toEqual([])
  })
})

describe("weighDocument", () => {
  it("reports the document's own size", () => {
    const document = page(3)

    expect(weighDocument(document).bytes).toBe(document.length)
  })

  it("puts the heaviest repetition first", () => {
    const weighed = weighDocument(page(3))

    expect(weighed.styles[0]?.repetition?.copies).toBe(4)
    expect(weighed.styles[1]?.repetition?.copies).toBe(1)
  })

  it("totals what the document would be lighter by if each style were carried once", () => {
    const weighed = weighDocument(page(3))

    expect(weighed.repeatedBytes).toBe(weighed.styles[0]?.repetition?.repeatedBytes)
    expect(weighed.repeatedBytes).toBe(3 * LIBRARY.length)
  })

  it("charges nothing when every style is carried once", () => {
    expect(weighDocument(page(0)).repeatedBytes).toBe(0)
  })
})

describe("describeWeight", () => {
  it("names the subject, the size and each style's repetition", () => {
    const printed = describeWeight("/why-use-it", weighDocument(page(3)))

    expect(printed).toContain("/why-use-it")
    expect(printed).toContain("carried 4 times")
    expect(printed).toContain("at least")
    expect(printed).toContain("bytes repeated")
    expect(printed).toContain("carried once")
  })

  it("says nothing about whether a number is acceptable", () => {
    const printed = describeWeight("/why-use-it", weighDocument(page(40)))

    for (const verdict of ["too", "should", "fail", "exceeds", "limit", "budget"]) {
      expect(printed).not.toContain(verdict)
    }
  })
})
