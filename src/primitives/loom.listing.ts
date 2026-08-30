import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema, mediaUrlSchema } from "./url.js"

/**
 * One property on the market: a photograph of it, what it costs, where it is,
 * what it measures, and the control that arranges a viewing.
 *
 * Ported from Hermes' `property-listings` and its `PropertyListing` shape —
 * `address`, `image`, `price`, `beds`, `baths`, `sqft`, `status`, `link`. It is
 * the last of the port map's card pairs and the one whose fields fail 0052
 * hardest, because three of the eight are the same field written three times.
 *
 * ## What became nodes
 *
 * - **`beds`, `baths` and `sqft`** — this is 0052's opening clause with the
 *   serial numbers filed off, and it is the *same* mistake the record itself
 *   names in `hours-of-operation`'s seven weekday fields: **repeated content
 *   that never got to be a list.** There is not always exactly three of them.
 *   A studio has no bedroom count worth printing; a commercial unit has floor
 *   area and no baths; a plot has acreage and neither; a rental has a parking
 *   space, a service charge and an EPC band, and Hermes could say none of those
 *   without shipping three more fields. So they are `loom.badge` nodes in the
 *   `meta` region — the call `loom.product` made about `format`,
 *   `loom.offering` made nine times, and `loom.book` makes about `status` — and
 *   the fourth metric costs an `insert` rather than a schema change.
 * - **The blurb** — a `loom.prose` child.
 *   [0094](../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md)
 *   decided this card by name before it was written: *"`loom.book` and
 *   `loom.listing` have repeated parts — a shelf entry's tags, a property's
 *   features — and take their prose as children."* The metrics are that
 *   repeated part, and the flow the card gains is where a `loom.perk-list` of
 *   amenities goes, which is the field Hermes never had and the one every real
 *   listing carries. Nothing here declares that list: it is `children`, so it
 *   costs this primitive no prop and the runtime can put it above or below the
 *   blurb with one `move`.
 *
 * ## What stayed props, including the one that looks like a badge
 *
 * `address`, `price` and `href` are one-per-record. `price` is free text for the
 * reason `loom.tier`, `loom.product` and `loom.offering` all give and Hermes
 * learned over a year of real pages — *"£450,000"*, *"Offers over £400,000"*,
 * *"£1,250 pcm + bills"* and *"POA"* are all things agents write, and a numeric
 * field with a currency prop beside it can say none of them.
 *
 * **`status` is a prop and not a fifth badge**, which is the one call on this
 * card that reads the wrong way until you see it drawn. Every other qualifier
 * here is a node because there is never exactly one; a listing has exactly one
 * status, because *For sale*, *Under offer* and *Sold* are the states of one
 * thing and a property in two of them at once is a mistake rather than a
 * listing. The rendering is the other half of the argument: the status is the
 * flag **on the photograph**, which is a place the card *places* and no node in
 * the `meta` row could reach. It is 0052's fourth clause — a prop that changes
 * what is rendered is still a prop — and `loom.perk`'s `state` is its nearest
 * relative. It is also half the reason the picture's box is drawn even when
 * there is no picture: see the note on the plate below.
 *
 * ## The price leads and the address follows
 *
 * `loom.product` sets its name and its price on one baseline with
 * `space-between`, and that is right for a shop where the name is the thing
 * being chosen. It is wrong here twice over. A buyer scans a wall of listings
 * by price first and address second, which is how every estate agent in the
 * world sets a card; and an address is long — *"Flat 4, 128 Grafton Terrace,
 * Kentish Town"* — so a price sharing its line loses the fight in a
 * three-column grid exactly the way `loom.credential`'s year did, and for the
 * same flexbox reason: a wrapping row decides wrapping before it decides
 * shrinking. Putting the price above the address ends the competition instead
 * of resolving it, and it is the arrangement a reader already expects.
 *
 * ## The reader aims at the button
 *
 * 0066 settles it in advance: a listing is **acted on**, not read, so no overlay
 * is emitted, the address is an ordinary link when there is a detail page, and
 * the thing that books a viewing is a real control in a region pinned to the
 * card's floor — so a row of listings with blurbs of different lengths still
 * lines its buttons up.
 */

