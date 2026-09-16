import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, size, space, weight } from "./tokens.js"

/**
 * One criterion, answered across every subject in the table.
 *
 * The row is where the asymmetry of a two-dimensional band shows up, and it is
 * worth stating plainly because reading 0052 quickly produces the wrong answer
 * here. Within one row there is **exactly one** criterion and **many**
 * answers. So the criterion is a fixed field and stays a prop — the same call
 * `loom.tier` makes with `name` and `loom.stat` with `label` — while the
 * answers are repeated content and become child nodes. A `heading` prop and a
 * `cells` prop would be one right decision and one delta in disguise sitting
 * in the same schema.
 *
 * **The first cell is always emitted, whether or not there is a heading.** It
 * is the corner of the header row and it is empty there, and it is the criterion
 * everywhere else. A row that skipped it when `heading` was absent would shift
 * its answers one column to the left of the subjects they belong to, which is
 * a table that lies rather than a table that is missing a label — and no test
 * that merely rendered it would notice.
 *
 * That first cell is also the one that stays put. On a screen too narrow for
 * the band, the table scrolls sideways inside its wrapper and the criterion
 * sticks to the leading edge, because a row of ticks with the question scrolled
 * off is the phone rendering of every comparison table that was never tried on
 * a phone.
 */

const props = z
  .object({
    /**
     * The criterion this row answers — "Reversible", "Runs offline". Rendered
     * as the row's `<th scope="row">`, which is what a screen reader reads back
     * with each answer in it.
     *
     * Optional, and its absence is the header row: there the leading cell is
     * the empty corner above the criteria, and the subjects are the children.
     */
    heading: z.string().min(1).max(120).optional(),
    /** A qualifier the criterion should not carry — "on the paid plans". */
    note: z.string().min(1).max(140).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * **The criterion column's width is no longer here**, and the move is
 * [0155](../../decisions/0155-a-container-may-only-add-to-its-children-what-they-left-unspoken.md)
 * in the second place it has bitten.
 *
 * It was `min-width: 12rem`, set inline on the cell below, and at 390px it took
 * 192 of the band's 348 pixels — leaving one subject and a blank sliver of the
 * next. A rule could have narrowed it for a phone and no rule could reach it,
 * because an inline style beats one. It is `.loom-compare .loom-compare-key` in
 * `stylesheet.ts` now, at twelve rem still, and nine on a narrow screen.
 */

export const loomComparisonRow = definePrimitive({
  type: "loom.comparison-row",
  description:
    "One row of a loom.comparison-table — a criterion, and a loom.comparison answering it for each subject.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "tr",
      { ...loom.editable, className: LIBRARY_CLASS.compareRow },
      createElement(
        given.heading === undefined ? "td" : "th",
        {
          ...(given.heading === undefined ? {} : { scope: "row" }),
          className: LIBRARY_CLASS.compareKey,
          style: {
            /** The table sets it — see `loom.comparison` for why not here. */
            textAlign: "start",
            verticalAlign: "middle",
            fontFamily: family("body"),
            fontWeight: weight("body"),
            fontSize: size(3),
            lineHeight: 1.4,
            color: colour("fg-default"),
          },
        },
        given.heading ?? null,
        given.note === undefined
          ? null
          : createElement(
              "span",
              {
                className: LIBRARY_CLASS.compareNote,
                style: { display: "block", marginBlockStart: space(1), fontSize: size(1), lineHeight: 1.4 },
              },
              given.note
            )
      ),
      children
    ),
})
