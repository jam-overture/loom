import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { renderLoomTree } from "../render/render.js"
import { editorialPalette, minimalPalette } from "../theme/library.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { createStarterPrimitiveRegistry } from "./index.js"

/**
 * `loom.brand` — the deployment naming itself.
 *
 * Filed from the marketing lane on 28 September after the site's bar was built
 * as a spike and thrown away. Three limits were measured; this primitive is the
 * answer to two of them, and the third is the stylesheet scope change tested at
 * the foot of this file.
 */

const registry = () => {
  const built = createStarterPrimitiveRegistry()

  if (!built.ok) throw new Error("the starter registry did not build")

  return built.value
}

const MARK = "M5 5h14v6H5z M21 5h6v14h-6z M13 21h14v6H13z M5 13h6v14H5z"

const markupOf = (props: JsonObject): string => {
  const ids = sequentialIdFactory("brand")
  const tree = createTree(buildElement(ids, { type: "loom.brand", props }), ids)
  const rendered = renderLoomTree(tree, { resolver: registry(), validator: registry() })

  return renderToStaticMarkup(rendered.element)
}

describe("loom.brand", () => {
  /**
   * **The reason this primitive exists.** An image is opaque to the cascade, so
   * a mark delivered as a file cannot take the palette's ink — the spike
   * rendered a `#0a0a0a` glyph on `bold`'s `#1a1a1a` bar. Drawn inline, the
   * path inherits whatever the container is set in.
   */
  it("draws the mark inline so it can take the page's ink", () => {
    const markup = markupOf({ name: "Overture", mark: MARK })

    expect(markup).toContain("<svg")
    expect(markup).toContain(`d="${MARK}"`)
    expect(markup).toContain('fill="currentColor"')
    expect(markup).not.toContain("<img")
  })

  /**
   * The color is on the container and never on the path, so the word and the
   * mark cannot drift apart — there is only one value and the path inherits it.
   */
  it("sets one color, on the container, for both halves", () => {
    const markup = markupOf({ name: "Overture", mark: MARK })

    expect(markup).toContain("color:var(--loom-fg-default")
  })

  /**
   * `loom.logo` renders its image *instead of* its name, which is why there was
   * no mark-beside-wordmark shape in the library at all. This is that shape.
   */
  it("renders the mark beside the word rather than instead of it", () => {
    const markup = markupOf({ name: "Overture", mark: MARK })

    expect(markup).toContain("Overture")
    expect(markup).toContain("<svg")
  })

  /**
   * A mark and a word saying the same thing is one label to a sighted reader
   * and two to a screen reader. The word is the name; the mark is decoration.
   */
  it("hides the mark from a screen reader when the word is beside it", () => {
    expect(markupOf({ name: "Overture", mark: MARK })).toContain('aria-hidden="true"')
  })

  /** A site that drops the word still has to answer to one. */
  it("names itself when the word is not drawn", () => {
    const markup = markupOf({ name: "Overture", mark: MARK, showName: false, href: "https://example.com/" })

    expect(markup).toContain('aria-label="Overture"')
    expect(markup).not.toContain(">Overture<")
  })

  /** The word alone is a perfectly good brand, and the mark is optional. */
  it("is the word alone when no mark is given", () => {
    const markup = markupOf({ name: "Overture" })

    expect(markup).toContain("Overture")
    expect(markup).not.toContain("<svg")
  })

  describe("what a mark may be", () => {
    const refused = (props: JsonObject): boolean => {
      const ids = sequentialIdFactory("brand")
      const tree = createTree(buildElement(ids, { type: "loom.brand", props }), ids)

      return renderLoomTree(tree, { resolver: registry(), validator: registry() }).diagnostics.length > 0
    }

    /**
     * **The security half, and it is why a path beats a URL here.** Every other
     * address in this library reaches something — a `src` fetches, an
     * `iframe src` is a document with a script host in it. Geometry reaches
     * nothing: no origin to allowlist, no request, no sandbox. The schema
     * narrows `mark` to the characters path data is made of so that is provable
     * rather than argued.
     */
    it.each([
      ["a url", "url(https://evil.example/x.svg)"],
      ["a script", "M0 0 <script>"],
      ["an entity", "M0 0 &#x6a;"],
      ["a quote break", 'M0 0" onload="x'],
      ["a data uri", "data:image/svg+xml,PHN2Zz4="],
    ])("refuses %s", (_name, mark) => {
      expect(refused({ name: "Overture", mark })).toBe(true)
    })

    it("accepts the commands, numbers and separators a path is made of", () => {
      expect(refused({ name: "Overture", mark: "M5 5h14v6H5zM1.5-2 C0,0 1 1 2 2 A3 3 0 0 1 4 4Z" })).toBe(false)
    })

    /** A `viewBox` is four numbers, for the same reason. */
    it("refuses a viewBox that is not four numbers", () => {
      expect(refused({ name: "Overture", mark: MARK, viewBox: "0 0 32" })).toBe(true)
      expect(refused({ name: "Overture", mark: MARK, viewBox: "0 0 32 32" })).toBe(false)
    })
  })
})

/**
 * The third limit: `.loom-mark` greyed **every** image wherever it sat, which
 * is right for a wall of somebody else's marks and wrong anywhere else.
 *
 * Measured before the change and worth keeping: no production tree in the
 * repository passed `image` to `loom.logo`, so this greyed nothing anybody
 * rendered and scoping it changed no existing pixel.
 */
describe("a mark is dimmed on a wall and nowhere else", () => {
  const stylesheet = (): string => {
    const ids = sequentialIdFactory("wall")
    const tree = createTree(
      buildElement(ids, { type: "loom.logo", props: { name: "Northwind" } }),
      ids
    )

    return renderToStaticMarkup(
      renderLoomTree(tree, { resolver: registry(), validator: registry() }).element
    )
  }

  it("scopes the greying to the cloud rather than to the mark", () => {
    const sheet = stylesheet()

    expect(sheet).toContain(".loom-logo-cloud .loom-mark")
    expect(sheet).not.toMatch(/(^|[^ ])\.loom-mark \{/)
  })

  /** The palettes are imported so this file fails if either stops existing. */
  it("leaves the palettes it does not read alone", () => {
    expect(minimalPalette.slots["fg-default"]).toBeTruthy()
    expect(editorialPalette.slots["fg-default"]).toBeTruthy()
  })
})
