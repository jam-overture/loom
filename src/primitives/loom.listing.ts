import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema, mediaUrlSchema } from "./url.js"

/**
 * A thing on offer at a place: a picture of it, what it costs, where it is, and
 * the facts a buyer measures it by.
 *
 * This is the port of Hermes' `property-listings`, and it is the last block in
 * `docs/hermes-port-map.md`'s *pairs to build* table.
 *
 * **The name was tested before it was taken.** The map proposed `loom.listing`
 * and flagged it as a `property-listings` word, with an instruction to ask what
 * else it collapses first — the test that renamed `loom.episode` to
 * `loom.recording`. It survives, and the reason is that *property* is the narrow
 * word and *listing* is the general one: a rental, a vehicle, a piece of
 * equipment for hire and a plot of land are all this card, and none of them is a
 * property. What the noun has to name is **a thing at a location, priced, and
 * measured** — and that is what separates it from the two cards it would
 * otherwise duplicate. `loom.product` is a thing for sale with no place and no
 * measurements; `loom.offering` is a service, which is somebody's time rather
 * than a thing at all.
 *
 * **Why it is a primitive rather than a `loom.product` with an address.** The
 * port map's collapse rule cuts both ways: two blocks with different *words* are
 * one primitive, two blocks with different *markup* are two. Three differences
 * here are markup rather than vocabulary, and the third is the one that settles
 * it:
 *
 * - **The price leads.** A product sets its price beside its name on a shared
 *   baseline, because what is being read is the name. A listing sets the price
 *   above the address and larger, because a reader scanning a listings band is
 *   scanning prices and reaches the address only after one stops them. Reversing
 *   the two is not a style preference; it is what the band is for.
 * - **The flags sit on the picture.** *For sale*, *Under offer*, *Price
 *   reduced*, *Open Sunday* — a listing wears its state on the photograph, where
 *   a product has no state to wear.
 * - **It has children, and `loom.product` is a leaf.** See below. A card whose
 *   interior is addressable is a different primitive from one whose interior is
 *   five props.
 *
 * **The specifications are nodes, and this is the whole 0052 argument in one
 * card.** Hermes holds `beds`, `baths` and `sqft` as three fixed fields. They
 * are three occurrences of one shape, which is repeated content that never got
 * to be a list — the same mistake `hours-of-operation` makes with seven weekday
 * fields, and the same one a `hotspots[]` array would have made on `loom.frame`.
 * As fields, "parking: 2" is unreachable forever: not expensive, *unreachable*,
 * because the runtime cannot register a fourth prop mid-session. As
 * `loom.spec` children they are an `insert` each, a `move` each and an inverse
 * each, and a listing for a plot of land can drop the bedrooms it does not have.
 *
 * **The reader aims at the control, so the card is not covered.**
 * [0066](../../decisions/0066-a-card-is-the-target-when-it-is-read-and-the-control-is-the-target-when-it-is-bought.md)
 * sorts the remaining pairs into read and acted-on, and a listing is acted on:
 * nobody browses a listing, they book a viewing. So this follows `loom.product`
 * rather than `loom.article` — the **address** carries the anchor, and the thing
 * on the floor of the card is a real `loom.action` the reader can tab to. A
 * card-wide overlay under a button is the pattern that ships broken, because the
 * two click regions overlap and which one wins depends on paint order.
 *
 * Two regions earn slots under
 * [0051](../../decisions/0051-a-slot-is-a-region-the-primitive-places.md), and
 * the flow of children — the specs — goes to neither of them: `flags` is over
 * the photograph and `action` is pinned to the card's floor, so six listings
 * with different numbers of specifications still line their buttons up. "The
 * last child is the button" is a rule no schema states and every `move` breaks.
 */

const props = z
  .object({
    /**
     * Where it is. Required — a listing with no location is a product — and it
     * carries the anchor.
     */
    address: z.string().min(1).max(200),
    /**
     * Free text, never parsed, never formatted: the call `loom.tier` and
     * `loom.offering` both made, which Hermes learned over a year of real pages.
     * "£450,000", "From $2,100 / mo", "Offers over" and "POA" are all things
     * people write, and a numeric field with a currency prop beside it can say
     * none of them.
     */
    price: z.string().min(1).max(32).optional(),
    image: mediaUrlSchema.optional(),
    /** Links the address. The control that books a viewing goes in `action`. */
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomListing = definePrimitive({
  type: "loom.listing",
  description:
    "A thing on offer at a place — photograph, price, address, and loom.spec children for the facts it is measured by. Flags go on the picture, the control on the card's floor. A cell of a loom.listing-grid.",
  props,
  /**
   * No `interactive` declaration, for `loom.product`'s reason and 0068's test:
   * the `href` here links the *address*, and 0066 puts a real `loom.action` in
   * the `action` region on purpose. Declaring it would make the Gate refuse this
   * library's own intended composition, which is how a check ends up switched
   * off. Nothing on this card covers anything else.
   */
  slots: ["flags", "action"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const flags = loom.slots["flags"]
    const action = loom.slots["action"]

    /**
     * Drawn whether or not there is a photograph, which is `loom.book`'s call
     * and the answer the 2 September finding lists first. Here it carries a
     * second job that settles it: the flags live inside this frame, so a listing
     * with a state and no picture would otherwise have nowhere to wear it, and a
     * band that moved its flags depending on whether a photograph was found
     * would be two layouts nobody chose.
     */
    const media = createElement(
      "div",
      {
        key: "media",
        className: LIBRARY_CLASS.listingMedia,
        style: { background: colour("bg-surface-muted") },
      },
      given.image === undefined
        ? null
        : createElement("img", {
            src: given.image,
            /** Empty: the address is in the same node. See `loom.article`. */
            alt: "",
            loading: "lazy",
            decoding: "async",
            style: { display: "block", width: "100%", height: "100%", objectFit: "cover" },
          }),
      flags === undefined
        ? null
        : createElement(
            "div",
            {
              key: "flags",
              className: LIBRARY_CLASS.listingFlags,
              style: { gap: space(2) },
            },
            flags
          )
    )

    const address = createElement(
      "h3",
      {
        key: "address",
        style: {
          margin: "0",
          fontFamily: family("body"),
          fontSize: size(3),
          lineHeight: 1.45,
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
        style: {
          display: "flex",
          flexDirection: "column",
          /** No stylesheet resets this, so the size below is the border box rather than the content box. */
          boxSizing: "border-box",
          height: "100%",
          overflow: "hidden",
          background: colour("bg-surface"),
          border: `1px solid ${colour("border-subtle")}`,
          borderRadius: radius("lg"),
        },
      },
      libraryStylesheet(),
      media,
      createElement(
        "div",
        {
          key: "body",
          style: {
            display: "flex",
            flexDirection: "column",
            gap: space(2),
            padding: space(5),
            flex: "1 1 auto",
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
                  fontSize: size(6),
                  lineHeight: 1.1,
                  color: colour("fg-default"),
                },
              },
              given.price
            ),
        address,
        /**
         * The specs strip. It is `children` and not a slot: a slot is a region
         * the primitive places somewhere the flow does not go (0051), and this
         * *is* the flow — the one part of the card whose contents the tree
         * decides. Rendering is total, so a listing given something that is not
         * a `loom.spec` draws it here rather than blanking (0008).
         */
        createElement(
          "div",
          {
            key: "specs",
            className: LIBRARY_CLASS.listingSpecs,
            style: { marginBlockStart: space(1) },
          },
          children
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
                /** The card's floor, so a row of listings lines its buttons up. */
                marginTop: "auto",
              },
            },
            action
          )
    )
  },
})
