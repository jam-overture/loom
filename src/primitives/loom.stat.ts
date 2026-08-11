import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, size, space, weight } from "./tokens.js"

/**
 * One number and what it counts.
 *
 * `value` and `label` are props rather than child text nodes, and that is the
 * other half of 0052's rule: a *fixed field* stays a prop, because there is
 * exactly one of it and changing it is exactly a `configure`. Only *repeated*
 * content earns its own node. Making these children would mean a stat whose
 * label had been deleted was still a valid tree.
 */

const props = z
  .object({
    value: z.string().min(1).max(24),
    label: z.string().min(1).max(80),
    caption: z.string().min(1).max(160).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomStat = definePrimitive({
  type: "loom.stat",
  description: "A single figure with a short label — one cell of a loom.stat-grid.",
  props,
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      { ...loom.editable, style: { display: "flex", flexDirection: "column", gap: space(1) } },
      createElement(
        "span",
        {
          style: {
            fontFamily: family("heading"),
            fontWeight: weight("heading"),
            fontSize: size(7),
            lineHeight: 1.05,
            color: colour("accent"),
          },
        },
        given.value
      ),
      createElement(
        "span",
        { style: { fontFamily: family("body"), fontSize: size(3), color: colour("fg-default") } },
        given.label
      ),
      given.caption === undefined
        ? null
        : createElement(
            "span",
            { style: { fontFamily: family("body"), fontSize: size(2), color: colour("fg-muted") } },
            given.caption
          )
    ),
})
