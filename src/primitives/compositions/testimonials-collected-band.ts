import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The wall of testimonials, read from wherever they were collected — and the
 * one band in this catalogue whose authored designs were always placeholders.
 *
 * ## The workaround that is this band's whole argument
 *
 * `loom.quote` carries an `anonymous` prop, and the reason it exists is written
 * in its own docblock:
 *
 * > A catalogue band needs it. **A starting composition may not ship a
 * > fabricated endorsement attributed to a person who does not exist**, so
 * > `testimonials` attributes its quotes to roles — *Head of Platform*,
 * > *Founder* — and a role has no initials.
 *
 * That is a correct answer to an unavoidable problem and it is also a confession
 * about the part. `testimonials` and `testimonials-wall` are two designs of a
 * band whose content **nobody is allowed to author**: praise in a tree is praise
 * somebody wrote on a customer's behalf, and a model writing it is a model
 * inventing it. Both existing designs ship real-looking quotes attributed to
 * nobody, because that is the most honest thing a band can do when the words
 * have to come from a file.
 *
 * Every real testimonial already lives somewhere that collected it with
 * consent — a reviews table, a G2 export, a survey, a CRM field. This band is
 * the one design of this part whose social proof is true by construction rather
 * than by somebody having checked, and that is why `loom.voices` was worth a
 * primitive ([0233](../../../decisions/0233-a-bound-twin-is-earned-by-a-system-of-record-and-a-row-shape-the-primitive-can-declare.md)
 * clause one, which this content model passes harder than anything else in the
 * library).
 *
 * ## A third design of `testimonials`, and the sets of nodes are not close
 *
 * `testimonials` is a `loom.quote-grid` over three `loom.quote` nodes;
 * `testimonials-wall` runs quotes through a `loom.marquee`. This is a single
 * `loom.voices`, because the cards are an answer's rows and rows are never
 * nodes — no `move` addresses the third review, no `configure` re-words it, and
 * re-wording a customer's words is the operation this band exists to make
 * impossible. [0162](../../../decisions/0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)'s
 * bar is cleared by a wide margin, and under 0171 the swap loses nothing in any
 * direction — all three are the band that says *somebody else thinks so* — so
 * `COMPOSITION_PARTS` does not move.
 *
 * ## It arrives unconnected, and the empty region says who may fill it
 *
 * `feedBand`'s rule: a composition naming a source id would make every
 * deployment that had not registered it report a binding it never agreed to
 * make. So this names a binding *key* and no source.
 *
 * The line in the empty region is the one piece of copy in this run chosen for
 * what it refuses rather than what it offers. *Nobody may write these for you*
 * is the band explaining why it is empty instead of apologising for it — and a
 * deployment that reads it and connects a reviews table gets a wall that cannot
 * contain a sentence no customer said.
 *
 * ## `limit: "six"`, which is a cap and not a page
 *
 * A reviews table has nine hundred rows and a landing page shows its best six.
 * The prop is on the primitive and its header argues the granularity: none of
 * these rows is a node under any configuration, so a cap changes no set of
 * nodes and is not `remove` in disguise. What the band adds is the editorial
 * part — six rather than three, because three cards in a three-column wall at
 * 1280 is one row that reads as an afterthought, and nine is a page of reading
 * where a band was wanted.
 */
export const testimonialsCollectedBand: Composition = {
  id: "testimonials-collected",
  part: "testimonials",
  label: "Testimonials, from where you collect them",
  promise:
    "A wall of testimonials read from a connected source — the only design of this band whose quotes nobody had to write.",
  rationale:
    "A testimonial is the one thing on a marketing page nobody may author, so this band is a single loom.voices reading a reviews table, a CRM or a survey. Its cards are an answer's rows rather than nodes, which makes it a different set of nodes from either authored design — where every quote is a loom.quote node — and makes re-wording a customer impossible rather than merely discouraged. It drops in unconnected, showing the region that names what goes there.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.voices",
    "loom.empty-state",
    "loom.icon",
    "loom.action",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "In their words", anchor: "testimonials" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "We did not write any of these")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "Point this at the place your reviews already arrive. What appears is what somebody actually said, with their name on it, and nothing on this page can edit it."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.voices",
          props: { binding: "reviews", columns: "three", density: "loose", limit: "six" },
          children: [
            buildSlot(ids, "empty", [
              buildElement(ids, {
                type: "loom.empty-state",
                props: { outline: "dashed", align: "center", cause: "empty", stature: "compact" },
                children: [
                  buildSlot(ids, "media", [
                    buildElement(ids, {
                      type: "loom.icon",
                      props: { shape: "bare", tone: "neutral", size: "medium" },
                      children: [buildText(ids, "❞")],
                    }),
                  ]),
                  buildSlot(ids, "heading", [
                    buildElement(ids, {
                      type: "loom.heading",
                      props: { level: 3 },
                      children: [buildText(ids, "Nobody may write these for you")],
                    }),
                  ]),
                  buildText(
                    ids,
                    "A quote and who said it is all this reads. Connect the table your reviews land in and the best of them appear here — with their faces, or their initials when there is no photograph."
                  ),
                  buildSlot(ids, "actions", [
                    buildElement(ids, {
                      type: "loom.action",
                      props: { href: "/connect", variant: "primary", scale: "small" },
                      children: [buildText(ids, "Connect a source")],
                    }),
                  ]),
                ],
              }),
            ]),
          ],
        }),
      ],
    }),
}
