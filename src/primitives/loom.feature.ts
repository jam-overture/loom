import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { color, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * One tile of a `loom.feature-grid`: a glyph, a title, and a sentence about why
 * it matters.
 *
 * Its copy is props rather than child nodes, which is the same call `loom.stat`
 * makes and the same half of 0052: `title` and `body` are *fixed fields* of one
 * record — there is exactly one of each, they are meaningless apart, and
 * changing one is exactly a `configure`. Text becomes a node when it is prose a
 * reader would edit as prose, or when there can be more than one of it.
 *
 * `icon` is one character on purpose. Hermes stored an emoji glyph here and
 * that is worth keeping: an icon *set* is a registry of its own, and a URL
 * would put a network fetch behind a tile that must render instantly. A model
 * choosing an emoji is choosing from a vocabulary it cannot get wrong.
 *
 * When `href` is set the whole tile is the link — the target a reader actually
 * aims at — and the title takes the underline wipe rather than the tile
 * sprouting a "learn more" that says nothing.
 *
 * ## The `media` region, and what it was for
 *
 * A tile may be handed something to show. It is a **slot** and not a child,
 * which is [0051](../../decisions/0051-a-slot-is-a-region-the-primitive-places.md)'s
 * test passed plainly: the tile *places* it — after the words, given a width of
 * its own, and turned beside them when the tile is wide enough — so *the last
 * child is the picture* would be a rule no schema states and every `move`
 * breaks. It is a region rather than a prop for
 * [0052](../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
 * reason: a tile with something in it and a tile without are different sets of
 * nodes, so *show the diff here* is an `insert` carrying whatever the page
 * already knows how to draw — and never a `mediaUrl` prop nobody can supply.
 *
 * It is named `media` because that is what this library calls the region:
 * `loom.card` and `loom.hero` both have one, and a third name for the same
 * question would be a third thing a model has to know.
 *
 * **What goes in it is nodes, not an asset.** `hero-split-band` established
 * that a product surface here is worth more than a screenshot — a `loom.frame`
 * over figures and bars re-themes with the page, needs no file a host has to
 * place, and is edited by moving nodes rather than by opening an image editor.
 * The same holds one level down.
 *
 * ## Why the turn is a container query
 *
 * A tile 340px wide in a `loom.feature-grid` and the same tile running the full
 * width of a `loom.mosaic`'s lead cell are the same node, and only one of them
 * has room to set the words beside the picture. The *window* cannot tell those
 * apart — both are on the same laptop — so the rule is a `@container` query
 * over the tile's own width, which is the bargain
 * [0079](../../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md)
 * already makes for the mosaic's rhythm and `loom.event`'s row. The markup is
 * the same either way.
 */

const props = z
  .object({
    title: z.string().min(1).max(80),
    body: z.string().min(1).max(280),
    /** A single glyph. Emoji or one character; an icon set is a registry, not a prop. */
    icon: z.string().min(1).max(4).optional(),
    href: linkUrlSchema.optional(),
    /** `card` sits on its own surface; `plain` sits directly on the page. */
    surface: z.enum(["card", "plain"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const CARD: CSSProperties = {
  background: color("bg-surface"),
  border: `1px solid ${color("border-subtle")}`,
  borderRadius: radius("lg"),
  padding: space(5),
}

const PLAIN: CSSProperties = {
  border: "1px solid transparent",
  paddingBlock: space(3),
}

export const loomFeature = definePrimitive({
  type: "loom.feature",
  description: "One feature tile — glyph, title, and a sentence. A cell of a loom.feature-grid.",
  props,
  /** The whole tile becomes the anchor when the tree gives it a destination (0064). */
  interactive: { whenProps: ["href"] },
  slots: ["media"],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const card = given.surface !== "plain"
    const linked = given.href !== undefined
    const media = loom.slots["media"]

    const body = [
      given.icon === undefined
        ? null
        : createElement(
            "span",
            {
              key: "icon",
              "aria-hidden": true,
              style: {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: space(7),
                height: space(7),
                borderRadius: radius("md"),
                background: color("accent-subtle"),
                fontSize: size(4),
                lineHeight: 1,
              },
            },
            given.icon
          ),
      createElement(
        "h3",
        {
          key: "title",
          className: linked ? LIBRARY_CLASS.underline : undefined,
          style: {
            margin: "0",
            alignSelf: "flex-start",
            fontFamily: family("heading"),
            fontWeight: weight("heading"),
            fontSize: size(4),
            lineHeight: 1.2,
            color: color("fg-default"),
          },
        },
        given.title
      ),
      createElement(
        "p",
        {
          key: "body",
          style: {
            margin: "0",
            fontFamily: family("body"),
            fontSize: size(3),
            lineHeight: 1.6,
            color: color("fg-muted"),
          },
        },
        given.body
      ),
    ]

    return createElement(
      linked ? "a" : "div",
      {
        ...loom.editable,
        ...(linked ? { href: given.href } : {}),
        className: [LIBRARY_CLASS.feature, card ? LIBRARY_CLASS.lift : undefined]
          .filter((name) => name !== undefined)
          .join(" "),
        style: {
          display: "flex",
          flexDirection: "column",
          height: "100%",
          /**
           * `height: 100%` and padding, without this, make a tile taller than
           * the row it is in.
           *
           * The percentage resolves against the grid track; the padding is then
           * added *outside* it under the default `content-box`, so every card
           * overflowed its own row by `2 × space(5)`. With one row that put the
           * cards 66px over the bottom of the grid and into whatever band came
           * next; with two rows the second row was drawn *through* the first.
           * Both are visible in a screenshot and invisible to every assertion,
           * because the markup, the colors and the widths were all correct.
           *
           * `loom.section` writes the same line with the same reasoning —
           * *"no stylesheet resets these"* — which is what makes this an
           * omission rather than a difference of opinion.
           */
          boxSizing: "border-box",
          textDecoration: "none",
          color: color("fg-default"),
          ...(card ? CARD : PLAIN),
        },
      },
      libraryStylesheet(),
      /**
       * The words and the picture are each one box, always — including on the
       * tile that has no picture, where the copy box is the only child.
       *
       * The alternative is to wrap only when something is placed, and it costs
       * more than the `<div>` it saves: `flex-direction` would then be inline
       * on the tile for one rendering and on a rule for the other, and an
       * inline style beats a rule — so the `@container` query that has to turn
       * the tile would be unreachable on exactly the tiles it is for. That is
       * the trap `loom.mosaic` names in its own `display` line, met here from
       * the other end.
       */
      createElement(
        "div",
        {
          key: "frame",
          className:
            media === undefined
              ? LIBRARY_CLASS.featureFrame
              : `${LIBRARY_CLASS.featureFrame} ${LIBRARY_CLASS.featureFigured}`,
        },
        createElement("div", { key: "copy", className: LIBRARY_CLASS.featureCopy }, ...body),
        media === undefined
          ? null
          : createElement("div", { key: "media", className: LIBRARY_CLASS.featureMedia }, media)
      )
    )
  },
})
