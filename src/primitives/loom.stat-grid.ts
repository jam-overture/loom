import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { space } from "./tokens.js"

/**
 * The decomposition one. Hermes' `stats` block held its numbers in an `items`
 * array of `StatItem` shapes; here the grid is a primitive and each number is a
 * `loom.stat` child.
 *
 * That is the port's central choice (0052). A repeated item becomes a child
 * node, so adding one is an `insert`, removing one is a `remove`, reordering is
 * a `move`, and each is attributable to whoever proposed it and reversible on
 * its own. As an array prop, every one of those is a `configure` that replaces
 * the whole list — the analysis cannot say which item changed, the inverse
 * restores all of them, and there is no node to attribute.
 *
 * The grid does not enforce that its children are stats. Rendering is total
 * (0008), and a grid that blanked itself over an unexpected child would be a
 * worse failure than a grid with something odd in one cell.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the grid fits what it can and wraps. */
    columns: z.enum(["auto", "two", "three", "four"]).optional(),
    align: z.enum(["start", "center"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const MINIMUMS = { auto: "12rem", two: "20rem", three: "13rem", four: "9rem" } as const

export const loomStatGrid = definePrimitive({
  type: "loom.stat-grid",
  description: "A responsive grid of loom.stat children — the “by the numbers” band.",
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
          gap: space(5),
          width: "100%",
          /**
           * Absent means inherit. This grid arranges its columns on the inline
           * axis with `auto-fit` rather than with `align-items`, so it has
           * nothing of its own for a text alignment to agree with, and under
           * 0207 that makes it a glyph arranger rather than a band.
           */
          ...(given.align === undefined ? {} : { textAlign: given.align }),
        },
      },
      children
    ),
})
