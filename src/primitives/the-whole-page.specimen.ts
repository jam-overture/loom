import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { PAGE_SEQUENCE } from "./compositions/index.js"

/**
 * Every part of the page sequence, in order, as one document.
 *
 * **Forty-four bands shipped and none of this library's photographs had ever
 * been of a page.** Every specimen here frames a band, or a handful of bands
 * from one run, which is the right subject when the question is *does this band
 * render* — and it is structurally incapable of answering the question a
 * marketing site actually asks, which is *does this read as a product*. Three
 * faults found on 25 September were all of that second kind:
 *
 * - a wall of quotes with no faces in it, standing four bands above a team
 *   band full of them. Each band is fine alone; together one of them is
 *   obviously unfinished;
 * - a footer whose fourth link group fell to a second row, which needs the band
 *   at the width a whole page gives it and the surface tone a whole page uses;
 * - and the general shape of both, which is that a defect can satisfy every
 *   schema, emit no diagnostic and measure no overflow, and still be the first
 *   thing a person sees.
 *
 * So this is the subject that finds them, committed rather than written into a
 * scratch file per run. It is {@link PAGE_SEQUENCE} verbatim — the canonical
 * design of each part, which is the thing a surface offering to *start a page*
 * hands somebody — so it cannot drift from the catalogue and a part left
 * undrawn shows up here as a hole rather than as a passing test.
 *
 * It is a tall photograph, deliberately: about 12,000 CSS pixels under
 * `editorial`. Reading it is the point. A run that only wants one band has
 * every other specimen in this directory to reach for.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: PAGE_SEQUENCE.map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "the-whole-page",
  title: "Every part of the page sequence, as one document",
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
