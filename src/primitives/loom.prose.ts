import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { color, family, size, READABLE_MEASURE, type RampStep } from "./tokens.js"

const props = z
  .object({
    size: z.enum(["small", "body", "lead"]).optional(),
    align: z.enum(["start", "center"]).optional(),
    tone: z.enum(["default", "muted"]).optional(),
    /** Off by default: a paragraph inside a narrow column is already measured. */
    measured: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const STEPS: Readonly<Record<"small" | "body" | "lead", RampStep>> = { small: 2, body: 3, lead: 5 }

export const loomProse = definePrimitive({
  type: "loom.prose",
  description: "A paragraph of body copy. Its text is child nodes, so it stays addressable.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "p",
      {
        ...loom.editable,
        style: {
          margin: "0",
          fontFamily: family("body"),
          fontSize: size(STEPS[given.size ?? "body"]),
          lineHeight: 1.6,
          color: given.tone === "muted" ? color("fg-muted") : color("fg-default"),
          /** Absent means inherit — see `loom.heading`, and 0207. */
          ...(given.align === undefined ? {} : { textAlign: given.align }),
          ...(given.measured === true
            ? { maxWidth: READABLE_MEASURE, ...(given.align === "center" ? { marginInline: "auto" } : {}) }
            : {}),
        },
      },
      children
    ),
})
