import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * Six bands that declare themselves centred, holding nodes that say nothing
 * about alignment — which is the arrangement this library rendered wrongly for
 * as long as `loom.heading` and `loom.prose` have existed
 * ([0207](../../decisions/0207-a-primitive-that-arranges-only-glyphs-inherits-its-alignment.md)).
 *
 * ## Why the phrasebook could not be the sheet
 *
 * The obvious instrument was the forty-four starter compositions, and it is the
 * wrong one. Rendering them before and after this change moves **two elements**
 * — a lead paragraph in the centred hero and an empty state's title — because
 * fifteen of the forty-four already set `align: "center"` on every child by
 * hand. That is the defect being worked around fifteen times rather than fixed
 * once, and a photograph of a successful workaround shows nothing.
 *
 * So every band here is written to the arrangement a composition author would
 * write if they trusted the prop: **the band says `center` and nothing under it
 * repeats it.** Before the change that is a band whose eyebrow is centred and
 * whose words are not; after, it is a centred band.
 *
 * ## What each band is here to show
 *
 * | band | what it is for |
 * | --- | --- |
 * | the strip | `loom.banner`'s centred message, the instance no camera found |
 * | the hero | the finding itself: eyebrow centred, headline ranged left, same column |
 * | the section | `loom.section`'s new `align` reaching an eyebrow, which is a prop and not a node |
 * | the wide band | the same prop **not** shrink-wrapping a full-width table, which is why it governs words and not boxes |
 * | the exception | one paragraph ranged left inside a centred band, so inheritance has taken no reach away |
 * | the control | a band that says nothing, which must still range left |
 *
 * **The control is the half of the sheet that is easy to leave out.** A fix that
 * made everything centred would pass every assertion above it and ruin every
 * page in the repository, so the last band declares no alignment and has to come
 * back left on both palettes.
 */

const heading = (ids: IdFactory, text: string, level = 2, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, {
    type: "loom.heading",
    props: { level, ...extra },
    children: [buildText(ids, text)],
  })

const prose = (ids: IdFactory, text: string, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.prose", props: extra, children: [buildText(ids, text)] })

const action = (ids: IdFactory, label: string, variant: string): ElementNode =>
  buildElement(ids, {
    type: "loom.action",
    props: { href: "/", variant, scale: "large" },
    children: [buildText(ids, label)],
  })

/**
 * `loom.banner`'s message, centred — and nothing inside it says so.
 *
 * **The message has to wrap or this band proves nothing**, which is the single
 * most useful thing this sheet taught its own author. A one-line message inside
 * a `justify-content: center` strip is a flex item shrink-wrapped to its own
 * text, so `text-align: start` and `text-align: center` produce identical
 * pixels and the first draft of this band photographed as a pass on the broken
 * library. The same mechanism is why the defect survived in `loom.hero` for as
 * long as it did: a lead paragraph that fits on one line is centred either way,
 * and only the headline — held to a display measure and wrapping to three lines
 * — ever showed it. **This class of defect is invisible on anything that does
 * not wrap.**
 *
 * So the message is long enough to take two lines at 390px, where the before
 * shot ranges both lines left inside a centred box.
 */
const strip = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.banner",
    props: { align: "center", tone: "accent", label: "Announcement" },
    children: [
      buildText(
        ids,
        "The record of every change to this page is public now, and every proposal that was refused is in it too."
      ),
    ],
  })

/**
 * The finding, as a composition author would write it. Three nodes and a fixed
 * field, and the only thing in the band that mentions alignment is the band.
 */
const hero = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: { align: "center", backdrop: "aurora", eyebrow: "A RUNTIME, NOT A GENERATOR" },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, "The page adapts, and the change is a record you can read", 1, { balance: true }),
      ]),
      prose(ids, "Every change is proposed, gated, attributed and reversible — and none of it is code."),
      buildSlot(ids, "actions", [action(ids, "Read the record", "primary"), action(ids, "See a band", "secondary")]),
    ],
  })

