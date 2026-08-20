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
     * **On by default**, and it governs the ink as well as the canvas — see
     * [0072](../../decisions/0072-a-page-paints-its-ink-and-its-canvas-together.md).
     * A page that is the whole document paints both. A page embedded in a
     * host's own chrome sets `fills: false` and paints neither, so it takes the
     * host's colours rather than half of each.
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
    const fills = given.fills !== false

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
          /**
           * Both or neither. A page that painted its ink and not its canvas is
           * how the documentation site rendered `#f5f5f5` body text on white
           * for a fortnight with no diagnostic and every test passing (0072).
           */
          ...(fills ? { color: colour("fg-default"), background: colour("bg-canvas") } : {}),
        },
      },
      createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: space(6),
            /** No stylesheet resets these, so padding would otherwise widen the band past its parent. */
            boxSizing: "border-box",
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
