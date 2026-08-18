import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * A run of `loom.milestone` entries down a rail — a history, a roadmap, a
 * changelog, or the steps of a process.
 *
 * Named by 0054 from the child it repeats, which is why it is not
 * `loom.timeline`: the same list is a timeline when its markers are dates and a
 * roadmap when they are statuses, and naming the container for one of its uses
 * would have made the other one look like a different primitive. The cost is
 * that "timeline" is what a person says out loud, so the description says it
 * for them.
 *
 * **It styles its entries through the stylesheet rather than through props.**
 * The spacing between entries, the flush last entry and the rail-less variant
 * are all things a child cannot know from its own node — a render is a pure
 * function of one node, and where that node sits among its siblings is the
 * browser's business. So the list applies a class and `stylesheet.ts` carries
 * four static rules, which is CSS doing the one thing only CSS can.
 *
 * The alternative was passing them down as props, and it is worse for reasons
 * that have nothing to do with CSS: the renderer does not inject props into
 * children (0009), so every entry would have to carry its own copy of a
 * decision belonging to the list — a `configure` per row to change the density
 * of one band, and *n* chances for a model to leave them disagreeing.
 *
 * Nothing is interpolated into those rules, every value in them is a `var()`,
 * and they are byte-identical under every theme — which is the bargain 0055
 * struck for motion, holding equally for the selectors that are about position.
 */

const props = z
  .object({
    /** `tight` sets it as a changelog to scan; `loose` as a history to read. */
    density: z.enum(["tight", "loose"]).optional(),
    /**
     * The vertical rule joining the dots. `none` keeps the dots and drops the
     * line, which is what a changelog wants and a journey does not.
     */
    rail: z.enum(["line", "none"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomMilestoneList = definePrimitive({
  type: "loom.milestone-list",
  description:
    "A run of loom.milestone entries down a vertical rail — a timeline, roadmap, changelog, or the steps of a process.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "ol",
      {
        ...loom.editable,
        className: [
          LIBRARY_CLASS.rail,
          given.density === "tight" ? LIBRARY_CLASS.railTight : undefined,
          given.rail === "none" ? LIBRARY_CLASS.railNone : undefined,
        ]
          .filter((name) => name !== undefined)
          .join(" "),
        style: {
          display: "flex",
          flexDirection: "column",
          margin: "0",
          padding: "0",
          width: "100%",
          listStyle: "none",
        },
      },
      libraryStylesheet(),
      children
    ),
})
