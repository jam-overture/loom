import { sequentialIdFactory, type IdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { bentoBand } from "./compositions/bento-band.js"
import { integrationsBand } from "./compositions/integrations-band.js"

/**
 * The two bands the first whole-page photograph found thin, and the two
 * renderings that were missing under them.
 *
 * ## What this sheet is taken to settle
 *
 * **Whether a wide cell is earning its width, and whether a ring reads as an
 * orbit.** Both questions are only askable of a picture. Every schema was
 * satisfied, no diagnostic was emitted and nothing overflowed on the versions
 * this replaces: the bento's lead cell was a glyph, a title and one sentence
 * stretched across 1120px, and the works-with band was eight grey words on a
 * dashed circle with a ninth word the same size in the middle of it.
 *
 * ## What it is good at
 *
 * **The turn, photographed as a pair.** The third section holds *one* tile
 * design at two widths — the full measure of the sheet, and the narrow column
 * of a `loom.split` — and nothing in either tree says which way it will lay
 * itself out. That is the `@container` rule doing its work, and it is the one
 * thing a screenshot of a band cannot separate from the band's own width.
 *
 * **Two marks side by side.** A wall wants its marks bare and a ring wants them
 * on something, so the same `loom.logo` content model is drawn both ways on one
 * line. On the bold palette this is also the sheet that shows why a tile the
 * size of a word takes `border-default`: at `border-subtle` the plated row is
 * three greys nobody can tell apart.
 *
 * ## What it is bad at
 *
 * **It cannot photograph the ring turning.** The orbit's motion is a stylesheet
 * animation and a specimen is a still, so what is on the sheet is the composition
 * rather than the movement — which is the rendering the primitive was always
 * designed to survive, and is what every reader with reduced motion sees.
 *
 * **Two bands of one page, out of sequence.** The bento and the works-with band
 * are five parts apart in `PAGE_SEQUENCE` and are adjacent here. Read the sheet
 * as two subjects rather than as a document; `the-whole-page.specimen.ts` is
 * where the rhythm between them is the question.
 */

const TILE_COPY = {
  icon: "◆",
  title: "Every change is a diff you can read",
  body: "Nothing is applied until somebody who can judge it has seen what it does, in the words of the page rather than the words of a model.",
} as const

const PANEL = `  {
    "op": "configure",
-   "align": "start"
+   "align": "center"
  }`

const tile = (ids: IdFactory) =>
  buildElement(ids, {
    type: "loom.feature",
    props: { ...TILE_COPY, surface: "card" },
    children: [
      buildSlot(ids, "media", [
        buildElement(ids, {
          type: "loom.frame",
          props: { chrome: "window", label: "Overture — review" },
          children: [
            buildSlot(ids, "surface", [
              buildElement(ids, {
                type: "loom.code",
                props: { language: "page.tree.json", tone: "source" },
                children: [buildText(ids, PANEL)],
              }),
            ]),
          ],
        }),
      ]),
    ],
  })

const mark = (ids: IdFactory, name: string, plated: boolean) =>
  buildElement(ids, {
    type: "loom.logo",
    props: plated ? { name, surface: "card" } : { name },
  })

const renderings = (ids: IdFactory) =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow: "One tile, two widths" },
    children: [
      buildSlot(ids, "heading", [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 2, balance: true },
          children: [buildText(ids, "Nothing in the tree says which of these it is")],
        }),
      ]),
      tile(ids),
      buildElement(ids, {
        type: "loom.split",
        props: { ratio: "even", align: "start" },
        children: [
          buildSlot(ids, "start", [tile(ids)]),
          buildSlot(ids, "end", [
            buildElement(ids, {
              type: "loom.stack",
              props: { direction: "column", gap: "normal" },
              children: [
                buildElement(ids, {
                  type: "loom.prose",
                  props: { tone: "muted" },
                  children: [
                    buildText(
                      ids,
                      "The same node as the one above it. A tile under 44rem keeps its panel beneath the words, because half of that width is a paragraph four words wide beside a panel too narrow to read."
                    ),
                  ],
                }),
                buildElement(ids, {
                  type: "loom.logo-cloud",
                  props: { label: "Bare, as a wall wants them", align: "start" },
                  children: [mark(ids, "Linear", false), mark(ids, "Figma", false), mark(ids, "Notion", false)],
                }),
                buildElement(ids, {
                  type: "loom.logo-cloud",
                  props: { label: "Plated, as a ring needs them", align: "start" },
                  children: [mark(ids, "Linear", true), mark(ids, "Figma", true), mark(ids, "Notion", true)],
                }),
              ],
            }),
          ]),
        ],
      }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [bentoBand.build(ids), integrationsBand.build(ids), renderings(ids)],
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-26-primitives-earning-the-wide-cell",
  title: "The wide cell with something in it, the ring with a middle, and one tile drawn at two widths",
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
