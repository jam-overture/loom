import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { LIBRARY_CLASS } from "./stylesheet.js"

/**
 * One row of a `loom.table` — its cells, and nothing else.
 *
 * `loom.comparison-row` carries its criterion as a `heading` prop, because in
 * that band there is exactly one criterion per row and many answers, and 0052
 * sends the fixed field to a prop. A general table does not have that
 * asymmetry: it may have no heading column, one, or two, and the heading is a
 * cell like any other with `role: "row"` set on it. Putting it in a prop here
 * would make the two-heading table unsayable and the no-heading table carry an
 * empty leading cell it never asked for.
 *
 * So the row is the second empty schema of its kind in this library, after
 * `loom.list-item`, and for the same reason: every candidate prop belonged one
 * level up or one level down. Except one.
 *
 * **`tone` is the one thing that is genuinely the row's**, and it is here rather
 * than on its cells for exactly the argument
 * [0084](../../decisions/0084-in-a-two-dimensional-band-rows-are-nodes-and-columns-are-positions.md)
 * makes about a featured column. A totals row, a recommended plan, the release
 * a changelog is about: the tint is one decision, and set on each cell it would
 * be one decision stored five times with nothing keeping the copies in step.
 * The difference from 0084's case is that a row *has a node* — this one — so it
 * needs no enumerated ordinal and no static rule keyed on position. It is
 * simply a prop on the thing it is about, which is what 0084 wanted all along
 * and could not have on the other axis.
 */

const props = z
  .object({
    /**
     * `highlight` tints the whole row and holds the tint under a pointer, which
     * `plain` does not — a row a page is pointing at should not stop being
     * pointed at because a reader moved the mouse.
     */
    tone: z.enum(["plain", "highlight"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomTableRow = definePrimitive({
  type: "loom.table-row",
  description: "One row of a loom.table — a loom.table-cell per column.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "tr",
      {
        ...loom.editable,
        className: [LIBRARY_CLASS.tableRow, given.tone === "highlight" ? LIBRARY_CLASS.tableHighlight : undefined]
          .filter((name) => name !== undefined)
          .join(" "),
      },
      children
    ),
})
