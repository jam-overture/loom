import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, radius, size, space, weight } from "./tokens.js"

/**
 * A short label attached to something else — "Most popular", "Beta", "New".
 *
 * It is the granularity doc's second atomic case, stated in three words: a
 * badge is a badge. There is no interior to carve at, no repeated content, and
 * nothing a `move` or an `insert` could usefully reach inside it, so the only
 * thing the tree says about one is what it reads and which of three
 * registered treatments it wears.
 *
 * Its label is child text rather than a prop, which is where it parts company
 * with `loom.stat` and `loom.feature`. Those hold *two or more* fixed fields
 * that are meaningless apart — a value with no label says nothing. A badge
 * holds exactly one string, and one string that is the whole of a node's
 * content is prose by 0052's third clause: `loom.action` reached the same place
 * for the same reason, and a badge whose text could not be re-authored without
 * replacing the node would be the odd one out.
 *
 * This exists because 0052 makes it necessary rather than merely nice. Hermes
 * put "Most popular" on a pricing tier as a `highlighted` boolean, which is
 * `insert` in disguise — the flag decides whether a piece of content exists.
 * Here the tier has a region and the badge is a node someone placed in it, so
 * the emphasis is a `configure` and the label is a subtree with its own
 * history.
 */

const props = z
  .object({
    /**
     * Three treatments, not three shades: an accent badge claims attention, a
     * neutral one classifies quietly, and an outline one sits on a coloured
     * surface where a filled badge would fight it.
     */
    tone: z.enum(["accent", "neutral", "outline"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const TONES = {
  accent: {
    background: colour("accent-subtle"),
    color: colour("accent-strong"),
    borderColor: colour("border-accent"),
  },
  neutral: {
    background: colour("bg-surface-muted"),
    color: colour("fg-muted"),
    borderColor: colour("border-subtle"),
  },
  outline: {
    background: "transparent",
    color: colour("fg-default"),
    borderColor: colour("border-strong"),
  },
} as const

export const loomBadge = definePrimitive({
  type: "loom.badge",
  description: "A short label attached to something else — “Most popular”, “Beta”. Its text is a child.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "span",
      {
        ...loom.editable,
        style: {
          ...TONES[given.tone ?? "accent"],
          display: "inline-flex",
          alignItems: "center",
          /**
           * Shrink-wraps rather than filling its parent, which `inline-flex`
           * alone does not buy: a flex container blockifies its items and
           * stretches them on the cross axis, so a badge placed directly in a
           * `loom.card` — a flex column — became a full-width bar with two
           * characters in it. Measured at 1280px on 17 September: a badge
           * reading `01` was **281px wide against a card whose inner width is
           * 281px**, in `steps-cards` and in `catches-the-eye.specimen.ts`,
           * where "Most popular" has been photographed that way since it
           * shipped.
           *
           * The same line, for the same reason, that `control.ts`,
           * `loom.perk`, `loom.feature` and `loom.milestone` already carry.
           * It belongs on the child rather than on every container that might
           * hold one, which is
           * [0155](../../decisions/0155-a-container-may-only-add-to-its-children-what-they-left-unspoken.md):
           * a badge's width is a thing a badge knows, and a card that reached
           * in to set it would be four containers each deciding it separately.
           */
          alignSelf: "flex-start",
          gap: space(1),
          /**
           * Padded off the spacing scale on the inline axis and off the type
           * ramp on the block axis. A badge is one line of text in a pill, so
           * its height wants to track the text it wraps rather than a step that
           * a spacious preset would blow out into a button.
           */
          paddingBlock: space(1),
          paddingInline: space(3),
          border: "1px solid",
          borderRadius: radius("full"),
          fontFamily: family("body"),
          fontWeight: weight("heading"),
          fontSize: size(1),
          lineHeight: 1.4,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        },
      },
      children
    ),
})
