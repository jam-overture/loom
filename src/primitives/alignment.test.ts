import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { renderLoomTree } from "../render/render.js"
import { describeRegistryError, type PrimitiveRegistry } from "../sdk/registry.js"
import { createThemeRegistry } from "../theme/registry.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { STARTER_COMPOSITIONS } from "./compositions/index.js"
import { createStarterPrimitiveRegistry } from "./index.js"

/**
 * Where the words in a band end up, which is the one question in this library
 * that no assertion could answer until this file existed.
 *
 * `Loom marketing` filed it twice on 29 September and named the reason it is
 * hard: a `text-align` is never *wrong* the way a missing import or an
 * overflowing table is wrong. Both values are valid, both render, both
 * validate, both measure clean. 3,254 tests passed over a front door whose
 * largest words were ranged left under a declaration that said `center`, and
 * they were right to — nothing was broken, two primitives simply disagreed.
 *
 * So the assertions here are not *this heading is centred*. They are the
 * invariant [0207](../../decisions/0207-a-primitive-that-arranges-only-glyphs-inherits-its-alignment.md)
 * states, swept over the whole library: **a primitive states a text alignment
 * exactly when it arranged boxes on the inline axis.** A hundredth primitive
 * that hardcodes `text-align: start` fails a test that names the rule, rather
 * than shipping and waiting for a camera.
 */

const registryOf = (): PrimitiveRegistry => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
}

const registry = registryOf()
const themes = createThemeRegistry()

const EDITORIAL = { palette: "editorial", fontPack: "editorial-serif", stylePreset: "comfortable" }
const BOLD = { palette: "bold", fontPack: "bold-sans", stylePreset: "airy-modern" }

/** Both starter palettes, because a report is only ever read next to both. */
const PALETTES = [
  ["editorial", EDITORIAL],
  ["bold", BOLD],
] as const

const pageOf = (theme: Record<string, string>, bands: readonly LoomNode[], ids: IdFactory): LoomTree =>
  createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: bands,
    }),
    ids
  )

const render = (tree: LoomTree): string => {
  const rendered = renderLoomTree(tree, { resolver: registry, validator: registry, themes, editMode: false })

  return renderToStaticMarkup(rendered.element)
}

/**
 * The tree without the stylesheet React hoists ahead of it.
 *
 * The sheet carries four legitimate `text-align` rules of its own — a pager's
 * link, a milestone's marker — and they are rules on a class rather than a
 * primitive overruling its parent, so a sweep that read them would be reporting
 * the wrong thing and would never go green.
 */
const treeOnly = (markup: string): string => {
  const end = markup.lastIndexOf("</style>")

  return end === -1 ? markup : markup.slice(end)
}

/** Every inline style in the render, in document order. */
const styles = (markup: string): readonly string[] =>
  [...treeOnly(markup).matchAll(/style="([^"]*)"/g)].map((match) => match[1] ?? "")

/**
 * The offenders: an element that ranges its words to the start while arranging
 * no boxes to agree with.
 *
 * The two exemptions are the shape of the property rather than a list of
 * primitives, which is what makes this a sweep and not a snapshot:
 *
 * - **`align-items` or `justify-content` in the same declaration.** That element
 *   arranged boxes on an axis, and under 0207 it then owns the words in them.
 *   `loom.hero`, `loom.banner`, `loom.person`, `loom.empty-state` and
 *   `loom.overlay` are here, deliberately.
 * - **`vertical-align` in the same declaration.** A table cell, whose alignment
 *   is the table's decision and is stated in `loom.comparison`'s docstring —
 *   `loom.table-cell` takes an `align` prop and `loom.comparison-row`'s key
 *   column is `start` because the header row is `center`.
 *
 * Anything else stating `text-align:start` is a leaf overruling an ancestor that
 * had an opinion, which is the defect this file exists for.
 */
const unearnedStarts = (markup: string): readonly string[] =>
  styles(markup)
    .filter((style) => style.includes("text-align:start"))
    .filter((style) => !/align-items:|justify-content:|vertical-align:/.test(style))

/** The whole phrasebook on one page — 44 bands, every primitive a band uses. */
const everyBand = (theme: Record<string, string>): LoomTree => {
  const ids = sequentialIdFactory()

  return pageOf(
    theme,
    STARTER_COMPOSITIONS.map((composition) => composition.build(ids)),
    ids
  )
}

