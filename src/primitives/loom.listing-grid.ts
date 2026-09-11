import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { COLUMN_NAMES, GAP_NAMES, GAPS } from "./layout.js"
import { libraryStylesheet } from "./stylesheet.js"
import { space } from "./tokens.js"

/**
 * A band of `loom.listing` cells — what is for sale, what is to let, what is on
 * the lot.
 *
 * It takes the **shared** `COLUMN_NAMES` rather than a local vocabulary with a
 * `one` in it, and the difference from `loom.book-grid` beside it is worth a
 * sentence, because the two were written in the same run and went opposite ways.
 * A local `one` exists to give a card the width at which it reads as a row, and
 * `loom.offering`, `loom.recording`, `loom.event` and `loom.book` all have a row
 * reading to be given. **`loom.listing` does not.** Its photograph is the
 * largest thing on it and its price sits over its address; laid across a
 * full-width row that arrangement has nowhere to go, and a listing stretched to
 * 1120px is a card with 700px of empty floor. A vocabulary member that produces
 * a worse rendering in every case is grammar budget (0014) spent on nothing.
 *
 * Its floors are its own and wide — the widest in the library beside
 * `loom.article-grid`'s, which they match deliberately. A listing carries a
 * photograph, a price, an address and a strip of specifications, which is an
 * article's cover-label-title-sentence with one more line; two bands of cards on
 * one page that wrapped at different widths is a difference nobody chose and
 * everybody sees.
 *
 * Like every container here it lays out and nothing else: it does not style its
 * children and does not require them to be listings (0008).
 */

const props = z
  .object({
    /** A floor for each column, not a count: the grid fits what it can and wraps. */
    columns: z.enum(COLUMN_NAMES).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const MINIMUMS: Readonly<Record<(typeof COLUMN_NAMES)[number], string>> = {
  auto: "20rem",
  two: "26rem",
  three: "19rem",
  four: "15rem",
}

export const loomListingGrid = definePrimitive({
  type: "loom.listing-grid",
  description:
    "A responsive band of loom.listing cells — properties, rentals, vehicles, anything on offer at a place.",
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
          alignItems: "stretch",
        },
      },
      libraryStylesheet(),
      children
    ),
})
