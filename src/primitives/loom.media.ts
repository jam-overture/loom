import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ASPECT_NAMES, ASPECT_RATIOS, type AspectName } from "./layout.js"
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
 * This is also where a Hermes *binding* would have been, and that sentence stood
 * here arguing the case was closed for seven weeks after it stopped being true.
 * What it said was *"Loom has no resolution layer, so a src is a plain URL in
 * the tree"*; the resolution layer arrived on 15 August with
 * [0058](../../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md),
 * and `loom.plate` is the half of it that belongs to a picture.
 *
 * **This primitive is unchanged and is still the right one for an authored
 * image.** `src` stays required, which is the guarantee every image in every
 * stored tree relies on and the reason the bound case is a second primitive
 * rather than an optional prop here
 * ([0233](../../decisions/0233-a-bound-twin-is-earned-by-a-system-of-record-and-a-row-shape-the-primitive-can-declare.md)).
 * A host that resolves its media before rendering and projects it through a slot
 * still may, and for a one-off picture that is still the simplest thing.
 */

const props = z
  .object({
    src: mediaUrlSchema,
    alt: z.string().max(280),
    decorative: z.boolean().optional(),
    aspect: z.enum(["auto", ...ASPECT_NAMES]).optional(),
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

/**
 * The three named shapes come from `layout.ts`, which `loom.embed` and
 * `loom.before-after` read too — a frame that says `wide` has to mean the same
 * ratio wherever it is said. `auto` stays here because it belongs to a
 * photograph and to nothing else in the library: an image has a natural shape
 * and an embedded document does not.
 */
const ASPECTS: Readonly<Record<"auto" | AspectName, string | undefined>> = {
  auto: undefined,
  ...ASPECT_RATIOS,
}

export const loomMedia = definePrimitive({
  type: "loom.media",
  description: "An image with alt text, an optional caption, and a fixed or natural aspect ratio.",
  props,
  slots: [],
  /**
   * `alt` is declared, and it is the judgement in this pass worth arguing with.
   * It is prose a person wrote for a reader who cannot see the picture, and a
   * change that rewrites every alt text on a page takes words away. It is also
   * the one declared prop a sighted reader does not read — see the finding filed
   * with this pass about one list and two consumers.
   */
  copy: ["alt", "caption"],
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
