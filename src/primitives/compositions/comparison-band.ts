import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Us against the two things a visitor is already using.
 *
 * The band that closes a sale a `pricing` band opens. `pricingBand` answers
 * *what does it cost*; this one answers *why this rather than the thing I have*,
 * and the original nine had no way to ask it.
 *
 * ## The steer is a position, and that is not a shortcut
 *
 * `loom.comparison-table` takes `feature: "first"`, which tints the column the
 * page is arguing for. A column is **not a node** — in a two-dimensional band
 * the rows are nodes and the columns are positions — so the steer can only be
 * expressed positionally, and the primitive says so in its own comment. The
 * consequence worth knowing before rearranging: **moving the subject to the
 * middle means changing `feature` as well as the cells**, because nothing ties
 * the tint to the heading it is under.
 *
 * ## Why `partial` appears, and why it is on us
 *
 * Three marks are available — `yes`, `no`, `partial` — and a comparison band
 * where the first column is `yes` all the way down is an advertisement rather
 * than a comparison; a reader discounts the whole table on sight. The honest
 * shape is the one here: the subject loses a row, on a real axis, and says why
 * in the note. That is an editorial judgement a starting composition is
 * entitled to make, because the alternative ships a table whose credibility
 * problem is invisible to every check in this repository.
 *
 * ## The row heading is a prop, the cells are children
 *
 * `loom.comparison-row` carries its criterion as `heading` and holds a
 * `loom.comparison` per column. That is 0052 read off the shape: the criterion
 * is one fixed field of the row, and the answers are repeated content — so
 * adding a fourth competitor is an `insert` into every row rather than a prop
 * nobody predicted.
 */
const ROWS = [
  {
    heading: "Every change is reviewable before it lands",
    marks: ["yes", "no", "partial"],
    notes: [undefined, undefined, "Diffs only, no reasoning"],
  },
  {
    heading: "Undo is one operation, not a restore",
    marks: ["yes", "no", "no"],
    notes: [undefined, undefined, undefined],
  },
  {
    heading: "Works against the page as it stands",
    marks: ["yes", "partial", "yes"],
    notes: [undefined, "Re-plans on request", undefined],
  },
  {
    heading: "Runs without sending your source anywhere",
    marks: ["partial", "yes", "no"],
    notes: ["Self-hosted only", undefined, undefined],
  },
  {
    heading: "Priced per seat rather than per generation",
    marks: ["yes", "yes", "no"],
    notes: [undefined, undefined, undefined],
  },
] as const

const COLUMNS = ["Overture", "Hand-rolled", "The incumbent"] as const

export const comparisonBand: Composition = {
  id: "comparison",
  label: "Comparison",
  promise: "A five-row comparison table against two alternatives, with the first column steered.",
  rationale:
    "A comparison band is a loom.comparison-table whose columns region names the subjects and whose children are a loom.comparison-row per criterion, each holding a loom.comparison per column. Every row is a node, so a criterion can be added or dropped without touching the rest.",
  uses: ["loom.section", "loom.heading", "loom.comparison-table", "loom.comparison-row", "loom.comparison"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Against what you have", anchor: "comparison" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "What changes, and what we do not claim")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.comparison-table",
          props: { feature: "first", caption: "Compared on the four axes teams ask about first." },
          children: [
            /**
             * The subjects go in a `loom.comparison-row` *inside* the slot, not
             * as bare cells in it. That is not decoration: the row is what puts
             * them in the same columns the body rows use, and the first
             * screenshot of this band showed what happens without it — every
             * mark one column right of its heading, and the steered tint on the
             * competitor instead of the subject. It renders, it registers, and
             * it is wrong, which is the class of defect only a picture catches.
             */
            buildSlot(ids, "columns", [
              buildElement(ids, {
                type: "loom.comparison-row",
                props: {},
                children: COLUMNS.map((column) =>
                  buildElement(ids, {
                    type: "loom.comparison",
                    props: { role: "subject" },
                    children: [buildText(ids, column)],
                  })
                ),
              }),
            ]),
            ...ROWS.map((row) =>
              buildElement(ids, {
                type: "loom.comparison-row",
                props: { heading: row.heading },
                children: row.marks.map((mark, column) =>
                  buildElement(ids, {
                    type: "loom.comparison",
                    props: {
                      mark,
                      ...(row.notes[column] === undefined ? {} : { note: row.notes[column] }),
                    },
                  })
                ),
              })
            ),
          ],
        }),
      ],
    }),
}
