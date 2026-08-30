import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema, mediaUrlSchema } from "./url.js"

/**
 * One book: its cover, what it is called, who wrote it, when, and a line about
 * why it is here.
 *
 * **Two Hermes blocks collapse here** — `book-list` (a `BookItem`: title,
 * author, description, image, year, link) and `currently-reading` (a
 * `ReadingItem`: title, author, cover, status, note). Hermes kept them apart
 * deliberately, and its own comment says why: *"Distinct from `BookItem`
 * (curated recommendations); `ReadingItem` captures current-state reading."*
 * That is a distinction between two **pages**, not between two records. Stack
 * the shapes and they are the same six fields with `description`/`note` and
 * `image`/`cover` wearing different words, plus one thing `ReadingItem` has and
 * `BookItem` does not — a `status`, which is the port's most interesting field
 * and does not survive as one.
 *
 * ## What became nodes
 *
 * - **`status`** — Hermes' own examples are *"Halfway"*, *"Started this week"*,
 *   *"On hold"*, and its field is one free-text string. It is the qualifier
 *   `loom.product` found in `format`, `loom.offering` found nine times over,
 *   and `loom.credential` found in `role`: **there is never exactly one of
 *   them.** A book is *Halfway* and *Non-fiction* and *Re-reading*, and a
 *   recommendation carries the genre where a current read carries the progress.
 *   So it is `loom.badge` nodes in the `meta` region rather than a field that
 *   would have to be split at a separator, and the second badge — the one
 *   Hermes could not hold at all — costs an `insert` rather than a schema
 *   change.
 * - **`description` / `note`** — a `loom.prose` child, which is
 *   [0094](../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md)
 *   deciding this card in advance and naming it while doing so: *"`loom.book`
 *   and `loom.listing` have repeated parts — a shelf entry's tags, a property's
 *   features — and take their prose as children."* The tags above are that
 *   repeated part. The reachability it buys is real rather than theoretical:
 *   "put the note under the tags" is one `move` here and is unsayable on a card
 *   that holds its sentence in a prop.
 *
 * ## What stayed props, including the cover
 *
 * `title`, `author` and `year` are one-per-record and stay props — an author
 * line is one line however many people wrote the book, and `year` is free text
 * and never parsed, which is `loom.credential`'s call and `loom.milestone`'s
 * before it. A parsed date refuses *"1974 (2016 edition)"*.
 *
 * **`cover` is a prop where `loom.credential`'s mark is a region**, and the two
 * are not in tension —
 * [0096](../../decisions/0096-a-cards-picture-is-a-prop-when-the-model-names-one-kind-of-picture.md)
 * is the rule and this is the card that forced it. A credential's mark is held
 * three ways in Hermes and can honestly be a wordmark, a face, a glyph or a
 * photograph, so a URL prop could express only one of the four and the card
 * places a region instead. A book cover is one kind of picture: a photograph of
 * the front of a book, portrait, cropped to fill. There is nothing for an author
 * to choose between, and a slot would buy a node per book to say the one thing
 * the prop already says.
 *
 * ## The jacket, and the initials it deliberately does not draw
 *
 * A shelf where three books have covers and two do not is a shelf with two
 * holes in it, and the hole is worse than anything that could be put in it —
 * the grid's rows stop lining up and the eye reads the gap as a loading
 * failure. So a book with no `cover` gets a **jacket**: the same portrait box,
 * the muted surface, the spine, and the **title set on it in the heading face**,
 * which is what the front of a book without a picture of it actually looks
 * like.
 *
 * It drew `monogramOf(title)` for one render, because that is `loom.avatar`'s
 * fallback and reusing it looked like consistency. The screenshot killed it in
 * one glance: *Notes on the Synthesis of Form* reduced to **"NO"**, in 24pt, on
 * a blank cover, on the demo page. The helper is not wrong — it is built for
 * *names*, where the first letters of the first two words are the convention a
 * reader recognises. A title is not a name. It starts with an article half the
 * time, its first two words are routinely *"The"* and *"Art"*, and the two
 * letters that fall out carry no information and occasionally carry the wrong
 * one. Nothing about the helper needed changing; it needed not calling.
 *
 * The jacket's title is `aria-hidden`, because the real one is in the same card
 * two inches below and a listening reader should hear it once. That is the same
 * bargain [0093](../../decisions/0093-a-decorative-copy-is-the-same-children-without-identity.md)
 * strikes for a decorative duplicate, reached here from a prop rather than from
 * children — and it is what a cover photograph does anyway, since every real
 * cover in the shelf beside it has the title printed on it too.
 *
 * ## The reader aims at the card
 *
 * 0066 settles it in advance — a book is **read**, not bought — so the whole
 * surface is the target by way of a stretched title anchor: the root is an
 * `<article>`, the title is the `<a>`, and its `::after` covers the card. The
 * accessible name is the title alone rather than the whole card read out, which
 * is what a listening reader wants from a shelf of thirty.
 */

