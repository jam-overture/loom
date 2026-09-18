import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Six answers already on the page, in a grid, with nothing to open.
 *
 * `faqBand` is a column of `<details>`. This is six cards whose answers are
 * simply *there*, and the difference between them is not decoration — it is the
 * claim the band makes about how much there is to read.
 *
 * A disclosure list says **there is a lot here, pick the one that is yours**.
 * It is right when the answers are long, when a reader has one specific worry,
 * and when a wall of prose would bury the questions that are not theirs. A grid
 * of open answers says **this is all of it, and it is short** — which is the
 * stronger thing to say when it is true, because a shut disclosure is a small
 * tax a reader pays before knowing whether the answer was worth the click.
 *
 * Neither is better and the catalogue holds both for that reason. What decides
 * it is the length of the answers, which is why the copy here is deliberately
 * shorter than `faqBand`'s: two sentences fits a card, and five would not.
 *
 * ## Why this is a design and not a `configure`, which is genuinely close here
 *
 * `loom.faq-list` already takes `columns: "one" | "two"`, so *the FAQ in two
 * columns* is one `configure` away and shipping it as a second entry would be
 * exactly what [0162](../../../decisions/0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)
 * refuses. This band is not that. It builds a **different set of nodes** — a
 * `loom.grid` of `loom.card`, each holding a `loom.heading` and a `loom.prose`,
 * where the canonical builds a `loom.faq-list` of `loom.faq` — and what changes
 * for a reader is not the column count but whether there is anything to click.
 *
 * The test of 0162 is *does changing this change the set of nodes?*, and here it
 * plainly does: there is no `<details>` in the output at all. The two-column
 * variant of the canonical remains one `configure`, and is still the right way
 * to get it.
 *
 * ## What it gives up, said plainly
 *
 * A question is a `loom.faq` in the canonical band: one node carrying both
 * halves, with the disclosure state as a prop. Here a question is three nodes —
 * the card, its heading, its answer — which is [0052](../../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
 * over-decomposition cost paid on purpose, and it buys the thing the canonical
 * cannot reach: *make the third answer's second sentence a link* is an operation
 * here and is unreachable against a `answer` prop.
 *
 * It also gives up the disclosure's own accessibility, which is not nothing —
 * `<details>` is a named, operable, scripting-free widget and a card is a box.
 * The exchange is fair only because nothing here is hidden, so there is no state
 * for a reader to need told about.
 *
 * ## Six, not five
 *
 * `faqBand` ships five because a column of five is a shape. A grid wants a
 * multiple of two and of three so it is a full rectangle at every width this
 * library photographs — three across at 1280px, two at a tablet, one at 390px —
 * and a ragged last row in a starting composition reads as a band that lost
 * something rather than as a band that has six answers.
 */
type Answer = { readonly question: string; readonly answer: string }

const ANSWERS: readonly Answer[] = [
  {
    question: "How long does setup take?",
    answer: "Connect a repository and the first board builds itself. Most teams see something worth looking at inside ten minutes.",
  },
  {
    question: "Can we bring our data?",
    answer: "Yes, from a CSV or from the tools you already use. Dates and authors arrive as they were, not stamped with the day you imported.",
  },
  {
    question: "Who can see what?",
    answer: "Permissions follow the repository. Someone who cannot read the code cannot read the board attached to it.",
  },
  {
    question: "What if we cancel?",
    answer: "Export everything at any time, including while cancelled, in a format something else can actually read.",
  },
  {
    question: "Is there a free plan?",
    answer: "Up to five people, with no card and no expiry. It is the paid product with the seat count turned down.",
  },
  {
    question: "Who answers support?",
    answer: "The people who build it, in the same queue as everyone else. Paid plans get a response time in writing.",
  },
]

export const faqGridBand: Composition = {
  id: "faq-grid",
  part: "faq",
  label: "FAQ, answers open",
  promise: "Six questions in a grid of cards, with every answer already on the page.",
  rationale:
    "An open FAQ is a loom.grid of loom.card, each holding a loom.heading for the question and a loom.prose for the answer. Nothing is a disclosure, so nothing is hidden, and each half of each question is its own node.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.grid", "loom.card"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", anchor: "faq" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true, align: "center" },
            children: [buildText(ids, "Questions people ask before they start")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted", align: "center" },
          children: [buildText(ids, "If yours is not here, the contact band below reaches a person who can answer it.")],
        }),
        buildElement(ids, {
          type: "loom.grid",
          props: { columns: "three", gap: "loose", align: "stretch" },
          children: ANSWERS.map((entry) =>
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "surface", padding: "loose" },
              children: [
                buildElement(ids, {
                  type: "loom.heading",
                  props: { level: 3 },
                  children: [buildText(ids, entry.question)],
                }),
                buildElement(ids, {
                  type: "loom.prose",
                  props: { tone: "muted", size: "small" },
                  children: [buildText(ids, entry.answer)],
                }),
              ],
            })
          ),
        }),
      ],
    }),
}
