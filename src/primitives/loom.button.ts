import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { controlStyle, CONTROL_SCALES, CONTROL_VARIANTS } from "./control.js"

/**
 * The control that sends a `loom.form`. Its label is child text.
 *
 * It looks exactly like `loom.action` and is a different primitive for a
 * reason a reader never sees: an anchor goes to a destination the tree names
 * and the Gate reads, and this sends what a visitor typed to an address the
 * tree cannot name at all — the deployment's, resolved by the submission seam
 * before the walk (0065). Collapsing them into one primitive with a `submits`
 * flag would put those two very different things one boolean apart in a space
 * a model writes.
 *
 * It carries **no destination of its own**, and that is the whole of its
 * safety: `formAction` is the one attribute that would let a button override
 * where its form posts, and a primitive that accepted it would have reopened
 * exactly the channel 0065 closed. There is no prop here that reaches the
 * network.
 *
 * It is `type="submit"` always. A `button` with no type is a submit button in
 * every browser anyway, and `reset` is a control that throws away what someone
 * typed on a page with no way to undo it.
 *
 * **A button outside a form does nothing**, which is a real limit and the
 * reason the description says where it goes — the same bargain
 * `loom.perk-list-item` makes about its one legal parent. A render is a pure
 * function with no handlers (0008), so a button that is not a form's submit has
 * nothing it could do.
 */

const props = z
  .object({
    variant: z.enum(CONTROL_VARIANTS).optional(),
    scale: z.enum(CONTROL_SCALES).optional(),
    /**
     * `full` fills the row. A submit under a stacked column of inputs reads as
     * part of the form when it is the same width as they are, and as a stray
     * pill when it shrink-wraps its label — which is what every control in this
     * library does by default because every other one sits in flowing content.
     */
    width: z.enum(["auto", "full"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomButton = definePrimitive({
  type: "loom.button",
  description:
    "The control that submits a loom.form. Its label is child text. For a link styled as a button, use loom.action.",
  props,
  /** The whole of it is the thing a reader aims at, however it is configured (0068). */
  interactive: "always",
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "button",
      {
        ...loom.editable,
        type: "submit",
        style: {
          ...controlStyle(given.variant ?? "primary", given.scale ?? "medium"),
          cursor: "pointer",
          ...(given.width === "full"
            ? { alignSelf: "stretch", boxSizing: "border-box", width: "100%", display: "flex" }
            : {}),
        },
      },
      children
    ),
})
