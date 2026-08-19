import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema, mediaUrlSchema } from "./url.js"

/**
 * A written piece: a cover, a small label, a title, a sentence, and a link.
 *
 * Five Hermes blocks collapse here — `articles`, `press`, `case-studies`,
 * `tutorials` and `recipes`. They are one content model wearing five sets of
 * words, and the words are the only thing that differed: `excerpt` /
 * `quote` / `result` / `description` / `summary` is one sentence under a title
 * in every one of them, and `date` / publication `name` / `client` is one short
 * label above it.
 *
 * The sharp question this pair had to answer is **why it is a primitive at
 * all**, given that `docs/hermes-port-map.md` sends `featured` — a card with an
 * image, a heading, a sentence and a link — to the compose layer with nothing
 * to build. The difference is repetition. `featured` is one item, and one item
 * assembled from `card` + `media` + `heading` + `prose` is four reviewable
 * nodes. A blog index is *twelve* of them, and twelve assembled cards is
 * forty-eight nodes that a model must keep typographically identical by hand —
 * which is the page of atoms the granularity doc warns about, spending the
 * grammar budget ([0014](../../decisions/0014-the-reply-schema-must-fit-a-grammar-budget.md))
 * on a joint nobody wants to change per card. A band that repeats carves at a
 * joint; a single card does not.
 *
 * **The markup is better than Hermes', and deliberately so.** Hermes wrapped
 * the whole card in an anchor, which is the common way and makes a screen
 * reader announce the entire card — label, title, excerpt, meta — as the name
 * of one link. Here the root is an `<article>`, the *title* is the anchor, and
 * a `::after` overlay stretches that anchor across the card
 * ([`stylesheet.ts`](stylesheet.ts)). The accessible name is the title; the
 * click target is the whole surface. It is also what keeps this primitive off
 * the nested-anchor hazard `loom.card` carries: the root is not a target, so a
 * link in the `meta` region is valid HTML rather than invalid.
 *
 * The three regions a `loom.card` places are not wanted here: an article's
 * cover, body and meta strip are *this* content model rather than whatever the
 * tree put on a surface, which is exactly the difference 0052 draws between a
 * fixed field and a child. Only `meta` is a slot, and it earns one under 0051
 * because the primitive places it somewhere the flow of children does not go —
 * on the card's floor, so a row of cards with excerpts of different lengths
 * still lines its meta strips up.
 */

const props = z
  .object({
    title: z.string().min(1).max(200),
    /**
     * The sentence under the title. One sentence, and a prop rather than a
     * `loom.prose` child, for 0059's other half: it is meaningless apart from
     * the title it belongs to, and re-authoring it is exactly a `configure`.
     */
    excerpt: z.string().min(1).max(400).optional(),
    /**
     * The small label above the title — a date, a publication, a client.
     *
     * Free text, never parsed, which is the same call `loom.milestone`'s
     * `marker` makes and for the same reason: Hermes' own field says *"free-text
     * date string; not parsed"*, and a parsed date refuses "Spring 2025" and
     * forces a locale decision onto a primitive with no business making one.
     * It is one label rather than five named fields because `date`, `client`
     * and publication `name` never co-occur — each block had exactly one.
     */
    kicker: z.string().min(1).max(80).optional(),
    image: mediaUrlSchema.optional(),
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomArticle = definePrimitive({
  type: "loom.article",
  description:
    "A written piece — cover, a small label, a title, a sentence, and a link over the whole card. A cell of a loom.article-grid.",
  props,
  slots: ["meta"],
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props>) => {
    const meta = loom.slots["meta"]

    const cover: ReactNode =
      given.image === undefined
        ? null
        : createElement(
            "div",
            {
              key: "cover",
              className: LIBRARY_CLASS.coverMedia,
              style: { background: colour("bg-surface-muted") },
            },
            createElement("img", {
              src: given.image,
              /**
               * Empty, for the reason `loom.person` gives: the title is in the
               * same node, and alt text that paraphrases it makes a screen
               * reader read the piece's name twice. `loom.media` requires alt
               * precisely because it has no such neighbour.
               */
              alt: "",
              loading: "lazy",
              decoding: "async",
              style: { display: "block", width: "100%", height: "100%", objectFit: "cover" },
            })
          )

    const title = createElement(
      "h3",
      {
        key: "title",
        style: {
          margin: "0",
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: size(4),
          lineHeight: 1.25,
          color: colour("fg-default"),
        },
      },
      given.href === undefined
        ? given.title
        : createElement(
            "a",
            {
              href: given.href,
              className: `${LIBRARY_CLASS.coverLink} ${LIBRARY_CLASS.underline}`,
              style: { color: "inherit", textDecoration: "none" },
            },
            given.title
          )
    )

    return createElement(
      "article",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.cover,
        /**
         * `flex-direction` and the body's `flex` are in the stylesheet rather
         * than here, and it is not a stylistic preference: an inline style
         * beats a rule in that file, so a value it has to vary must not also be
         * set on the element. A `lead` grid flips both, and setting either one
         * here makes the lead layout silently unreachable — which is what
         * happened on the first render of this primitive.
         */
        style: {
          display: "flex",
          height: "100%",
          overflow: "hidden",
          background: colour("bg-surface"),
          border: `1px solid ${colour("border-subtle")}`,
          borderRadius: radius("lg"),
        },
      },
      libraryStylesheet(),
      cover,
      createElement(
        "div",
        {
          key: "body",
          className: LIBRARY_CLASS.coverBody,
          style: {
            display: "flex",
            flexDirection: "column",
            gap: space(2),
            padding: space(5),
          },
        },
        given.kicker === undefined
          ? null
          : createElement(
              "p",
              {
                key: "kicker",
                style: {
                  margin: "0",
                  fontFamily: family("body"),
                  fontSize: size(1),
                  lineHeight: 1.4,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: colour("accent"),
                },
              },
              given.kicker
            ),
        title,
        given.excerpt === undefined
          ? null
          : createElement(
              "p",
              {
                key: "excerpt",
                style: {
                  margin: "0",
                  fontFamily: family("body"),
                  fontSize: size(3),
                  lineHeight: 1.6,
                  color: colour("fg-muted"),
                },
              },
              given.excerpt
            ),
        meta === undefined
          ? null
          : createElement(
              "div",
              {
                key: "meta",
                style: {
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: space(2),
                  /** The card's floor, so unequal excerpts still line their strips up. */
                  marginTop: "auto",
                  paddingTop: space(3),
                },
              },
              meta
            )
      )
    )
  },
})
