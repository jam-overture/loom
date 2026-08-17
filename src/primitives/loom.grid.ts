import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ALIGN_NAMES, ALIGNMENTS, COLUMN_MINIMUMS, COLUMN_NAMES, GAP_NAMES, GAPS } from "./layout.js"

/**
 * Whatever it is given, in as many columns as will fit.
 *
 * `loom.stack`'s other axis, and the same argument for existing: the library
 * had three grids before this one — features, stats, quotes — and every one of
 * them insisted on what it held. A grid of cards, a grid of two images, a grid
 * of anything nobody has ported yet: all of them had to borrow
 * `loom.feature-grid` and render features that were not features.
 *
 * The columns are a **floor, not a count**, which is the distinction the
 * granularity doc calls the easiest one to get wrong: `three` sets a minimum
 * width that yields three columns at a page width and one on a phone, and it
 * truncates nothing. Changing it changes no node, so it is a prop rather than
 * `remove` in disguise. A `columns: 3` that dropped the fourth child would be
 * the other thing entirely.
 *
 * It shares its minimums with `loom.feature-grid` (`layout.ts`) rather than
 * restating them, so the two wrap at the same widths — a page that mixes them
 * should break in one place, not two.
 *
 * Naming: see `loom.stack`. This is a general arranger with no child of its
 * own, so it is `loom.grid` and not `<something>-grid`, and the stem rule in
 * 0054 is untouched — nothing here ends in `-grid`.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the grid fits what it can and wraps. */
    columns: z.enum(COLUMN_NAMES).optional(),
    gap: z.enum(GAP_NAMES).optional(),
    align: z.enum(ALIGN_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomGrid = definePrimitive({
  type: "loom.grid",
  description:
    "Its children in as many columns as fit, wrapping intrinsically. The general grid; prefer a named band where one fits.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "grid",
          /**
           * `min(100%, …)` rather than the minimum alone: without it a floor
           * wider than the viewport makes the single remaining column overflow
           * rather than shrink, which is the one way an intrinsically
           * responsive grid still manages to scroll sideways on a phone.
           */
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${COLUMN_MINIMUMS[given.columns ?? "auto"]}), 1fr))`,
          gap: GAPS[given.gap ?? "normal"],
          alignItems: ALIGNMENTS[given.align ?? "stretch"],
          width: "100%",
        },
      },
      children
    ),
})
