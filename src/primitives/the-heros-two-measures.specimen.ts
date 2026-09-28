import { sequentialIdFactory, type IdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * The front door's own hero, photographed under all three starter palettes.
 *
 * ## What this sheet is taken to settle
 *
 * Two findings against `loom.hero` were filed on 20 September, re-photographed
 * on 26 September and still open eight days later. Both are claims about a
 * picture and both were filed as prose:
 *
 * 1. **The backdrop paints over the band's own words.** The `grid` paint's 1px
 *    lines cross the headline and read as strikethrough.
 * 2. **One measure caps a display line and a reading line.** The headline takes
 *    three lines at 1280 and the two actions fall below a 900px fold.
 *
 * Neither is visible to any assertion in this repository. Nothing overflows, no
 * diagnostic is emitted, every palette assertion passes, and `pnpm verify` was
 * green on the day they were filed and on the day they were fixed. A photograph
 * is the only instrument that sees either one.
 *
 * ## Why the front door's tree verbatim, rather than a reduced case
 *
 * Both findings were measured against the marketing site's home page, and the
 * second is a claim about a **fold** — *the primary button's top edge is at
 * 858px of a 900px viewport*. A fold is a property of one viewport height and
 * one stack of real content; a reduced hero with a three-word headline has no
 * fold to fall below and would photograph as fixed before anything was.
 *
 * So the first band is `loom.hero` with the props, the headline and the lead
 * that `(marketing)/_lib/pages/home.ts` gives it, and the 1280×900 shot is the
 * fold measurement the finding quotes. The copy is that lane's and is reproduced
 * rather than rewritten, because a shorter headline is a different measurement.
 *
 * ## Why the second band has media in it
 *
 * The measure is not one number in one place. A hero with nothing in its `media`
 * slot is one full-width column; a hero with something in it is two columns of
 * `26rem` and `22rem`, and the text column is then narrower than any measure the
 * primitive could name. The split band is what proves a display measure widened
 * for the centred case does not overflow the narrow one — which is the mistake
 * this fix could plausibly have made and the reason the band is here.
 *
 * ## What it is bad at
 *
 * **It cannot photograph the paint order it was taken for.** A stacking-order
 * defect is visible only where the layer draws something hard-edged over
 * something dark enough to see it through: `grid` over a 72px headline is the
 * sharpest case in the library and it is the case the finding named, but the
 * four soft paints overlay their bands exactly as badly and photograph as
 * nothing at all. The sheet shows one instance of a defect that was in five.
 *
 * **The entrance animation is not in it.** Shots are taken with reduced motion
 * forced, so every `rise` row is at rest. That is the rendering a reader with
 * reduced motion gets and it is not the one a live page opens with.
 */

/**
 * The home page's hero copy, from `(marketing)/_lib/pages/home.ts`.
 *
 * Forty-five characters, which is the whole of the second finding: at `44rem`
 * and a 72px top step it is nineteen characters to the line, so it sets three.
 */
const HEADLINE = "The AI age needs a new way to build web apps."

const LEAD =
  "AI already writes the components. What your page becomes, and how it feels to use, is still to be built. Loom is where you and the AI build it — adaptive to your users, answerable to your rules, and secure."

const EYEBROW = "For pages that AI is allowed to change"

const heading = (ids: IdFactory) =>
  buildSlot(ids, "heading", [
    buildElement(ids, {
      type: "loom.heading",
      props: { level: 1, align: "center", balance: true },
      children: [buildText(ids, HEADLINE)],
    }),
  ])

const lead = (ids: IdFactory, align: "start" | "center") =>
  buildElement(ids, {
    type: "loom.prose",
    props: { size: "lead", align, tone: "muted", measured: true },
    children: [buildText(ids, LEAD)],
  })

const actions = (ids: IdFactory) =>
  buildSlot(ids, "actions", [
    buildElement(ids, {
      type: "loom.action",
      props: { href: "/how-it-works", variant: "primary", scale: "large" },
      children: [buildText(ids, "See how a change travels")],
    }),
    buildElement(ids, {
      type: "loom.action",
      props: { href: "/pricing", variant: "secondary", scale: "large" },
      children: [buildText(ids, "See pricing")],
    }),
  ])

/**
 * The front door, as it ships: `grid` behind it, centred, holding the fold.
 *
 * `stature: "tall"` is what makes the 1280×900 shot a fold measurement rather
 * than a picture of a band — the section is `78vh` before its padding, so where
 * the actions land is decided by how many lines the headline took.
 */
const frontDoor = (ids: IdFactory) =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "center",
      stature: "tall",
      eyebrow: EYEBROW,
      anchor: "top",
    },
    children: [heading(ids), lead(ids, "center"), actions(ids)],
  })

/**
 * The same copy with the `media` slot filled, which halves the text column.
 *
 * A `loom.frame` rather than a `loom.media`: `mediaUrlSchema` refuses `data:`
 * deliberately and a specimen may reach no network, so the one thing that can
 * stand in for a product shot here is a primitive that draws its own chrome.
 */
const split = (ids: IdFactory) =>
  buildElement(ids, {
    type: "loom.hero",
    props: { backdrop: "aurora", align: "start", eyebrow: EYEBROW },
    children: [
      buildSlot(ids, "heading", [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 1, balance: true },
          children: [buildText(ids, HEADLINE)],
        }),
      ]),
      lead(ids, "start"),
      actions(ids),
      buildSlot(ids, "media", [
        buildElement(ids, {
          type: "loom.frame",
          props: { chrome: "browser", label: "loom.dev/how-it-works" },
          children: [
            buildElement(ids, {
              type: "loom.stack",
              props: { direction: "column", gap: "snug" },
              children: [
                buildElement(ids, {
                  type: "loom.heading",
                  props: { level: 3 },
                  children: [buildText(ids, "What changed")],
                }),
                buildElement(ids, {
                  type: "loom.prose",
                  props: { size: "small", tone: "muted" },
                  children: [
                    buildText(
                      ids,
                      "One insert, one move, and the record of who proposed each — the page before the walk and the page after it."
                    ),
                  ],
                }),
              ],
            }),
          ],
        }),
      ]),
    ],
  })

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [frontDoor(ids), split(ids)],
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-28-primitives-heros-two-measures",
  title: "The front door's hero and a split hero, under all three starter palettes",
  build,
  themes: [
    {
      label: "minimal",
      selection: themeSelectionSchema.parse({
        palette: "minimal",
        fontPack: "minimal-sans",
        stylePreset: "precise",
      }),
    },
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
