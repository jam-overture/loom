import { sequentialIdFactory } from "../ids.js"
import { SUBMIT_PROP_KEY, THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import type { LoomNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * Imported from the band modules rather than from the catalogue's index, the
 * way `phrasebook-designs.specimen.ts` does and for its reason: a band is
 * reached by id through `compositionById`, not as a named export of this
 * package (0157), and inside the package the module path is the direct route.
 */
import { bentoBand } from "./compositions/bento-band.js"
import { bentoMixedBand } from "./compositions/bento-mixed-band.js"
import { comparisonBand } from "./compositions/comparison-band.js"
import { comparisonWaysBand } from "./compositions/comparison-ways-band.js"
import { footerSignupBand } from "./compositions/footer-signup-band.js"
import { navCentredBand } from "./compositions/nav-centred-band.js"

/**
 * Four parts that had one design, photographed with two of the canonicals they
 * are now alternates *to*.
 *
 * ## Why the canonicals are in the frame
 *
 * The same reasoning `phrasebook-designs.specimen.ts` sets out: a sheet of four
 * new bands proves four bands render. The claim 0162 rests on — and the claim
 * this run is making — is that a second design is **a different set of nodes**
 * rather than the same band configured differently, and the only way to show
 * that to a reader who will not open a file is to put the pair in one frame.
 *
 * `bento` above `bento-mixed` is the pair that carries it best: four identical
 * tiles, then four cells holding a quotation, a figure, a checklist and a
 * window. `comparison` above `comparison-ways` is the other half — a table
 * against two named alternatives, then two columns against nobody.
 *
 * **The bar and the footer have no pair in the sheet, deliberately.** They are
 * the page's own edges: a second `loom.nav` stacked under the first is two bars
 * at the top of one document, which photographs as a defect rather than as a
 * comparison, and the footers do the same at the bottom. So this sheet takes
 * the alternates of both and the canonical pair is in every other photograph
 * this lane has ever published.
 *
 * ## Why it is live
 *
 * `comparison-ways` ends in a `loom.popover`, whose panel is hidden until a
 * reader presses the trigger. Rendered to static markup and photographed, the
 * band's method is a button that does nothing — which is a true picture of a
 * page nobody has touched and says nothing about whether the panel this run
 * added has anything in it. So the sheet is `live` and has two states, which is
 * the pattern `the-behaviours-nothing-declared.specimen.ts` established:
 *
 * | state | what it is for |
 * | --- | --- |
 * | `shut` | the four bands as the page arrives, every panel closed |
 * | `the method` | the popover open over the gap below the two columns |
 *
 * `shut` is the control and is the half that is easy to leave out. A sheet of
 * nothing but open panels would photograph identically against a hide rule
 * written in the wrong direction.
 */
/**
 * The deployment's half of the footer's form, applied here and nowhere else.
 *
 * A band may not name a submission target: where a visitor's typed data goes is
 * the deployment's to decide (0065), and `footerSignupBand` ships the field, the
 * label and the button and stops. The consequence is that a form in a starting
 * composition photographs, correctly, as a notice reading *"This form is not
 * connected yet"* over a fieldset at six-tenths opacity — the primitive being
 * right about an unaddressed form and the picture being useless, which is the
 * failure `specimen.ts`'s own `endpoints` comment describes at length.
 *
 * So the specimen plays the host: it writes the reserved submit prop onto the
 * one `loom.form` in the sheet and declares what that id resolves to. That is
 * exactly the division of labour the band's doc comment claims, performed rather
 * than asserted, and it is why the footer in these photographs has a live field
 * in it.
 *
 * Written as a walk rather than built into the band, because the band is the
 * subject: a copy of it with an endpoint spliced in is a photograph of something
 * the catalogue does not contain.
 */
const ENDPOINT = "specimen.subscribe"

const connected = (node: LoomNode): LoomNode => {
  if (node.kind === "text") return node
  if (node.kind === "slot") return { ...node, children: node.children.map(connected) }

  return {
    ...node,
    ...(node.type === "loom.form" ? { props: { ...node.props, [SUBMIT_PROP_KEY]: { to: ENDPOINT } } } : {}),
    children: node.children.map(connected),
  }
}

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        navCentredBand,
        bentoBand,
        bentoMixedBand,
        comparisonBand,
        comparisonWaysBand,
        footerSignupBand,
      ].map((band) => connected(band.build(ids))),
    }),
    ids
  )
}

/**
 * Scoped by the primitive's own root, because a bare `.loom-control-present`
 * would be a strict-mode violation the day a second presentation lands on this
 * page rather than a press. There is one popover here and the selector says so.
 */
const POPOVER_TRIGGER = ".loom-popover > .loom-control-present"

export default defineSpecimen({
  name: "2026-10-02-primitives-the-parts-that-offered-no-choice",
  title:
    "Four parts that had one design, and the second design each now has: a bar in a pill, a mosaic of four registers, two columns against nobody, and a footer with one last thing to do",
  build,
  endpoints: { [ENDPOINT]: { action: "/subscribe", method: "post", fields: [] } },
  /**
   * The wide shot is taller than the harness's 900, because the sheet is six
   * bands and a full-page capture of a page that scrolls is the whole page.
   * 1900 is measured against the rendered sheet rather than chosen: the two
   * mosaics are the tall part, and at 1280 each closes its rhythm in two rows.
   *
   * The phone stays at 390×844, which is a real phone, and is where three of the
   * four bands make their actual claim — the pill bar is the design that does
   * not wrap at that width, the split stacks, and the footer's inline form is
   * the one thing in the sheet that has to survive a 390px column.
   */
  viewports: [
    { label: "wide", width: 1280, height: 1900, deviceScaleFactor: 2 },
    { label: "phone", width: 390, height: 844, deviceScaleFactor: 2 },
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
  live: {
    states: [
      /**
       * The control, and the only shot that says the panel is ever closed.
       *
       * **It waits, and the wait is a measurement rather than a courtesy.**
       * Shot with an empty step list this overflowed its viewport at 390px —
       * `scrollWidth 697 / innerWidth 390` — on one palette per run and a
       * different palette each run, which is the signature of a race rather
       * than of a defect in a band. It is 0176 working as specified: a
       * presentation's panel is **visible by default and hidden by a rule keyed
       * on the control** (`presentation.ts`, §2), the control renders `null`
       * until an effect has proved scripting runs, so between first paint and
       * hydration the panel is laid out at its natural width beside its
       * trigger. On a phone that is three hundred pixels of page nobody asked
       * for. Filed; the four hundred milliseconds here are what make the shot
       * deterministic, and the band is not what is being worked around.
       */
      { label: "shut", do: [{ wait: 400 }] },
      {
        label: "the method",
        do: [{ click: POPOVER_TRIGGER }, { wait: 400 }],
      },
    ],
  },
})
