import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

/**
 * One choice inside a `loom.field` of type `select`. Its label is child text.
 *
 * It exists because Hermes' `dropdown` field type had nowhere to put its
 * choices — the shape declared `label`, `type` and `required` and stopped, so
 * a dropdown rendered empty — and because choices are the plainest repeated
 * content in the library: adding one is an `insert`, and reordering two is a
 * `move` (0052).
 *
 * `value` is **optional**, and that is HTML rather than a shortcut: an
 * `<option>` with no value attribute submits its own text, so a choice whose
 * label is what the host wants to receive needs no second copy of the string to
 * drift from. Set it when the wire value differs from the words.
 *
 * There is no `selected` prop. Which option a form opens on is the field's
 * business — it renders its placeholder as the selected choice — and a prop
 * here would let two siblings both claim it with nothing able to say which won.
 */

const props = z
  .object({
    value: z.string().min(1).max(120).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomOption = definePrimitive({
  type: "loom.option",
  description:
    "One choice in a loom.field of type select. Its label is child text; value defaults to that text.",
  props,
  slots: [],
  /**
   * Its label is children. `value` is what the form posts, and a posted string is
   * not a word on a page — the distinction `loom.field`'s `name` makes too.
   */
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "option",
      {
        ...loom.editable,
        ...(given.value === undefined ? {} : { value: given.value }),
      },
      children
    ),
})