const heading = (ids: IdFactory, text: string, props: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.heading", props: { level: 2, ...props }, children: [buildText(ids, text)] })

const prose = (ids: IdFactory, text: string, props: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.prose", props, children: [buildText(ids, text)] })

describe("a band that says it is centred", () => {
  /**
   * The finding, pinned as the contradiction rather than as a value.
   *
   * What made this defect survive three days of being looked for is that the
   * hero was *already* emitting `text-align: center`. Asserting the hero's
   * column would have passed on the broken library. What cannot pass is the
   * pair: the eyebrow this primitive renders itself inherited the centring and
   * the heading it was handed did not, in the same column, under the same
   * declaration.
   */
  it.each(PALETTES)("centres the words it was handed, not only the ones it renders (%s)", (_label, theme) => {
    const ids = sequentialIdFactory()
    const hero = buildElement(ids, {
      type: "loom.hero",
      props: { align: "center", eyebrow: "THE EYEBROW" },
      children: [
        buildSlot(ids, "heading", [heading(ids, "The headline", { level: 1 })]),
        prose(ids, "The lead paragraph."),
      ],
    })

    const markup = treeOnly(render(pageOf(theme, [hero], ids)))

    expect(markup).toContain("text-align:center")

    const headline = /<h1 style="([^"]*)"/.exec(markup)?.[1] ?? ""
    expect(headline).not.toBe("")
    expect(headline).not.toContain("text-align")

    const eyebrow = /<span style="([^"]*)text-transform:uppercase([^"]*)"/.exec(markup)
    expect(eyebrow).not.toBeNull()
    expect(`${eyebrow?.[1] ?? ""}${eyebrow?.[2] ?? ""}`).not.toContain("text-align")
  })

  /**
   * The second finding: the eyebrow is a fixed field, so no composition could
   * reach it, so a band with one had to be ranged left.
   */
  it.each(PALETTES)("reaches a section's eyebrow, which is a prop and not a node (%s)", (_label, theme) => {
    const ids = sequentialIdFactory()
    const centred = buildElement(ids, {
      type: "loom.section",
      props: { align: "center", eyebrow: "WHERE IT IS TODAY" },
      children: [
        buildSlot(ids, "heading", [heading(ids, "Built in the open")]),
        prose(ids, "Every change to this page is a record you can read."),
      ],
    })

    const markup = treeOnly(render(pageOf(theme, [centred], ids)))

    expect(markup).toMatch(/<section[^>]*text-align:center/)

    /** The eyebrow states nothing, which is how one prop on the band reaches it. */
    const eyebrow = /<p style="([^"]*)">WHERE IT IS TODAY</.exec(markup)?.[1] ?? ""
    expect(eyebrow).not.toBe("")
    expect(eyebrow).not.toContain("text-align")

    /** And so do the two nodes it was handed. */
    expect(/<h2 style="([^"]*)"/.exec(markup)?.[1] ?? "").not.toContain("text-align")
  })

  /**
   * A section that says nothing says nothing, so a band nested in an
   * already-centred region does not quietly range itself left. This is the half
   * of the invariant a `?? "start"` would have got wrong in the other direction.
   */
  it("says nothing about alignment when it was not asked", () => {
    const ids = sequentialIdFactory()
    const plain = buildElement(ids, {
      type: "loom.section",
      props: { eyebrow: "AN EYEBROW" },
      children: [buildSlot(ids, "heading", [heading(ids, "A heading")])],
    })

    const markup = treeOnly(render(pageOf(EDITORIAL, [plain], ids)))

    expect(markup).toMatch(/<section[^>]*>/)
    expect(/<section style="([^"]*)"/.exec(markup)?.[1] ?? "").not.toContain("text-align")
  })

  /**
   * Inheritance adds a default; it removes no reach. An author who wants one
   * paragraph ranged left inside a centred band still says so on the paragraph,
   * and that has to keep working or the fix has traded one unreachable
   * arrangement for another.
   */
  it("still lets one paragraph range itself left inside a centred band", () => {
    const ids = sequentialIdFactory()
    const hero = buildElement(ids, {
      type: "loom.hero",
      props: { align: "center" },
      children: [
        buildSlot(ids, "heading", [heading(ids, "Centred", { level: 1 })]),
        prose(ids, "Ranged left on purpose.", { align: "start" }),
      ],
    })

    const markup = treeOnly(render(pageOf(EDITORIAL, [hero], ids)))

    expect(markup).toMatch(/<p style="[^"]*text-align:start[^"]*">Ranged left on purpose\.</)
  })

  /**
   * `loom.banner` is the instance no camera found. It spends `align` on
   * `justify-content` and stated no text alignment at all, so a centred strip
   * centred its message's box and ranged the words inside it left.
   */
  it.each(PALETTES)("agrees with itself when a strip is centred (%s)", (_label, theme) => {
    const ids = sequentialIdFactory()
    const banner = buildElement(ids, {
      type: "loom.banner",
      props: { align: "center", tone: "accent" },
      children: [buildText(ids, "The record of every change to this page is public now.")],
    })

    const markup = treeOnly(render(pageOf(theme, [banner], ids)))

    expect(markup).toMatch(/justify-content:center[^"]*text-align:center/)
  })
})

describe("the invariant, over the whole library", () => {
  /**
   * The sweep. Every band in the phrasebook, both palettes, and the only
   * elements allowed to range their words to the start are the ones that
   * arranged boxes to agree with or are a cell in a table.
   *
   * It reports the offending declarations rather than counting them, because a
   * count tells the next person how many there were and a declaration tells them
   * which element on which band.
   */
  it.each(PALETTES)("states a text alignment only where it arranged boxes (%s)", (_label, theme) => {
    const markup = render(everyBand(theme))

    /** Guards the two below: a sweep of an empty render finds nothing wrong. */
    expect(styles(markup).length).toBeGreaterThan(400)

    expect(unearnedStarts(markup)).toEqual([])
  })

  /**
   * The same sweep from the other side. Removing the `?? "start"` from a leaf is
   * only half of 0207 — the other half is that a band which *did* arrange boxes
   * keeps stating the alignment those boxes agree with, and the way to check
   * that is not to assert the bands but to assert that the exemption above is
   * carrying real weight. If nothing in the library paired the two, the filter
   * would be dead code and the test above would be weaker than it reads.
   */
  it("finds the bands that do own their words, so the exemption is not dead code", () => {
    const markup = render(everyBand(EDITORIAL))

    const owned = styles(markup).filter(
      (style) => style.includes("text-align:") && /align-items:|justify-content:/.test(style)
    )

    expect(owned.length).toBeGreaterThan(3)
  })
})
