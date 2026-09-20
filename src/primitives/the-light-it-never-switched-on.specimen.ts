import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { featuresBand } from "./compositions/features-band.js"
import { pricingBand } from "./compositions/pricing-band.js"

/**
 * The two bands that wear a treatment, in the order a page takes them.
 *
 * ## Why these two, and why the band between them is not here
 *
 * This is a contact sheet rather than a page, and unusually it is a sheet whose
 * subject is a *change* rather than a set of new bands. Both bands existed
 * yesterday and both rendered correctly; what is on trial is the three nodes
 * they gained between them under
 * [0174](../../decisions/0174-a-band-wears-the-treatment-its-own-content-earns.md),
 * and the question a reviewer should be able to answer from the picture is
 * whether any of them is doing something a reader would notice.
 *
 * `metrics` sits between these two on the canonical page and was the third band
 * in the first version of this sheet. It is not here because the picture is
 * what took it out: a `loom.backdrop` behind four figures in a 170-pixel strip
 * is invisible under `editorial` and a grey smear under `bold`, and the band
 * went back to what it was. The shot that proved it is in the report rather
 * than in `reports/`, because a sheet is for what shipped.
 *
 * Both bands need their neighbours in frame for a different reason than usual.
 * A lit tier is *the one of three*, so the other two have to be photographed
 * with it or the light is just a border; the atmosphere is read in the gutters
 * **between** the cards, so a single card would show none of it.
 *
 * ## What the sheet is good and bad at, said plainly
 *
 * **Good at the halo**, which is the treatment with the most to lose from a
 * palette. The rim stands four pixels off the card so it reads as geometry
 * rather than as chroma, and the whole of that argument is checkable here:
 * under `bold` the ring is bright and under `editorial` it is a second hairline
 * with a strip of the page's ground between it and the card's own border. If
 * the editorial shot shows one heavier border instead of two lines, the
 * argument in `RIM_OFFSET` has failed at its first real use and the band should
 * not ship.
 *
 * **Good at the backdrop**, and specifically at 0174's second clause: the three
 * tier cards keep their own opaque surfaces under both palettes and the
 * atmosphere is in the space around them. A reviewer should see a band that
 * gained light, never a band that traded a ground for a paint.
 *
 * **Bad at the reveal, completely.** Every shot in this repository is taken
 * with reduced motion — deliberately, because a page that reveals on scroll is
 * otherwise photographed blank below the fold — so the six tiles are captured
 * exactly as a reader who asked for reduced motion gets them, which is at full
 * opacity, in place, having moved not at all. That is the correct picture and
 * it is evidence of nothing about the cascade.
 *
 * What the picture *can* settle about the cascade is the defect that came with
 * it: six cards in two rows, each now inside a wrapper, with the row's short
 * cards either lining up with its tall one or ending above it. That is the
 * stretch fix `loom.reveal` gained, and it is visible here even though the
 * motion is not.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [featuresBand, pricingBand].map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-20-primitives-the-light-it-never-switched-on",
  title: "The two bands that wear a treatment: a cascade, and light on the plan the page is selling",
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
