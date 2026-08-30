import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { COLUMN_NAMES, GAP_NAMES, GAPS } from "./layout.js"
import { space } from "./tokens.js"

/**
 * A wall of `loom.listing` cells — what is on the market.
 *
 * Its own column floors and they are the **widest** in the library, which is
 * the one interesting thing about a container that otherwise does what every
 * other `-grid` does. A listing cell carries a photograph, a price set at the
 * type ramp's fifth step, an address that is routinely eight words, a row of
 * metric badges and a button; below about 19rem the address wraps to four lines
 * and the badges to three rows, and the wall stops reading as a set of
 * comparable things — which is the only thing a wall of listings is for.
 *
 * So `four` is absent from this map's usable range in practice rather than in
 * the schema: it is the shared `COLUMN_NAMES` vocabulary, because a local one
 * would be a third column vocabulary in a library that already has two, and the
 * floor for `four` is set where a four-across wall still holds its badges on one
 * row rather than at the narrowest width the markup survives.
 *
 * `alignItems: stretch` for `loom.product-grid`'s reason: a `loom.listing` pins
 * its viewing button to the card's floor with an `auto` block-start margin,
 * which means nothing unless the cell fills the row's height.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the wall fits what it can and wraps. */
    columns: z.enum(COLUMN_NAMES).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Wider than a product's: a price, a long address, a badge row and a button. */
const MINIMUMS = { auto: "19rem", two: "26rem", three: "20rem", four: "17rem" } as const

export const loomListingGrid = definePrimitive({
  type: "loom.listing-grid",
  description: "A responsive wall of loom.listing cells — the properties on the market.",
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
