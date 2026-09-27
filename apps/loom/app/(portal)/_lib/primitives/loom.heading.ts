import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "@jam-overture/loom/react"
import { definePrimitive } from "@jam-overture/loom/sdk"

const props = z
  .object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const LEVELS = {
  1: { tag: "h1", className: "text-2xl tracking-tight" },
  2: { tag: "h2", className: "text-xl tracking-tight" },
  3: { tag: "h3", className: "text-md" },
} as const

export const loomHeading = definePrimitive({
  type: "loom.heading",
  description: "A section title; level 1 to 3.",
  props,
  slots: [],
  /** Shows no words of its own — every one of them is a child. `registry.ts` has why `[]` is said. */
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const level = LEVELS[given.level ?? 2]

    return createElement(level.tag, { ...loom.editable, className: level.className }, children)
  },
})
