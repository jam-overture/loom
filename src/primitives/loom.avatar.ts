import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { monogramOf } from "./monogram.js"
import { colour, family, radius, size, weight } from "./tokens.js"
import { mediaUrlSchema } from "./url.js"

/**
 * One face, or the two letters that stand in for it.
 *
 * `loom.person` and `loom.quote` have each drawn one since the port started,
 * and both are right to: a person's photograph and a testimonial's portrait are
 * fixed fields of those records, not nodes someone would move. What neither
 * could do is let a face appear anywhere *else* — beside a byline, in a signed-in
 * nav, in the row of them a landing page puts above "4,000 builders" — because
 * the only way to reach one was to claim to be a person or a quote.
 *
 * That is the same gap `loom.icon` closed for the glyph that lived inside a
 * feature, and it is closed the same way: the leaf comes out, and the two
 * primitives that already hold one keep holding one. Nothing is deprecated, and
 * a tree that wants a face beside a name now composes it rather than borrowing
 * a record that means something else.
 *
 * **`name` is required and the image is not**, which is `loom.logo`'s rule and
 * worth keeping for the same reason: the fallback is the common case, not the
 * error case. A team page ships before its photographs do, and a directory
 * pulled from a database has an image column that is null more often than not.
 * A monogram in the accent tint reads as a decision; an empty grey circle reads
 * as something that failed to load.
 *
 * Both fields are props rather than nodes, which is 0052's fixed-field half:
 * there is exactly one name and one face, they are meaningless apart, and
 * changing either is exactly a `configure`. It is a leaf for the reason
 * `loom.stat` is one.
 */

const props = z
  .object({
    /**
     * Who this is. It is the accessible name *and* the monogram's source, which
     * is the call `loom.logo` makes with `name` beside `image` — one string
     * doing both jobs is what stops a face with a photograph and a face without
     * one being described differently to a screen reader.
     */
    name: z.string().min(1).max(80),
    image: mediaUrlSchema.optional(),
    size: z.enum(["small", "medium", "large"]).optional(),
    /** `soft` is the rounded square a product avatar tends to be; `circle` is a person. */
    shape: z.enum(["circle", "soft"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * In `rem` rather than off the spacing scale, which is the call `loom.person`
 * and `loom.quote` already made for the faces they draw. A photograph has a
 * *subject* in it, and below about two rem a face is a smudge whatever the
 * preset thinks a comfortable gap is — this is one of the few lengths in the
 * library that is answerable to the content rather than to the theme.
 *
 * The monogram takes a type step at each size, chosen to sit inside the box
 * rather than to fill it: initials that touch the edge of a circle read as a
 * crop.
 */
const SIZES = {
  small: { box: "2rem", glyph: size(1) },
  medium: { box: "2.75rem", glyph: size(2) },
  large: { box: "4rem", glyph: size(4) },
} as const

export const loomAvatar = definePrimitive({
  type: "loom.avatar",
  description:
    "One person's face — a photograph, or their initials when there is none. A leaf; a row of them is a loom.avatar-row.",
  props,
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const scale = SIZES[given.size ?? "medium"]
    const corners = given.shape === "soft" ? radius("md") : radius("full")

    const box = {
      width: scale.box,
      height: scale.box,
      flex: "0 0 auto",
      borderRadius: corners,
    } as const

    return given.image === undefined
      ? createElement(
          "span",
          {
            ...loom.editable,
            /**
             * The monogram is decoration and the *node* carries the name, so
             * the letters are announced once as a name rather than twice as two
             * capitals. An `img` with no `alt` and a `span` with no role are
             * both the wrong shape here: this is a picture of somebody, and
             * `role="img"` with a label is how a span says so.
             */
            role: "img",
            "aria-label": given.name,
            style: {
              ...box,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colour("accent-subtle"),
              color: colour("accent-strong"),
              fontFamily: family("heading"),
              fontWeight: weight("heading"),
              fontSize: scale.glyph,
              lineHeight: 1,
              letterSpacing: "0.02em",
              userSelect: "none",
            },
          },
          monogramOf(given.name)
        )
      : createElement("img", {
          ...loom.editable,
          src: given.image,
          alt: given.name,
          loading: "lazy",
          decoding: "async",
          style: {
            ...box,
            display: "block",
            objectFit: "cover",
            /** Shows through while the photograph loads, so the row never has a hole in it. */
            backgroundColor: colour("bg-surface-muted"),
          },
        })
  },
})
