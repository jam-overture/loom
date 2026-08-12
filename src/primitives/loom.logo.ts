import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, size, weight } from "./tokens.js"
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
 */

const props = z
  .object({
    name: z.string().min(1).max(80),
    image: mediaUrlSchema.optional(),
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const MARK_HEIGHT = "1.75rem"

export const loomLogo = definePrimitive({
  type: "loom.logo",
  description: "One client or partner mark — a wordmark, or an image with the name as its alt text.",
  props,
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
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
          { ...loom.editable, style: { display: "inline-flex", alignItems: "center" } },
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
            },
          },
          libraryStylesheet(),
          mark
        )
  },
})
