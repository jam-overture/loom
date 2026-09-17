import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Three people saying it instead of the page saying it.
 *
 * A `loom.quote-grid` over three `loom.quote` nodes, under a title. The band is
 * small and the interesting decision in it is one this catalogue has to make
 * everywhere and only shows plainly here.
 *
 * ## What a starting composition is allowed to put in someone's mouth
 *
 * A testimonial is a claim attributed to a named person at a named company. A
 * library cannot ship one: the person does not exist, and a tree that says
 * "Rosa Iyer, Head of Platform, Northwind" is a fabricated endorsement sitting
 * in a page that may be published before anyone re-reads it. That is not a
 * placeholder that fails safe.
 *
 * So the attributions here are **roles without names** — "Head of Platform",
 * "Engineering manager, 40-person team" — in the `author` field, with no
 * company. It reads as a real band, it is obviously unfinished to anyone
 * filling it in, and nothing in it is a claim about a person who exists. The
 * quotes themselves say what a customer would say about a tool, in the register
 * a customer uses, without naming the product.
 *
 * This is the one place the catalogue's copy rule bends and it is worth stating
 * where the rule is: **generic but real** for everything a page would keep, and
 * **structurally complete but deliberately unattributed** for anything that
 * would be a claim about a third party if it stayed.
 *
 * ## No avatars, for the reason nothing here has an image
 *
 * `loom.quote` takes an optional `avatar` and the band is better with one. It
 * would be a URL this library cannot supply — the same wall the hero's `media`
 * slot and the logo wall's marks hit. `loom.quote` draws a monogram from the
 * author when there is no avatar, so the band is complete without one rather
 * than visibly missing something.
 */
const QUOTES = [
  {
    quote:
      "We stopped having the meeting where everyone reads out what they did. The board already said it, and it said it in their words rather than mine.",
    author: "Head of Platform",
    role: "Fintech, 200 people",
  },
  {
    quote:
      "The part I did not expect: it is the first tool where undo means undo. I have rolled back a bad afternoon twice and lost nothing either time.",
    author: "Engineering manager",
    role: "40-person team",
  },
  {
    quote:
      "It took a morning to connect and the first board was right. I have set up four of these and that has never once been true before.",
    author: "Founder",
    role: "Seed-stage, remote",
  },
] as const

export const testimonialsBand: Composition = {
  id: "testimonials",
  part: "testimonials",
  label: "Testimonials",
  promise: "A titled band with three quotes side by side, each with its attribution.",
  rationale:
    "A wall of testimonials is a loom.quote-grid with one loom.quote per person. Each quote is a node with its own attribution, so one can be replaced or dropped without rewriting the others.",
  uses: ["loom.section", "loom.heading", "loom.quote-grid", "loom.quote"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      /**
       * The anchor was missing here and present on `testimonials-wall`, which
       * meant `#testimonials` resolved on a page that had taken the alternate
       * design and resolved nowhere on a page that had taken this one. A nav
       * link that works or does not depending on which design of a band a host
       * chose is the worst shape a defect of this kind can have, because the
       * page it is broken on is the default.
       *
       * An anchor belongs to the **part**, not to the design — the same reason
       * `hero` and `hero-split` both answer to `#top`
       * ([0165](../../../decisions/0165-an-anchor-belongs-to-the-part-and-is-unique-over-the-assembled-page.md)).
       */
      props: { eyebrow: "What people say", width: "wide", anchor: "testimonials" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "The bit nobody writes on a landing page")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.quote-grid",
          props: { columns: "three", density: "loose" },
          children: QUOTES.map((quote) =>
            buildElement(ids, {
              type: "loom.quote",
              props: { quote: quote.quote, author: quote.author, role: quote.role, emphasis: "card" },
            })
          ),
        }),
      ],
    }),
}
