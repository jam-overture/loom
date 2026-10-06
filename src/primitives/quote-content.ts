import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import { portrait } from "./portrait.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { mediaUrlSchema } from "./url.js"

/**
 * What a testimonial *is*, shared by the two primitives that draw one.
 *
 * `loom.quote` holds a quote the tree authored; `loom.voices` reads a run of
 * them from a registered source. They are one content model and one card, and
 * they differ in where the words come from — which is exactly the pair
 * `perk-content.ts` already exists for, and the reason is the same: a surface
 * added to one and forgotten in the other is the failure a shared module
 * prevents. Here the stake is higher than usual, because the authored card is
 * what a catalogue band photographs and the bound card is what a deployment
 * actually serves, so a drift between them is a drift nobody sees until it is
 * live.
 *
 * It is not itself a primitive and registers nothing. Files here are named for
 * the type they implement (`loom.quote.ts`); this one is named for what it
 * holds, the way `tokens.ts`, `portrait.ts` and `perk-content.ts` are.
 */

/**
 * The fields of one testimonial, as the authored primitive's props spell them.
 *
 * `loom.voices` reads the same four off a row, which is not a coincidence to be
 * tidied away later: a deployment moving a wall of quotes from authored to bound
 * should not have to re-describe its own data, and an adapter written against
 * this shape works for either.
 */
export const quoteFields = {
  quote: z.string().min(1).max(600),
  author: z.string().min(1).max(120),
  /** Title and company, as one line — "Head of Design, Acme". */
  role: z.string().min(1).max(120).optional(),
  avatar: mediaUrlSchema.optional(),
} as const

export type QuoteContent = {
  readonly quote: string
  readonly author: string
  readonly role?: string | undefined
  readonly avatar?: string | undefined
  /**
   * **Whether `author` names a person**, which decides whether there is a face
   * to draw at all. `loom.quote`'s prop docblock carries the 0160 argument for
   * why this is a legitimate prop; what matters here is that both primitives
   * read it the same way.
   */
  readonly anonymous?: boolean | undefined
}

/** `feature` is the one-per-page pull quote; `card` sits in a wall of them. */
export type QuoteEmphasis = "card" | "feature"

const SURFACES: Readonly<Record<QuoteEmphasis, CSSProperties>> = {
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

const attributionOf = (given: QuoteContent): ReactNode =>
  createElement(
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
     * **The face this band was always described as having.** `portrait.ts` is
     * why the four faces in this library can no longer disagree, and routing
     * both testimonial primitives through one call is why they cannot either.
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
        : createElement("span", { style: { fontSize: size(2), color: colour("fg-muted") } }, given.role)
    )
  )

/**
 * The quote card's interior — the blockquote and the attribution — without the
 * `figure` that holds them.
 *
 * The element is the caller's rather than this module's, and that is the one
 * thing the two primitives genuinely do not share: `loom.quote` *is* a figure
 * and carries `loom.editable`, while a card inside `loom.voices` is one of n
 * drawn from an answer and carries a `key` and nothing addressable, because a
 * row from a database is not a node anything can address.
 */
export const quoteInterior = (
  given: QuoteContent,
  emphasis: QuoteEmphasis
): readonly ReactNode[] => {
  const feature = emphasis === "feature"

  return [
    createElement(
      "blockquote",
      {
        key: "quote",
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
    attributionOf(given),
  ]
}

/** The card's own box, which both primitives draw identically. */
export const quoteSurface = (emphasis: QuoteEmphasis): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: space(4),
  margin: "0",
  /** No stylesheet resets this, so the size below is the border box rather than the content box. */
  boxSizing: "border-box",
  height: "100%",
  ...SURFACES[emphasis],
})
