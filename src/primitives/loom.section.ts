import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { anchorAttributes, anchorSchema, anchorStyle } from "./anchor.js"
import { color, radius, size, space, WIDTHS, type WidthName } from "./tokens.js"

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
    /**
     * Where this band's words sit. Absent inherits, `center` centres.
     *
     * It is the one prop a fully centred band could not be built without, and
     * for five weeks this schema was `tone`, `width`, `eyebrow` and `anchor`.
     * A composition can give its own `align` to a heading and to a paragraph,
     * because those are nodes — but **the eyebrow is not a node.** It is a fixed
     * field this primitive renders itself (0052), it was rendered with no
     * alignment at all, and there was no prop anywhere that could move it. So a
     * band with an eyebrow was a band that had to be ranged left, and the
     * marketing site's *Built in the open* band shipped with a left eyebrow and
     * a left heading beside a centred stat grid because the alternative —
     * centring the heading and the caption and leaving `WHERE IT IS TODAY` alone
     * on the left — looked worse. That is a layout decision the library was
     * making on a composition's behalf without saying so.
     *
     * No operation reorders glyphs, so this is a real prop rather than a delta in
     * disguise, and it is the example the granularity doc uses.
     *
     * **It governs the words and not the boxes**, which is the whole reason one
     * prop closes the case. A section's children are full-width regions — a
     * grid, a table, a band of cards — and an `align-items: center` here would
     * shrink-wrap every one of them to its content. Setting `text-align` on the
     * band instead reaches the eyebrow, the heading region and the children
     * together, by inheritance, because under
     * [0207](../../decisions/0207-a-primitive-that-arranges-only-glyphs-inherits-its-alignment.md)
     * none of them overrides an alignment it was not given.
     */
    align: z.enum(["start", "center"]).optional(),
    /** Above the heading region: the small uppercase label Hermes called an eyebrow. */
    eyebrow: z.string().min(1).max(60).optional(),
    /** The name this band answers to, so a link on the page can point at it. */
    anchor: anchorSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const TONES = {
  canvas: { background: "transparent", color: color("fg-default") },
  surface: { background: color("bg-surface"), color: color("fg-default") },
  accent: { background: color("accent-subtle"), color: color("fg-default") },
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
          /**
           * Emitted only when asked, so a band inside an already-centred region
           * does not quietly range itself left (0207). This is the only
           * alignment this primitive sets: the inner wrappers keep flex's
           * `stretch`, so the regions stay full width and their words follow
           * this line down.
           */
          ...(given.align === undefined ? {} : { textAlign: given.align }),
          /**
           * A band narrower than the page sits in the middle of it.
           *
           * `loom.page` lays its children out in a column and a flex item
           * defaults to `stretch`, so a `readable` section inside a `wide` page
           * capped itself at the measure and then sat flush against the left
           * edge with a third of the page empty beside it. Nothing was wrong
           * with either primitive on its own, which is why no assertion in
           * ninety of them caught it: the section's width was right, the page's
           * width was right, and the defect only exists in the pair.
           *
           * A no-op when the band is as wide as its container, which is every
           * band that was rendering correctly before.
           */
          marginInline: "auto",
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
                color: color("accent"),
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
