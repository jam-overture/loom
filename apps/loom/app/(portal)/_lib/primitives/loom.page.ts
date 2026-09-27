import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "@jam-overture/loom/react"
import { definePrimitive } from "@jam-overture/loom/sdk"

const props = z.object({}).strict()

type Props = z.infer<typeof props>

export const loomPage = definePrimitive({
  type: "loom.page",
  description: "The root of a page; stacks its children vertically.",
  props,
  slots: [],
  /** Shows no words of its own — every one of them is a child. `registry.ts` has why `[]` is said. */
  copy: [],
  component: ({ loom, children }: LoomPrimitiveProps<Props>) =>
    createElement("div", { ...loom.editable, className: "flex flex-col gap-4" }, children),
})
