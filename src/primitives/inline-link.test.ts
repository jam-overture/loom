import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { renderLoomTree } from "../render/render.js"
import { THEME_PROP_KEY } from "../render/theme.js"
import { STARTER_PALETTES } from "../theme/library.js"
import { createThemeRegistry } from "../theme/registry.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { bannerInlineBand } from "./compositions/banner-inline-band.js"
import { createStarterPrimitiveRegistry } from "./index.js"
import { libraryStylesheet, libraryStylesheetText, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * `loom.inline-link` — the link inside a sentence.
 *
 * Filed from the marketing lane on 4 October, after the inline link was built
 * for `/what-you-run`, photographed on all three palettes and taken out again.
 * The finding measured three things that stopped it and every one of them is a
 * property of `loom.link` rather than a mistake in it, so the assertions here
 * are mostly about **what this primitive refuses to set** — a colour, a size, a
 * weight, a line height, a block box. Each of those, set, is the finding's
 * defect back again.
 */

const registry = (() => {
  const built = createStarterPrimitiveRegistry()

  if (!built.ok) throw new Error("the starter registry did not build")

  return built.value
})()

const themes = createThemeRegistry()

const EDITORIAL = { palette: "editorial", fontPack: "editorial-serif", stylePreset: "comfortable" }
const BOLD = { palette: "bold", fontPack: "bold-sans", stylePreset: "airy-modern" }
const MINIMAL = { palette: "minimal", fontPack: "minimal-sans", stylePreset: "precise" }

const markupOf = (tree: LoomTree): string =>
  renderToStaticMarkup(renderLoomTree(tree, { resolver: registry, validator: registry, themes }).element)

const diagnosticsOf = (tree: LoomTree): readonly unknown[] =>
  renderLoomTree(tree, { resolver: registry, validator: registry, themes }).diagnostics

/**
 * The opening tag alone. Every one of these assertions is about what the
 * element does **not** carry, and the primitive emits the whole library
 * stylesheet beside itself — so reading the markup would be reading three
 * thousand lines of CSS for the word `display` and finding it.
 */
const openingTagOf = (markup: string): string => markup.slice(markup.indexOf("<a "), markup.indexOf(">", markup.indexOf("<a ")) + 1)

/** The link alone, so the assertion is about the element and not about a parent. */
const linkMarkup = (props: JsonObject, words = "read the changelog"): string => {
  const ids = sequentialIdFactory("inline")

  return markupOf(createTree(buildElement(ids, { type: "loom.inline-link", props, children: [buildText(ids, words)] }), ids))
}

/**
 * The link where it belongs: one phrase of a paragraph, with words either side.
 * Several of these assertions are only meaningful in a sentence, because the
 * whole claim is that the phrase takes the sentence's type and ink.
 */
const sentence = (theme: Record<string, string>, ids: IdFactory = sequentialIdFactory("sentence")): LoomTree =>
  createTree(
    buildElement(ids, {
      type: "loom.prose",
      props: { [THEME_PROP_KEY]: theme, size: "lead", tone: "muted" },
      children: [
        buildText(ids, "The rule every primitive is held to is "),
        buildElement(ids, {
          type: "loom.inline-link",
          props: { href: "/granularity" },
          children: [buildText(ids, "written down in one page")],
        }),
        buildText(ids, ", and nothing in the library may contradict it."),
      ],
    }),
    ids
  )

describe("loom.inline-link", () => {
  it("is an anchor carrying the destination it was given", () => {
    const markup = linkMarkup({ href: "/pricing" })

    expect(markup).toContain('<a href="/pricing"')
    expect(markup).toContain("read the changelog")
  })

  /**
   * **The finding's first defect, asserted as an absence.** `loom.link` draws
   * its underline as a background sized `0% 2px` and wipes it to `100%` on
   * hover, which is right in a nav bar where position says the word is a link.
   * A phrase in a paragraph has nothing saying so, so the rest state has to
   * carry the mark — and the rule, not the element, is where it lives, since a
   * paragraph has to be able to lend this phrase its ink.
   */
  it("underlines at rest rather than on hover, and does it in the sheet", () => {
    const markup = linkMarkup({ href: "/pricing" })

    expect(openingTagOf(markup)).toContain(`class="${LIBRARY_CLASS.inlineLink}"`)
    expect(openingTagOf(markup)).not.toContain(LIBRARY_CLASS.underline)

    const css = libraryStylesheetText()
    const rest = css.slice(css.indexOf(`.${LIBRARY_CLASS.inlineLink} {`))

    expect(rest).toContain("text-decoration-line: underline")
    expect(rest.slice(0, rest.indexOf("}"))).toContain("text-decoration-thickness: 1px")
    expect(css).toContain(`.${LIBRARY_CLASS.inlineLink}:hover, .${LIBRARY_CLASS.inlineLink}:focus-visible`)
  })

  /**
   * **The finding's second defect**, and the one that cannot be fixed with a
   * token. `accent` is `#0a0a0a` under `minimal` — the same hex as
   * `fg-default`, deliberately — so an accent phrase is invisible as a link on
   * the palette every visitor and every screenshot gets. The right colour is
   * not a slot; it is the colour of the words either side of it, and `inherit`
   * is the only thing that knows.
   */
  it("sets no colour of its own, on the element or in the sheet", () => {
    const markup = linkMarkup({ href: "/pricing" })

    expect(openingTagOf(markup)).not.toMatch(/style=/)
    expect(openingTagOf(markup)).not.toMatch(/#[0-9a-fA-F]{3,8}/)

    const css = libraryStylesheetText()
    const rule = css.slice(css.indexOf(`.${LIBRARY_CLASS.inlineLink} {`))

    expect(rule.slice(0, rule.indexOf("}"))).toContain("color: inherit")
    expect(rule.slice(0, rule.indexOf("}"))).not.toContain("--loom-accent")
  })

  /**
   * **The finding's third defect.** `loom.link` sets `display: inline-block`,
   * its own `font-size` and `line-height: 1.4` against `loom.prose`'s 1.6 — so
   * the phrase could not break mid-phrase and sat on a line a different height
   * from the ones above it. This primitive sets no style attribute at all,
   * which is the strongest form of the assertion: there is nothing on the
   * element for a paragraph to lose an argument with.
   */
  it("carries no inline style at all, so the paragraph wins every one", () => {
    const tag = openingTagOf(linkMarkup({ href: "/pricing" }))

    expect(tag).not.toContain("style=")

    for (const property of ["display", "font-size", "line-height", "font-weight", "font-family"]) {
      expect(tag, `the element states ${property}, which is a declaration no paragraph can win against`).not.toContain(property)
    }
  })

  it("keeps the phrase inside the paragraph, with the words either side of it", () => {
    const markup = markupOf(sentence(EDITORIAL))

    expect(markup).toMatch(/The rule every primitive is held to is <a href="\/granularity"/)
    expect(markup).toContain(", and nothing in the library may contradict it.")
    /** One paragraph, so the phrase did not break the sentence into three. */
    expect(markup.match(/<\/p>/g)).toHaveLength(1)
  })

  describe("under both starter palettes", () => {
    /**
     * The brief's bar, and the one that would have caught the defect the
     * finding describes if `loom.link` had ever been photographed in a
     * sentence: **a phrase renders identically under every palette**, because
     * nothing about it comes from a palette. The element's markup is the same
     * byte for byte; only the paragraph's own variables move.
     */
    it("renders the phrase identically, because none of it comes from a palette", () => {
      const anchorIn = (markup: string): string => {
        const start = markup.indexOf("<a ")

        return markup.slice(start, markup.indexOf("</a>", start) + 4)
      }

      const editorial = anchorIn(markupOf(sentence(EDITORIAL)))
      const bold = anchorIn(markupOf(sentence(BOLD)))
      const minimal = anchorIn(markupOf(sentence(MINIMAL)))

      expect(editorial).toBe(bold)
      expect(bold).toBe(minimal)
      expect(editorial).toContain("written down in one page")
    })

    /**
     * `minimal` is the palette named in the finding and the reason the colour
     * inherits: its `accent` and its `fg-default` are the same hex. Asserted
     * from the registry rather than typed, so the day a palette stops mirroring
     * them this test still says what it means.
     */
    it("is legible on the palette whose accent is its own foreground", () => {
      const minimalTheme = STARTER_PALETTES.find((palette) => palette.id === "minimal")

      expect(minimalTheme?.slots["accent"]).toBe(minimalTheme?.slots["fg-default"])
      expect(libraryStylesheetText()).toContain("text-decoration-thickness: 2px")
    })

    it("renders with nothing left unhonoured under either palette", () => {
      for (const theme of [EDITORIAL, BOLD]) {
        expect(diagnosticsOf(sentence(theme))).toEqual([])
      }
    })
  })

  describe("an outbound phrase", () => {
    it("opens in a new tab with the rel that has to accompany it", () => {
      const markup = linkMarkup({ href: "https://example.com/post", external: true })

      expect(markup).toContain('target="_blank"')
      expect(markup).toContain('rel="noreferrer noopener"')
    })

    /**
     * The mark is `aria-hidden` and so declares no `copy` — 0223's glyph rule,
     * and the reason a reviewer handed a diff of this page is not handed `↗` in
     * a list of removed words.
     */
    it("draws a mark a reader can see and a screen reader does not read", () => {
      const markup = linkMarkup({ href: "https://example.com/post", external: true })

      expect(markup).toContain('aria-hidden="true"')
      expect(markup).toContain("↗")
      expect(markup).toContain(LIBRARY_CLASS.inlineLinkOutward)
    })

    /**
     * The one declaration on the mark that is load-bearing rather than a layout
     * habit. `text-decoration` propagates from an ancestor and cannot be
     * cancelled on a descendant inline box, so an inline arrow is an arrow with
     * a line under it; only a block box starts a decoration context of its own.
     */
    it("gives the mark a decoration context of its own", () => {
      const css = libraryStylesheetText()
      const rule = css.slice(css.indexOf(`.${LIBRARY_CLASS.inlineLinkOutward} {`))

      expect(rule.slice(0, rule.indexOf("}"))).toContain("display: inline-block")
    })

    it("draws no mark on a link that stays on the site", () => {
      expect(linkMarkup({ href: "/pricing" })).not.toContain("↗")
      expect(linkMarkup({ href: "/pricing" })).not.toContain("target=")
    })
  })

  describe("what the schema refuses", () => {
    /**
     * `linkUrlSchema`, inherited rather than re-stated: a phrase in a paragraph
     * is the part of the tree a model writes most freely, and it reaches an
     * `href`.
     */
    it("refuses a scheme that is not a destination", () => {
      const ids = sequentialIdFactory("unsafe")
      const tree = createTree(
        buildElement(ids, {
          type: "loom.prose",
          children: [
            buildText(ids, "press "),
            buildElement(ids, {
              type: "loom.inline-link",
              props: { href: "javascript:alert(1)" },
              children: [buildText(ids, "here")],
            }),
          ],
        }),
        ids
      )

      const markup = markupOf(tree)

      expect(markup).not.toContain("javascript:")
      expect(diagnosticsOf(tree).length).toBeGreaterThan(0)
      /** Rendering is total: the sentence around the refused node still draws. */
      expect(markup).toContain("press")
    })

    it("takes an anchor on the page the reader is already on", () => {
      expect(linkMarkup({ href: "#pricing" })).toContain('href="#pricing"')
    })
  })

  describe("the band it was written for", () => {
    /**
     * `banner-inline` is the second design of the one part that had a single
     * one, and it is the first band in the catalogue whose destination is a
     * phrase rather than a region. The pair is what `compositions.test.ts`
     * checks structurally; this checks the thing a reader meets.
     */
    it("puts the strip's destination inside its sentence and fills no region", () => {
      const ids = sequentialIdFactory("band")
      const markup = markupOf(createTree(bannerInlineBand.build(ids), ids))

      expect(markup).toMatch(/Seat pricing changes on 1 November[\s\S]*<a href="#pricing"/)
      expect(markup).toContain("current price list")
      expect(markup).toContain("is held for a year from the day you start.")
      /** The canonical's button, which this design does not have. */
      expect(markup).not.toContain("loom.action")
      expect(bannerInlineBand.uses).toEqual(["loom.banner", "loom.inline-link"])
    })
  })

  /**
   * The portal's 3 October finding, closed. The only way to this library's CSS
   * as text was `libraryStylesheet().props.children` — reaching into an
   * element's props to get at a constant. The element is now the text's caller,
   * which is the half that matters: one copy of the rules, and no second export
   * that could come to disagree with the first.
   */
  describe("the stylesheet as text", () => {
    it("is the same rules the element carries", () => {
      const element = libraryStylesheet()
      const children = (element.props as { children?: unknown }).children

      expect(typeof libraryStylesheetText()).toBe("string")
      expect(children).toBe(libraryStylesheetText())
    })

    it("needs no React to be read", () => {
      const css = libraryStylesheetText()

      expect(css.length).toBeGreaterThan(1000)
      expect(css).not.toContain("[object Object]")
      expect(css).toContain(`.${LIBRARY_CLASS.inlineLink} {`)
    })
  })
})
