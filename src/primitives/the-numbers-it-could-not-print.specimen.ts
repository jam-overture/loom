import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { metricsBand } from "./compositions/metrics-band.js"
import { specsBand } from "./compositions/specs-band.js"

/**
 * The new band, and the band it has to sit next to without repeating it.
 *
 * ## Why `metrics` is in the frame
 *
 * `specs` goes immediately after `metrics` on the canonical page, and the whole
 * risk in admitting it as a part is that a reader meets two bands of numbers in
 * a row and reads the second as more of the first. That is the thing a
 * photograph settles and nothing else can: both bands render clean on their
 * own, both pass every palette assertion, and *the page says one thing twice*
 * has no assertion anywhere in this repository.
 *
 * So the question a reviewer should answer from this sheet is not whether the
 * table is correct. It is whether the two bands are **in different registers** —
 * four figures at display size on a painted surface, then a run of the same kind
 * of fact at reading size over a sheet you look things up in. If the second band
 * reads as a louder version of the first, the part does not belong in
 * `COMPOSITION_PARTS` and the band should go back to being a design of
 * something.
 *
 * ## What it is good at
 *
 * **The rule.** `loom.divider` had never been drawn by any band in the
 * catalogue, and the question this sheet was taken to answer is whether a
 * hairline between the figure run and a bordered table reads as a separator or
 * as a second border forty pixels above the first. Both palettes, both widths.
 *
 * **The narrow table**, which is the one measurement `loom.table`'s `prose` prop
 * exists for. The third column holds whole sentences; at 390 the band is meant
 * to scroll sideways inside its own edge rather than squeeze seven rows into a
 * hundred pixels each. The phone shot is the check, and the harness prints
 * `scrollWidth` against `innerWidth` so a table that took the *page* with it
 * says so rather than being eyeballed.
 *
 * **Tabular figures in a column of mixed values.** `600 a minute` and `2,000
 * nodes` sit above `Bring your own`; the digits should line up with each other
 * and every value should share the column's leading edge.
 *
 * ## What it is bad at
 *
 * **The sticky row heading.** `loom.table-cell`'s `row` role is `position:
 * sticky`, which is a fact about a table mid-scroll and a photograph is taken
 * at rest. The picture shows the heading column at its origin, which is where
 * it would be anyway, and is evidence of nothing about whether it stays.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [metricsBand, specsBand].map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-21-primitives-the-numbers-it-could-not-print",
  title: "The specification band, under the metrics band it must not repeat",
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