/**
 * `loom.section`'s new prop, on the band that asked for it. The eyebrow is a
 * string this primitive renders itself, so before this run there was no prop
 * anywhere in the library that could move it.
 */
const centredSection = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { align: "center", tone: "surface", width: "wide", eyebrow: "WHERE IT IS TODAY" },
    children: [
      buildSlot(ids, "heading", [heading(ids, "Built in the open")]),
      prose(ids, "Four numbers, a caption and an eyebrow, and for the first time all three agree.", {
        tone: "muted",
      }),
      buildElement(ids, {
        type: "loom.stat-grid",
        props: { columns: "four" },
        children: [
          ["1,304", "Text junctions checked"],
          ["3,265", "Tests on the runtime"],
          ["99", "Primitives registered"],
          ["205", "Decisions recorded"],
        ].map(([value, label]) =>
          buildElement(ids, { type: "loom.stat", props: { value: value ?? "", label: label ?? "" } })
        ),
      }),
    ],
  })

/**
 * The reason the prop governs words and not boxes.
 *
 * An `align-items: center` on a section would shrink-wrap this table to its
 * content and leave the band's width doing nothing. The heading and the caption
 * centre; the table stays the width of the band.
 */
const wideBand = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { align: "center", width: "wide", eyebrow: "WHAT CHANGES" },
    children: [
      buildSlot(ids, "heading", [heading(ids, "The boxes keep their width")]),
      prose(ids, "A centred band centres its words. Its regions are still regions.", { tone: "muted" }),
      buildElement(ids, {
        type: "loom.table",
        props: { density: "comfortable", rules: "rows", tone: "panel" },
        children: [
          buildSlot(ids, "columns", [
            buildElement(ids, {
              type: "loom.table-row",
              props: {},
              children: ["Primitive", "States an alignment", "Because"].map((column) =>
                buildElement(ids, {
                  type: "loom.table-cell",
                  props: { role: "column" },
                  children: [buildText(ids, column)],
                })
              ),
            }),
          ]),
          ...[
            ["loom.hero", "always", "it sets align-items"],
            ["loom.banner", "always", "it sets justify-content"],
            ["loom.heading", "when given", "it arranges glyphs"],
            ["loom.section", "when given", "its regions stay stretch"],
          ].map(([primitive, states, because]) =>
            buildElement(ids, {
              type: "loom.table-row",
              props: {},
              children: [
                buildElement(ids, {
                  type: "loom.table-cell",
                  props: { role: "row" },
                  children: [buildText(ids, primitive ?? "")],
                }),
                buildElement(ids, { type: "loom.table-cell", children: [buildText(ids, states ?? "")] }),
                buildElement(ids, { type: "loom.table-cell", children: [buildText(ids, because ?? "")] }),
              ],
            })
          ),
        ],
      }),
    ],
  })

/** Inheritance adds a default and removes no reach: one paragraph still opts out. */
const exception = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { align: "center", tone: "accent", width: "readable", eyebrow: "THE EXCEPTION" },
    children: [
      buildSlot(ids, "heading", [heading(ids, "A node can still disagree")]),
      prose(ids, "This sentence inherits the band's centring, because it says nothing."),
      prose(ids, "This one is ranged left, because it says so — which is the reach the fix had to keep.", {
        align: "start",
        tone: "muted",
      }),
    ],
  })

/** The control. It declares nothing, so it must come back left on both palettes. */
const control = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow: "THE CONTROL" },
    children: [
      buildSlot(ids, "heading", [heading(ids, "A band that says nothing is ranged left")]),
      prose(ids, "No align prop anywhere in this band. Nothing here may move.", { tone: "muted" }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        strip(ids),
        hero(ids),
        centredSection(ids),
        wideBand(ids),
        exception(ids),
        control(ids),
      ],
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-30-primitives-the-band-that-said-centre",
  title:
    "Six bands that declare themselves centred and hold nodes that say nothing, under both starter palettes — plus the control that must not move",
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
