import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { conversationBand } from "./compositions/conversation-band.js"
import { footerBand } from "./compositions/footer-band.js"
import { proofStoryBand } from "./compositions/proof-story-band.js"
import { testimonialsBand } from "./compositions/testimonials-band.js"
import { testimonialsWallBand } from "./compositions/testimonials-wall-band.js"

/**
 * Four faces that were never drawn, one that is refused on purpose, and the
 * footer column that fell off the row.
 *
 * The bands are chosen the way `debts.specimen.ts` chooses its pair — **the
 * refusal beside the fallback**, in one frame, because the claim is not *a
 * quote can have a face* but *the library now knows which quotes should*:
 *
 * - `testimonials-wall` attributes eight quotes to people by name, so eight
 *   monograms appear where there were eight blanks;
 * - `testimonials` attributes three quotes to **roles**, declares `anonymous`
 *   ([0160](../../decisions/0160-a-prop-that-unblocks-a-rendering-names-the-content-and-never-the-layout.md))
 *   and draws no face at all — because the initials of *Founder* are a circle
 *   with `F` in it, which reads as a person whose name got lost;
 * - `proof-story` is the singleton pull quote, where the same fallback has to
 *   sit against a 2px accent rule rather than inside a card;
 * - `code-conversation` is `loom.message`, the second primitive that drew
 *   nothing, with the name on every turn that makes a monogram possible;
 * - `footer` is here for the other half of the run, and it has to be
 *   photographed inside a page rather than alone: the fault needed the band at
 *   the width a whole page gives it.
 *
 * The four bands above it are also what puts this footer under load — four link
 * groups is the ordinary number and the number that broke.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [testimonialsWallBand, testimonialsBand, proofStoryBand, conversationBand, footerBand].map((band) =>
        band.build(ids)
      ),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-25-primitives-the-face-the-band-promised",
  title: "The faces two primitives never drew, and the one band that refuses them",
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
