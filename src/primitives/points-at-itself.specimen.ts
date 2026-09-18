import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * Imported from the band modules rather than from the catalogue's index, for
 * the reason `phrasebook-designs.specimen.ts` gives: a band is not a named
 * export of this package, it is reached by id through `compositionById` (0157),
 * and inside the package the module path is the direct route.
 */
import { navBand } from "./compositions/nav-band.js"
import { heroBand } from "./compositions/hero-band.js"
import { stepsBand } from "./compositions/steps-band.js"
import { integrationsGridBand } from "./compositions/integrations-grid-band.js"
import { faqGridBand } from "./compositions/faq-grid-band.js"
import { contactDetailsBand } from "./compositions/contact-details-band.js"

/**
 * The bar that now points into the page, and the three designs of 18 September.
 *
 * ## Why the nav is photographed with a hero and a steps band under it
 *
 * The other sheets in this directory are contact sheets — bands stacked in an
 * order chosen for comparison, with no claim to being a document. This one has
 * to be a little more than that, because **the thing that changed is a
 * relationship between two bands rather than anything inside one.** A
 * photograph of `nav` alone shows four menu links and cannot show that they now
 * resolve; it would look identical to the version that pointed at four routes
 * of a site that does not exist.
 *
 * So the sheet is assembled as a short page: `nav`, then `hero` (which carries
 * `#top`, where the wordmark points), then `steps` (`#how-it-works`, the first
 * menu item), then the three new bands — of which `integrations-grid` and
 * `faq-grid` carry `#integrations` and `#faq`, two more of the four. What the
 * picture shows is a bar whose links have somewhere to go on the document
 * underneath it.
 *
 * **`#features` and `#pricing` are the two it cannot show**, because neither
 * band is on this sheet, and a reader should know that rather than infer it:
 * on the assembled page they resolve, and `compositions.test.ts` is what says
 * so ([0168](../../decisions/0168-a-band-links-into-the-page-it-is-assembled-into.md)).
 * A sheet is a photograph and the test is the proof; this file is not
 * pretending to be the second.
 *
 * ## What a still photograph cannot show here at all
 *
 * A fragment link is **navigation**, and navigation is the one thing a
 * screenshot has no way to depict: the picture is the same before and after the
 * click. This is a narrower cousin of the marquee limit filed on 16 September —
 * there the shot cannot show motion, here it cannot show a destination — and it
 * is why the assertion carries the weight in this run and the sheet carries the
 * appearance.
 *
 * What the sheet *is* good for is the second half of the run, which is three
 * bands whose whole subject is how they look.
 *
 * ## The three new designs, and what each is beside
 *
 * | | |
 * | --- | --- |
 * | `integrations-grid` | six cards that each say what the integration *does*. Its canonical is a ring of eight marks, which says these connect and has nowhere to put a sentence |
 * | `faq-grid` | six answers already open. Its canonical is a column of disclosures, which says *there is a lot here, pick yours* |
 * | `contact-details` | three ways to reach a person, and **no form**, which is why it is the one contact band that photographs at full strength |
 *
 * That last one is the sheet's own small argument. `contact` photographs
 * **dimmed with a notice above it** in every shot this lane has taken since it
 * shipped, and correctly so: `loom.form` disables its own fieldset when no
 * submission endpoint has been resolved, and a specimen has no deployment
 * behind it. `contact-details` needs no endpoint, so the picture here is the
 * picture a reader gets — which is a real property of the band and not a
 * flattering camera angle.
 *
 * ## One anchor is duplicated on this sheet and would not be on a page
 *
 * `faq-grid` answers to `#faq` and `contact-details` to `#contact`, which are
 * their canonicals' anchors — that is 0165 working, an anchor belongs to the
 * part. Neither canonical is on this sheet, so nothing collides here. The
 * general point still holds and `spine-designs.specimen.ts` said it first: a
 * contact sheet may hold two designs of one part and a page may not, and the
 * assertion is written over `PAGE_SEQUENCE` for exactly that reason.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        navBand,
        heroBand,
        stepsBand,
        integrationsGridBand,
        faqGridBand,
        contactDetailsBand,
      ].map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "points-at-itself",
  title: "A bar that points into the page under it, and three designs of 18 September",
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
