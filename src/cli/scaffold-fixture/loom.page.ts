import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "@loom/runtime/react"
import { definePrimitive } from "@loom/runtime/sdk"

/**
 * Every prop a tree may set on this primitive. The render seam refuses a node
 * whose props do not satisfy this schema, so it is the one place that decides
 * what AI is allowed to configure here.
 */
const props = z.object({}).strict()

type Props = z.infer<typeof props>

export const loomPage = definePrimitive({
  type: "loom.page",
  /** One line. This is what a model reads when choosing between primitives. */
  description: "Describe what loom.page is for",
  props,
  /** Name a slot here for every region this primitive projects children into. */
  slots: [],
  component: ({ loom, children }: LoomPrimitiveProps<Props>) =>
    /**
     * Spreading `loom.editable` is the edit-mode contract: without it this
     * primitive renders correctly and is invisible to the portal. Read declared
     * props off the `props` bag — they are never spread onto the element.
     */
    createElement("div", { ...loom.editable }, children),
})
