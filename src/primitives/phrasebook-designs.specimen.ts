import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * Imported from the band modules rather than from the catalogue's index,
 * because a band is not a named export of this package — it is reached by id
 * through `compositionById`, the way a primitive is reached through the
 * registry (0157). Inside the package the module path is the direct route and
 * costs the published surface nothing.
 */
import { featuresBand } from "./compositions/features-band.js"
import { featuresAlternatingBand } from "./compositions/features-alternating-band.js"
import { heroSplitBand } from "./compositions/hero-split-band.js"
import { pricingMatrixBand } from "./compositions/pricing-matrix-band.js"
import { testimonialsWallBand } from "./compositions/testimonials-wall-band.js"

/**
 * The four designs 0161 added, and one of the canonicals they are alternates
 * *to*, so the photograph shows the thing the record is actually about.
 *
 * The choice of which canonical to include is the whole design of this
 * specimen. A shot of four new bands alone proves each one renders; it says
 * nothing about the claim 0161 rests on, which is that a second design of a
 * part is a **different set of nodes** rather than the same band with different
 * props. `features` and `features-alternating` side by side is that claim in
 * one frame — six tiles above three argued rows — and it is the pair a reader
 * can check without opening a file.
 *
 * The same reason `debts.specimen.ts` puts a defect beside its absence rather
 * than showing the fixed state alone.
 *
 * `hero-split` leads, because it is the band that finally puts something in
 * `loom.hero`'s media region and the only one of the four whose subject is a
 * region that has been empty in every photograph this lane has taken.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        heroSplitBand,
        featuresBand,
        featuresAlternatingBand,
        pricingMatrixBand,
        testimonialsWallBand,
      ].map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "phrasebook-designs",
  title: "Four second designs, and the canonical one of them is an alternate to",
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
