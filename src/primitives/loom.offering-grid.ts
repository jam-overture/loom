import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAP_NAMES, GAPS } from "./layout.js"
import { space } from "./tokens.js"

/**
 * A band of `loom.offering` cells — the services page, the packages, the class
 * schedule, the menu, the ways to give.
 *
 * Named `-grid` rather than the `-list` `docs/hermes-port-map.md` proposed, and
 * the change is 0054 being applied rather than overruled: **the arrangement
 * word names what the container does with its children**, and what this one does
 * is `repeat(auto-fit, minmax(…))`. Every other primitive in the library that
 * lays out that way is a `-grid`. 0054 also says why getting the word right
 * before it ships matters — a container that changes its arrangement changes its
 * own name, and a rename is a breaking change to every stored tree.
 *
 * **Its column vocabulary is its own, and `one` is the point of it.** The shared
 * `COLUMN_NAMES` runs `auto | two | three | four`, which is right for a grid of
 * pictures and wrong here twice over: four offerings across is never a band
 * anybody wants, and the arrangement that *is* wanted — a single full-width
 * column — has no name in it. A class schedule, a volunteer roster and a
 * restaurant menu are all one column of full-width rows, and `loom.offering`
 * reads as a row exactly when it is given that width. So `one` is not a
 * degenerate grid; it is the arrangement half of these blocks were always in.
 * `loom.perk-list` set the precedent for a local column vocabulary and gave the
 * same reason: the shared names did not fit the child.
 *
 * It is still a **floor and never a count** — the distinction
 * `docs/primitive-granularity.md` names as the easiest one to get wrong.
 * Nothing here truncates the band, so changing it changes no node.
 *
 * `alignItems: stretch` is load-bearing rather than copied along, for
 * `loom.product-grid`'s reason: a `loom.offering` pins its action to the card's
 * floor with an `auto` margin, which means nothing at all unless the cell fills
 * the row's height. A grid that let its cells shrink to content would leave six
 * booking buttons at six different heights and no primitive able to say why.
 */

const COLUMNS = ["auto", "one", "two", "three"] as const

const props = z
  .object({
    /**
     * A floor for each column, never a count. `one` is a full-width column,
     * which is the arrangement a schedule and a menu want — and the width at
     * which a `loom.offering` becomes a row rather than a card.
     */
    columns: z.enum(COLUMNS).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * Wider than `loom.product-grid`'s, because an offering has no cover image to
 * carry the cell and does have a price on the same line as its name: below
 * about 19rem the two collide and the price wraps onto a line of its own.
 */
const MINIMUMS: Readonly<Record<(typeof COLUMNS)[number], string>> = {
  auto: "21rem",
  one: "100%",
  two: "26rem",
  three: "19rem",
}

export const loomOfferingGrid = definePrimitive({
  type: "loom.offering-grid",
  description:
    "A band of loom.offering cells — services, packages, a class schedule, a menu, or the ways to give. Set columns to one for a full-width list.",
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
          gap: given.gap === undefined ? space(4) : GAPS[given.gap],
          width: "100%",
          /** Equal-height cells, which is what makes a pinned action mean anything. */
          alignItems: "stretch",
        },
      },
      children
    ),
})
