import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * One reason to be believed: a mark, what it is called, who granted it, when,
 * and a line about it.
 *
 * **Four Hermes blocks collapse here** — `awards`, `certifications`,
 * `affiliations` and `favorite-tools`. The last one looks like the odd member
 * and is not: a favourite tool is a thing with a logo, a name, a category and a
 * sentence saying why it is here, which is a certification with the words
 * changed. What all four say is *"this is vouched for, and here is by whom"*.
 *
 * | Hermes | name | who | when | the line |
 * | --- | --- | --- | --- | --- |
 * | `awards` | award name | `organization` | `year` | — |
 * | `certifications` | credential | `issuer` | `year` | — |
 * | `affiliations` | organisation | — | — | — |
 * | `favorite-tools` | tool | — | — | `why` |
 *
 * ## What became nodes
 *
 * - **The mark is a region, not a URL prop**, and this is the one place the port
 *   improves on Hermes rather than transcribing it. Hermes holds it three
 *   different ways — `badge` on a certification, `logo` on an affiliation,
 *   `image` on a tool — and every one of them is a bare URL, which can express
 *   exactly one rendering. The library already has three better answers than a
 *   bare `<img>`: `loom.logo` greys a wordmark back until it is pointed at,
 *   `loom.avatar` rounds and rings a face, `loom.icon` draws a glyph for an
 *   award that never had a picture. A prop could hold one of the four; a region
 *   holds whichever the content actually is, with its own alt text
 *   ([0051](../../decisions/0051-a-slot-is-a-region-the-primitive-places.md) —
 *   the card *places* it at the leading edge, where the flow of children does
 *   not go). It is `loom.before-after`'s argument, whose two sides are slots for
 *   the same reason: two URL props would have made both unsayable to save two
 *   nodes.
 * - **`role` and `category`** — `loom.badge` nodes in the `meta` region. A
 *   board seat is a role and a chair is another; a tool is *Design* and
 *   *Prototyping*. Never exactly one, so 0052 says nodes, and it is the call
 *   `loom.product` made about `format` and `loom.person` made about
 *   `specialties`.
 *
 * ## What stayed props, including the one that looks like it should not
 *
 * `name`, `issuer`, `year` and `note` are four fixed fields of one record —
 * there is exactly one issuer and exactly one year — and **`note` stays a prop
 * even though `loom.offering`'s prose became a child in the same run.** That is
 * [0094](../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md)
 * and it is the sharpest worked example of it: a credential has no repeated
 * part, so it has no children flow, so its one sentence has nowhere to be a
 * node *among* — which is exactly 0059's multi-string leaf. An offering has an
 * includes list, so it has a flow, so its sentence belongs in it.
 *
 * `year` is free text and never parsed, the call `loom.article`'s `kicker` and
 * `loom.milestone`'s `marker` both make: Hermes' own field is a string, and a
 * parsed date refuses "2019–present" and forces a locale decision onto a
 * primitive with no business making one.
 *
 * ## The reader aims at the card
 *
 * 0066 settles it in advance — a credential is **read**, not acted on — so the
 * whole surface is the target by way of a stretched title anchor: the root is an
 * `<article>`, the name is the `<a>`, and its `::after` covers the card. The
 * accessible name is the credential's name alone rather than the whole card
 * read aloud, which is what a listening reader wants from a wall of twelve.
 */

