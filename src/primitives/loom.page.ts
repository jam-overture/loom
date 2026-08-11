import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, size, space, weight, WIDTHS, type WidthName } from "./tokens.js"

/**
 * The render root, and the only primitive in this library that mounts a theme.
 *
 * `loom.theme` is present on the root node alone (0050), so applying it here is
 * what puts the custom properties on the page for everything below to read
 * through the cascade. A root primitive that dropped it would render the whole
 * page unstyled, which is what the two starter palettes exist to catch.
 */

const props = z
  .object({
    width: z.enum(["full", "wide", "readable"]).optional(),
    /**
     * Off by default. A page that is the whole document paints the canvas; a
     * page embedded in a host's own chrome should not repaint that host's
     * background out from under it.
     */
    fills: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomPage = definePrimitive({
  type: "loom.page",
  description: "The root of a page. Mounts the theme and stacks its children in one column.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const width: WidthName = given.width ?? "wide"

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          ...loom.theme,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: space(6),
          width: "100%",
          paddingBlock: space(6),
          fontFamily: family("body"),
          fontWeight: weight("body"),
          fontSize: size(3),
          color: colour("fg-default"),
          ...(given.fills === true ? { background: colour("bg-canvas") } : {}),
        },
      },
      createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: space(6),
            width: "100%",
            maxWidth: WIDTHS[width],
            paddingInline: space(4),
          },
        },
        children
      )
    )
  },
})
