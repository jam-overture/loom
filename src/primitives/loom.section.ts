import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { anchorAttributes, anchorSchema, anchorStyle } from "./anchor.js"
import { colour, radius, size, space, WIDTHS, type WidthName } from "./tokens.js"

/**
 * A band of the page, with a region above its content for whatever introduces
 * it.
 *
 * The heading region is a `slot` rather than the first few children, because
 * the section places it differently from the rest — tighter spacing, its own
 * measure — and "the first two children are the title" is a rule no schema
 * states and every edit can break. A slot says it out loud, and the catalogue
 * tells a model the region exists (0051).
 */

const props = z
  .object({
    tone: z.enum(["canvas", "surface", "accent"]).optional(),
    width: z.enum(["full", "wide", "readable"]).optional(),
    /** Above the heading region: the small uppercase label Hermes called an eyebrow. */
    eyebrow: z.string().min(1).max(60).optional(),
    /** The name this band answers to, so a link on the page can point at it. */
    anchor: anchorSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const TONES = {
  canvas: { background: "transparent", color: colour("fg-default") },
  surface: { background: colour("bg-surface"), color: colour("fg-default") },
  accent: { background: colour("accent-subtle"), color: colour("fg-default") },
} as const

export const loomSection = definePrimitive({
  type: "loom.section",
  description: "A band of the page: an optional heading region above its content.",
  props,
  slots: ["heading"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const tone = TONES[given.tone ?? "canvas"]
    const width: WidthName = given.width ?? "full"
    const heading = loom.slots["heading"]

    return createElement(
      "section",
      {
        ...loom.editable,
        ...anchorAttributes(given.anchor),
        style: {
          ...tone,
          ...anchorStyle(given.anchor),
          display: "flex",
          flexDirection: "column",
          gap: space(5),
          /** No stylesheet resets these, so padding would otherwise widen the band past its parent. */
          boxSizing: "border-box",
          width: "100%",
          maxWidth: WIDTHS[width],
          paddingBlock: given.tone === undefined || given.tone === "canvas" ? space(3) : space(6),
          paddingInline: given.tone === undefined || given.tone === "canvas" ? "0" : space(5),
          borderRadius: given.tone === undefined || given.tone === "canvas" ? "0" : radius("lg"),
        },
      },
      given.eyebrow === undefined
        ? null
        : createElement(
            "p",
            {
              style: {
                margin: "0",
                fontSize: size(1),
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: colour("accent"),
              },
            },
            given.eyebrow
          ),
      heading === undefined
        ? null
        : createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: space(2) } },
            heading
          ),
      children === null
        ? null
        : createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: space(4) } },
            children
          )
    )
  },
})
