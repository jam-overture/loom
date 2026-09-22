import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { articlesBand } from "./compositions/articles-band.js"
import { feedBand } from "./compositions/feed-band.js"

/**
 * The two designs of one part, in one frame: the writing band somebody typed,
 * and the writing band that asks where the posts are.
 *
 * ## The question this sheet is taken to answer
 *
 * A design earns a place in the catalogue only if it differs from the part's
 * other designs **in the set of nodes it builds**, and `feedBand` clears that
 * bar in the source. What a photograph settles is the other half: whether a
 * page that has not connected anything yet looks *designed* or looks *broken*.
 *
 * The bound band ships unbound, deliberately (0180 §6) — a composition cannot
 * name a source id a host never registered. So what drops in is a designed
 * empty region saying what would be here, and the failure mode is that it reads
 * as a band that failed to load. A reviewer should be able to tell, from these
 * four shots and without the source, that nothing is broken.
 *
 * ## What it is good at
 *
 * **The empty region at band scale.** `loom.empty-state` has been in the
 * library since 14 September and no band in the catalogue had ever placed one,
 * so every picture of it until today was of a fixture. This is the first one
 * inside a section, at a section's width, with a heading above it.
 *
 * **The two bands' rhythm.** They occupy the same region of a page and only one
 * of them can be on it. Read together, the authored band is four cards and the
 * bound band is one panel — which is the honest difference, since a page with
 * no posts has nothing to make four cards out of.
 *
 * ## What it is bad at, and it is most of what the run built
 *
 * **It cannot photograph an answer.** A specimen is rendered with no data
 * resolution, so a `loom.feed` here can only ever be one that asked nothing.
 * The four states that matter — rows, an answer of none, a source that did not
 * answer, and an answer of the wrong shape — and every state of `loom.tally`
 * are unreachable from this harness.
 *
 * This is the same gap `endpoints` was added to close for `loom.form`, whose
 * comment in `tools/specimen/specimen.ts` describes exactly this failure one
 * seam over: *"That is the form being right and the photograph being useless."*
 * The shape of the fix is the same — a specimen declaring the answers, run
 * through `defineSource` so an invented one is refused exactly as a host's
 * would be. `tools/` is not this lane's, so it is filed rather than built, and
 * the photographs in this run's report were taken by serving a page and using
 * the harness's other entry point.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [articlesBand, feedBand].map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-22-primitives-the-first-answer",
  title: "Two designs of the writing band: one authored, one waiting to be connected",
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
