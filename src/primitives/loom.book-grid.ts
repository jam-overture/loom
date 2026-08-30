import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { COLUMN_NAMES, GAP_NAMES, GAPS } from "./layout.js"
import { space } from "./tokens.js"

/**
 * A shelf of `loom.book` cells — what someone wrote, recommends, or is reading
 * right now.
 *
 * **Named `-grid` rather than the `-shelf` `docs/hermes-port-map.md` proposed**,
 * and the third time this lane has made that correction rather than the first.
 * `loom.offering-list` and `loom.credential-list` both shipped as `-grid` on 26
 * August because [0054](../../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
 * says the arrangement word names *what the container does with its children* —
 * and what this does is `repeat(auto-fit, minmax(…))`, the same expression every
 * other `-grid` in the library uses, with the same `stretch`.
 *
 * `-shelf` was the tempting name and it would have been a lie about the layout,
 * which is the specific failure 0054 exists to prevent: a model that knows
 * `loom.book` exists can guess `loom.book-grid` and be right, and a container
 * whose name promised an arrangement it does not have would cost a rename —
 * which is a breaking change to every stored tree. A real shelf is a wrapping
 * row of natural-width covers with a ragged last row, and if the library ever
 * wants one it is a different container with a different name, not this one
 * with a prop.
 *
 * The column floors are the narrowest in the library, and they are the one
 * thing about this grid that is not a copy of `loom.product-grid`. A book cell
 * is a portrait cover and two short lines, with no price on the title's row and
 * no button under it, so it reads correctly far narrower than a product does —
 * `four` here is a shelf of thirty recommendations, and `two` is the *currently
 * reading* band where each entry carries a note.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the shelf fits what it can and wraps. */
    columns: z.enum(COLUMN_NAMES).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Narrower than a product's: a portrait cover and two lines need very little width. */
const MINIMUMS = { auto: "12rem", two: "20rem", three: "14rem", four: "10rem" } as const

export const loomBookGrid = definePrimitive({
  type: "loom.book-grid",
  description:
    "A responsive shelf of loom.book cells — a bibliography, a reading list, or what is on the desk right now.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MINIMUMS[given.columns ?? "auto"]}), 1fr))`,
          gap: given.gap === undefined ? space(5) : GAPS[given.gap],
          width: "100%",
          /**
           * Equal-height cells, which is what makes a `loom.book`'s floored tag
           * row mean anything — and what puts every cover on the same line,
           * since a cover is the first thing in each cell and they are all one
           * ratio. The shelf effect is the child's, not the container's.
           */
          alignItems: "stretch",
        },
      },
      children
    ),
})
