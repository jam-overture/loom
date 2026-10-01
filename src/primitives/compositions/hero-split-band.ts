import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The other hero: the claim on one side, the product on the other.
 *
 * This is the second design of the band a page opens with, and it is in the
 * catalogue rather than being a `configure` of `hero` because of what it
 * *builds* rather than how it looks. `align: "start"` is a prop and a
 * one-operation edit; the fourteen nodes in the `media` region are a subtree
 * the centred hero does not have. That is the line the catalogue's own doc
 * comment draws, and this file is the first band on the far side of it.
 *
 * ## It closes `hero-band`'s standing excuse, and not by finding a picture
 *
 * `hero-band.ts` has carried a section called *why there is no image* since it
 * shipped, and every word of it is still true:
 *
 * > Nothing can go there: `loom.media` requires a `src`, `mediaUrlSchema`
 * > refuses `data:` deliberately, and a same-origin path names a file this
 * > library cannot put in a host's `public/`.
 *
 * All of that is about **`loom.media`**. The slot is not typed to it. A hero's
 * media region is a region (0051) and takes whatever a page puts there, and
 * what goes here is `loom.frame` holding a small product surface **built out of
 * the library** — two figures, two measures, a caption. No asset, no
 * third-party URL, no file a host has to place, and it re-themes with the page
 * because every color in it comes from the palette.
 *
 * That is worth more than a screenshot would have been, and not only because a
 * screenshot was unavailable. A picture of a product is a picture; this is the
 * product's own primitives, so a host who swaps the numbers for their real ones
 * is editing nodes rather than opening an image editor.
 *
 * ## The chrome is decoration and says so
 *
 * `loom.frame` hides its own chrome from assistive technology — its doc comment
 * is explicit that *a fake address bar read out as an address is a page lying
 * to somebody who cannot see it*. `acme.dev/board` is therefore safe to write
 * and is never announced. What **is** announced is everything on the surface,
 * because those are ordinary nodes; a reader who cannot see the frame still
 * gets the four numbers, which is the part that carries the claim.
 *
 * ## Why the figures are the ones they are
 *
 * A product surface in a hero is the most common place in this whole catalogue
 * to write a lie. These are deliberately modest and internally consistent —
 * 1,284 changes against 96% reviewed is a number a reader can check against the
 * bar beside it — rather than the round, enormous, unsourced figures a stock
 * hero uses. The band is a starting point somebody edits, and a starting point
 * that models good numbers is worth more than one that models impressive ones.
 */
const FIGURES: readonly { readonly value: string; readonly label: string; readonly caption: string }[] = [
  { value: "1,284", label: "Changes this quarter", caption: "Across 9 repositories" },
  { value: "4m", label: "Median time to review", caption: "Down from 41 minutes" },
]

const MEASURES: readonly { readonly value: number; readonly label: string; readonly readout: string }[] = [
  { value: 96, label: "Reviewed before landing", readout: "96%" },
  { value: 71, label: "Landed the same day", readout: "71%" },
]

/**
 * The surface inside the chrome: two figures over two bars.
 *
 * A `loom.grid` rather than a `loom.split` for the figures, because `columns`
 * here is a floor and not a count — the pair sits side by side in a hero that
 * has room and stacks in one that does not, with nothing measuring anything.
 * The same reasoning `loom.feature-grid`'s `columns` gets in the granularity
 * doc, and the reason a third figure could be added to `FIGURES` without any
 * other edit.
 */
const surface = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.stack",
    props: { direction: "column", gap: "loose" },
    children: [
      buildElement(ids, {
        type: "loom.grid",
        props: { columns: "two", gap: "normal" },
        children: FIGURES.map((figure) =>
          buildElement(ids, {
            type: "loom.stat",
            props: { value: figure.value, label: figure.label, caption: figure.caption },
          })
        ),
      }),
      buildElement(ids, {
        type: "loom.stack",
        props: { direction: "column", gap: "snug" },
        children: MEASURES.map((measure) =>
          buildElement(ids, {
            type: "loom.meter",
            props: {
              value: measure.value,
              label: measure.label,
              readout: measure.readout,
              shape: "bar",
              tone: "accent",
            },
          })
        ),
      }),
    ],
  })

export const heroSplitBand: Composition = {
  id: "hero-split",
  part: "hero",
  label: "Hero, split with a product surface",
  promise:
    "An opening band with the headline and two buttons on one side, and a framed product surface of live figures on the other.",
  rationale:
    "A split hero is a loom.hero whose media region holds a loom.frame over a small surface built from the library itself — two loom.stat figures and two loom.meter bars. Every number is an ordinary node, so the figures can be replaced with real ones without touching the band, and nothing here is an image.",
  uses: [
    "loom.hero",
    "loom.heading",
    "loom.prose",
    "loom.action",
    "loom.frame",
    "loom.stack",
    "loom.grid",
    "loom.stat",
    "loom.meter",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.hero",
      props: {
        backdrop: "panel",
        stature: "standard",
        align: "start",
        eyebrow: "Built for review",
        anchor: "top",
      },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 1, balance: true },
            children: [buildText(ids, "See what changed before it changes")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "lead", tone: "muted", measured: true },
          children: [
            buildText(
              ids,
              "Every edit arrives as a proposal with its reasoning attached. Read it, keep it, or put it back — in one operation."
            ),
          ],
        }),
        buildSlot(ids, "actions", [
          buildElement(ids, {
            type: "loom.action",
            props: { href: "/start", variant: "primary", scale: "large" },
            children: [buildText(ids, "Start free")],
          }),
          buildElement(ids, {
            type: "loom.action",
            props: { href: "/tour", variant: "quiet", scale: "large" },
            children: [buildText(ids, "Take the tour")],
          }),
        ]),
        buildSlot(ids, "media", [
          buildElement(ids, {
            type: "loom.frame",
            props: { chrome: "browser", label: "acme.dev/board" },
            children: [buildSlot(ids, "surface", [surface(ids)])],
          }),
        ]),
      ],
    }),
}
