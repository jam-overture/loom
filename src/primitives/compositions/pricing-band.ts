import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode, LoomNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Three plans, their perks, their buttons — and the composition that pays for
 * the whole argument.
 *
 * A pricing band is forty-two nodes. Every one of them is decomposed for a
 * reason 0052 gives and every one of them was, until this file existed,
 * forty-two operations to put on a page. It is the band the granularity
 * doc's promise was written about, so it is worth walking once.
 *
 * ```
 * section                       one band
 *   slot heading                the title and its lead
 *   tier-table                  the arrangement
 *     tier ×3                   name, price, period, note — fixed fields
 *       slot badge              "Most popular", on one tier only
 *       perk-list               what the plan includes
 *         perk-list-item ×5     one claim each
 *       slot action             the button, pinned to the foot
 * ```
 *
 * ## The badge is the clearest thing in the catalogue
 *
 * `loom.tier` explains in its own doc comment that Hermes' `highlighted:
 * boolean` split in two here: `emphasis` is a prop because no delta reorders a
 * border, and the ribbon is a `loom.badge` in a region because *a boolean that
 * decides whether a piece of copy exists is `insert` in disguise*. This band is
 * where that split becomes visible — the middle tier has a badge node and the
 * other two have an empty slot, and moving "Most popular" to the Enterprise
 * plan is one `move` of one node rather than two `configure`s that happen to
 * agree with each other.
 *
 * ## Every tier has the same number of perks, and that is a decision
 *
 * Five each, and the ones a plan does not have are `state: "excluded"` rather
 * than absent. Two things follow that are worth having by default: the three
 * cards are the same height without anything measuring anything, and a reader
 * comparing plans reads the same list three times in the same order, which is
 * the whole reason a pricing table is a table. An author who wants ragged lists
 * deletes rows; an author handed ragged lists has to notice the ordering is
 * inconsistent before they can fix it.
 *
 * The excluded rows are also the only place in this catalogue that exercises
 * 0060's text seam — `loom.perk-list-item` announces "Not included" from its
 * own declared strings, because the marker means something the label does not
 * say. A pricing band built by hand almost never has those, which is a small
 * illustration of why a starting composition is worth more than a screenshot of
 * one.
 *
 * ## Free text prices, and no currency prop
 *
 * "Free", "$24", "Let's talk". `loom.tier`'s `price` is a string for exactly
 * this: a third of real prices are not numbers, and the third one here is the
 * case a numeric field with a currency beside it could never say.
 */
type Plan = {
  readonly name: string
  readonly price: string
  readonly period?: string
  readonly note?: string
  readonly featured: boolean
  readonly badge?: string
  readonly cta: { readonly label: string; readonly href: string; readonly variant: "primary" | "secondary" }
  readonly perks: readonly { readonly label: string; readonly note?: string; readonly excluded?: boolean }[]
}

const PLANS: readonly Plan[] = [
  {
    name: "Starter",
    price: "Free",
    note: "Up to 3 people",
    featured: false,
    cta: { label: "Start free", href: "/start", variant: "secondary" },
    perks: [
      { label: "Unlimited boards" },
      { label: "One connected repository" },
      { label: "30 days of history" },
      { label: "Review rules", excluded: true },
      { label: "Single sign-on", excluded: true },
    ],
  },
  {
    name: "Team",
    price: "$24",
    period: "per person, per month",
    note: "Billed annually",
    featured: true,
    badge: "Most popular",
    cta: { label: "Start a trial", href: "/start", variant: "primary" },
    perks: [
      { label: "Unlimited boards" },
      { label: "Unlimited repositories" },
      { label: "Full history" },
      { label: "Review rules", note: "Up to 20" },
      { label: "Single sign-on", excluded: true },
    ],
  },
  {
    name: "Enterprise",
    price: "Let's talk",
    note: "Annual agreement",
    featured: false,
    cta: { label: "Contact sales", href: "/contact", variant: "secondary" },
    perks: [
      { label: "Unlimited boards" },
      { label: "Unlimited repositories" },
      { label: "Full history", note: "With export" },
      { label: "Review rules", note: "Unlimited" },
      { label: "Single sign-on" },
    ],
  },
]

const tierNode = (ids: IdFactory, plan: Plan): ElementNode => {
  const badge: readonly LoomNode[] =
    plan.badge === undefined
      ? []
      : [
          buildElement(ids, {
            type: "loom.badge",
            props: { tone: "accent" },
            children: [buildText(ids, plan.badge)],
          }),
        ]

  return buildElement(ids, {
    type: "loom.tier",
    props: {
      name: plan.name,
      price: plan.price,
      ...(plan.period === undefined ? {} : { period: plan.period }),
      ...(plan.note === undefined ? {} : { note: plan.note }),
      emphasis: plan.featured ? "featured" : "plain",
    },
    children: [
      buildSlot(ids, "badge", badge),
      buildElement(ids, {
        type: "loom.perk-list",
        props: { columns: "one", density: "loose" },
        children: plan.perks.map((perk) =>
          buildElement(ids, {
            type: "loom.perk-list-item",
            props: {
              label: perk.label,
              ...(perk.note === undefined ? {} : { note: perk.note }),
              state: perk.excluded === true ? "excluded" : "included",
            },
          })
        ),
      }),
      buildSlot(ids, "action", [
        buildElement(ids, {
          type: "loom.action",
          props: { href: plan.cta.href, variant: plan.cta.variant, scale: "medium" },
          children: [buildText(ids, plan.cta.label)],
        }),
      ]),
    ],
  })
}

export const pricingBand: Composition = {
  id: "pricing",
  part: "pricing",
  label: "Pricing",
  promise: "Three plans side by side, each with its perks and its button, and one marked as the popular one.",
  rationale:
    "A pricing band is a loom.tier-table holding one loom.tier per plan, each with a loom.perk-list of what it includes and its call to action in the action region. The 'Most popular' ribbon is a loom.badge node rather than a flag, so moving it to another plan is one move.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.tier-table",
    "loom.tier",
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
            children: [buildText(ids, "Priced per person, and nothing per seat you are not using")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [buildText(ids, "Every plan includes the whole product. What changes is how many of you there are.")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.tier-table",
          props: { columns: "three", density: "loose" },
          children: PLANS.map((plan) => tierNode(ids, plan)),
        }),
      ],
    }),
}