const props = z
  .object({
    name: z.string().min(1).max(200),
    /** Who granted, awarded or makes it — an issuing body, an academy, a vendor. */
    issuer: z.string().min(1).max(160).optional(),
    /** Free text, never parsed: "2024", "2019–present", "Spring 2025". */
    year: z.string().min(1).max(24).optional(),
    /** The one line about it — why this tool, what the award was for. */
    note: z.string().min(1).max(280).optional(),
    /** Where it can be verified or read about. Stretches over the whole card. */
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomCredential = definePrimitive({
  type: "loom.credential",
  description:
    "One credential — a mark, what it is called, who granted it, when, and a line about it. A cell of a loom.credential-grid.",
  props,
  /**
   * The declaration 0068 exists to justify, and `loom.article`'s reasoning
   * applies unchanged: the root is an `<article>` rather than an anchor, so
   * nothing here nests two anchors — but the name's `::after` covers the whole
   * card, and a control placed under it is unreachable in a way no reader can
   * see and no markup check would name.
   */
  interactive: { whenProps: ["href"] },
  slots: ["mark", "meta"],
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props>) => {
    const mark = loom.slots["mark"]
    const meta = loom.slots["meta"]

    const name = createElement(
      "h3",
      {
        key: "name",
        style: {
          margin: "0",
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: size(3),
          lineHeight: 1.3,
          color: colour("fg-default"),
        },
      },
      given.href === undefined
        ? given.name
        : createElement(
            "a",
            {
              href: given.href,
              className: `${LIBRARY_CLASS.coverLink} ${LIBRARY_CLASS.underline}`,
              style: { color: "inherit", textDecoration: "none" },
            },
            given.name
          )
    )

    return createElement(
      "article",
      {
        ...loom.editable,
        className: `${LIBRARY_CLASS.credential} ${LIBRARY_CLASS.lift}`,
        style: {
          display: "flex",
          /**
           * `stretch`, not `flex-start`: the body has to fill the card's height
           * or the `auto` margin that drops the chips to the floor has no slack
           * to take. The mark keeps its own size because it declares one.
           */
          alignItems: "stretch",
          gap: space(4),
          height: "100%",
          padding: space(4),
          background: colour("bg-surface"),
          border: `1px solid ${colour("border-subtle")}`,
          borderRadius: radius("lg"),
          color: colour("fg-default"),
        },
      },
      libraryStylesheet(),
      mark === undefined
        ? null
        : createElement(
            "div",
            {
              key: "mark",
              /**
               * A fixed square rather than a shrink-to-fit box. A wall of
               * credentials whose marks are a wordmark, a round badge and a
               * glyph has three different leading edges otherwise, and the
               * ragged column of names is the first thing anyone sees. The
               * ground is `bg-surface-muted` so a transparent PNG has something
               * to sit on under either palette.
               */
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
                inlineSize: space(8),
                blockSize: space(8),
                overflow: "hidden",
                padding: space(2),
                background: colour("bg-surface-muted"),
                border: `1px solid ${colour("border-subtle")}`,
                borderRadius: radius("md"),
              },
            },
            mark
          ),
      createElement(
        "div",
        {
          key: "body",
          style: {
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            gap: space(1),
            /** Without this a long unbroken credential name pushes the card wide. */
            minInlineSize: "0",
          },
        },
        /**
         * The year is a **kicker above the name**, which is `loom.article`'s
         * vertical rhythm reached for the second time in the library.
         *
         * It was a trailing chip on the name's own line for one render — a
         * résumé's arrangement, and a good-looking one — and the screenshots
         * killed it. In a three-column wall the text column is about 240px, the
         * year takes ninety of them, and every credential whose name runs past
         * three words wrapped to three lines. Nothing shrinks its way out of
         * that: a name and its date competing for one line is a competition the
         * name has to win, so the date stops competing.
         *
         * Accent rather than muted, and it is the card's only colour, because
         * the whole surface is a link here (0066): accent-coloured *words*
         * beside the name read as a second link that is not one, which is what
         * "Amazon Web Services" in accent looked like. A year is unmistakably
         * not a destination.
         */
        given.year === undefined
          ? null
          : createElement(
              "p",
              {
                key: "year",
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
              given.year
            ),
        name,
        given.issuer === undefined
          ? null
          : createElement(
              "p",
              {
                key: "issuer",
                style: {
                  margin: "0",
                  fontFamily: family("body"),
                  fontSize: size(2),
                  lineHeight: 1.4,
                  color: colour("fg-muted"),
                },
              },
              given.issuer
            ),
        given.note === undefined
          ? null
          : createElement(
              "p",
              {
                key: "note",
                style: {
                  margin: "0",
                  marginBlockStart: space(1),
                  fontFamily: family("body"),
                  fontSize: size(2),
                  lineHeight: 1.6,
                  color: colour("fg-muted"),
                },
              },
              given.note
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
                  /** The card's floor, so unequal notes still line their chips up. */
                  marginBlockStart: "auto",
                  paddingBlockStart: space(3),
                },
              },
              meta
            )
      )
    )
  },
})
