import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, radius, size, space, weight, type RampStep } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * The one thing on a page that asks the reader to do something.
 *
 * It is an anchor, never a button, and it has no handler prop. A primitive is
 * rendered by a pure function with no IO (0008), and a prop that named a
 * callback would be a string in the tree that some host had to map back to a
 * function — an indirection an AI proposal could point anywhere. A destination
 * is a URL, and a URL is data the Gate can read and a reviewer can check.
 */

const props = z
  .object({
    href: linkUrlSchema,
    variant: z.enum(["primary", "secondary", "quiet"]).optional(),
    scale: z.enum(["small", "medium", "large"]).optional(),
    /** Opens in a new tab, with the `rel` that has to accompany it. */
    external: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const VARIANTS = {
  primary: {
    background: colour("accent"),
    color: colour("fg-on-accent"),
    border: `1px solid ${colour("accent")}`,
  },
  secondary: {
    background: "transparent",
    color: colour("fg-default"),
    border: `1px solid ${colour("border-strong")}`,
  },
  quiet: {
    background: "transparent",
    color: colour("accent"),
    border: "1px solid transparent",
  },
} as const

const SCALES: Readonly<Record<"small" | "medium" | "large", { text: RampStep; pad: RampStep }>> = {
  small: { text: 2, pad: 2 },
  medium: { text: 3, pad: 3 },
  large: { text: 4, pad: 4 },
}

export const loomAction = definePrimitive({
  type: "loom.action",
  description: "A call to action: a link styled as a button. Its label is child text.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const scale = SCALES[given.scale ?? "medium"]

    return createElement(
      "a",
      {
        ...loom.editable,
        href: given.href,
        ...(given.external === true ? { target: "_blank", rel: "noreferrer noopener" } : {}),
        style: {
          ...VARIANTS[given.variant ?? "primary"],
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "flex-start",
          gap: space(2),
          paddingBlock: space(scale.pad),
          paddingInline: space((scale.pad + 2) as RampStep),
          borderRadius: radius("full"),
          fontFamily: family("body"),
          fontWeight: weight("heading"),
          fontSize: size(scale.text),
          lineHeight: 1.2,
          textDecoration: "none",
        },
      },
      children
    )
  },
})
