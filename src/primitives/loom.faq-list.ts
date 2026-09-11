import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, space, WIDTHS } from "./tokens.js"

/**
 * The questions band: a stack of `loom.faq` disclosures.
 *
 * Hermes held eight to twelve `FaqItem` shapes in one `items` array, which is
 * the case 0052 was argued from — reordering two questions is a `move` of one
 * node here, and was a `configure` replacing all twelve there, with no way for
 * the analysis to say what actually changed or for the inverse to restore only
 * what was lost.
 *
 * Named `faq-list` rather than `faq-grid`, and its child `faq` rather than
 * `faq-item`, per 0054: the child is the singular thing, the container is that
 * word plus the arrangement it puts them in.
 *
 * Each row draws its own leading rule, so the list needs no selector reaching
 * into its children and a question moved between two lists carries its own
 * separator with it. The list closes the run with the matching rule.
 */

const props = z
  .object({
    /** Two columns suit a long list; one keeps a reading measure. */
    columns: z.enum(["one", "two"]).optional(),
    width: z.enum(["full", "wide", "readable"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomFaqList = definePrimitive({
  type: "loom.faq-list",
  description: "A stack of loom.faq disclosures — the questions band at the foot of a page.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "grid",
          gridTemplateColumns:
            given.columns === "two" ? "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))" : "1fr",
          columnGap: space(6),
          width: "100%",
          maxWidth: WIDTHS[given.width ?? "full"],
          /**
           * Centred when it is narrower than what holds it, for the reason
           * `loom.section` now gives: a `readable` list inside a `wide` band
           * capped its measure correctly and then sat against the left edge.
           * A no-op at `full`, which is the default and every list that was
           * right before.
           */
          marginInline: "auto",
          borderBlockEnd: `1px solid ${colour("border-subtle")}`,
          alignContent: "start",
        },
      },
      children
    ),
})
