import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { comparisonWipeBand } from "./compositions/comparison-wipe-band.js"
import { ctaOverlayBand } from "./compositions/cta-overlay-band.js"
import { testimonialsCarouselBand } from "./compositions/testimonials-carousel-band.js"

/**
 * The three bands that reached three primitives nothing could reach, in the
 * order a page would take them.
 *
 * ## What this sheet is evidence of, and it is not *does it render*
 *
 * `compositions.test.ts` already renders all sixty-six bands under both
 * palettes and refuses a single diagnostic, so a picture that only proved the
 * render would prove nothing new. What these three need a photograph for is
 * narrower and is the whole subject of 0255: each of them was classified for
 * five weeks as **blocked on an image source**, and each is here holding
 * content that is not a photograph and was never going to be one.
 *
 * So the question the sheet answers is *does an image-free wipe, an image-free
 * scroller and an image-free painted panel look like bands somebody would
 * choose* — which is a judgement about a page and cannot be asserted.
 *
 * ## Why these three on one sheet
 *
 * They share the property that makes them worth photographing together: all
 * three are **regions rather than content**, so what goes wrong with each is a
 * failure of the region and not of the thing in it. A wipe whose layers are
 * different heights, a scroller whose row stops short of its own edge, a panel
 * whose paint has no area to read in — three different spellings of one defect,
 * and each is invisible in the subtree.
 *
 * The wipe is the one to read first. Its two layers are separate subtrees that
 * have to be **exactly the same height**, because the `after` region is in the
 * flow and gives the band its height while `before` is absolute over it. Both
 * build six months with identical labels for that reason, and this sheet is the
 * only thing in the repository that would show it if they ever stopped
 * matching: the bars would line up at one divider position and not at another.
 *
 * ## What this sheet cannot show, said plainly
 *
 * **The divider is photographed at rest**, at the declared `position: 38`, and
 * a specimen cannot press or drag — `pnpm specimen` renders and shoots, and
 * reaching a state is `pnpm shoot`'s `do` list (0182). So the picture proves
 * the wipe is *aligned and legible at a position*, which is the defect that
 * would ship, and not that dragging it feels good.
 *
 * It is the honest shape of the claim rather than a gap: 0226 and #515 settled
 * that a declared position survives hydration, and `presentation.test.ts`
 * asserts a node's own number travelling to the slider's value. What a picture
 * adds is that the two layers agree at that number.
 *
 * **The carousel is photographed at rest too, and that is the point.** Its
 * whole affordance is static CSS — an item is never wider than 82% of the band,
 * so the next card is visibly cut off with nothing moving. This is the
 * difference from `integrations-marquee`, whose central claim the 10 October
 * report had to record as unphotographable by this harness: a marquee shot with
 * motion reduced is a wrapped block. **A carousel under reduced motion is a
 * carousel.**
 *
 * ## The page is the bands and nothing else
 *
 * No wrapper, no hand-written heading between them, nothing styled here. Every
 * difference between the two shots is the palette, the font pack and the style
 * preset the theme names, which is the property 0049 promises and the only
 * thing a sheet like this can prove about a band.
 *
 * `loom.page` takes `width: "wide"` so the bands measure themselves the way
 * they would on the assembled page rather than against the viewport.
 *
 * ## What the phone shot is for, specifically
 *
 * Two things, and both are the kind that pass every test.
 *
 * **The carousel is the band most likely to overflow.** A scroller is
 * `overflow-x: auto` on an element whose children are wider than it, and the
 * difference between *that element scrolls* and *the page scrolls* is one
 * missing `min-width: 0` somewhere above it. The harness prints `scrollWidth`
 * against `innerWidth` on every shot, so a ribbon that takes the page with it
 * says so instead of being eyeballed.
 *
 * **The painted panel is the band most likely to lose its paint.** `spotlight`
 * is written in the box's own units and holds at any aspect (0196), but a panel
 * that stacks to four hundred pixels tall on a phone is where that claim is
 * actually tested, and a paint that has gone flat is something only a picture
 * shows.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  const page = buildElement(ids, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide" },
    children: [comparisonWipeBand.build(ids), testimonialsCarouselBand.build(ids), ctaOverlayBand.build(ids)],
  })

  return createTree(page, ids)
}

export default defineSpecimen({
  name: "never-behind-a-photograph",
  title: "The three bands that reached three primitives nothing could reach",
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
