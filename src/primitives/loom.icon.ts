import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { color, radius, size, space } from "./tokens.js"

/**
 * One glyph, optionally in a tile.
 *
 * `loom.feature` has carried an emoji in a prop since the first port, and the
 * reasoning there still holds: an icon *set* is a registry of its own, and a
 * URL puts a network fetch behind a tile that has to render instantly. What did
 * not survive the compose-and-arrange layer is that the glyph was only ever
 * reachable *inside a feature*. A card, a stack, a footer column — none of them
 * could have one without pretending to be a feature.
 *
 * **The glyph is a child, not a prop**, which is 0059 read literally: exactly
 * one string, and it is the whole of what the node says. An icon with its glyph
 * taken away is not an icon with a hole in it; it is nothing. So re-authoring
 * it is a `configure` on a text node, and the glyph has an author of its own in
 * the attribution walk — the same shape as `loom.badge` and `loom.action`.
 *
 * `label` is a prop and is not a second string of content. It is the
 * *accessible name of the same content*, which is the call `loom.media` already
 * makes with `alt` beside `src`. Its absence is meaningful and is the default:
 * an icon beside a word it repeats must be `aria-hidden`, or a screen reader
 * reads the word twice. An icon that is the only thing in its control has to
 * say what it means, and then `label` is how it does.
 */

const props = z
  .object({
    /**
     * The accessible name. **Omit it for the decorative case** — an icon that
     * sits beside text saying the same thing — and the glyph is hidden from
     * assistive technology rather than read out as whatever Unicode calls it.
     */
    label: z.string().min(1).max(80).optional(),
    size: z.enum(["small", "medium", "large"]).optional(),
    /** `bare` is the glyph alone; the other two put it on a tile. */
    shape: z.enum(["bare", "soft", "circle"]).optional(),
    tone: z.enum(["accent", "neutral", "strong"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const SIZES = {
  small: { box: space(6), glyph: size(2) },
  medium: { box: space(7), glyph: size(4) },
  large: { box: space(8), glyph: size(6) },
} as const

/**
 * `bare` carries its own foreground because the tiled color is chosen against
 * the tile. `fg-on-accent` on a `strong` tile is the contrast the palette
 * promises; the same value on the page background is text nobody can read, and
 * that is exactly the class of mistake the two starter palettes exist to catch.
 */
const TONES = {
  accent: {
    background: color("accent-subtle"),
    color: color("accent-strong"),
    borderColor: color("border-accent"),
    bare: color("accent"),
  },
  neutral: {
    background: color("bg-surface-muted"),
    color: color("fg-muted"),
    borderColor: color("border-subtle"),
    bare: color("fg-muted"),
  },
  strong: {
    background: color("accent"),
    color: color("fg-on-accent"),
    borderColor: color("accent-strong"),
    bare: color("accent-strong"),
  },
} as const

export const loomIcon = definePrimitive({
  type: "loom.icon",
  description: "One glyph, bare or on a tile. Its glyph is a child; name it with label, or leave it decorative.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const named = given.label !== undefined
    const shape = given.shape ?? "soft"
    const tone = TONES[given.tone ?? "accent"]
    const scale = SIZES[given.size ?? "medium"]
    const tiled = shape !== "bare"

    return createElement(
      "span",
      {
        ...loom.editable,
        /**
         * Named or hidden, never neither. A `role="img"` with no name is a
         * control that announces itself as an image and then says nothing,
         * which is worse for a reader than the glyph being skipped.
         */
        ...(named ? { role: "img", "aria-label": given.label } : { "aria-hidden": true }),
        style: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
          fontSize: scale.glyph,
          lineHeight: 1,
          color: tiled ? tone.color : tone.bare,
          ...(tiled
            ? {
                width: scale.box,
                height: scale.box,
                background: tone.background,
                border: "1px solid",
                borderColor: tone.borderColor,
                borderRadius: shape === "circle" ? radius("full") : radius("md"),
              }
            : {}),
        },
      },
      children
    )
  },
})
