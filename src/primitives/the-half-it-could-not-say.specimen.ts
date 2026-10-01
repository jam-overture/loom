import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { bannerBand } from "./compositions/banner-band.js"
import { navBand } from "./compositions/nav-band.js"
import { heroBand } from "./compositions/hero-band.js"
import { proofFacesBand } from "./compositions/proof-faces-band.js"
import { codeBand } from "./compositions/code-band.js"
import { codeSessionBand } from "./compositions/code-session-band.js"
import { changelogBand } from "./compositions/changelog-band.js"

/**
 * The four bands of 19 September, in the order a page would take them.
 *
 * ## Why this sheet is a page and not a contact sheet
 *
 * Most sheets in this directory stack bands in an order chosen for comparison
 * and make no claim to being a document. This one has to be a short page, for
 * two reasons that both come from the run rather than from taste.
 *
 * **`banner` is defined by where it is.** It is the first part the catalogue
 * has ever had above the navigation
 * ([0171](../../decisions/0171-a-page-part-is-earned-by-the-region-it-occupies.md)),
 * and *above the navigation* is not a property a band has on its own — a strip
 * photographed alone is a strip, and the whole argument for it being a part
 * rather than a design of something is the region it occupies. So the nav is
 * under it, and the hero under that.
 *
 * **The banner's link needs somewhere to go.** It points at `#changelog`, which
 * is 0168 applied to the band that most wants to point at another site. The
 * changelog band is on this sheet so the sheet is a page where that link
 * resolves, rather than a page where it silently does not. What the picture
 * cannot show is that it *arrives* — that limit is filed, and the assertion
 * over `PAGE_SEQUENCE` is what proves it.
 *
 * ## The two code bands are both here, which a page would not do
 *
 * `code` and `code-session` are two designs of one part, so a page takes one.
 * They are side by side here because the sheet's job is to let a reviewer see
 * the pair and judge whether the second earns its entry under 0162 — the
 * canonical is a split with a numbered list and two panels, the alternate is
 * one wide transcript and an aside, and the question a reader should be able
 * to answer from the picture is *would I ever want the other one*.
 *
 * `spine-designs.specimen.ts` said the general form of this first: a contact
 * sheet may hold two designs of one part and a page may not, and that is why
 * the duplicate-anchor assertion is written over `PAGE_SEQUENCE` rather than
 * over whatever a sheet happens to contain. Both sections here answer to
 * `#code`, and on the assembled page exactly one of them would.
 *
 * ## What the sheet is good and bad at, said plainly
 *
 * Good at: the monograms in `proof-faces`, which are the band at full strength
 * rather than the band with its photographs missing, and which a reader should
 * judge as such. The terminal bar on the two panels. The proportion between a
 * 13px transcript and the prose above it, which is the pairing that went wrong
 * in #329 and was caught by a photograph rather than by a test.
 *
 * Bad at: anything about `loom.code`'s copy control, which is a behavior and
 * not a state — a still shows the button and cannot show that it copies.
 *
 * ## Why the name carries a date
 *
 * The files this writes are the pictures beside a report, and a report is
 * never overwritten — so its pictures carry its date. Every sheet before this
 * one was named undated here and **renamed by hand** on the way into
 * `reports/`, which means re-running `pnpm specimen` on any of them produces
 * files that are not the committed ones. Naming the sheet after the report it
 * belongs to costs a date in a string and makes the command reproduce exactly
 * what is in the repository.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        bannerBand,
        navBand,
        heroBand,
        proofFacesBand,
        codeBand,
        codeSessionBand,
        changelogBand,
      ].map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-19-primitives-the-half-it-could-not-say",
  title: "The four bands of 19 September: a strip above the nav, faces under the hero, and code at last",
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
