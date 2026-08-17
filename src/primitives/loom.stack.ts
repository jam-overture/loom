import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import {
  ALIGN_NAMES,
  ALIGNMENTS,
  GAP_NAMES,
  GAPS,
  JUSTIFICATIONS,
  JUSTIFY_NAMES,
} from "./layout.js"

/**
 * Whatever it is given, in one direction, with a gap.
 *
 * Every container shipped before this one is a **named band** — a grid of
 * features, a table of tiers, a cloud of logos — and each is excellent at the
 * one page section it was named for. What none of them can say is "these two
 * things, side by side, close together", which is the arrangement a page
 * actually spends most of its nodes on: the buttons under a headline, the
 * avatar beside a name, the three lines of a footer column. Until this
 * primitive existed the only way to say it was to borrow a band that means
 * something else, and a `loom.feature-grid` holding two buttons is a tree that
 * lies about what it contains.
 *
 * **It has no child of its own**, which is why it breaks no rule by not being
 * `<something>-stack`. 0054 governs *pairs*, and says in as many words that a
 * primitive which is not half of one names itself. 0062 is where that case is
 * written down for the generic arrangers, along with the more important half:
 * a named band is still preferred wherever one exists, because
 * `loom.feature-grid` tells a model what belongs inside it and this tells it
 * nothing.
 *
 * Every prop here decides how *however many* children are arranged, and none
 * decides how many there are. `direction` is the one worth naming: two
 * primitives, a column and a row, would make "turn this row into a column" a
 * `remove` and an `insert` that loses the subtree's history, where one
 * primitive makes it a `configure`. Flipping the axis is exactly the
 * adaptation this layer exists to keep reachable.
 */

const props = z
  .object({
    direction: z.enum(["column", "row"]).optional(),
    gap: z.enum(GAP_NAMES).optional(),
    align: z.enum(ALIGN_NAMES).optional(),
    justify: z.enum(JUSTIFY_NAMES).optional(),
    /**
     * A row wraps unless told not to. Nothing in a render reads a viewport
     * (0008), so a row that cannot wrap is a row that overflows a phone — the
     * same reasoning `loom.split` gives for wrapping by flex-basis rather than
     * by media query. Set `false` for the clusters that must stay on one line,
     * like a label and the glyph that belongs to it.
     */
    wrap: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomStack = definePrimitive({
  type: "loom.stack",
  description:
    "Its children in one direction — a column or a row — with a gap, alignment, and wrapping. The general arranger; prefer a named band where one fits.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const row = given.direction === "row"

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: row ? "row" : "column",
          gap: GAPS[given.gap ?? "normal"],
          alignItems: ALIGNMENTS[given.align ?? (row ? "center" : "stretch")],
          justifyContent: JUSTIFICATIONS[given.justify ?? "start"],
          /**
           * Only a row wraps. `flex-wrap` on a column is not harmless — it
           * spills into a second column the moment anything constrains the
           * height — and a prop that means nothing in one direction should do
           * nothing there rather than something surprising.
           */
          ...(row ? { flexWrap: given.wrap === false ? "nowrap" : "wrap" } : {}),
          /**
           * No width. A stack is as wide as its parent gives it, which for a
           * block parent is the full measure and for a flex parent is whatever
           * that parent's alignment decided — and a `width: 100%` here would
           * quietly overrule an ancestor that had aligned it to the start.
           */
        },
      },
      children
    )
  },
})
