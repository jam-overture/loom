import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, size, space, weight } from "./tokens.js"

/**
 * One question and its answer, as a disclosure that needs no JavaScript.
 *
 * This is the only interactive thing in the whole Hermes catalogue, and it was
 * already `<details>` there. The port keeps that exactly, because it is the
 * shape the runtime needs: 0008 makes rendering a pure function with no
 * effects, so a primitive whose open state lived in `useState` would be a
 * primitive the conformance probe could not call and the renderer could not
 * treat as pure. `details` puts the state in the browser, where it belongs, and
 * costs nothing.
 *
 * `open` is a prop rather than a hidden default because which question starts
 * open is an editorial decision about the page — the first one usually should —
 * and editorial decisions belong in the tree where a proposal can change one
 * and a reviewer can see that it did.
 *
 * The marker is drawn rather than left to the browser: `list-style` on a
 * `summary` is styleable in only some engines, and a cross is one element that
 * rotates into a minus under a rule the stylesheet already carries.
 */

const props = z
  .object({
    question: z.string().min(1).max(200),
    answer: z.string().min(1).max(1000),
    open: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomFaq = definePrimitive({
  type: "loom.faq",
  description: "One question and answer, as a disclosure a reader opens. A row of a loom.faq-list.",
  props,
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) =>
    createElement(
      "details",
      {
        ...loom.editable,
        ...(given.open === true ? { open: true } : {}),
        style: {
          borderBlockStart: `1px solid ${colour("border-subtle")}`,
          paddingBlock: space(3),
          width: "100%",
        },
      },
      libraryStylesheet(),
      createElement(
        "summary",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: space(4),
            cursor: "pointer",
            listStyle: "none",
            fontFamily: family("heading"),
            fontWeight: weight("heading"),
            fontSize: size(4),
            lineHeight: 1.3,
            color: colour("fg-default"),
          },
        },
        createElement("span", null, given.question),
        createElement(
          "span",
          {
            className: LIBRARY_CLASS.marker,
            "aria-hidden": true,
            style: {
              flex: "0 0 auto",
              fontSize: size(4),
              lineHeight: 1,
              color: colour("accent"),
            },
          },
          "+"
        )
      ),
      createElement(
        "p",
        {
          style: {
            margin: "0",
            paddingBlockStart: space(3),
            paddingInlineEnd: space(6),
            fontFamily: family("body"),
            fontSize: size(3),
            lineHeight: 1.7,
            color: colour("fg-muted"),
            textWrap: "pretty",
          },
        },
        given.answer
      )
    ),
})
