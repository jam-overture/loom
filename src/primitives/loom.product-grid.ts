import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { COLUMN_NAMES, GAP_NAMES, GAPS } from "./layout.js"
import { space } from "./tokens.js"

/**
 * A wall of `loom.product` cells — the shop, the downloads, the categories.
 *
 * Its own column floors, narrower than `loom.article-grid`'s: a product cell is
 * a picture, a name, a price and a button, with no excerpt to measure against,
 * so four across a wide page is a shop and three is a showroom. The **gap**
 * scale is shared with every other band, for the reason `layout.ts` exists.
 *
 * `alignItems: stretch` is doing real work here rather than being a default
 * copied along. A `loom.product` pins its action region with `margin-top: auto`,
 * which means nothing unless the cell fills the row's height — so a grid that
 * let its cells shrink to content would leave six buy buttons at six different
 * heights and no primitive able to say why.
 *
 * Like every container in the library it lays out and nothing else. Rendering
 * is total (0008), and a grid that blanked itself over an unexpected child
 * fails worse than one with something odd in a cell.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the grid fits what it can and wraps. */
    columns: z.enum(COLUMN_NAMES).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Narrower than an article's: a picture, a name and a price need less width than a sentence. */
const MINIMUMS = { auto: "15rem", two: "22rem", three: "16rem", four: "12rem" } as const

export const loomProductGrid = definePrimitive({
  type: "loom.product-grid",
  description: "A responsive grid of loom.product cells — the shop, the downloads, the categories.",
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
          /** Equal-height cells, which is what makes a pinned action mean anything. */
          alignItems: "stretch",
        },
      },
      children
    ),
})
