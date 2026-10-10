import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { contactSplitBand } from "./compositions/contact-split-band.js"
import { faqAsideBand } from "./compositions/faq-aside-band.js"
import { footerStatusBand } from "./compositions/footer-status-band.js"
import { integrationsMarqueeBand } from "./compositions/integrations-marquee-band.js"

/**
 * The four bands that gave four two-design parts a third, photographed in the
 * order a page would take them.
 *
 * ## Why the four together rather than one sheet each
 *
 * Each of these is a *third* design, so the question a picture has to answer is
 * not *does it render* — `compositions.test.ts` renders every band under both
 * palettes and refuses a single diagnostic — but **does it look like a band
 * somebody would choose**. That is a judgement about a page, and the four share
 * one property that only a page can show: three of them put two unequal things
 * side by side, and the thing that goes wrong with all three is the same
 * failure at a different ratio.
 *
 * `loom.split`'s widest asymmetric ratio is `start-wide` at 62/38, and both
 * `faq-aside` and `contact-split` want nearer 70/30. One sheet per band would
 * have shown two asides that each look slightly roomy. The four on one page
 * show the same aside twice at the same width, which is what makes it a
 * measurement rather than a taste — and it is the filing from `primitives-55`
 * about a fourth member of that enum, now with a second and third caller.
 *
 * ## The page is the bands and nothing else
 *
 * No wrapper, no hand-written heading between them, nothing styled here. Every
 * difference between the two shots is the palette, the font pack and the style
 * preset the theme names — which is the property 0049 promises and the only
 * thing a sheet like this can actually prove about a port.
 *
 * `loom.page` takes `width: "wide"`, so the bands measure themselves the way
 * they would on the assembled page rather than against the viewport.
 *
 * ## What the phone shot is for, specifically
 *
 * All three splits stack at narrow widths, and the order they stack in is the
 * one thing a desktop shot cannot show. `contact-split` is the one to read: the
 * form comes first and the addresses land under it, which is the right order
 * and is a consequence of source order rather than of a prop, so it is the kind
 * of thing that changes silently when somebody reorders two slots.
 *
 * The marquee is the other reason for the phone shot. `loom.marquee` measures
 * itself and animates, and a band that overflows its viewport is the defect a
 * screenshot hides — the harness reports `scrollWidth` against `innerWidth` on
 * every shot, and a ribbon is the most likely band in this run to fail it.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  const page = buildElement(ids, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide" },
    children: [
      integrationsMarqueeBand.build(ids),
      faqAsideBand.build(ids),
      contactSplitBand.build(ids),
      footerStatusBand.build(ids),
    ],
  })

  return createTree(page, ids)
}

export default defineSpecimen({
  name: "the-third-design",
  title: "The four bands that gave four parts a third design",
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
