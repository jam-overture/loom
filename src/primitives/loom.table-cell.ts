import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, size, weight } from "./tokens.js"

/**
 * One cell of a `loom.table` — a value, a label, or a sentence.
 *
 * It is the general table's answer to `loom.comparison`, and the difference
 * between the two is the whole reason both exist. A comparison cell holds a
 * *verdict*: the primitive draws the glyph, so a proposal cannot put a tick
 * beside something a reader does not get. This one holds **whatever the tree
 * puts in it** — a number, a word, a `loom.emphasis`, a `loom.link`, a
 * `loom.code-span`, a `loom.badge` — because an ordinary table's cells are
 * ordinary content and a closed set of three marks is not what a course, a
 * changelog or a spec sheet is made of.
 *
 * That is 0052's third clause: the cell's value is prose, so it is `text`
 * children rather than a `value` prop, and a cell that has to say
 * *`ChangeInterpreter`, from v2* can hold two nodes instead of one string with
 * the markup burnt into it.
 *
 * **`role` is what makes this a table rather than a grid of boxes.** A
 * `<th scope="col">` is what a screen reader reads back when it reaches this
 * column six rows later, and a `<th scope="row">` is what turns the ninth cell
 * from *No* into *Reversible, Codegen, No*. It is a display mode by 0052 — a
 * closed set of three renderings of one content model, one `configure` apart —
 * and a library that could not say which cells were headers would be drawing a
 * table and shipping a mosaic.
 *
 * **Why alignment is here and not on the container.**
 * [0084](../../decisions/0084-in-a-two-dimensional-band-rows-are-nodes-and-columns-are-positions.md)
 * sends a *column-scoped* decision to the container, because no node is "the
 * second column" and a decision stored once per cell has nothing keeping the
 * copies in step. That rule is about decisions the column makes as a whole —
 * `loom.comparison-table`'s `feature` tint, which says *this is the plan we
 * want you on*. Alignment is not one of those. It is a fact about what a cell
 * *holds*: a number sits against the column's trailing edge and a word sits
 * against its leading one, which is why HTML put the attribute on the cell and
 * CSS puts the property there. A totals row proves it — the label reads left,
 * the figure beneath the figures reads right, and they are in the same column
 * as each other's opposite.
 *
 * The enumerated-ordinal machinery 0084 needs would also not survive the move:
 * a comparison has at most four subjects and four rules already written, and a
 * general table has as many columns as somebody types.
 */

const props = z
  .object({
    /**
     * `column` is a heading across the top — the cell that belongs in a
     * `loom.table`'s `columns` region. `row` is a heading down the side, and is
     * the cell that stays put when a wide table scrolls inside its panel.
     * `data` is the default and is an ordinary cell.
     */
    role: z.enum(["data", "column", "row"]).optional(),
    /**
     * Defaults to the trailing edge for a numeric cell and the leading one
     * otherwise, which is the alignment each wants in every table anybody has
     * drawn. Set it to align a column's heading over its figures.
     */
    align: z.enum(["start", "center", "end"]).optional(),
    /**
     * Sets the figures in this cell as tabular — every digit the same width, so
     * a column of numbers lines up digit under digit rather than drifting with
     * whichever glyphs happen to be in it.
     *
     * It is typography rather than content: nothing here parses the cell or
     * changes what it says, and a cell holding "3 seats" is as entitled to it as
     * one holding "1,204". A face without tabular figures ignores it and loses
     * nothing.
     */
    numeric: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const ELEMENTS: Readonly<Record<NonNullable<Props["role"]>, { element: "th" | "td"; scope?: "col" | "row" }>> = {
  data: { element: "td" },
  column: { element: "th", scope: "col" },
  row: { element: "th", scope: "row" },
}

const ALIGNMENTS: Readonly<Record<NonNullable<Props["align"]>, "start" | "center" | "end">> = {
  start: "start",
  center: "center",
  end: "end",
}

export const loomTableCell = definePrimitive({
  type: "loom.table-cell",
  description:
    "One cell of a loom.table, holding whatever is put in it. Set role to column or row for a heading a screen reader can read back.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const { element, scope } = ELEMENTS[given.role ?? "data"]
    const heading = element === "th"
    const numeric = given.numeric === true
    const align = ALIGNMENTS[given.align ?? (numeric ? "end" : "start")]

    return createElement(
      element,
      {
        ...loom.editable,
        ...(scope === undefined ? {} : { scope }),
        /**
         * Only the row heading is named, and only so the table can keep it in
         * place while the columns travel under it. A column heading needs no
         * class because nothing about it varies with where the table is.
         */
        className: given.role === "row" ? LIBRARY_CLASS.tableKey : undefined,
        style: {
          /**
           * No padding here. Density is the table's decision — one band is a
           * spec to scan and another is a page to read, and neither is a
           * property of one cell — so the length is a rule the container
           * switches, and an inline value would make that rule inert.
           */
          textAlign: align,
          verticalAlign: "top",
          fontFamily: heading ? family("heading") : family("body"),
          /**
           * `bolder` rather than `weight("heading")`, which is the difference
           * between a header row and no header row under one registered pack.
           *
           * A heading cell's whole job is to be distinguishable from the cells
           * under it, and a token promises only that a value came from the theme
           * — never that it differs from the one beside it. `bold-sans` declares
           * `headingWeight: 400` beside `bodyWeight: 400`, which is a legitimate
           * pack that carries its emphasis in size and face; under it a
           * `weight("heading")` header row renders **identical** to its own data,
           * and `<th>`'s browser default is overridden into normal on the way.
           * `bolder` is relative to the inherited weight by definition, so it is
           * heavier under every registered pack and under one nobody has written
           * yet. It is the fix `loom.emphasis` took on 23 August for the same
           * reason, and `src/primitives/tokens.ts` carries the general warning.
           */
          fontWeight: heading ? "bolder" : weight("body"),
          fontSize: size(3),
          lineHeight: 1.5,
          color: colour("fg-default"),
          ...(numeric ? { fontVariantNumeric: "tabular-nums" } : {}),
        },
      },
      children
    )
  },
})
