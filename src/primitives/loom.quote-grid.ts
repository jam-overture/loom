import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { space } from "./tokens.js"

/**
 * The proof wall: several `loom.quote` cards at once.
 *
 * `loom.quote` was ported as a leaf holding one testimonial, with a note
 * saying that Hermes' singleton `testimonial` and its `testimonial-grid` were
 * "the same content model at two scales". This is the missing half of that
 * sentence. Hermes' grid held two to twelve `TestimonialEntry` shapes in an
 * `items` array; by 0052 each entry is a node, and by 0054 the container is the
 * child's name plus the arrangement — so the pair is `loom.quote-grid` over
 * `loom.quote` and nothing about `loom.quote` had to change to get it.
 *
 * That is the practical value 0054 claimed for a naming rule over a set of
 * individually reasonable names: a model that knows `loom.quote` exists can
 * guess this one and be right.
 *
 * It is a grid rather than a masonry column flow, and that is a real
 * limitation rather than an oversight — see the note on `flow` below.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the wall fits what it can and wraps. */
    columns: z.enum(["auto", "two", "three"]).optional(),
    density: z.enum(["tight", "loose"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const MINIMUMS = { auto: "20rem", two: "26rem", three: "19rem" } as const

/**
 * There is no `flow: "grid" | "columns"` prop, and the reason is the rule that
 * a container's name states its arrangement
 * ([0054](../../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)):
 * a prop that switched this one from a grid to a multi-column flow would make
 * the name wrong for half its values.
 * The masonry wall is a different container — `loom.quote-column`,
 * unbuilt — and it is buildable today: `break-inside: avoid` has to land on the
 * *children*, which a descendant rule in the shared stylesheet can do, the way
 * `details[open] > summary .loom-marker` already does. It is a unit of its own,
 * not a prop on this one.
 *
 * A stretched grid is not a consolation prize here. `loom.quote` already sets
 * `height: 100%` and pushes its attribution to the foot of the card, so a row
 * of quotes of different lengths lines its authors up — which is what makes a
 * wall of them read as a set rather than as a ragged pile. Masonry buys density
 * and gives that up.
 */

export const loomQuoteGrid = definePrimitive({
  type: "loom.quote-grid",
  description: "A wall of loom.quote testimonials — the social-proof band.",
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
          gap: given.density === "tight" ? space(4) : space(5),
          width: "100%",
          alignItems: "stretch",
        },
      },
      children
    ),
})
