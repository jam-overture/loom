import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { space } from "./tokens.js"

/**
 * A run of `loom.perk` rows — what a plan includes, what it does not, and what
 * is on its way.
 *
 * It exists as its own primitive rather than as rows sitting loose inside
 * `loom.tier`, for the reason 0054 gives about pairs being discoverable from
 * either half: a checklist is wanted in a split's column and under a hero as
 * often as it is wanted in a pricing card, and a perk that could only exist
 * inside a tier would be a child with one legal parent — a parentage
 * [0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md) says the
 * renderer must not enforce and nothing else could.
 *
 * `columns` is a floor rather than a count, the same shape `loom.feature-grid`
 * argues for: it says how wide a column must be before a second one is worth
 * having, and changing it moves no perk in or out of the list.
 */

const props = z
  .object({
    /** A minimum column width fed to `auto-fit` — never a limit on how many rows. */
    columns: z.enum(["one", "two"]).optional(),
    /** `loose` sets the rows as a list to read; `tight` as a spec to scan. */
    density: z.enum(["tight", "loose"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomPerkList = definePrimitive({
  type: "loom.perk-list",
  description: "A checklist of loom.perk rows — what a plan includes and what it does not.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "ul",
      {
        ...loom.editable,
        style: {
          display: "grid",
          gridTemplateColumns:
            given.columns === "two" ? "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))" : "1fr",
          gap: given.density === "tight" ? space(2) : space(3),
          margin: "0",
          padding: "0",
          width: "100%",
          listStyle: "none",
        },
      },
      children
    ),
})
