import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { listingsBand } from "./compositions/listings-band.js"
import { metricsLiveBand } from "./compositions/metrics-live-band.js"
import { shelfBand } from "./compositions/shelf-band.js"
import { whatsOnBand } from "./compositions/whats-on-band.js"

/**
 * The four bands that were filed as work rather than as decisions, drawn
 * together.
 *
 * ## What this sheet is taken to settle
 *
 * Three of the four place a primitive that has never been photographed inside a
 * band — `loom.book`, `loom.listing`, `loom.event` and their grids have been
 * registered, tested and unreachable for weeks — and every one of them draws a
 * frame whose picture the catalogue has no source for. **That is the thing to
 * look at.** The 23 September run found the same shape twice in `loom.recording`
 * by photographing a record with no cover art, and wrote the rule it produced:
 * *a ratio reserves the shape of a picture, so a frame with no picture in it
 * does not get one.* It also named `loom.listing` as having the same shape, and
 * declined to change it on the argument alone because there was no band placing
 * one to take a picture of. This is that band.
 *
 * The fourth is different in kind and is here for contrast: `metrics-live` has
 * no picture anywhere and its whole subject is the state of a page **before**
 * anybody connected it. Four figures that cannot be read yet, each saying so
 * under a caption naming what it is waiting on.
 *
 * ## What it is good at
 *
 * **Three ragged strips that are load-bearing rather than decorative.** The
 * listings carry two, three and four `loom.spec` children; the events carry one
 * or two badges. Both raggednesses are the 0052 argument made visible: a band
 * where every card had the same number of facts would be a photograph of the
 * prop version, and the fourth spec on the Cross Street listing is the one that
 * could not exist at all if these were fields.
 *
 * **Two readings of one card, side by side on one sheet.** The books are at
 * `columns: "two"`, which is past `loom.book`'s 32rem container query, so every
 * one of them is a *row* with a 7rem cover. The listings are at `three`, which
 * is under `loom.listing`'s, so every one of those is a tile. Nothing in either
 * tree says which; both are the cell's width.
 *
 * **A failure state drawn on purpose.** `loom.tally` renders its declared
 * `unavailable` word muted and one step down the type ramp, deliberately not in
 * the accent, *because a figure that did not arrive must not be the loudest
 * thing on the page.* Four of them in a row is the sharpest test of that call
 * this library has taken, and if the band reads as broken rather than as
 * unconnected then the captions are not doing their job.
 *
 * ## What it is bad at
 *
 * **Four bands and no page would carry all four.** Two are designs of
 * `features` and would never share a site; one is the come-back band and one is
 * the rhythm break. Read it as a catalogue page rather than as a document — the
 * heading levels are all `2` and the sheet makes no claim about rhythm between
 * the bands.
 *
 * **It cannot show what a bound figure looks like.** The one thing
 * `metrics-live` is for is the number that arrives, and a specimen resolves no
 * data, so the sheet can only photograph the half that fails. That is the
 * standing finding about a harness that photographs and cannot assert, arriving
 * in its most literal form yet.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [shelfBand, listingsBand, whatsOnBand, metricsLiveBand].map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-24-primitives-the-rows-that-were-a-run",
  title: "Four bands that were waiting on a run: a list of books, what is available, what is on, and four figures nobody has connected yet",
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
