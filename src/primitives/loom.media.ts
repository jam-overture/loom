import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, radius, size, space } from "./tokens.js"
import { mediaUrlSchema } from "./url.js"

/**
 * The rich-schema one: seven props, two of them required, with the constraints
 * that matter enforced by the schema rather than by the renderer coping.
 *
 * `alt` is required and non-empty because the props in a Loom tree are
 * AI-authored, and "the model usually remembers alt text" is not an
 * accessibility strategy. A decorative image is expressible — `alt: ""` is the
 * HTML convention for it — but it has to be said, and `decorative: true` is what
 * says it, so the difference between "no alt text" and "deliberately none"
 * survives in the tree.
 *
 * This is also where a Hermes *binding* would have been. Hermes' image field
 * could resolve from a connected integration at render time; Loom has no
 * resolution layer, so a src is a plain URL in the tree and a host that wants
 * dynamic media resolves it before rendering and projects it through a slot
 * (0008).
 */

const props = z
  .object({
    src: mediaUrlSchema,
    alt: z.string().max(280),
    decorative: z.boolean().optional(),
    aspect: z.enum(["auto", "square", "wide", "portrait"]).optional(),
    fit: z.enum(["cover", "contain"]).optional(),
    corners: z.enum(["none", "sm", "md", "lg"]).optional(),
    caption: z.string().min(1).max(240).optional(),
  })
  .strict()
  .refine((value) => value.decorative === true || value.alt.length > 0, {
    message: "alt text is required unless the image is marked decorative",
    path: ["alt"],
  })

type Props = z.infer<typeof props>

const ASPECTS = {
  auto: undefined,
  square: "1 / 1",
  wide: "16 / 9",
  portrait: "3 / 4",
} as const

export const loomMedia = definePrimitive({
  type: "loom.media",
  description: "An image with alt text, an optional caption, and a fixed or natural aspect ratio.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const ratio = ASPECTS[given.aspect ?? "auto"]
    const corners = given.corners ?? "md"

    const image = createElement("img", {
      src: given.src,
      alt: given.alt,
      ...(given.decorative === true ? { role: "presentation" } : {}),
      loading: "lazy",
      decoding: "async",
      style: {
        display: "block",
        width: "100%",
        height: ratio === undefined ? "auto" : "100%",
        objectFit: given.fit ?? "cover",
        ...(ratio === undefined ? {} : { aspectRatio: ratio }),
        background: colour("bg-surface-muted"),
        borderRadius: corners === "none" ? "0" : radius(corners),
      },
    })

    return createElement(
      "figure",
      {
        ...loom.editable,
        style: { display: "flex", flexDirection: "column", gap: space(2), margin: "0", width: "100%" },
      },
      image,
      given.caption === undefined
        ? null
        : createElement(
            "figcaption",
            {
              style: {
                fontFamily: family("body"),
                fontSize: size(2),
                color: colour("fg-muted"),
              },
            },
            given.caption
          ),
      children
    )
  },
})
