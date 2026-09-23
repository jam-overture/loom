import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode, LoomNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * What a studio sells, priced one engagement at a time.
 *
 * ## Why this is a design of `pricing` and not a part of its own
 *
 * [0171](../../../decisions/0171-a-page-part-is-earned-by-the-region-it-occupies.md)
 * asks the swap, both ways: put this where `pricingBand` goes and ask what the
 * page loses. It loses nothing it needed — the band still stands between the
 * proof and the questions, and it still answers *what does this cost*. A
 * service menu and a tier table are one region of a page drawn for two
 * businesses, which is the definition of a second design and not of a second
 * part.
 *
 * The catalogue had thirty-six bands before this one and every one of them was
 * written for a developer product. That is not a fact about the *parts* — a
 * clinic's page has a hero, proof, a price and a footer in the same order — it
 * is a fact about the copy inside them, and the copy is the cheapest thing in
 * a composition to replace. The twelve primitives that had been filed as
 * *waiting on a second page sequence* were waiting on nobody.
 *
 * ## Why `loom.offering` rather than `loom.tier`
 *
 * The primitive argues it in its own doc comment and this band is where the
 * argument is spent: **a tier is a column in a comparison and an offering
 * stands alone.** A tier table sets three prices in one row so a reader can
 * run their eye across them; that is the right shape for three plans of one
 * product and the wrong shape for three different things you can buy. Here the
 * *name* is the loud thing and the price is a detail beside it, which is why
 * the two primitives exist rather than one with a `layout` prop.
 *
 * Structurally the difference is real and not a skin: a tier carries its perks
 * in a fixed five-row ledger so three cards align, and an offering carries a
 * prose line, a ragged includes-list and a strip of qualifier badges. Swap the
 * types and the subtree changes, which is 0052's test lifted to the catalogue.
 *
 * ## The qualifiers are badges, and there is never exactly one
 *
 * `loom.offering`'s own note: nine Hermes fields — duration, format, level,
 * day, time, location — collapse into *a short qualifier beside the name*, and
 * a record has several or none. So they are `loom.badge` nodes in the `meta`
 * region rather than props, and a fourth one is an `insert` rather than a
 * schema change. This band ships two or three per offering to make that
 * visible at a glance: the cards are deliberately ragged where a tier table is
 * deliberately square.
 *
 * ## Free text prices, for the third time in this catalogue
 *
 * `loom.tier`, `loom.product` and `loom.offering` all take `price` as a string
 * and all three give the same reason. It is most obviously right here: *From
 * £3,200 / mo* is a real price, and no numeric field with a currency prop
 * beside it can say it.
 */
type Engagement = {
  readonly name: string
  readonly price: string
  readonly featured: boolean
  readonly badge?: string
  readonly qualifiers: readonly string[]
  readonly summary: string
  readonly includes: readonly string[]
  readonly cta: { readonly label: string; readonly href: string; readonly variant: "primary" | "secondary" }
}

const ENGAGEMENTS: readonly Engagement[] = [
  {
    name: "Diagnostic",
    price: "£2,400",
    featured: false,
    qualifiers: ["One week", "Remote"],
    summary: "We read what you have, use it the way your customers do, and tell you what is actually in the way.",
    includes: ["A working session to open", "Everything we find, written down", "A ranked list you own"],
    cta: { label: "Book a diagnostic", href: "/start", variant: "secondary" },
  },
  {
    name: "Build sprint",
    price: "£9,600",
    featured: true,
    badge: "Most booked",
    qualifiers: ["Four weeks", "Two of us", "Your repository"],
    summary: "One problem taken from the list and finished — designed, built, reviewed and shipped behind your own flag.",
    includes: [
      "A working build every Friday",
      "Your team in every review",
      "Tests for what we wrote",
      "The handover written as we go",
    ],
    cta: { label: "Check availability", href: "/start", variant: "primary" },
  },
  {
    name: "Retainer",
    price: "From £3,200 / mo",
    featured: false,
    qualifiers: ["Rolling", "Cancel any month"],
    summary: "A standing half of a week, for the quarter after launch when the questions are small and constant.",
    includes: ["A named pair of hands", "Same-day answers", "Whatever the month needs"],
    cta: { label: "Talk it through", href: "/contact", variant: "secondary" },
  },
]

/**
 * One engagement: qualifiers above, the line about it, what it includes, and
 * the way in pinned to the foot.
 *
 * The `action` region is a region rather than a pair of props for the reason
 * the library has given since the first ten primitives — a call to action is
 * `loom.action`, which owns 0053's scheme allowlist, and a card that
 * reimplemented a link as two props would keep a second copy of it in step.
 * `loom.offering-grid` stretches its cells, which is what makes a pinned foot
 * mean anything when the three summaries are different lengths.
 */
const offeringNode = (ids: IdFactory, engagement: Engagement): ElementNode => {
  const qualifiers: readonly LoomNode[] = engagement.qualifiers.map((qualifier) =>
    buildElement(ids, {
      type: "loom.badge",
      props: { tone: "neutral" },
      children: [buildText(ids, qualifier)],
    })
  )

  const meta: readonly LoomNode[] =
    engagement.badge === undefined
      ? qualifiers
      : [
          buildElement(ids, {
            type: "loom.badge",
            props: { tone: "accent" },
            children: [buildText(ids, engagement.badge)],
          }),
          ...qualifiers,
        ]

  return buildElement(ids, {
    type: "loom.offering",
    props: {
      name: engagement.name,
      price: engagement.price,
      emphasis: engagement.featured ? "featured" : "plain",
    },
    children: [
      buildSlot(ids, "meta", meta),
      buildElement(ids, {
        type: "loom.prose",
        props: { size: "body", tone: "muted" },
        children: [buildText(ids, engagement.summary)],
      }),
      buildElement(ids, {
        type: "loom.perk-list",
        props: { columns: "one", density: "tight" },
        children: engagement.includes.map((include) =>
          buildElement(ids, {
            type: "loom.perk-list-item",
            props: { label: include, state: "included" },
          })
        ),
      }),
      buildSlot(ids, "action", [
        buildElement(ids, {
          type: "loom.action",
          props: { href: engagement.cta.href, variant: engagement.cta.variant, scale: "medium" },
          children: [buildText(ids, engagement.cta.label)],
        }),
      ]),
    ],
  })
}

export const offeringsBand: Composition = {
  id: "pricing-offerings",
  part: "pricing",
  label: "Pricing, as a menu of engagements",
  promise:
    "Three things you can buy side by side, each with its own qualifiers, what it includes and the way in — with the one most people take marked.",
  rationale:
    "A service menu is a loom.offering-grid holding one loom.offering per engagement, each carrying its qualifiers as loom.badge nodes in the meta region, its line as loom.prose, what it includes as a loom.perk-list, and its way in as a loom.action in the action region. It is a second design of the pricing part rather than a second part: it occupies the same region of a page as the tier table and differs in the set of nodes it builds, which is what 0162 asks of a design.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.offering-grid",
    "loom.offering",
    "loom.badge",
    "loom.perk-list",
    "loom.perk-list-item",
    "loom.action",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { eyebrow: "Pricing", width: "wide", anchor: "pricing" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Three ways to start, and none of them is a subscription")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "Every engagement is fixed before it starts. If we are wrong about the scope, that is ours to carry."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.offering-grid",
          props: { columns: "three", gap: "normal" },
          children: ENGAGEMENTS.map((engagement) => offeringNode(ids, engagement)),
        }),
      ],
    }),
}
