import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * Imported from the band modules rather than from the catalogue's index, the
 * way `the-parts-that-offered-no-choice.specimen.ts` does and for its reason: a
 * band is reached by id through `compositionById`, not as a named export of this
 * package (0157), and inside the package the module path is the direct route.
 */
import { changelogBand } from "./compositions/changelog-band.js"
import { changelogNotesBand } from "./compositions/changelog-notes-band.js"
import { credentialsBand } from "./compositions/credentials-band.js"
import { credentialsPostureBand } from "./compositions/credentials-posture-band.js"
import { specsBand } from "./compositions/specs-band.js"
import { specsSheetBand } from "./compositions/specs-sheet-band.js"
import { teamBand } from "./compositions/team-band.js"
import { teamLeadsBand } from "./compositions/team-leads-band.js"

/**
 * The last four parts that had one design, each photographed **directly above
 * or below the canonical it is now an alternate to.**
 *
 * ## Why every pair is in the frame, and why that is not four wasted bands
 *
 * The claim this run makes is not *four bands render*. It is 0162's: a second
 * design earns a catalogue entry by building **a different set of nodes**, and a
 * band differing only in its props is a `configure` of the first. That claim is
 * held by a test — `compositions.test.ts` fails by name on two designs whose
 * node types read the same in the same order — and a test is not what a
 * maintainer looks at before a demo.
 *
 * So the sheet is the pairs. Eight bands, four of them already shipped, in
 * canonical-then-alternate order:
 *
 * | the pair | what a reader should see change |
 * | --- | --- |
 * | `specs` → `specs-sheet` | seven rows and three columns, then three cards each holding four limits and the line that qualifies the group |
 * | `team` → `team-leads` | four equal people, then two in full with a way to reach them and seven faces |
 * | `credentials` → `credentials-posture` | a wall of paperwork, then the argument with the paperwork beside it, marked and chipped |
 * | `changelog` → `changelog-notes` | five dated lines on a rail, then three releases with their changes as lists |
 *
 * Read down a column and the thing being asserted is visible without opening a
 * file: in every pair the second band contains a kind of node the first has
 * nowhere to put.
 *
 * **This is also the one sheet in the lane where the pairs are safe to stack.**
 * The 2 October sheet had to leave `nav` and `footer` unpaired, because two bars
 * at the top of one document photographs as a defect rather than as a
 * comparison. None of these four parts is a page edge, so all four pairs sit
 * mid-page where they belong and nothing in the frame is an artefact of the
 * sheet.
 *
 * ## Why it is static
 *
 * No band here declares a control. There is no panel to open, nothing renders
 * `null` until an effect has run, and so none of these bands passes through the
 * pre-hydration state that made the 2 October sheet race its own hide rule and
 * overflow a phone viewport on one palette per run. That filing stands and is
 * untouched by this one; it is worth saying out loud that these four are
 * *outside* it, because a reader comparing the two sheets will notice one waits
 * and this one does not.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        specsBand,
        specsSheetBand,
        teamBand,
        teamLeadsBand,
        credentialsBand,
        credentialsPostureBand,
        changelogBand,
        changelogNotesBand,
      ].map((band) => band.build(ids)),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-10-03-primitives-every-part-offers-a-choice",
  title:
    "The last four parts that had one design, each above or below the canonical it is now an alternate to: a specification sorted by where it bites, two founders and seven faces, a security posture with its paperwork beside it, and three releases with their notes open",
  build,
  /**
   * The wide shot is far taller than the harness's 900, because the sheet is
   * eight bands and a full-page capture of a page that scrolls is the whole
   * page. 3400 is measured against the rendered sheet rather than chosen: the
   * two specification bands and the two changelogs are the tall parts, and the
   * taller the viewport the fewer seams a stitched capture has — the sticky-bar
   * artefact the 2 October shots recorded is a stitch rather than a band.
   *
   * The phone stays at 390×844, which is a real phone, and is where three of the
   * four alternates make their actual claim: the sheet's three cards become one
   * column where the canonical's three-column table has to carry `prose: true`
   * to survive, the split stacks argument-above-evidence in source order, and
   * the leads' grid drops to one card wide.
   */
  viewports: [
    { label: "wide", width: 1280, height: 3400, deviceScaleFactor: 2, touch: false },
    { label: "phone", width: 390, height: 844, deviceScaleFactor: 2, touch: true },
  ],
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
