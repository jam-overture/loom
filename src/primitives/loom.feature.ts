import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
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
  background: colour("bg-surface"),
  border: `1px solid ${colour("border-subtle")}`,
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
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const card = given.surface !== "plain"
    const linked = given.href !== undefined

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
                background: colour("accent-subtle"),
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
            color: colour("fg-default"),
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
            color: colour("fg-muted"),
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
        className: card ? LIBRARY_CLASS.lift : undefined,
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: space(3),
          height: "100%",
          textDecoration: "none",
          color: colour("fg-default"),
          ...(card ? CARD : PLAIN),
        },
      },
      libraryStylesheet(),
      ...body
    )
  },
})
