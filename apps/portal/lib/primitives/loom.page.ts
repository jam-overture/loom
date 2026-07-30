import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "@loom/runtime/react"
import { definePrimitive } from "@loom/runtime/sdk"

const props = z.object({}).strict()

type Props = z.infer<typeof props>

export const loomPage = definePrimitive({
  type: "loom.page",
  description: "The root of a page; stacks its children vertically",
  props,
  slots: [],
  component: ({ loom, children }: LoomPrimitiveProps<Props>) =>
    createElement("div", { ...loom.editable, className: "flex flex-col gap-4" }, children),
})
