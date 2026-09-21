import type { IdFactory } from "../../ids.js"
import { buildElement, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The other proof band: one customer, named, with what it did for them.
 *
 * `proof` is a wall of logos and makes the claim *many*. This makes the
 * opposite claim — *one, specifically, and here is the number* — and a page
 * wants one or the other depending on what it actually has. A five-logo wall
 * from a company with five customers is the weakest band on the internet; one
 * named person saying one checkable thing is not.
 *
 * ## Why it is a design and not a `configure` of `proof`
 *
 * `proof` is a `loom.logo-cloud` over six `loom.logo` nodes and has no other
 * children. This has a `loom.quote`, two `loom.stat` nodes and a `loom.link`,
 * arranged in a `loom.grid`. The only type the two share is `loom.logo`, and
 * here there is one of it rather than six — which is the granularity document's
 * own question answered in the affirmative: **changing between these changes
 * the set of nodes**, so it is `remove` and `insert` rather than a prop.
 *
 * ## Why this is `proof` and not a third `testimonials` design
 *
 * It is a quote, and the part called `testimonials` is made of quotes, so this
 * has to be argued rather than asserted.
 *
 * The parts in `COMPOSITION_PARTS` are **positions in a document**, not content
 * types — that is why the tuple's order is the information it carries. `proof`
 * is the band directly under the hero, whose job is to stop a reader who has
 * just read a claim from bouncing; `testimonials` is two thirds down, after the
 * reader has been shown the product and is weighing it. The first wants one
 * short, specific, checkable thing. The second wants volume and range, which is
 * why both of its designs are *many* quotes.
 *
 * The test of that, rather than the argument: a page that takes this band
 * **and** `testimonials-wall` reads correctly, because they are making different
 * arguments in different places. A page that takes two designs of one part
 * reads as a mistake. That is the line, and it is the same line
 * `COMPOSITION_PARTS` already draws.
 *
 * ## Two figures rather than five, and they are the customer's
 *
 * The right column is deliberately thin. A customer story band that lists six
 * metrics is a case study with the prose deleted, and the reader on a landing
 * page is not reading a case study — they are checking whether the claim above
 * survives contact with somebody real. Two numbers is what fits in that glance,
 * and the `loom.link` under them is where the rest of it lives.
 *
 * The numbers agree with the quote above them on purpose: *four days to two*
 * is the same fact as *50% faster*, said once as a person would say it and once
 * as a figure. A band whose quote and whose statistics are about different
 * things is two bands sharing a background.
 *
 * ## The logo is a node and it is one
 *
 * `loom.logo` outside a `loom.logo-cloud` is an ordinary leaf — the cloud is
 * the arrangement, not the container something has to be inside (0054). It sits
 * above the quote rather than beside the attribution because a reader scanning
 * the band should get *who* before *what they said*, and because it is the one
 * element here a reader may recognise without reading anything.
 *
 * ## The names
 *
 * Invented, and visibly so. A starting composition that shipped a real
 * company's name and a fabricated quote from a named employee would be a lie
 * this library put on a host's page for them, which is a different kind of
 * placeholder from `Overture` in the footer. Every band in this catalogue that
 * attributes words to a person uses a name that cannot be mistaken for one.
 */
const RESULTS = [
  { value: "2 days", label: "Median time to merge", caption: "Down from four" },
  { value: "3×", label: "More changes reviewed", caption: "Same size team" },
] as const

export const proofStoryBand: Composition = {
  id: "proof-story",
  part: "proof",
  label: "Proof, one customer story",
  promise:
    "A band under the hero with one named customer's quote on one side and two of their results on the other.",
  rationale:
    "A customer story is a loom.quote beside a pair of loom.stat figures, under the customer's loom.logo, in a loom.grid. The quote, each figure and the link out are separate nodes, so a second result can be added or the link dropped without rebuilding the band.",
  uses: ["loom.section", "loom.grid", "loom.stack", "loom.logo", "loom.quote", "loom.stat", "loom.link"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "surface", width: "wide", eyebrow: "Customer story" },
      children: [
        buildElement(ids, {
          type: "loom.grid",
          props: { columns: "two", gap: "roomy", align: "center" },
          children: [
            buildElement(ids, {
              type: "loom.stack",
              props: { direction: "column", gap: "normal", align: "start" },
              children: [
                buildElement(ids, {
                  type: "loom.logo",
                  props: { name: "Meridian Health" },
                }),
                buildElement(ids, {
                  type: "loom.quote",
                  props: {
                    emphasis: "feature",
                    quote:
                      "We went from four days to two on the median change, and nobody had to learn a new tool to do it. The reviews are the same reviews — they just stopped waiting on somebody to open them.",
                    author: "Priya Raghunathan",
                    role: "VP Engineering, Meridian Health",
                  },
                }),
              ],
            }),
            buildElement(ids, {
              type: "loom.stack",
              props: { direction: "column", gap: "loose", align: "start" },
              children: [
                ...RESULTS.map((result) =>
                  buildElement(ids, {
                    type: "loom.stat",
                    props: { value: result.value, label: result.label, caption: result.caption },
                  })
                ),
                buildElement(ids, {
                  type: "loom.link",
                  props: { href: "/customers/meridian", tone: "accent" },
                  children: [buildText(ids, "Read how they did it")],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
}
