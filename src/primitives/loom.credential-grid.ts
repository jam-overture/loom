import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { COLUMN_NAMES, GAP_NAMES, GAPS } from "./layout.js"
import { space } from "./tokens.js"

/**
 * A wall of `loom.credential` cells — the awards, the certifications, the
 * memberships, the tools.
 *
 * Named `-grid` rather than the `-list` `docs/hermes-port-map.md` proposed, for
 * the reason `loom.offering-grid`'s comment gives at length: 0054 says the
 * arrangement word names what the container does, and what this does is
 * `auto-fit`. It takes the **shared** `COLUMN_NAMES` where its sibling needed a
 * local vocabulary, and the difference is the child rather than a preference —
 * a credential is a mark and two short lines, so four across a wide page is a
 * dense wall of certifications and reads correctly, where four offerings across
 * never would.
 *
 * `alignItems: stretch` for `loom.product-grid`'s reason: a `loom.credential`
 * drops its chips to the card's floor with an `auto` margin, which needs the
 * cell to fill the row.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the wall fits what it can and wraps. */
    columns: z.enum(COLUMN_NAMES).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * Narrower than `loom.offering-grid`'s and close to the shared scale, because a
 * credential carries no price on the name's line and no button. It is its own
 * map rather than `COLUMN_MINIMUMS` for one value: the leading mark takes a
 * fixed square out of every cell, so the floor has to leave room for it plus a
 * name — below about 15rem the name wraps to one word a line beside the mark.
 */
const MINIMUMS: Readonly<Record<(typeof COLUMN_NAMES)[number], string>> = {
  auto: "18rem",
  two: "24rem",
  three: "18rem",
  four: "15rem",
}

export const loomCredentialGrid = definePrimitive({
  type: "loom.credential-grid",
  description:
    "A wall of loom.credential cells — awards, certifications, memberships, or the tools behind the work.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MINIMUMS[given.columns ?? "auto"]}), 1fr))`,
          gap: given.gap === undefined ? space(4) : GAPS[given.gap],
          width: "100%",
          /** Equal-height cells, which is what makes a floored chip row line up. */
          alignItems: "stretch",
        },
      },
      children
    ),
})
