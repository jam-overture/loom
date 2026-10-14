import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * One measure in two states, superimposed, with the reader holding the edge
 * between them.
 *
 * ## Why this is a third design of the part and not a fourth band
 *
 * `comparison` is a table of rival columns and `comparison-ways` is two cards
 * of opposed perks. Both lay the two things **side by side, permanently**, and
 * both are comparisons of *rivals* — this against that, at one moment. Neither
 * can put the two in the **same space**, which is the only way to compare one
 * thing against itself over time: a table with an *April, before* column and an
 * *April, after* column beside it is two numbers a reader has to hold in their
 * head and subtract.
 *
 * A wipe does the subtraction with a gesture. The region it occupies that the
 * other two cannot is *the same box, twice*, and the test 0162 sets is met on
 * nodes rather than on taste — `loom.before-after` and `loom.stat-chart` appear
 * in no other design of this part, and there is no sequence of `configure`
 * operations against a `loom.comparison-table` that produces them.
 *
 * ## The first band to reach `loom.before-after`, and why it took so long
 *
 * `loom.before-after` has been registered and unreached since it was ported,
 * carried in four consecutive reports under *needs an image source*. It does
 * not need one: `before` and `after` are **slots** (0051) and the primitive has
 * no URL prop at all. What was missing was not an asset but the observation
 * that a wipe does not have to be a wipe of photographs.
 *
 * ## Why a chart, and why text would have been wrong
 *
 * This is the part of the band that is a real constraint rather than a
 * preference. **A wipe clips, so whatever is in the two regions is cut at
 * whatever column the reader leaves the divider in.** That is right for
 * anything spatially continuous — a photograph, a map, a plot — and wrong for
 * prose, which gets cut mid-word and reads as a rendering fault at every
 * position except the two ends. A before/after of two paragraphs would satisfy
 * every schema in this repository and be unreadable on the page.
 *
 * A bar chart is the image-free content that survives the clip: each bar is
 * whole or absent, the axis is continuous, and the comparison is legible at
 * every divider position rather than only at 5 and 95.
 *
 * ## The two charts carry the same ceiling, and that is load-bearing
 *
 * Both `loom.stat-chart` nodes declare `max: 100`. This is not tidiness — a
 * wipe of two charts drawn to **different** ceilings is a band whose entire
 * claim is false, because the bar heights either side of the divider are then
 * in different units and the reader is invited to compare them anyway. It is
 * the sharpest instance yet of the pair the 10 October finding is about: a
 * figure over its chart's `max` draws a full column and lies quietly, and here
 * two charts can lie about each other. `compositions.test.ts` now holds the
 * ceiling over every chart in the catalogue, and this band is why the second
 * half of that check was worth writing.
 *
 * ## No `aspect`, deliberately
 *
 * Omitted, the `after` region stays in the flow and gives the band its height
 * while `before` is the absolute layer clipped over it. Both regions build the
 * **same structure with the same labels** — six months, same words, different
 * magnitudes — so the two layers are exactly the same height and the bars line
 * up column for column. An `aspect` would have forced a box and left the charts
 * to stretch inside it; identical structure is the better guarantee and it
 * costs nothing to keep.
 *
 * It is also why the months are spelled identically in both regions and only
 * the values move. A longer label on one side would wrap on that side alone,
 * and the two layers would disagree about their own height.
 *
 * **And why they are three letters.** A six-bar chart on a 390-pixel phone
 * gives each column about fifty pixels, which is narrower than the word
 * *September* — the phone shot had it broken over three lines as *Sept emb er*,
 * with the wide shot perfectly clean and every test green. Both layers wrapped
 * identically so the heights still agreed and nothing could see it. Three
 * letters is the ordinary convention for a month on an axis and it is legible
 * at both sizes the harness photographs.
 *
 * ## What is a node here, and what stayed a prop
 *
 * Every month is a `loom.stat` node in both regions — twelve nodes rather than
 * two arrays — so a quarter can be dropped from the comparison with a `remove`
 * and the inverse puts that month back rather than the whole series (0052).
 * `position` is a prop: it changes where the edge rests and adds no node, which
 * is the granularity document's sharper question. The two corner labels are
 * props for 0052's fixed-field clause — there is exactly one of each, each
 * names its region rather than being its content, and rewriting one is exactly
 * a `configure`.
 */
type Month = { readonly label: string; readonly before: number; readonly after: number }

/**
 * April is the same figure in both regions on purpose: the two series start
 * together and diverge, so the wipe reveals a decision rather than two
 * unrelated runs of numbers.
 */
const MONTHS: readonly Month[] = [
  { label: "Apr", before: 19, after: 19 },
  { label: "May", before: 23, after: 34 },
  { label: "Jun", before: 21, after: 48 },
  { label: "Jul", before: 26, after: 61 },
  { label: "Aug", before: 24, after: 74 },
  { label: "Sep", before: 28, after: 87 },
]

/** The ceiling both charts are drawn to. One constant, so the two cannot drift. */
const CEILING = 100

/**
 * The chart sits on a card, and the padding is the point rather than the card.
 *
 * `loom.before-after` anchors its two corner chips to the **bottom** corners of
 * the band, which is right for a photograph and collides exactly with a chart,
 * because a bar chart's labels live along its own bottom edge. Unpadded, *By
 * hand* sat on top of April and *Reviewed and shipped* on top of September —
 * both legible enough to pass a reading and wrong enough to notice.
 *
 * So the card is clearance. It also makes each region opaque, which the
 * primitive now guarantees for itself, and the belt is kept because this band
 * is the one that found the gap.
 */
const chart = (ids: IdFactory, side: "before" | "after"): ElementNode =>
  buildElement(ids, {
    type: "loom.card",
    props: { tone: "surface", padding: "roomy" },
    children: [
      buildElement(ids, {
        type: "loom.stat-chart",
        props: { max: CEILING, plot: "tall" },
        children: MONTHS.map((month) =>
          buildElement(ids, {
            type: "loom.stat",
            props: {
              value: `${String(month[side])}%`,
              label: month.label,
              magnitude: month[side],
            },
          })
        ),
      }),
    ],
  })

export const comparisonWipeBand: Composition = {
  id: "comparison-wipe",
  part: "comparison",
  label: "Comparison, wiped",
  promise:
    "Six months of one measure in two states, one plotted over the other, with a divider the reader drags across the band.",
  rationale:
    "A before-and-after comparison is a loom.before-after holding a loom.stat-chart in each of its two regions. Every month is a loom.stat node in both, so a quarter can be dropped from the comparison with one remove, and both charts declare the same max so the bars either side of the divider are in the same units.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.before-after",
    "loom.card",
    "loom.stat-chart",
    "loom.stat",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "The same six months, twice", anchor: "comparison" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "What changed once the page could change itself")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "small", tone: "muted", measured: true },
          children: [
            buildText(
              ids,
              "The share of requested page changes that shipped the same day. Both sides are drawn to the same scale — drag the divider to move between them."
            ),
          ],
        }),
        buildElement(ids, {
          type: "loom.before-after",
          props: { position: 38, beforeLabel: "By hand", afterLabel: "Reviewed and shipped" },
          children: [
            buildSlot(ids, "before", [chart(ids, "before")]),
            buildSlot(ids, "after", [chart(ids, "after")]),
          ],
        }),
      ],
    }),
}