const props = z
  .object({
    title: z.string().min(1).max(200),
    author: z.string().min(1).max(160).optional(),
    /** Free text, never parsed: "1974", "1974 (2016 edition)", "forthcoming". */
    year: z.string().min(1).max(24).optional(),
    /** The front of the book. Cropped to a portrait box; see the note above. */
    cover: mediaUrlSchema.optional(),
    /** Where to read more or buy it. Stretches over the whole card. */
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomBook = definePrimitive({
  type: "loom.book",
  description:
    "One book — cover, title, author, year, and a line about it. A cell of a loom.book-grid.",
  props,
  /**
   * The declaration 0068 exists for, and `loom.credential`'s reasoning applies
   * unchanged: the root is an `<article>` so nothing nests two anchors, but the
   * title's `::after` covers the whole card and a control placed under it is
   * unreachable in a way no reader can see and no markup check would name.
   */
  interactive: { whenProps: ["href"] },
  slots: ["meta"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const meta = loom.slots["meta"]

    const jacket: ReactNode =
      given.cover === undefined
        ? createElement(
            "span",
            {
              key: "jacket-title",
              "aria-hidden": "true",
              style: {
                padding: space(4),
                fontFamily: family("heading"),
                fontWeight: weight("heading"),
                fontSize: size(4),
                lineHeight: 1.25,
                letterSpacing: "0.01em",
                textAlign: "center",
                textWrap: "balance",
                color: colour("fg-muted"),
              },
            },
            given.title
          )
        : createElement("img", {
            key: "cover",
            src: given.cover,
            /** Empty: the title is in the same card. See `loom.article`. */
            alt: "",
            loading: "lazy",
            decoding: "async",
            style: { display: "block", width: "100%", height: "100%", objectFit: "cover" },
          })

    const title = createElement(
      "h3",
      {
        key: "title",
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
        className: `${LIBRARY_CLASS.book} ${LIBRARY_CLASS.lift}`,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: space(3),
          height: "100%",
          color: colour("fg-default"),
        },
      },
      libraryStylesheet(),
      createElement(
        "div",
        {
          key: "jacket",
          className: LIBRARY_CLASS.bookCover,
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: colour("bg-surface-muted"),
            borderRadius: radius("sm"),
            boxShadow: `0 18px 36px -28px ${colour("fg-default")}`,
          },
        },
        jacket
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
            /** Without this a long unbroken title pushes the cell past its track. */
            minInlineSize: "0",
          },
        },
        /**
         * The year is a kicker **above** the title rather than a chip beside it,
         * which is `loom.credential`'s repair applied before it could break
         * anything: a name and its date competing for one line in a narrow
         * column is a competition the name has to win at every width, and the
         * cheapest way to win it is not to hold it.
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
        title,
        given.author === undefined
          ? null
          : createElement(
              "p",
              {
                key: "author",
                style: {
                  margin: "0",
                  fontFamily: family("body"),
                  fontSize: size(2),
                  lineHeight: 1.4,
                  color: colour("fg-muted"),
                },
              },
              given.author
            ),
        children === null
          ? null
          : createElement(
              "div",
              {
                key: "children",
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: space(2),
                  marginBlockStart: space(2),
                },
              },
              children
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
                  /** The card's floor, so unequal notes still line their tags up. */
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
