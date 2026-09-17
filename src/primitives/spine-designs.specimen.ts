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
import { proofBand } from "./compositions/proof-band.js"
import { proofStoryBand } from "./compositions/proof-story-band.js"
import { stepsBand } from "./compositions/steps-band.js"
import { stepsCardsBand } from "./compositions/steps-cards-band.js"
import { metricsChartBand } from "./compositions/metrics-chart-band.js"
import { ctaSignupBand } from "./compositions/cta-signup-band.js"

/**
 * The four designs of 17 September, each beside the canonical it is an
 * alternate to where the pairing is the argument.
 *
 * The ordering is not the page's and is not meant to be — this is a contact
 * sheet, not a document. It is arranged so that the two pairs a reader has to
 * *compare* are adjacent and the two bands that stand alone are not:
 *
 * | | |
 * | --- | --- |
 * | `proof` → `proof-story` | *many* against *one, specifically* — the two claims a proof band can make, and the reason both designs exist |
 * | `steps` → `steps-cards` | **the same three sentences** in ten nodes and in twenty-eight. The whole of 0162's rule in one frame, with the copy held constant so nothing else can explain the difference |
 * | `metrics-chart` | alone, because its canonical plots four different units and there is nothing to compare it against — which is itself the argument for why it is a design and not a `configure` |
 * | `cta-signup` | alone, and last, because it is where a page ends |
 *
 * `cta-signup` photographs **dimmed, with a notice above it**, and that is
 * correct rather than a defect in the shot: `loom.form` disables its own
 * fieldset when no submission endpoint has been resolved, and a specimen has no
 * deployment behind it. `contact` has photographed this way since it shipped.
 * The alternative — seeding a fake endpoint so the picture looks better — would
 * be photographing a state no reader of this report can reach.
 *
 * ## This sheet breaks 0165 on purpose, and it is worth saying so
 *
 * `steps` and `steps-cards` both answer to `#how-it-works` — that is
 * [0165](../../decisions/0165-an-anchor-belongs-to-the-part-and-is-unique-over-the-assembled-page.md)
 * working — so putting both on one document gives it two elements with
 * `id="how-it-works"`, which is the exact defect that record was written about.
 *
 * It does not fire, and the reason is the record's own wording rather than an
 * exemption: the assertion is over `PAGE_SEQUENCE`, which is **one design of
 * each part in page order**, and a page never holds two designs of one part.
 * This is not a page. It is a contact sheet whose entire purpose is to put a
 * pair side by side, and the duplicate is the cost of that — paid here, where
 * nothing links to either anchor and no reader navigates by fragment, and paid
 * nowhere else. `phrasebook-designs.specimen.ts` has had the same duplicate on
 * `#features` since 16 September for the same reason and had not said so.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        proofBand,
        proofStoryBand,
        stepsBand,
        stepsCardsBand,
        metricsChartBand,
        ctaSignupBand,
      ].map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "spine-designs",
  title: "Four second designs of the page's spine, beside the canonicals they alternate with",
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
