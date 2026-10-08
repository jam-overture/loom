import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { DOCUMENT_SEQUENCE } from "./compositions/index.js"

/**
 * The whole document sequence, in order, as one page.
 *
 * `the-whole-page.specimen.ts` is this library's photograph of the landing page
 * and its header says why a picture of a *page* finds what a picture of a band
 * cannot: a defect can satisfy every schema, emit no diagnostic, measure no
 * overflow, and still be the first thing a person sees. The same argument
 * applies to a second kind of page the first time one exists, and this is the
 * subject —
 * [0241](../../decisions/0241-a-second-page-sequence-is-earned-by-regions-in-a-different-order-and-the-sites-own-regions-are-shared.md)
 * is `Proposed`, so the thing review most needs is to be able to look at it.
 *
 * It is {@link DOCUMENT_SEQUENCE} verbatim — the design each region actually
 * takes — so it cannot drift from the catalogue, and a region left undrawn
 * shows up here as a hole rather than as a passing test.
 *
 * **Two things in the frame are the ones to read at size.** The bar, because it
 * is the one band on this page that is a *different design* of a landing region
 * rather than a new one, and the whole argument for that is visible in it: a
 * search field and a version badge where the canonical has four fragments. And
 * the split, because the contents rail beside the text is the region this
 * sequence would have had to invent a part for if `loom.page` stacked its
 * children any other way — on the phone shot it is below the prose, which is
 * the same two nodes and no second design.
 *
 * The phone viewport is not a nicety here. A breadcrumb four crumbs deep and a
 * two-column split are the two shapes on this page most likely to overflow 390
 * pixels, and `loom.link-trail` wraps rather than truncating on purpose — a
 * trail whose middle is hidden has stopped being the thing it is for, so the
 * wrap is what a phone shot has to show happening.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: DOCUMENT_SEQUENCE.map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  /**
   * Short on purpose, and it is this lane's own 6 October finding applied
   * again: the mangler that wraps a pull-request URL in injected backticks
   * fires on length, and the raw-content prefix is 99 characters before a
   * filename starts. The report keeps the long slug, whose own references are
   * repository-relative and have no limit.
   */
  name: "prim-doc",
  title: "The document sequence, as one page",
  build,
  themes: [
    {
      label: "editorial",
      selection: themeSelectionSchema.parse({
        palette: "editorial",
        fontPack: "editorial-serif",
        stylePreset: "comfortable",
      }),
    },
    {
      label: "bold",
      selection: themeSelectionSchema.parse({
        palette: "bold",
        fontPack: "bold-sans",
        stylePreset: "airy-modern",
      }),
    },
  ],
})
