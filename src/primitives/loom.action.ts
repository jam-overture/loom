import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { controlStyle, CONTROL_SCALES, CONTROL_VARIANTS } from "./control.js"
import { linkUrlSchema } from "./url.js"

/**
 * The one thing on a page that asks the reader to do something.
 *
 * It is an anchor, never a button, and it has no handler prop. A primitive is
 * rendered by a pure function with no IO (0008), and a prop that named a
 * callback would be a string in the tree that some host had to map back to a
 * function — an indirection an AI proposal could point anywhere. A destination
 * is a URL, and a URL is data the Gate can read and a reviewer can check.
 *
 * The control that *sends* something rather than going somewhere is
 * `loom.button`, and the two share their paint and their sizing through
 * `control.ts`: they are one object to a reader and two primitives to a
 * proposal.
 */

const props = z
  .object({
    href: linkUrlSchema,
    variant: z.enum(CONTROL_VARIANTS).optional(),
    scale: z.enum(CONTROL_SCALES).optional(),
    /** Opens in a new tab, with the `rel` that has to accompany it. */
    external: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomAction = definePrimitive({
  type: "loom.action",
  description: "A call to action: a link styled as a button. Its label is child text.",
  props,
  /** `href` is required, so it is a target however it is configured (0064). */
  interactive: "always",
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "a",
      {
        ...loom.editable,
        href: given.href,
        ...(given.external === true ? { target: "_blank", rel: "noreferrer noopener" } : {}),
        style: controlStyle(given.variant ?? "primary", given.scale ?? "medium"),
      },
      children
    ),
})
