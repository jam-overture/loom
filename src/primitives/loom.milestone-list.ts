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
 * **It styles its children through the stylesheet rather than through props**,
 * which is the one thing here worth reading twice. The spacing between entries
 * and the two things only a position can know — that the last entry has no
 * connector below it, and that a list with no rail has none at all — cannot be
 * inline styles on a child, because a child is rendered from its own node and
 * knows nothing about its siblings. Passing them down as props is worse: the
 * renderer does not inject props into children (0009), and a `rail` prop
 * repeated on every entry would be a `configure` per row for a decision that
 * belongs to the list.
 *
 * So the list applies a class and `stylesheet.ts` carries three static rules.
 * Nothing is interpolated into them, every value in them is a `var()`, and they
 * are byte-identical under every theme — which is the bargain 0055 struck for
 * motion, holding equally for the two selectors that are about position.
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
