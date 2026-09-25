import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { portrait } from "./portrait.js"
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
 * The portrait falls back to the author's initials, which is `portrait.ts`'s
 * rule and not this primitive's: a wall of quotes with nothing where the faces
 * go is the same hole a row of `loom.avatar`s would have, and the answer is
 * already drawn rather than fetched.
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
    /**
     * **Whether `author` names a person**, which decides whether there is a
     * face to draw at all.
     *
     * This is [0160](../../decisions/0160-a-prop-that-unblocks-a-rendering-names-the-content-and-never-the-layout.md)
     * and it meets all three of that record's conditions. The fact is genuinely
     * unobservable: `monogramOf("Head of Platform")` is `"HO"` and
     * `monogramOf("Hanna Ochoa")` is `"HO"`, and nothing in a string says which
     * of the two it was. It changes no node. And getting it wrong degrades
     * rather than breaks — a quote wrongly marked draws no face, a quote
     * wrongly unmarked puts the initials of a job title in a circle.
     *
     * It names the **content** and not the layout, which is the whole of what
     * 0160 rules on: a tree says *nobody is named here*, which stays true, and
     * not *draw no avatar*, which pins this library to the answer it had in
     * September.
     *
     * A catalogue band needs it. A starting composition may not ship a
     * fabricated endorsement attributed to a person who does not exist, so
     * `testimonials` attributes its quotes to roles — *Head of Platform*,
     * *Founder* — and a role has no initials.
     */
    anonymous: z.boolean().optional(),
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
  description:
    "A testimonial: a quote with its author, their role, and a portrait — their initials when there is no photograph.",
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
      /**
       * **The face this band was always described as having.** `loom.avatar`
       * and `loom.person` have fallen back to the initials since they shipped;
       * this one drew a photograph or nothing, and the catalogue ships no
       * photographs — so every quote in every band here was faceless, while
       * `testimonials-band`'s own doc comment said *"`loom.quote` draws a
       * monogram from the author when there is no avatar, so the band is
       * complete without one rather than visibly missing something."* It did
       * not. `portrait.ts` is why that sentence is now true and why the four
       * faces in this library can no longer disagree.
       */
      portrait({
        name: given.anonymous === true ? undefined : given.author,
        image: given.avatar,
        box: AVATAR_SIZE,
        glyph: 2,
        corners: "circle",
        labelled: false,
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
          /** No stylesheet resets this, so the size below is the border box rather than the content box. */
          boxSizing: "border-box",
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
