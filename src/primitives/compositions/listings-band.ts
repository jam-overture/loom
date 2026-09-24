import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * What is available, where it is, what it costs, and the facts a reader
 * measures it by.
 *
 * ## A design of `features`, and the swap that decides it
 *
 * Same argument as `features-catalogue` and `features-shelf`, and it is the
 * third business whose body band is not a grid of capabilities: an agency's page
 * answers *what is this* with the things it has on its books. Swap this for the
 * feature grid in either direction and neither page loses something it needed —
 * a **design** of `features` under
 * [0162](../../../decisions/0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md),
 * and `COMPOSITION_PARTS` does not move.
 *
 * The reading it is *not* is `pricing`, and `catalogueBand` already worked that
 * swap: a band of priced things tells a reader what there **is** and a price
 * band tells them what the **commitment** is, and a reader who wanted the second
 * and got the first has to infer the answer from six cards. Different regions.
 *
 * ## The specifications are nodes, and this band is the reason that matters
 *
 * `loom.listing` takes its facts as `loom.spec` children rather than as the
 * `beds` / `baths` / `sqft` fields Hermes held, and this is the first band to
 * spend that. **The six listings carry two, three and four specs each, on
 * purpose.** A workspace has a desk count and a floor area; a unit above a shop
 * has neither and has a lease length instead; the yard has an acreage and a
 * gate width and nothing else. As fields those cards would each carry three
 * blanks and a fourth fact that could never be added at all — not expensively,
 * *unreachably*, because nothing can register a fourth prop mid-session. As
 * nodes, adding the fourth is one `insert` into one card.
 *
 * A band where every card had the same three specs would be a photograph of the
 * prop version, which is the point `another-kind-of-business` made about ragged
 * badge strips and is made again here about something load-bearing.
 *
 * ## The flags are on the frame and the control is on the floor
 *
 * Two regions, two reasons, both 0051's. `flags` sits over the picture because
 * *Let agreed* and *New* are states a listing wears rather than things it says,
 * and `action` is pinned to the card's end so six cards with two, three and four
 * specifications between them still line their buttons up. "The last child is
 * the button" is a rule no schema states and every `move` breaks.
 *
 * The address carries the anchor and the button is a real control, which is
 * [0066](../../../decisions/0066-a-card-is-the-target-when-it-is-read-and-the-control-is-the-target-when-it-is-bought.md)
 * on the acted-on side: nobody browses a listing, they book a viewing.
 *
 * ## No photographs, and what that cost the primitive
 *
 * `loom.listing`'s `image` is optional and the card is drawn without one, so
 * this band ships inside the catalogue's standing rule that no composition names
 * an image source. What the first photograph of it showed is written up in
 * `loom.listing` itself: a frame holding a 4:3 ratio with nothing in it is a
 * quarter of the card given to a grey rectangle, six times over. The ratio is
 * now the picture's and the flags keep their region either way. An agency with
 * its photography sets `image` on each card and gets the frame back, with no
 * node moved.
 */
type Listing = {
  readonly address: string
  readonly price: string
  readonly flags: readonly { readonly word: string; readonly loud?: boolean }[]
  readonly specs: readonly { readonly value: string; readonly label?: string }[]
}

const LISTINGS: readonly Listing[] = [
  {
    address: "Unit 4, Bowline Wharf, Bristol",
    price: "£2,400 / mo",
    flags: [{ word: "New", loud: true }, { word: "Viewings Thursday" }],
    specs: [{ value: "28", label: "desks" }, { value: "2,150", label: "sq ft" }, { value: "24/7", label: "access" }],
  },
  {
    address: "The Print Room, Mabgate, Leeds",
    price: "£1,180 / mo",
    flags: [{ word: "Let agreed" }],
    specs: [{ value: "12", label: "desks" }, { value: "940", label: "sq ft" }],
  },
  {
    address: "First floor, 19 Cross Street, Manchester",
    price: "£3,050 / mo",
    flags: [{ word: "Reduced", loud: true }],
    specs: [
      { value: "Open plan" },
      { value: "40", label: "desks" },
      { value: "3,400", label: "sq ft" },
      { value: "5 yr", label: "lease" },
    ],
  },
  {
    address: "Studio 2, Gasworks Yard, Sheffield",
    price: "£640 / mo",
    flags: [{ word: "Short let" }],
    specs: [{ value: "Studio" }, { value: "460", label: "sq ft" }],
  },
  {
    address: "The Long Shed, Attercliffe Road, Sheffield",
    price: "Offers over £310,000",
    flags: [{ word: "Freehold" }, { word: "Open Sunday" }],
    specs: [{ value: "0.4", label: "acres" }, { value: "4.2 m" }, { value: "B1 / B8" }],
  },
  {
    address: "Suite 11, Tramway House, Glasgow",
    price: "POA",
    flags: [{ word: "Under offer" }],
    specs: [{ value: "18", label: "desks" }, { value: "1,320", label: "sq ft" }, { value: "Furnished" }],
  },
]

/**
 * One card. Flags in their region, specs in the flow, the way in on the floor —
 * and the address is what the anchor hangs on.
 */
const listingNode = (ids: IdFactory, listing: Listing): ElementNode =>
  buildElement(ids, {
    type: "loom.listing",
    props: { address: listing.address, price: listing.price, href: "/space" },
    children: [
      buildSlot(
        ids,
        "flags",
        listing.flags.map((flag) =>
          buildElement(ids, {
            type: "loom.badge",
            props: { tone: flag.loud === true ? "accent" : "neutral" },
            children: [buildText(ids, flag.word)],
          })
        )
      ),
      ...listing.specs.map((spec) =>
        buildElement(ids, {
          type: "loom.spec",
          props: spec.label === undefined ? { value: spec.value } : { value: spec.value, label: spec.label },
        })
      ),
      buildSlot(ids, "action", [
        buildElement(ids, {
          type: "loom.action",
          props: { href: "/space", variant: "secondary", scale: "small" },
          children: [buildText(ids, "Book a viewing")],
        }),
      ]),
    ],
  })

export const listingsBand: Composition = {
  id: "features-listings",
  part: "features",
  label: "What it is, as what is available",
  promise: "Six places on the books, each with its price, its address, the facts it is measured by and a way to see it.",
  rationale:
    "A band of what is available is a loom.listing-grid holding one loom.listing per place, each carrying its state as loom.badge nodes in the flags region, its measurements as loom.spec children, and a viewing request as a loom.action on the card's floor. The specifications are nodes rather than the three fixed fields Hermes held, so a card can carry two facts or four and a fourth is one insert. It is a design of the features part rather than a new part: what an agency has on its books occupies the body of the page, where a software page puts its capabilities.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.listing-grid", "loom.listing", "loom.badge", "loom.spec", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "On the books", anchor: "features" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Room to work in, on terms you can leave")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "Every space here is one we have stood in. Prices are what you pay, the lease is as long as you want it, and a viewing takes twenty minutes."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.listing-grid",
          props: { columns: "three", gap: "normal" },
          children: LISTINGS.map((listing) => listingNode(ids, listing)),
        }),
      ],
    }),
}
