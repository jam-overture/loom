import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAP_NAMES, GAPS } from "./layout.js"
import { space } from "./tokens.js"

/**
 * A run of `loom.event` cards — what is coming up, and where to get a place.
 *
 * A **list** by 0054 and not a grid, for a reason that is about the child
 * rather than about taste: a `loom.event` puts its date at the leading edge and
 * its control at the trailing one, which is an arrangement that only exists at
 * full width. Three of them across would leave three date columns each about
 * seventy pixels wide with a wrapped button underneath, and the shape that made
 * the card readable would be the first thing lost.
 *
 * **Why this one takes a `gap` where `loom.episode-list` takes rules and a
 * density.** The two containers in this run are deliberately different, and the
 * difference follows 0066 rather than a preference. An episode band is *scanned*
 * — you are looking for one row out of thirty — so its rows are borderless and
 * a hairline is enough to separate them. An event band is *acted on*: every card
 * carries a control, and a control needs an edge around it to say where the
 * card it belongs to begins. Cards with edges want space between them, which is
 * a gap; borderless rows want a rule, which is a border. Neither container
 * would be improved by growing the other's prop.
 *
 * So this is a stack with one job and one prop, and that is the whole primitive.
 * Nothing here is styled through the stylesheet, because nothing about it
 * depends on where a card sits among its siblings.
 */

const props = z
  .object({
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomEventList = definePrimitive({
  type: "loom.event-list",
  description:
    "A run of loom.event cards in one column — upcoming talks, workshops, releases, or dates on tour.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: given.gap === undefined ? space(3) : GAPS[given.gap],
          width: "100%",
        },
      },
      children
    ),
})
