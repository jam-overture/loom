import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "@loom/runtime/react"
import { definePrimitive } from "@loom/runtime/sdk"

const props = z
  .object({
    tone: z.enum(["normal", "muted"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const TONES = { normal: "text-ink", muted: "text-ink-muted" } as const

export const loomProse = definePrimitive({
  type: "loom.prose",
  description: "A paragraph of text.",
  props,
  slots: [],
  /** Shows no words of its own — every one of them is a child. `registry.ts` has why `[]` is said. */
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "p",
      { ...loom.editable, className: `text-sm ${TONES[given.tone ?? "normal"]}` },
      children
    ),
})
