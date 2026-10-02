import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Four cells, four registers: a sentence somebody said, a figure, a list of what
 * is in the box, and the product drawing itself.
 *
 * ## What makes this a different design rather than a different mosaic
 *
 * `bentoBand` is four `loom.feature` nodes in cells of unequal width, and its
 * own comment is clear about what that arrangement says — *this one, then these
 * four*. Every cell is the same kind of thing and the rhythm is what carries the
 * emphasis.
 *
 * This band's cells are **four different primitives**, and the arrangement is
 * carrying something else: a bento is the one band on a page where the registers
 * are allowed to disagree. A number beside a quotation beside a checklist beside
 * a window is not a layout trick, it is the band saying *here is the case, in
 * every form it comes in* — and it is what the reference bentos on 21st.dev are
 * actually made of, which is the thing a grid of four identical tiles cannot be
 * configured into.
 *
 * So the two designs of this part differ in the way 0162 requires and in the way
 * that matters: not a `rhythm` away from each other, but a different set of
 * nodes answering a different question.
 *
 * ## The rhythm is `alternating`, and the count is the rhythm's
 *
 * `loom.mosaic`'s `alternating` cycle is wide, narrow, narrow, wide — so four
 * children close it exactly, with no cell starting a row alone. `bentoBand`
 * learned the same lesson from a photograph and wrote it down: the count a
 * mosaic band ships is a design decision rather than a neutral number, and the
 * next tidy number here is eight rather than five.
 *
 * Which content gets which width is then decided for it. The two wide cells hold
 * the two things that are wider than they are tall — a sentence set large, and a
 * window with code in it. The two narrow ones hold the two that are not: one
 * figure, and four short rows.
 *
 * ## Every cell is a `loom.card`, and that is deliberate uniformity
 *
 * The contents disagree; the surfaces must not. Four different primitives each
 * drawing their own ground — `loom.quote`'s `card` emphasis, `loom.feature`'s
 * `surface`, a bare `loom.stat` on the canvas — is four slightly different boxes
 * in one band, which reads as four bands that have been pushed together. One
 * `loom.card` per cell with the same `tone` and the same `padding` is the frame
 * the mosaic needs, and it leaves each child doing only its own job.
 *
 * It also means a cell's content is replaceable by one `insert` into a card that
 * is already there, which is the half of this that a tree gets to use.
 *
 * ## Why the window holds the tree and not a diff
 *
 * `bentoBand`'s wide cell holds a `configure` operation, because the claim
 * beside it is *every change is a diff you can read*. The claim here is the one
 * underneath that one and the page asserts it everywhere without ever showing
 * it: **the page is data**. So the window holds a fragment of the tree itself,
 * and the fragment is **this band's own first cell** — which is checkable
 * against the quotation a reader has just read rather than invented syntax, and
 * is the one thing in the band a developer will read twice.
 *
 * Its heading says *the quotation above* rather than *the cell on the left*,
 * and the correction came from the photograph. On a 1280px page the quotation
 * is indeed to the left; on a 390px one the four cells are a column and the
 * only true relation between them is order. A caption that is right at one
 * width and wrong at the other is the class of defect a sheet photographed at
 * one viewport never shows.
 *
 * Nothing in it is an asset. `loom.frame` draws its own chrome, which is
 * `hero-split-band`'s rule — *a product surface built out of the library is
 * worth more than a screenshot* — and it re-themes with the page because every
 * colour in it is the palette's.
 *
 * **Set one property per line**, for the measurement `bentoBand` records: a
 * `loom.code` panel puts a line too long for it behind a horizontal scroll, and
 * in a narrow mosaic cell on a 390px phone that panel is around thirty
 * characters wide.
 */
const TREE = `{
  "type": "loom.quote",
  "props": {
    "quote": "We stopped…",
    "author": "Nadia Okonjo",
    "role": "Head of Web",
    "emphasis": "feature"
  }
}`

const INCLUDED = [
  "Every primitive on this page",
  "The record behind every change",
  "Undo with no window on it",
  "Your own primitives, registered",
] as const

export const bentoMixedBand: Composition = {
  id: "bento-mixed",
  part: "bento",
  label: "Feature mosaic, four registers",
  promise:
    "Four cells of unequal width holding four different kinds of thing: a quotation, a figure, a checklist, and the product drawing itself.",
  rationale:
    "A mixed mosaic is a loom.mosaic on the alternating rhythm holding one loom.card per cell, each card holding a different primitive — a loom.quote, a loom.stat, a loom.perk-list, and a loom.frame over a loom.code panel. The cards are uniform and their contents are not, so a cell's content can be replaced by one insert into the card that is already there.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.mosaic",
    "loom.card",
    "loom.quote",
    "loom.stat",
    "loom.perk-list",
    "loom.perk",
    "loom.frame",
    "loom.code",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      /**
       * The same fragment `bentoBand` answers to, because an anchor belongs to
       * the part and not to the design (0165): a nav link written against one
       * has to keep resolving when a host swaps in the other.
       */
      props: { width: "wide", eyebrow: "What it does", anchor: "what-it-does" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "The case, in each of the forms it comes in")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "lead", tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "A number, a sentence somebody said, the list of what you get, and the thing itself with its lid off."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.mosaic",
          props: { rhythm: "alternating", gap: "normal" },
          children: [
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "surface", padding: "loose" },
              children: [
                buildElement(ids, {
                  type: "loom.quote",
                  props: {
                    quote:
                      "We stopped shipping copy changes in release trains. The page is the thing under review now, and the review takes a minute.",
                    author: "Nadia Okonjo",
                    role: "Head of Web, Marbleworks",
                    emphasis: "feature",
                  },
                }),
              ],
            }),
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "surface", padding: "loose" },
              children: [
                buildElement(ids, {
                  /**
                   * No `magnitude`, and that is the one prop worth explaining
                   * by its absence. A magnitude makes `loom.stat` plot itself,
                   * which is what `metricsChartBand` is for and is wrong here:
                   * a single figure in a bento cell has nothing to be a
                   * proportion *of*, and a bar beside it would be a chart of
                   * one column.
                   */
                  type: "loom.stat",
                  props: {
                    value: "11s",
                    label: "median time to a reviewed change",
                    caption: "Measured from the instruction to the approval, across the last ninety days.",
                  },
                }),
              ],
            }),
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "surface", padding: "loose" },
              children: [
                buildElement(ids, {
                  type: "loom.heading",
                  props: { level: 3 },
                  children: [buildText(ids, "In every plan")],
                }),
                buildElement(ids, {
                  type: "loom.perk-list",
                  props: { columns: "one", density: "tight" },
                  children: INCLUDED.map((label) =>
                    buildElement(ids, {
                      type: "loom.perk",
                      props: { label, state: "included" },
                    })
                  ),
                }),
              ],
            }),
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "surface", padding: "loose" },
              children: [
                buildElement(ids, {
                  type: "loom.heading",
                  props: { level: 3 },
                  children: [buildText(ids, "The quotation above, as the page holds it")],
                }),
                buildElement(ids, {
                  type: "loom.frame",
                  props: { chrome: "window", label: "page.tree.json" },
                  children: [
                    buildSlot(ids, "surface", [
                      buildElement(ids, {
                        type: "loom.code",
                        props: { language: "page.tree.json", tone: "source" },
                        children: [buildText(ids, TREE)],
                      }),
                    ]),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
}
