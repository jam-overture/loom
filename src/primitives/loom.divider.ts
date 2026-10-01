import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { color, hairline, space, type RampStep } from "./tokens.js"

/**
 * The enum-driven one: `ornament` selects between three genuinely different
 * renderings, not three values of the same property.
 *
 * This is the shape of Hermes block that ports most awkwardly. Its `style` field
 * was a display mode — the renderer branched on it and emitted different
 * elements — while every other field was data. Loom keeps it as a prop rather
 * than splitting it into three primitives, because a model changing a rule into
 * a dot row should emit one `configure` that the Gate can weigh as the small,
 * reversible change it is; `remove` plus `insert` would read as a structural
 * edit and lose the node's identity for no gain.
 *
 * The general rule the port follows: **a prop that changes what is rendered is
 * still a prop, as long as the alternatives are a closed set the schema names.**
 * An open set would be a different primitive per member.
 */

const props = z
  .object({
    ornament: z.enum(["rule", "dots", "diamond"]).optional(),
    spacing: z.enum(["tight", "normal", "loose"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const SPACING: Readonly<Record<"tight" | "normal" | "loose", RampStep>> = {
  tight: 2,
  normal: 4,
  loose: 6,
}

const DOT_COUNT = 3

const dot = (key: number): ReturnType<typeof createElement> =>
  createElement("span", {
    key,
    style: {
      width: "4px",
      height: "4px",
      borderRadius: "50%",
      background: color("accent"),
    },
  })

/**
 * `role="separator"` on every mode, and no text. A divider is decoration that
 * carries meaning to a sighted reader only, so the mode is invisible to a screen
 * reader by design rather than by omission.
 *
 * **Every ornament states its own width**, and two of them did not until the
 * marketing routine put one on a real page and filed it. The divider's element
 * is a flex row; `rule` filled it because it set `width: 100%`, and `dots` and
 * `diamond` set neither a width nor a flex, so they took `flex: 0 1 auto` and
 * shrank to their content — three dots centred inside a box the width of three
 * dots, and a diamond whose two hairlines had nothing to grow into. The library
 * palette test rendered both and asserted about color, so a mark drawn in
 * entirely the wrong place passed it.
 */
const ORNAMENTS = {
  rule: () =>
    createElement("span", {
      style: { display: "block", width: "100%", height: "1px", background: color("border-default") },
    }),
  dots: () =>
    createElement(
      "span",
      { style: { display: "flex", flex: "1 1 auto", justifyContent: "center", gap: space(2) } },
      Array.from({ length: DOT_COUNT }, (_unused, index) => dot(index))
    ),
  diamond: () =>
    createElement(
      "span",
      { style: { display: "flex", flex: "1 1 auto", alignItems: "center", gap: space(3) } },
      createElement("span", {
        key: "before",
        style: { flex: "1 1 0", height: "1px", background: hairline() },
      }),
      createElement("span", {
        key: "mark",
        style: {
          width: "8px",
          height: "8px",
          rotate: "45deg",
          background: color("accent"),
        },
      }),
      createElement("span", {
        key: "after",
        style: { flex: "1 1 0", height: "1px", background: hairline() },
      })
    ),
} as const

export const loomDivider = definePrimitive({
  type: "loom.divider",
  description: "A visual break between sections, as a plain rule, a row of dots, or a diamond.",
  props,
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        role: "separator",
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          paddingBlock: space(SPACING[given.spacing ?? "normal"]),
        },
      },
      ORNAMENTS[given.ornament ?? "rule"]()
    ),
})
