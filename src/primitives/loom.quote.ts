import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { quoteFields, quoteInterior, quoteSurface } from "./quote-content.js"

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
 *
 * ## The card moved to `quote-content.ts`, and nothing about it changed
 *
 * `loom.voices` reads a run of these from a registered source, and the two draw
 * one card. The markup, the two surfaces, the portrait call and the quotation
 * mark are now in a shared module for `perk-content.ts`'s reason — a surface
 * added to one and forgotten in the other is the drift a shared module
 * prevents — and here the stake is sharper than usual: the authored card is
 * what the catalogue photographs and the bound card is what a deployment
 * serves, so a disagreement between them is one nobody sees until it is live.
 *
 * What stayed is the `figure` and `loom.editable` on it. That is the one real
 * difference between the two: this is a node a reviewer can address, and a row
 * from a database is not.
 */

const props = z
  .object({
    /**
     * The four fields of a testimonial, from `quote-content.ts`, so this
     * primitive and `loom.voices` cannot disagree about what one is. The two
     * props below are this primitive's own and have no analogue in a row — see
     * each one for why.
     */
    ...quoteFields,
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

export const loomQuote = definePrimitive({
  type: "loom.quote",
  description:
    "A testimonial: a quote with its author, their role, and a portrait — their initials when there is no photograph.",
  props,
  slots: [],
  copy: ["quote", "author", "role"],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) =>
    /**
     * The card is `quote-content.ts`'s, and the `figure` carrying
     * `loom.editable` is this primitive's — which is the whole of the
     * difference between an authored quote and one of `loom.voices`' rows. A
     * node is addressable; a row from a database is not.
     */
    createElement(
      "figure",
      { ...loom.editable, style: quoteSurface(given.emphasis ?? "card") },
      ...quoteInterior(given, given.emphasis ?? "card")
    ),
})
