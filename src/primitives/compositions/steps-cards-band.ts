import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The same three steps, as three cards — and the same three steps is the point.
 *
 * ## This pair is the clearest illustration of 0162's rule in the catalogue
 *
 * Every other second design in the phrasebook differs from its canonical in
 * *what it says* as well as in what it builds, which makes the rule easy to
 * agree with and hard to see. This one says **the same three things in the same
 * three sentences**, deliberately, so that what is left over is exactly the
 * difference the rule is about.
 *
 * `steps` is a `loom.milestone-row` over three `loom.milestone` nodes. A
 * milestone is a leaf: its marker, its title and its body are **props**, which
 * is correct by 0052 — they are a fixed set of fields on one record, not
 * repeated content — and it is what makes that band ten nodes.
 *
 * This is a `loom.grid` over three `loom.card` nodes, each holding a
 * `loom.badge`, a `loom.heading` and a `loom.prose`. Twenty-eight nodes for the
 * identical copy. Nothing about the *content model* changed; what changed is
 * how much of it a later edit can reach.
 *
 * ## What the extra eighteen nodes actually buy
 *
 * This is worth stating plainly, because "more nodes" is not self-evidently
 * better and the granularity document is explicit that over-decomposing has a
 * real cost:
 *
 * > over-decomposing costs tedium, under-decomposing costs reachability, and
 * > only one of those is recoverable.
 *
 * Against `steps`, *"make the third step's heading a link"* is unreachable —
 * `loom.milestone` has an `href` for the whole row and no way to mark up part
 * of a title, because a title that is a prop has no inside. Against this band it
 * is one operation, because the heading is a node and its text is a child.
 * Likewise *"put a second paragraph in step two"*, *"emphasise three words"*,
 * *"give the first card a footer"*.
 *
 * None of that makes `steps` wrong. A row of three terse steps under a rail is
 * the better band when the steps *are* terse, and ten nodes is the cheaper
 * thing to drop in and the cheaper thing to read. The library offers both
 * because a page has both kinds of process to describe, and the choice between
 * them is a choice about **how much of the band the author expects to edit**,
 * which is a thing only the author knows.
 *
 * ## The rail is what is lost, and it is not nothing
 *
 * `loom.milestone-row` draws a line through its children, which is the band
 * saying *these happen in this order*. A grid of cards says *these are three
 * things* and leaves the order to the numbers in the badges. That is why the
 * badges are not optional decoration here: with the rail gone they are the only
 * thing carrying sequence, and a card grid whose numbers were dropped would be
 * a features band that had lost its way.
 *
 * The numbers are written in the content for the reason `steps-band.ts` gives
 * at length and which applies identically: a container cannot count its
 * children (0008), so the marker is authored, and inserting a step between the
 * first and second leaves the two that follow wrong by one. The cost is the
 * same either way; only the primitive holding the number changed.
 *
 * ## The anchor is shared with `steps`, on purpose
 *
 * Both designs answer to `#how-it-works`, the way `hero` and `hero-split` both
 * answer to `#top`. A page takes one design of a part, so the anchor belongs to
 * the **part** — and a nav link written against the canonical design keeps
 * working when a host swaps in this one, which is the thing that would
 * otherwise break silently and only for people who arrived from a menu.
 */
const STEPS = [
  {
    marker: "01",
    title: "Connect what you already use",
    body: "Point it at the repository, the board and the docs. Nothing moves and nothing is copied.",
  },
  {
    marker: "02",
    title: "Describe the change in a sentence",
    body: "Say what should be different. It plans against the page as it stands, not as it was.",
  },
  {
    marker: "03",
    title: "Approve what you meant",
    body: "Every change arrives as a diff with its reasoning attached, and every one of them comes back out.",
  },
] as const

export const stepsCardsBand: Composition = {
  id: "steps-cards",
  part: "steps",
  label: "How it works, as numbered cards",
  promise: "Three numbered cards across the page, each with its own heading and paragraph.",
  rationale:
    "A card-based process band is a loom.grid holding one loom.card per step, each with a loom.badge for its number, a loom.heading and a loom.prose. The heading and the paragraph are nodes rather than props on a milestone, so either can be edited, linked or extended on its own.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.grid", "loom.card", "loom.badge"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "How it works", anchor: "how-it-works" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Three moves, and the third is the only one you repeat")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted" },
          children: [
            buildText(ids, "No migration, no new place to work, and nothing that changes without you saying so."),
          ],
        }),
        buildElement(ids, {
          type: "loom.grid",
          props: { columns: "three", gap: "normal", align: "stretch" },
          children: STEPS.map((step) =>
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "outline", padding: "loose" },
              children: [
                buildElement(ids, {
                  type: "loom.badge",
                  props: { tone: "accent" },
                  children: [buildText(ids, step.marker)],
                }),
                buildElement(ids, {
                  type: "loom.heading",
                  props: { level: 3 },
                  children: [buildText(ids, step.title)],
                }),
                buildElement(ids, {
                  type: "loom.prose",
                  props: { size: "small", tone: "muted" },
                  children: [buildText(ids, step.body)],
                }),
              ],
            })
          ),
        }),
      ],
    }),
}
