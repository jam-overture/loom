import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, size, weight, type RampStep } from "./tokens.js"

/**
 * A heading, with its text as child nodes rather than a `text` prop.
 *
 * That is the one deliberate difference from Hermes, whose blocks carried their
 * copy as fields. Text is a node in Loom (0001) so a sentence can be addressed,
 * moved and re-authored the same way a card can — and so rewording a headline
 * is a delta against the sentence rather than a `configure` that replaces the
 * whole heading's props.
 *
 * `level` is the document outline; the visual size follows from it and is not
 * separately settable. A model that wants a smaller headline picks a lower
 * level, which keeps the outline honest rather than letting a page look
 * structured while its heading levels say otherwise.
 */

const props = z
  .object({
    level: z.number().int().min(1).max(6),
    align: z.enum(["start", "center"]).optional(),
    balance: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Level 1 is the largest step on the ramp; each level down is one step smaller. */
const STEP_FOR_LEVEL: Readonly<Record<number, RampStep>> = { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3 }

export const loomHeading = definePrimitive({
  type: "loom.heading",
  description: "A heading. Its level sets both the document outline and the size.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      `h${given.level}`,
      {
        ...loom.editable,
        style: {
          margin: "0",
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: size(STEP_FOR_LEVEL[given.level] ?? 5),
          lineHeight: 1.15,
          color: colour("fg-default"),
          textAlign: given.align ?? "start",
          ...(given.balance === true ? { textWrap: "balance" } : {}),
        },
      },
      children
    ),
})
