import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, radius, size, space, weight } from "./tokens.js"
import { mediaUrlSchema } from "./url.js"

/**
 * Someone else saying it. The social-proof leaf every marketing page needs and
 * the one that most often looks cheap.
 *
 * Hermes had two blocks here — a singleton `testimonial` with quote and author,
 * and a `testimonial-grid` over a `TestimonialEntry` shape with role and
 * avatar. They are the same content model at two scales, so the port keeps one
 * primitive with the richer schema: one of these in a `loom.split` is the
 * singleton, several in a grid are the wall, and there is no second type to
 * keep in step with the first.
 *
 * The copy is props rather than child nodes for the reason `loom.feature`
 * gives: a quote, its author and their role are one record, and an attribution
 * that outlived its quote would be a valid tree saying nothing.
 *
 * The quotation mark is drawn from the heading family at a size no ramp step
 * offers, and it is `aria-hidden`: it is punctuation a screen reader already
 * gets from `blockquote`, and reading it aloud is noise.
 */

const props = z
  .object({
    quote: z.string().min(1).max(600),
    author: z.string().min(1).max(120),
    /** Title and company, as one line — "Head of Design, Acme". */
    role: z.string().min(1).max(120).optional(),
    avatar: mediaUrlSchema.optional(),
    /** `feature` is the one-per-page pull quote; `card` sits in a wall of them. */
    emphasis: z.enum(["card", "feature"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const SURFACES: Readonly<Record<"card" | "feature", CSSProperties>> = {
  card: {
    background: colour("bg-surface"),
    border: `1px solid ${colour("border-subtle")}`,
    borderRadius: radius("lg"),
    padding: space(5),
  },
  feature: {
    background: "transparent",
    borderInlineStart: `2px solid ${colour("border-accent")}`,
    borderRadius: "0",
    paddingInlineStart: space(5),
    paddingBlock: space(3),
  },
}

const AVATAR_SIZE = "2.75rem"

export const loomQuote = definePrimitive({
  type: "loom.quote",
  description: "A testimonial: a quote with its author, their role, and an optional portrait.",
  props,
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const feature = given.emphasis === "feature"

    const attribution = createElement(
      "figcaption",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: space(3),
          fontFamily: family("body"),
        },
      },
      given.avatar === undefined
        ? null
        : createElement("img", {
            src: given.avatar,
            alt: "",
            loading: "lazy",
            decoding: "async",
            style: {
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: radius("full"),
              objectFit: "cover",
              background: colour("bg-surface-muted"),
            },
          }),
      createElement(
        "span",
        { style: { display: "flex", flexDirection: "column", gap: space(1) } },
        createElement(
          "span",
          { style: { fontSize: size(2), fontWeight: weight("heading"), color: colour("fg-default") } },
          given.author
        ),
        given.role === undefined
          ? null
          : createElement(
              "span",
              { style: { fontSize: size(2), color: colour("fg-muted") } },
              given.role
            )
      )
    )

    return createElement(
      "figure",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: space(4),
          margin: "0",
          height: "100%",
          ...SURFACES[given.emphasis ?? "card"],
        },
      },
      createElement(
        "blockquote",
        {
          style: {
            display: "flex",
            gap: space(2),
            margin: "0",
            fontFamily: family(feature ? "heading" : "body"),
            fontSize: size(feature ? 5 : 3),
            lineHeight: feature ? 1.35 : 1.6,
            color: colour("fg-default"),
            textWrap: "pretty",
          },
        },
        createElement(
          "span",
          {
            "aria-hidden": true,
            style: {
              fontFamily: family("heading"),
              fontSize: size(feature ? 8 : 6),
              lineHeight: 0.9,
              color: colour("accent"),
              /** Optical alignment: the glyph's own sidebearing reads as a gap. */
              marginInlineStart: "-0.08em",
            },
          },
          "“"
        ),
        createElement("p", { style: { margin: "0" } }, given.quote)
      ),
      attribution
    )
  },
})
