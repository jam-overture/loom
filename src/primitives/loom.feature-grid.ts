import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { space } from "./tokens.js"

/**
 * The "what makes this different" band: a wall of `loom.feature` tiles.
 *
 * Ported from Hermes' `feature-grid`, which held two to twelve `FeatureItem`
 * shapes in an `items` array. Each item is a node here, for the reasons 0052
 * sets out — adding a feature is an `insert` a reviewer can weigh on its own,
 * and removing one is a `remove` whose inverse restores that feature rather
 * than the whole list.
 *
 * The grid lays out and nothing else. It does not style its children, and does
 * not require them to be features: rendering is total (0008), and a grid that
 * blanked itself over an unexpected child would fail worse than one with
 * something odd in a cell. Naming follows 0054 — the container is the child's
 * type plus the arrangement it puts them in.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the grid fits what it can and wraps. */
    columns: z.enum(["auto", "two", "three", "four"]).optional(),
    /** `loose` gives tiles room to read as cards; `tight` reads as a list. */
    density: z.enum(["tight", "loose"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const MINIMUMS = { auto: "16rem", two: "22rem", three: "17rem", four: "13rem" } as const

export const loomFeatureGrid = definePrimitive({
  type: "loom.feature-grid",
  description: "A responsive grid of loom.feature tiles — the “what makes this different” band.",
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
