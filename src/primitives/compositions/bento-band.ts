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
/**
 * What the wide cell is showing, and why the cell has something in it at all.
 *
 * The first photograph ever taken of this catalogue as a *page* found this
 * band's lead cell was a squat box: one glyph, one title and one sentence
 * stretched across 1120px with air underneath. Every reference bento earns its
 * wide cell by putting something in it that is wider than it is tall, and this
 * one was a card that happened to be long. Filed 25 September, fixed here.
 *
 * It is a diff because the cell's own sentence is *every change is a diff you
 * can read*, and a band that makes a claim beside a picture of the claim is
 * worth more than either. It is also the one thing this whole page asserts and
 * never shows: the code band shows what a developer writes, the conversation
 * band shows what somebody asks, and until now nothing showed **what comes
 * back**.
 *
 * Nothing here is an asset. It is `loom.frame`'s window chrome over a
 * `loom.code` panel, which is `hero-split-band`'s rule — *a product surface
 * built out of the library is worth more than a screenshot* — one level down,
 * and it re-themes with the page because every color in it is the palette's.
 *
 * The lines are a real `configure` against the tree this band is in, down to
 * the shape of a node id, rather than invented syntax that would be a lie a
 * reader could check.
 *
 * **It is set one property per line, and that is a measurement rather than a
 * preference.** `loom.code` puts a line too long for its panel behind a
 * horizontal scroll, deliberately and for a good reason — a command broken
 * across two rows reads as two commands. On a 390px phone this panel is about
 * thirty characters wide, so the same diff written with each `props` object on
 * one line lost the end of both changed lines off the right edge, which is the
 * one thing a diff must not do. Nine short lines fit a phone with nothing
 * hidden and nothing wrapped.
 */
const CHANGE = `  {
    "op": "configure",
    "id": "n7:heading",
    "props": {
-     "align": "start"
+     "align": "center",
+     "balance": true
    }
  }`

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
  promise: "Four features in cells of unequal width, the first running across the top with a panel beside its words.",
  rationale:
    "A bento band is a loom.mosaic on the lead rhythm holding a loom.feature per cell, and the wide first cell places a loom.frame over a loom.code panel in its media region. The children are the same nodes a loom.feature-grid takes, so the arrangement is one configure away from an even grid and back, and the panel is an ordinary subtree that can be moved to another cell or dropped.",
  uses: ["loom.section", "loom.heading", "loom.mosaic", "loom.feature", "loom.frame", "loom.code"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      /**
       * `what-it-does` rather than `features`, which is what this carried until
       * 17 September and which `features-band` also carries. Both are on the
       * canonical page, so the document had **two elements with `id="features"`**
       * and a link to `#features` reached the first of them — leaving this band
       * unaddressable by the one mechanism `anchorSchema` exists to provide.
       *
       * Nothing could see it. `anchor.ts` says so in its own header: uniqueness
       * *"is a fact about a tree"* and a per-node schema cannot check one. The
       * assertion that now can is over the assembled page rather than over this
       * file, which is
       * [0165](../../../decisions/0165-an-anchor-belongs-to-the-part-and-is-unique-over-the-assembled-page.md).
       */
      props: { width: "wide", eyebrow: "What it does", anchor: "what-it-does" },
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
          children: FEATURES.map((feature, index) =>
            buildElement(ids, {
              type: "loom.feature",
              props: { icon: feature.icon, title: feature.title, body: feature.body, surface: "card" },
              /**
               * Only the lead cell, and that is the band rather than a
               * shortcut. The rhythm's first cell is the one with room to set
               * a panel beside the words; the three under it are a third of
               * the row each, where the same subtree would turn back into a
               * column and make three tall cards out of a tidy row.
               */
              children:
                index === 0
                  ? [
                      buildSlot(ids, "media", [
                        buildElement(ids, {
                          type: "loom.frame",
                          props: { chrome: "window", label: "Overture — review" },
                          children: [
                            buildSlot(ids, "surface", [
                              buildElement(ids, {
                                type: "loom.code",
                                props: { language: "page.tree.json", tone: "source" },
                                children: [buildText(ids, CHANGE)],
                              }),
                            ]),
                          ],
                        }),
                      ]),
                    ]
                  : [],
            })
          ),
        }),
      ],
    }),
}
