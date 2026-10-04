import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema, mediaUrlSchema } from "./url.js"

/**
 * A book: its cover, what it is called, who wrote it, and a line about it.
 *
 * Two Hermes blocks collapse here — `book-list` (a grid of things an author
 * wrote or recommends) and `currently-reading` (a short list of what someone is
 * reading now). Hermes held them as two shapes, `BookItem` and `ReadingItem`,
 * with a comment on the second explaining that it is *"distinct from BookItem;
 * ReadingItem captures current-state reading"*. Read the fields rather than the
 * comment and they are one content model:
 *
 * | `BookItem` | `ReadingItem` | here |
 * | --- | --- | --- |
 * | `title` | `title` | `title` |
 * | `author` | `author` | `author` |
 * | `image` | `cover` | `cover` |
 * | `description` | `note` | `note` |
 * | `year` | `status` | `marker` |
 *
 * `year` and `status` are the row worth pausing on, because they are the reason
 * the two blocks look different: `"2019"` and `"Halfway through"` are both *a
 * short label above the title saying where this book stands*, and Hermes' own
 * schema types both as free text it never parses. It is the same collapse
 * `loom.article` made across five blocks whose label was a date, a publication
 * and a client, and the same one `loom.milestone`'s `marker` made across seven.
 * The general noun wins over the block's word, which is the test the port map
 * applies to every name it proposes — and the one `loom.recording` was renamed
 * by.
 *
 * **The card is the target, because a book is read.**
 * [0066](../../decisions/0066-a-card-is-the-target-when-it-is-read-and-the-control-is-the-target-when-it-is-bought.md)
 * settles this for all the remaining card pairs at once, and it puts this one on
 * `loom.article`'s side rather than `loom.product`'s: nothing here is bought
 * from the card, so the title carries the anchor and a `::after` overlay
 * stretches it across the whole surface. The accessible name stays the title
 * rather than becoming *title, author, note* read as one link, which is what
 * wrapping the card in an anchor does and what Hermes did.
 *
 * **The cover panel is drawn even when there is no cover, and that is a
 * deliberate answer to an open finding.** `loom.recording` skips its artwork
 * frame when it has none, and the 2 September entry in `FINDINGS.md` records
 * what that costs: in a single-column band, one cell without a panel starts its
 * text at the card's edge while its neighbours start 11rem in, and the ragged
 * edge reads as a bug. That finding lists *always draw the panel* as one of
 * three answers and declines it, because a track with no artwork is a title and
 * a runtime and nothing is missing. **A book is the case where the same choice
 * is right.** A book is a physical object with a shape; a blank panel at 2:3
 * with a spine on it reads as *this edition's cover is not to hand*, which is
 * true, rather than as an empty rectangle. So a shelf of eight books lines up
 * whether or not every cover was found.
 *
 * **A panel with no cover in it is a spine's width, not a cover's.** The
 * paragraph above is the argument for drawing the panel at all and it stands;
 * what it got wrong is the *size*. A 2:3 ratio reserves the shape of a picture,
 * so at a tile's full width a missing cover is 350px of blank panel on a phone
 * and 360px in a three-across shelf — which is not *this edition's cover is not
 * to hand*, it is a hole. `features-shelf` photographed six of them.
 *
 * This is [0187](../../decisions/0187-a-frame-with-no-picture-in-it-is-not-the-pictures-shape.md)
 * applied, which is the rule `articles-episodes` produced from the identical
 * fault in `loom.recording` on 23 September, stated once for the library.
 * Without a cover the panel keeps the ratio at 4.5rem of width, so it stays a
 * book seen edge-on and stops being a void. The **row** rendering is untouched:
 * `flex: 0 0 7rem` beats a width on a flex item, so a card that was already
 * drawing a small cover is exactly as it was.
 *
 * **The spine is the one ornament, and it is a border rather than a shadow.**
 * A cover drawn as a plain rectangle reads as a thumbnail; the same rectangle
 * with a darker edge down its leading side reads as a book seen slightly from
 * the side, and it costs one `border-inline-start`. It is deliberately not a
 * `box-shadow`: the palette has no shadow slot — the standing finding from
 * `primitives-17` — so a shadow would have to be a literal colour, which is the
 * one thing `tokens.ts` exists to make impossible.
 *
 * **A card that reads two ways, chosen by the room it is given.** The third
 * caller of the mechanic `loom.offering` opened: the article declares
 * `container-type: inline-size` and one `@container` rule turns the frame inside
 * it from a column into a row past 32rem. In a four-across `loom.book-grid` this
 * is a cover-led tile, which is `book-list`; at `columns: "one"` it is a row
 * with the cover beside the text, which is `currently-reading`. Two Hermes
 * blocks, one node, and nothing in the tree says which — because it is a
 * question about how much room the card was given, and no author should have to
 * answer it twice.
 */

