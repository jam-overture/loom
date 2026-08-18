import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema, mediaUrlSchema } from "./url.js"

/**
 * One thing for sale: a picture of it, what it is called, what it costs, and
 * the button that buys it.
 *
 * Four Hermes blocks collapse here — `products`, `digital-downloads`,
 * `shop-categories` and `leadmagnet`. Three fields did not survive the port as
 * fields, and each is a different clause of 0052:
 *
 * - **`format`** (`"PDF · 24 pages"`) and **`itemCount`** (`"18 items"`) are
 *   the same thing wearing two names — a short qualifier beside the name — and
 *   there is never exactly one of them. A download is a PDF *and* 24 pages
 *   *and* instantly delivered. That is repeated content, so by 0052 it wants
 *   nodes, and a `loom.badge` says it better than a field that has to be split
 *   at a separator. It is the call `loom.person` made about `specialties`,
 *   with the difference that a product's qualifiers belong *inside* its card —
 *   so they are a region here rather than a sibling.
 * - **`btnText`** and **`fileUrl`** are a `loom.action`, which the library
 *   already has. A product that reimplemented a link as two props would be a
 *   second call-to-action with its own scheme allowlist to keep in step with
 *   [0053](../../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md),
 *   which is the argument `loom.tier` already made and won.
 *
 * **Why this is not `loom.article` with a price on it.** The two are the same
 * five fields and they differ in the one place that matters: *what the reader
 * is meant to aim at.* A written piece is read, so the card is the target and
 * the title anchor stretches across it. A product is bought, so the target is
 * the button — and a card-wide overlay under a button is the pattern that ships
 * broken, because the two click regions overlap and which one wins depends on
 * paint order. So this primitive links its **name only**, and the thing on the
 * floor of the card is a real control the reader can tab to
 * ([0064](../../decisions/0064-a-card-is-the-target-when-it-is-read-and-the-control-is-the-target-when-it-is-bought.md)).
 *
 * The two regions earn slots under 0051 for the reason `loom.tier`'s do: the
 * card places them where the flow of children does not go — the qualifiers on a
 * line of their own under the name, the action pinned to the card's floor so
 * that six products with descriptions of different lengths still line their
 * buttons up. "The last child is the button" is a rule no schema states and
 * every `move` breaks.
 */

const props = z
  .object({
    name: z.string().min(1).max(120),
    /**
     * Free text, and deliberately not a number — the argument `loom.tier`
     * makes about `price`, which Hermes learned over a year of real pages.
     * "Free", "From $12", "Pay what you want" and "£40 / £30 members" are all
     * things people write, and a numeric field with a currency prop beside it
     * can say none of them.
     */
    price: z.string().min(1).max(32).optional(),
    description: z.string().min(1).max(400).optional(),
    image: mediaUrlSchema.optional(),
    /** Links the name. The button that buys it goes in the `action` region. */
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomProduct = definePrimitive({
  type: "loom.product",
  description:
    "One thing for sale — picture, name, price, and a buy button on the card's floor. A cell of a loom.product-grid.",
  props,
  slots: ["meta", "action"],
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props>) => {
    const meta = loom.slots["meta"]
    const action = loom.slots["action"]

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
              /** Empty: the name is in the same node. See `loom.article`. */
              alt: "",
              loading: "lazy",
              decoding: "async",
              style: { display: "block", width: "100%", height: "100%", objectFit: "cover" },
            })
          )

    const name = createElement(
      "h3",
      {
        key: "name",
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
        ? given.name
        : createElement(
            "a",
            {
              href: given.href,
              className: LIBRARY_CLASS.underline,
              style: { color: "inherit", textDecoration: "none" },
            },
            given.name
          )
    )

    /**
     * Baseline, not centre. A price is set larger than the name it sits beside,
     * and two lines of different sizes centred on their boxes read as a
     * misalignment even to someone who could not say why — the letters sit on
     * different lines. `baseline` is what a typesetter would do and costs
     * nothing.
     */
    const heading = createElement(
      "div",
      {
        key: "heading",
        style: {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: space(2),
        },
      },
      name,
      given.price === undefined
        ? null
        : createElement(
            "p",
            {
              key: "price",
              style: {
                margin: "0",
                whiteSpace: "nowrap",
                fontFamily: family("heading"),
                fontWeight: weight("heading"),
                fontSize: size(5),
                lineHeight: 1.1,
                color: colour("accent-strong"),
              },
            },
            given.price
          )
    )

    return createElement(
      "article",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: "column",
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
            flex: "1 1 auto",
          },
        },
        heading,
        meta === undefined
          ? null
          : createElement(
              "div",
              {
                key: "meta",
                style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: space(2) },
              },
              meta
            ),
        given.description === undefined
          ? null
          : createElement(
              "p",
              {
                key: "description",
                style: {
                  margin: "0",
                  fontFamily: family("body"),
                  fontSize: size(3),
                  lineHeight: 1.6,
                  color: colour("fg-muted"),
                },
              },
              given.description
            )
      ),
      action === undefined
        ? null
        : createElement(
            "div",
            {
              key: "action",
              style: {
                display: "flex",
                flexDirection: "column",
                padding: space(5),
                paddingTop: "0",
                /** The card's floor, so a row of products lines its buttons up. */
                marginTop: "auto",
              },
            },
            action
          )
    )
  },
})
