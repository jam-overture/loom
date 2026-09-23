import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { catalogueBand } from "./compositions/catalogue-band.js"
import { conversationBand } from "./compositions/conversation-band.js"
import { episodesBand } from "./compositions/episodes-band.js"
import { offeringsBand } from "./compositions/offerings-band.js"

/**
 * Four bands for four businesses that are not a developer product, in the
 * order they would sit on a page.
 *
 * ## The question this sheet is taken to answer
 *
 * The source argument is that a *part* is a region, so a shop, a studio, a
 * podcast and an assistant are the same page sequence with different nodes in
 * four of its bands. That is checkable by reading 0171 and it is not the thing
 * a reviewer is worried about. What a photograph settles is whether the four
 * read as **one library** — whether a coffee shelf and a service menu, drawn
 * from the same tokens by the same grids, look like a catalogue that has range
 * or like four unrelated things that happen to compile.
 *
 * ## What it is good at
 *
 * **Eight primitives that had never been photographed inside a band.**
 * `loom.offering`, `loom.product`, `loom.recording`, `loom.message` and their
 * four containers have been registered and tested for weeks, and every picture
 * of them until today was of a fixture stood up beside a page. Here they are at
 * a section's width with a heading above them, which is the only width that
 * settles whether a card's proportions are right.
 *
 * **Three cards that carry no picture.** The strongest claim this run makes is
 * that these primitives were never behind the standing image question, and the
 * way to disbelieve it is to look: a product cell with no cover, an episode
 * whose frame carries a play mark and nothing else, and an offering that never
 * had an image field at all. If any of the three reads as a card with a hole in
 * it, the claim is wrong and the picture says so.
 *
 * **The ragged meta strips.** `loom.offering` takes two or three badges and
 * `loom.product` takes two or three, deliberately, because the argument for
 * their being nodes is that a record never has exactly one. A sheet where every
 * card had the same number would be a photograph of the prop version.
 *
 * ## What it is bad at
 *
 * **It cannot photograph the motion.** The conversation's last turn is
 * `pending`, which is three dots animating from the library's stylesheet
 * (0055). A specimen is a still, so the sheet shows the dots at whatever phase
 * the capture caught, and the one thing that makes the band feel like a live
 * exchange is exactly the thing that does not survive the shutter. The standing
 * finding about a harness that photographs and cannot assert covers this; it is
 * the sharpest case of it this lane has had.
 *
 * **It is four bands on one page and no page would carry all four.** They are
 * designs of four different parts, so a real page takes one of each at most —
 * and two of these four (the shelf and the service menu) belong to businesses
 * that would never share a site. Read it as a catalogue page, not as a
 * document: the heading levels are deliberately all `2`, and the sheet makes no
 * claim about rhythm between the bands.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [conversationBand, catalogueBand, offeringsBand, episodesBand].map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-23-primitives-another-kind-of-business",
  title: "Four bands for businesses this catalogue could not draw: an assistant, a shop, a studio and a podcast",
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
