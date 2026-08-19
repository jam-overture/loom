import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "@loom/runtime/react"
import { definePrimitive } from "@loom/runtime/sdk"

const props = z
  .object({
    variant: z.enum(["plain", "outlined"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const VARIANTS = {
  plain: "flex flex-col gap-2 bg-surface-base",
  outlined: "flex flex-col gap-2 bg-surface-base border-edge-subtle border",
} as const

export const loomCard = definePrimitive({
  type: "loom.card",
  description: "A block of related content, optionally outlined",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      { ...loom.editable, className: `rounded-md p-4 ${VARIANTS[given.variant ?? "plain"]}` },
      children
    ),
})
