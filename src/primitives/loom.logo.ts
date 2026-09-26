import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema, mediaUrlSchema } from "./url.js"

/**
 * One mark in a `loom.logo-cloud`.
 *
 * `name` is required and `image` is not, which is Hermes' rule and worth
 * keeping: a wordmark set in the page's own heading face is a perfectly good
 * logo, and it is what renders when the image is missing, still loading, or
 * hosted somewhere that has stopped answering. A logo wall of empty boxes is
 * the failure this avoids.
 *
 * The image is greyed and lifts to full colour on hover, which is what a real
 * logo wall does — twelve brand palettes at full strength fight both the page's
 * theme and each other. It is a filter rather than a colour, so it stays true
 * under both palettes and needs no per-logo styling.
 *
 * ## `surface`, and the photograph that asked for it
 *
 * A mark on a wall is a word on the page and wants nothing under it. A mark on
 * a **ring** is a different rendering of the same content: the first photograph
 * of `loom.orbit` in an assembled page was eight wordmarks floating on two
 * dashed guides, with the guide drawn straight through several of them — a
 * large empty circle with small grey words scattered over it, which is what the
 * 25 September finding called *a ring of words*. What made it read as an orbit
 * in every reference version of this band is that each thing on the ring is a
 * **mark on something**: a tile the guide passes behind rather than through.
 *
 * So `surface` is a prop and not a second primitive, and it is
 * [0052](../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
 * display-mode clause exactly as `loom.feature`'s own `surface` reads it: two
 * renderings of one content model, chosen from a closed set the schema names,
 * changing no node. Asking a wall to plate its marks is one `configure` over
 * the wall's children and back.
 */

const props = z
  .object({
    name: z.string().min(1).max(80),
    image: mediaUrlSchema.optional(),
    href: linkUrlSchema.optional(),
    /**
     * `plain` is the mark alone, which is what a wall of them wants. `card`
     * sets it on a tile, which is what a mark on a ring or over a picture
     * needs to stay legible against whatever is behind it.
     */
    surface: z.enum(["card", "plain"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const MARK_HEIGHT = "1.75rem"

/**
 * The tile, when there is one.
 *
 * It is `loom.feature`'s card off the same tokens, because two things that read
 * as the same surface on one page have to be the same surface. Two things
 * differ, and both are about how small it is:
 *
 * - **the padding**, because a mark is one short line rather than a paragraph;
 * - **the border**, which is `border-default` where a card takes
 *   `border-subtle`. A card is mostly fill and is read by its fill; a tile the
 *   size of a word is mostly edge. On the bold palette a `border-subtle` tile
 *   is a grey around a grey on a grey — three values nobody can tell apart —
 *   which is the whole tile invisible on exactly the band it was added for.
 *   Photographed, not reasoned.
 */
const PLATE: CSSProperties = {
  background: colour("bg-surface"),
  border: `1px solid ${colour("border-default")}`,
  borderRadius: radius("md"),
  paddingBlock: space(2),
  paddingInline: space(4),
}

export const loomLogo = definePrimitive({
  type: "loom.logo",
  description: "One client or partner mark — a wordmark, or an image with the name as its alt text.",
  props,
  /** The mark becomes the anchor when the tree gives it a destination (0064). */
  interactive: { whenProps: ["href"] },
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const plate = given.surface === "card" ? PLATE : {}

    const mark: ReactNode =
      given.image === undefined
        ? createElement(
            "span",
            {
              style: {
                fontFamily: family("heading"),
                fontWeight: weight("heading"),
                fontSize: size(4),
                letterSpacing: "-0.01em",
                color: colour("fg-muted"),
              },
            },
            given.name
          )
        : createElement("img", {
            src: given.image,
            alt: given.name,
            loading: "lazy",
            decoding: "async",
            className: LIBRARY_CLASS.mark,
            style: {
              display: "block",
              height: MARK_HEIGHT,
              width: "auto",
              maxWidth: "10rem",
              objectFit: "contain",
            },
          })

    return given.href === undefined
      ? createElement(
          "div",
          { ...loom.editable, style: { display: "inline-flex", alignItems: "center", ...plate } },
          libraryStylesheet(),
          mark
        )
      : createElement(
          "a",
          {
            ...loom.editable,
            href: given.href,
            "aria-label": given.name,
            style: {
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              color: colour("fg-muted"),
              ...plate,
            },
          },
          libraryStylesheet(),
          mark
        )
  },
})
