import { sequentialIdFactory } from "../../src/ids.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { defineSpecimen, PHONE, WIDE } from "./specimen.js"

/**
 * The page the document measurement calls clean while a word sits off the edge
 * of it.
 *
 * `Loom primitives` filed this on 27 September, having rendered one tree twice:
 * wrapped in a `loom.backdrop` it measured 390 / 390, and unwrapped the same
 * nodes measured 401 / 390. The wrapper is the whole difference. A backdrop
 * sets `overflow: hidden` and has to — its paints reach the element's edges and
 * a backdrop that did not clip would paint over the band beside it — so the one
 * check in this repository that catches a visual defect without a person
 * looking cannot see through the four catalogue bands that are rooted in one.
 *
 * This specimen is that shape, committed so the instrument can be pointed at it
 * again. A section inside a backdrop, whose heading names an export of this
 * repository — twenty characters with no break opportunity in them, which at a
 * display step on a 390-pixel phone is wider than the phone. It is not a
 * contrived string: a heading naming a symbol is what a documentation page is
 * made of.
 *
 * **What it should print.** At `wide` the content fits, nothing clips, and the
 * shot is the control. At `phone` the document still measures 390 / 390 —
 * unchanged, and the point — and the clipping box is named beside it. Run it
 * against the harness before this file existed and the phone line reads clean.
 */

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()
  const text = (value: string) => buildText(idFactory, value)

  const section = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Reference", width: "wide" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 2 },
        children: [text("themeSelectionSchema")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { tone: "muted" },
        children: [
          text(
            "The heading above is one word with nowhere to break. On a phone it is wider than the band, and the band is inside a backdrop, so the page reports its own width as exactly the width of the phone."
          ),
        ],
      }),
    ],
  })

  const band = buildElement(idFactory, {
    type: "loom.backdrop",
    props: { paint: "grid" },
    children: [section],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide" },
    children: [band],
  })

  return createTree(page, idFactory)
}

export default defineSpecimen({
  name: "a-clip-hides-an-overflow",
  title: "A clip hides an overflow",
  build,
  viewports: [PHONE, WIDE],
  themes: [
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
