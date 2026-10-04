import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, size, space } from "./tokens.js"

/**
 * The "trusted by" wall: a row of `loom.logo` marks under an optional line of
 * context.
 *
 * Ported from Hermes' `clients` and `affiliations` blocks, which were the same
 * block twice. One primitive covers both, because the difference between them
 * was the label above the row and nothing else — and a label is a prop.
 *
 * It does **not** scroll. A seamless marquee needs the row rendered twice, and
 * a duplicated row means two DOM elements carrying the same `data-loom-node`
 * id — the exact failure 0051 rejected when it considered leaving slot content
 * in `children` as well. A portal that resolves an id to the second copy points
 * the reviewer at a node that is not the one they clicked. The honest version
 * of this band is a still one, and it is what most pages actually want.
 */

const props = z
  .object({
    /** The line above the row — "Trusted by teams at". Sentence case, not a heading. */
    label: z.string().min(1).max(80).optional(),
    align: z.enum(["start", "center"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomLogoCloud = definePrimitive({
  type: "loom.logo-cloud",
  description: "A row of loom.logo marks under an optional label — the “trusted by” band.",
  props,
  slots: [],
  copy: ["label"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const centred = given.align !== "start"

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: centred ? "center" : "flex-start",
          gap: space(4),
          width: "100%",
        },
      },
      given.label === undefined
        ? null
        : createElement(
            "p",
            {
              style: {
                margin: "0",
                fontFamily: family("body"),
                fontSize: size(2),
                letterSpacing: "0.08em",
                color: colour("fg-subtle"),
              },
            },
            given.label
          ),
      createElement(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: centred ? "center" : "flex-start",
            gap: `${space(4)} ${space(7)}`,
            width: "100%",
          },
        },
        children
      )
    )
  },
})