const props = z
  .object({
    address: z.string().min(1).max(200),
    /** Free text, never parsed: "£450,000", "Offers over £400,000", "POA". */
    price: z.string().min(1).max(32).optional(),
    /** Exactly one per listing, drawn as a flag on the photograph or its plate. */
    status: z.string().min(1).max(32).optional(),
    /** The photograph of it. Cropped to a landscape box. */
    cover: mediaUrlSchema.optional(),
    /** Links the address. The control that books a viewing goes in `action`. */
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomListing = definePrimitive({
  type: "loom.listing",
  description:
    "One property on the market — photograph, price, address, its metrics, and a viewing button. A cell of a loom.listing-grid.",
  props,
  /**
   * **Deliberately no `interactive` declaration**, for `loom.offering`'s reason
   * rather than by omission: `href` links the *address*, 0066 puts a real
   * `loom.action` in the `action` region, and no overlay is emitted — so
   * declaring this a target would make the Gate refuse the library's own
   * intended composition, which is how a check ends up switched off. 0068
   * states the test the two answers differ on.
   */
  slots: ["meta", "action"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const meta = loom.slots["meta"]
    const action = loom.slots["action"]

    /** The flag on the photograph — or on the plate, which is why there is one. */
    const flag: ReactNode =
      given.status === undefined
        ? null
        : createElement(
            "p",
            {
              key: "status",
              style: {
                margin: "0",
                fontFamily: family("body"),
                fontWeight: weight("heading"),
                fontSize: size(1),
                lineHeight: 1.4,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: colour("accent-strong"),
                background: colour("accent-subtle"),
                border: `1px solid ${colour("border-accent")}`,
                borderRadius: radius("full"),
                paddingBlock: space(1),
                paddingInline: space(3),
              },
            },
            given.status
          )

    /**
     * **The box is always drawn, with or without a photograph**, which is
     * `loom.book`'s jacket reached for the same reason one section of the shelf
     * away: a wall where two listings have pictures and one does not is a wall
     * with a hole in it, the rows stop lining up, and the eye reads the gap as a
     * photograph that failed to load rather than a listing that has none yet.
     * An empty plate on the muted surface reads as deliberate; a missing one
     * reads as broken, and an agent's wall is full of listings whose pictures
     * are still with the photographer.
     *
     * It also keeps the flag honest. A status is one per record and the card
     * *places* it — over the picture, where no `meta` badge could reach — and a
     * card that sometimes had nowhere to place it would need a second
     * arrangement for the same prop, which is a branch that exists only to be
     * got wrong.
     */
    const photograph: ReactNode = createElement(
      "div",
      {
        key: "cover",
        className: LIBRARY_CLASS.coverMedia,
        style: { position: "relative", background: colour("bg-surface-muted") },
      },
      given.cover === undefined
        ? null
        : createElement("img", {
            key: "image",
            src: given.cover,
            /** Empty: the address is in the same card. See `loom.article`. */
            alt: "",
            loading: "lazy",
            decoding: "async",
            style: { display: "block", width: "100%", height: "100%", objectFit: "cover" },
          }),
      flag === null
        ? null
        : createElement(
            "div",
            {
              key: "flag",
              style: {
                position: "absolute",
                insetBlockStart: space(3),
                insetInlineStart: space(3),
              },
            },
            flag
          )
    )

    const address = createElement(
      "h3",
      {
        key: "address",
        style: {
          margin: "0",
          fontFamily: family("body"),
          fontWeight: weight("body"),
          fontSize: size(3),
          lineHeight: 1.4,
          color: colour("fg-muted"),
        },
      },
      given.href === undefined
        ? given.address
        : createElement(
            "a",
            {
              href: given.href,
              className: LIBRARY_CLASS.underline,
              style: { color: "inherit", textDecoration: "none" },
            },
            given.address
          )
    )

    return createElement(
      "article",
      {
        ...loom.editable,
        className: `${LIBRARY_CLASS.cover} ${LIBRARY_CLASS.lift}`,
        style: {
          display: "flex",
          height: "100%",
          overflow: "hidden",
          background: colour("bg-surface"),
          border: `1px solid ${colour("border-subtle")}`,
          borderRadius: radius("lg"),
          color: colour("fg-default"),
        },
      },
      libraryStylesheet(),
      photograph,
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
            /** Without this a long unbroken address pushes the cell past its track. */
            minInlineSize: "0",
          },
        },
        given.price === undefined
          ? null
          : createElement(
              "p",
              {
                key: "price",
                style: {
                  margin: "0",
                  fontFamily: family("heading"),
                  fontWeight: weight("heading"),
                  fontSize: size(5),
                  lineHeight: 1.1,
                  color: colour("fg-default"),
                },
              },
              given.price
            ),
        address,
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
                  marginBlockStart: space(1),
                },
              },
              meta
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
                  gap: space(3),
                  marginBlockStart: space(2),
                },
              },
              children
            ),
        action === undefined
          ? null
          : createElement(
              "div",
              {
                key: "action",
                style: {
                  display: "grid",
                  gap: space(2),
                  /** The card's floor, so a row of listings lines its buttons up. */
                  marginBlockStart: "auto",
                  paddingBlockStart: space(4),
                },
              },
              action
            )
      )
    )
  },
})
