import { sequentialIdFactory, type IdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { PAINT_NAMES, type PaintName } from "./backdrop.js"

/**
 * Every paint in the vocabulary, drawn twice: once in a band with room and once
 * in a strip with none.
 *
 * ## What this sheet is taken to settle
 *
 * The 20 September finding — *a paint needs area: every `loom.backdrop` paint is
 * unusable in a short band* — was measured by putting a backdrop behind the four
 * figures of `metricsBand` and photographing it, one paint at a time, and its
 * table is five rows of prose. Prose is the wrong medium for the question: what
 * the finding actually claims is that **the same node draws atmosphere at one
 * aspect and dirt at another**, and that is a claim about a pair of pictures.
 *
 * So the pair is the unit here. Each paint appears in a tall band and then
 * immediately in a 170-pixel strip, adjacent, at the same width, under the same
 * palette, with the same node in both places and nothing in either tree saying
 * which it is. A paint that works is one where the reader cannot tell which row
 * was the designed case.
 *
 * ## What it is good at
 *
 * **Separating the aspect from the palette.** The finding's table has two
 * failures in it — the glow paints concentrating and the ruled paints
 * disappearing — and a reader of that table cannot tell how much of either is
 * `editorial`'s low chroma rather than the box. Ten bands under both palettes
 * puts the two variables on two axes, which is the only way to attribute a
 * defect to one of them.
 *
 * **Photographing the thing that has no assertion.** `pnpm verify` was green
 * with a backdrop behind every one of these strips, on the day the finding was
 * filed and today. Nothing overflows, no diagnostic is emitted, and every
 * palette assertion passes. The sheet is the only instrument in the repository
 * that sees it.
 *
 * ## What it is bad at
 *
 * **It cannot photograph the drift.** `aurora`'s two fields move, and a
 * specimen is a still taken with reduced motion forced — so what is on the sheet
 * is where the fields rest, which is the rendering every reader with reduced
 * motion gets and is *not* the one that carries the paint on a live page.
 *
 * **The strips are deliberately the worst case rather than a typical one.**
 * 170 pixels at 1280 wide is an aspect of about 7.5:1, which is the shortest
 * band the catalogue ships. A paint that reads here reads anywhere; a paint that
 * fails here may still be fine in the 300-pixel band nobody has photographed.
 */

const FIGURES = [
  { value: "12k+", label: "Teams shipping weekly" },
  { value: "99.98%", label: "Uptime last quarter" },
  { value: "4 min", label: "Median time to first board" },
  { value: "40+", label: "Tools it reads and writes" },
] as const

/** The exact content of `metricsBand`, which is the band the finding was measured in. */
const figures = (ids: IdFactory) =>
  buildElement(ids, {
    type: "loom.stat-grid",
    props: { columns: "four", align: "center" },
    children: FIGURES.map((figure) =>
      buildElement(ids, { type: "loom.stat", props: { value: figure.value, label: figure.label } })
    ),
  })

const PROSE = [
  "A backdrop does not know how tall its band is. Nothing in a render reads a box, so the same five layers are laid over a screen and over a strip, and the only thing that differs between the two is the aspect the browser resolves the percentages against.",
  "That is the whole subject of this sheet. Where a paint is written in units the box supplies it adapts for free; where it is written in a length it does not, and the failure is invisible to every assertion in the repository because the markup is identical.",
] as const

const prose = (ids: IdFactory, index: 0 | 1) =>
  buildElement(ids, {
    type: "loom.prose",
    props: index === 0 ? {} : { tone: "muted" },
    children: [buildText(ids, PROSE[index])],
  })

/**
 * A band with room. Two paragraphs and the figures come to a little over five
 * hundred pixels at 1280, which is the height of the shortest band in the
 * catalogue that is not the metrics strip.
 */
const tall = (ids: IdFactory, paint: PaintName) =>
  buildElement(ids, {
    type: "loom.backdrop",
    props: { paint },
    children: [
      buildElement(ids, {
        type: "loom.section",
        props: { width: "wide", eyebrow: `${paint} — with room` },
        children: [
          buildSlot(ids, "heading", [
            buildElement(ids, {
              type: "loom.heading",
              props: { level: 2, balance: true },
              children: [buildText(ids, "The case every paint was drawn for")],
            }),
          ]),
          prose(ids, 0),
          prose(ids, 1),
          figures(ids),
        ],
      }),
    ],
  })

/** The same node, over the strip the finding measured. */
const strip = (ids: IdFactory, paint: PaintName) =>
  buildElement(ids, {
    type: "loom.backdrop",
    props: { paint },
    children: [
      buildElement(ids, {
        type: "loom.section",
        props: { width: "wide", eyebrow: `${paint} — in a strip` },
        children: [figures(ids)],
      }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: PAINT_NAMES.flatMap((paint) => [tall(ids, paint), strip(ids, paint)]),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-27-primitives-atmosphere-needs-area",
  title: "Every paint in a band with room and in a strip with none, under both starter palettes",
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