const props = z
  .object({
    title: z.string().min(1).max(200),
    /**
     * Required, and it is the field that makes this primitive rather than a
     * `loom.article` with a portrait cover. A byline is the second thing anyone
     * reads on a shelf, and an article's `kicker` — which is optional, and above
     * the title rather than under it — cannot be it.
     */
    author: z.string().min(1).max(160),
    /**
     * The short label above the title: a year, or where the reading has got to.
     * Free text, never parsed. See the table above.
     */
    marker: z.string().min(1).max(80).optional(),
    /**
     * One sentence under the byline. A prop rather than a `loom.prose` child for
     * 0059's reason, the one `loom.article`'s `excerpt` gives: it is meaningless
     * apart from the book it belongs to, and re-authoring it is a `configure`.
     */
    note: z.string().min(1).max(400).optional(),
    cover: mediaUrlSchema.optional(),
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomBook = definePrimitive({
  type: "loom.book",
  description:
    "A book — cover, title, author, an optional year or reading status, and a line about it. A cell of a loom.book-grid; a tile when it is narrow and a row when it is wide.",
  props,
  /**
   * `loom.article`'s declaration and for its reason (0068): the root is an
   * `<article>` so no anchor nests inside another, but the title's `::after`
   * covers the card, and anything placed under it is unreachable in a way no
   * markup check would name. What 0064 protects is the reader's aim, and by that
   * measure a covered card is a target.
   */
  interactive: { whenProps: ["href"] },
  slots: [],
  copy: ["title", "author", "marker", "note"],
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props>) => {
    const cover = createElement(
      "div",
      {
        key: "cover",
        className:
          given.cover === undefined
            ? `${LIBRARY_CLASS.bookCover} ${LIBRARY_CLASS.bookCoverBare}`
            : LIBRARY_CLASS.bookCover,
        style: {
          background: colour("bg-surface-muted"),
          /**
           * A border on all four edges **and** a heavier one on the leading
           * edge, and the four-sided one is there because a screenshot showed
           * what its absence costs. `bg-surface-muted` is a step off the page on
           * a light palette and very nearly the page itself on a dark one, so a
           * book with no cover was a light grey rectangle under `editorial` and
           * an almost invisible hole under `bold` — the standing finding that a
           * surface-toned band disappears on the darker palettes, met here by a
           * primitive rather than by the theme. The outline makes the panel a
           * drawn object under both, and the spine keeps it a book rather than a
           * thumbnail.
           */
          border: `1px solid ${colour("border-subtle")}`,
          borderInlineStart: `3px solid ${colour("border-strong")}`,
          borderRadius: radius("sm"),
        },
      },
      given.cover === undefined
        ? null
        : createElement("img", {
            src: given.cover,
            /**
             * Empty, for `loom.article`'s reason: the title is in the same node,
             * and alt text that paraphrases it makes a screen reader read the
             * book's name twice. `loom.media` requires alt because it has no
             * such neighbour.
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
        className: LIBRARY_CLASS.book,
        style: { position: "relative", height: "100%" },
      },
      libraryStylesheet(),
      createElement(
        "div",
        {
          /**
           * The element the `@container` rule flips, and it has to be a child of
           * the element declaring the containment — a container queries its
           * ancestor and never itself. That is what this `<div>` is for, and it
           * is markup rather than a node. The mechanic caught `loom.offering`
           * once.
           */
          key: "frame",
          className: LIBRARY_CLASS.bookFrame,
        },
        cover,
        createElement(
          "div",
          {
            key: "body",
            className: LIBRARY_CLASS.bookBody,
            style: { display: "flex", flexDirection: "column", gap: space(1) },
          },
          given.marker === undefined
            ? null
            : createElement(
                "p",
                {
                  key: "marker",
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
                given.marker
              ),
          title,
          createElement(
            "p",
            {
              key: "author",
              style: {
                margin: "0",
                fontFamily: family("body"),
                fontSize: size(3),
                lineHeight: 1.5,
                color: colour("fg-muted"),
              },
            },
            given.author
          ),
          given.note === undefined
            ? null
            : createElement(
                "p",
                {
                  key: "note",
                  style: {
                    margin: "0",
                    marginBlockStart: space(2),
                    fontFamily: family("body"),
                    fontSize: size(2),
                    lineHeight: 1.6,
                    color: colour("fg-subtle"),
                  },
                },
                given.note
              )
        )
      )
    )
  },
})
