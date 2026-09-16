import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Five features in cells of unequal width — the band that stopped looking like
 * a table of contents.
 *
 * `featuresBand` already exists and this is not a second one wearing a hat. The
 * difference is the arrangement and it is the whole point: a
 * `loom.feature-grid` gives every feature the same box, which is right when the
 * five things are peers and wrong when one of them is the reason anybody is on
 * the page. A `loom.mosaic` on the `lead` rhythm runs the first cell across the
 * top and sets the rest beneath it, so the band says *this one, then these
 * four* without a word of copy doing that work.
 *
 * This is the first composition in the catalogue that is a **second
 * arrangement of a content model already in it**, which is worth naming because
 * it is the shape the rest of the catalogue's growth will take. It is legitimate
 * here for the reason [0054](../../../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
 * makes a second container legitimate: the children are identical
 * `loom.feature` nodes, so swapping the two bands is one `configure` on the
 * container and nothing else — and a page that outgrows the emphasis can go
 * back to a grid without rewriting five features.
 *
 * ## Why four, and the count is doing design work
 *
 * `lead` runs the first child across the top and lets the rest auto-fit
 * beneath, which is three at a wide width. So **four is the count that closes
 * the shape**: one across, three under it, no ragged row.
 *
 * It shipped as five and the screenshot is what caught it — the fifth cell
 * started a third row on its own, narrow and alone on the left, which reads as
 * a mistake rather than as a rhythm. Nothing failed: a mosaic takes any number
 * of children and every test passed. The count is a design decision this band
 * makes, which is unusual enough to say out loud, and it is why adding a fifth
 * is not a neutral edit — the next tidy number is seven.
 *
 * ## The icons are one character each
 *
 * `loom.feature` takes `icon` as a string of at most four characters, which is
 * an emoji or a symbol rather than an asset. That is the same constraint
 * `heroBand` meets over images, arriving somewhere it costs nothing: a glyph
 * needs no file, no host `public/`, and no third-party request, and it re-themes
 * with the text around it because it *is* text.
 */
const FEATURES = [
  {
    icon: "◆",
    title: "Every change is a diff you can read",
    body: "Nothing is applied until somebody who can judge it has seen what it does, in the words of the page rather than the words of a model.",
  },
  { icon: "↺", title: "Undo is one operation", body: "Not a restore, not a redeploy. The inverse was computed when the change was." },
  { icon: "◷", title: "It plans against now", body: "Against the page as it stands when it runs, never as it stood when somebody asked." },
  { icon: "◫", title: "The vocabulary is yours", body: "Register your own primitives and they are as reachable as the ones that ship." },
] as const

export const bentoBand: Composition = {
  id: "bento",
  part: "bento",
  label: "Feature mosaic",
  promise: "Four features in cells of unequal width, with the first running across the top.",
  rationale:
    "A bento band is a loom.mosaic on the lead rhythm holding a loom.feature per cell. The children are the same nodes a loom.feature-grid takes, so the arrangement is one configure away from an even grid and back.",
  uses: ["loom.section", "loom.heading", "loom.mosaic", "loom.feature"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "What it does", anchor: "features" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "One of these is the reason, and four are the rest")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.mosaic",
          props: { rhythm: "lead", gap: "normal" },
          children: FEATURES.map((feature) =>
            buildElement(ids, {
              type: "loom.feature",
              props: { icon: feature.icon, title: feature.title, body: feature.body, surface: "card" },
            })
          ),
        }),
      ],
    }),
}
