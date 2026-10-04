import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, weight } from "./tokens.js"

/**
 * One mark placed at a point over the thing it is explaining.
 *
 * A screenshot shows the whole interface at once and says nothing about which
 * part of it matters. The band that fixes that is an annotated shot — a numbered
 * dot on the panel being described and a short phrase beside it — and it is the
 * one thing on a product page that makes a reader look at the picture rather
 * than past it.
 *
 * ## The field this is not
 *
 * Hermes would have written it `hotspots: Hotspot[]` on the frame, and that is
 * the exact shape [0052](../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
 * rules out. Moving one mark two percent to the left would be a `configure`
 * carrying the whole array; the analysis could say only *this node's props
 * changed*; the inverse would restore every mark rather than the one that
 * moved; and nobody would be attributable for any single one of them. As nodes
 * they are an `insert` each, a `move` each and a `remove` each, and the
 * granularity doc's promise holds: the adaptation nobody predicted — *put that
 * label on the other side* — is reachable without anyone shipping a prop.
 *
 * `x` and `y` are the near-miss the doc warns about and they pass its sharper
 * test: changing either moves **this** mark and changes the set of nodes not at
 * all. They are the same kind of value as `loom.orbit`'s seat angle, expressed
 * the same way and for the same reason.
 *
 * ## Where the layout lives, and why none of it is on the element
 *
 * The pin carries **where it is** and nothing about **how it is drawn**, which
 * is what lets one mark have two completely different renderings:
 *
 * - Where the frame is wide it is absolutely placed over the screen, with its
 *   label flying out to the side the tree chose.
 * - Where the frame is narrow it is a row in a legend under the screen, because
 *   four labels flying out over a 350px-wide screenshot is four labels lying on
 *   top of one another and on top of the thing they point at.
 *
 * Both renderings are `stylesheet.ts`'s, and the legend is the **unqueried**
 * rule — the base layout is the legend and the overlay arrives inside a query,
 * so a client that resolves none at all gets the readable arrangement rather
 * than the one that needs room
 * ([0079](../../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md)).
 * An inline `position` would beat every one of those rules, so the only thing
 * this component writes to the element is the two coordinates.
 *
 * It is a **container** query rather than a width one, for the reason
 * `loom.offering`, `loom.marquee` and `loom.orbit` each already give: what
 * decides whether three labels can fly out over a screenshot is the width of
 * the *frame*, and a frame is as likely to be one column of a `loom.split` on a
 * laptop as the whole width of a phone. A viewport query cannot tell those
 * apart, and it is the first of the two that a page actually puts a screenshot
 * in.
 *
 * The dot pulses, once per few seconds, and that is in the stylesheet too
 * ([0055](../../decisions/0055-motion-is-a-static-stylesheet-the-primitive-emits.md)):
 * a tree may say where a mark is and may not say how fast it breathes. It stops
 * for reduced motion, and it stops while the page is being edited, for
 * `loom.marquee`'s reason — a target that is moving is hostile to the one
 * activity edit mode exists for.
 */

const props = z
  .object({
    /** How far across the surface, as a percentage of its width. */
    x: z.number().min(0).max(100),
    /** How far down the surface, as a percentage of its height. */
    y: z.number().min(0).max(100),
    /**
     * What the label says. Required, because a dot with nothing beside it
     * points at something and tells the reader nothing — and in the legend
     * rendering, where the dot is no longer *over* anything, it would be a row
     * of ordinals with no content at all.
     */
    label: z.string().min(1).max(80),
    /**
     * The ordinal in the dot — `1`, `2`, `A`. Optional: a single mark on a shot
     * needs no numbering, and an unnumbered dot is smaller than a numbered one
     * rather than a numbered one with a hole in it.
     */
    marker: z.string().min(1).max(3).optional(),
    /**
     * Which way the label flies out from the dot. A mark at 90% across has to
     * open leftwards or its label leaves the frame, and no rule can work that
     * out: a percentage is not a width, and the label's own length is not
     * knowable here. Ignored by the legend rendering, where the label follows
     * the dot in reading order.
     */
    side: z.enum(["start", "end", "above", "below"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * A plain string map rather than a style literal, which is `loom.orbit`'s shape
 * and is a compiler fact rather than an echo of it: a custom property is not a
 * member of React's `CSSProperties`, so a literal carrying one is an excess
 * property `tsc` refuses.
 */
const at = (x: number, y: number): Record<string, string> => ({
  "--loom-pin-x": `${x}%`,
  "--loom-pin-y": `${y}%`,
})

const SIDES = {
  start: LIBRARY_CLASS.pinStart,
  end: LIBRARY_CLASS.pinEnd,
  above: LIBRARY_CLASS.pinAbove,
  below: LIBRARY_CLASS.pinBelow,
} as const

export const loomPin = definePrimitive({
  type: "loom.pin",
  description:
    "A numbered mark placed at a point over a loom.frame's surface, with a short label beside it. Becomes a row of a legend under the screen where the frame is narrow.",
  props,
  slots: [],
  /**
   * `marker` is three characters of glyph, and a glyph is not a word: a change
   * that swaps one is a change a reading should report as taking no words away.
   */
  copy: ["label"],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className: [
          LIBRARY_CLASS.pin,
          SIDES[given.side ?? "end"],
          loom.editable === undefined ? undefined : LIBRARY_CLASS.pinStill,
        ]
          .filter((name) => name !== undefined)
          .join(" "),
        /**
         * The whole of what this element carries. Everything else about the
         * mark is a fact about the arrangement rather than about this one node,
         * and an inline value would make the legend rendering unreachable.
         */
        style: at(given.x, given.y),
      },
      libraryStylesheet(),
      createElement(
        "span",
        {
          key: "dot",
          className: LIBRARY_CLASS.pinDot,
          style: {
            background: colour("accent"),
            color: colour("fg-on-accent"),
            fontFamily: family("body"),
            fontSize: size(1),
            fontWeight: weight("heading"),
            boxShadow: `0 6px 16px -8px ${colour("fg-default")}`,
          },
        },
        given.marker
      ),
      createElement(
        "span",
        {
          key: "label",
          className: LIBRARY_CLASS.pinLabel,
          style: {
            /**
             * `bg-surface`, and `bg-overlay` is the slot this actually wants: a
             * label floating over content the primitive did not draw and cannot
             * measure is the one thing that slot names. Nothing in the library
             * paints it — this would be the first — so it carries no row in the
             * declared pairings, and adding one is `src/theme/`'s file rather
             * than this lane's. The three starter palettes set the two slots to
             * the same value, so the rendering is identical today and the swap
             * is one token when the row exists. Filed.
             */
            background: colour("bg-surface"),
            color: colour("fg-default"),
            border: `1px solid ${colour("border-subtle")}`,
            borderRadius: radius("sm"),
            fontFamily: family("body"),
            fontSize: size(1),
            boxShadow: `0 10px 24px -18px ${colour("fg-default")}`,
          },
        },
        given.label
      )
    ),
})
