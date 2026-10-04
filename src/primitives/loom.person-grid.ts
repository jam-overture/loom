import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAP_NAMES, GAPS } from "./layout.js"
import { space } from "./tokens.js"

/**
 * A wall of `loom.person` cells — the team, the staff, the speakers.
 *
 * It has its own column minimums rather than borrowing `layout.ts`'s, and that
 * is the one decision in this file. A person cell is a portrait, two short
 * lines and sometimes a sentence, so it reads well much narrower than a feature
 * tile does: reusing the shared floors would have wrapped a team of six to two
 * rows of three on a screen with room for six. The **gap** scale is shared,
 * because a gap has no content to be measured against and two bands on one page
 * spacing themselves differently is exactly the mismatch `layout.ts` exists to
 * prevent.
 *
 * Like every container in the library it lays out and nothing else: it does not
 * style its children and does not require them to be people. Rendering is total
 * (0008), and a grid that blanked itself over an unexpected child fails worse
 * than one with something odd in a cell.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the grid fits what it can and wraps. */
    columns: z.enum(["auto", "two", "three", "four"]).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Narrower than `layout.ts`'s: a portrait and two short lines need less width than a tile. */
const MINIMUMS = { auto: "13rem", two: "18rem", three: "13rem", four: "10rem" } as const

export const loomPersonGrid = definePrimitive({
  type: "loom.person-grid",
  description: "A responsive grid of loom.person cells — the team, the staff, the speakers.",
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
          gap: given.gap === undefined ? space(5) : GAPS[given.gap],
          width: "100%",
          alignItems: "start",
        },
      },
      children
    ),
})
