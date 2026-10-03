import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The two columns every page has drawn since the first landing page: what it
 * costs you now, and what changes.
 *
 * ## Why this is a second design of `comparison` and not a new part
 *
 * 0171 makes a part a **region**, and the test is whether two candidates can
 * stand in for each other. This one can: it goes exactly where `comparisonBand`
 * goes, between the price and the quotes, and it answers the same question a
 * reader has there — *against what I have now, is this worth it.* It carries the
 * same `#comparison` fragment for that reason, which is 0165 and is what lets a
 * nav link survive a host swapping one design for the other.
 *
 * What differs is **who the page is arguing against**. The table names two
 * alternatives and marks five criteria against each, which is the band a product
 * with named competitors wants. This one names no competitor at all: the
 * left-hand column is the reader's own Tuesday, and the only subject in the band
 * is the product. Most products cannot write the table — naming a competitor in
 * a marketing page is a decision with a legal department attached — and until
 * now the catalogue had nothing else to offer them.
 *
 * ## `loom.perk` for a claim that is not a feature of a plan
 *
 * The two columns are `loom.perk-list`s, which is the primitive whose own
 * description is *"what a plan includes and what it does not"*. Reading it as a
 * pricing primitive would be reading the content model off its first use. What
 * it actually is is a run of claims each carrying one of three states, and
 * `excluded` renders the ✕ with `Not included` as its accessible name — which is
 * true of the left column in the only sense that matters: with what you have
 * today, these are not included.
 *
 * The alternative was `loom.list` on both sides, and it is worse in the one way
 * that counts. A bulleted list says nothing about whether a row is a cost or a
 * benefit, so the left column would read as five more things you get — and the
 * marker is the only thing in the band doing that work, because the headings
 * above the two cards are four words each.
 *
 * ## The method goes in a popover, and it is the first one in the catalogue
 *
 * A comparison band that shows its working is a comparison band somebody
 * believes. `comparisonBand` does it with `loom.comparison-table`'s `caption`,
 * which is the right answer for a table — a caption belongs to a table. This
 * band has no table, and a paragraph of method set under two columns of claims
 * is a paragraph nobody reads that also dilutes the thing above it.
 *
 * `loom.popover` is the primitive for exactly this and had no band at all: it
 * shipped on 1 October and the 1 October reach measurement is what found it
 * sitting registered and unreachable, which means every deployment was paying
 * for its description in every interpretation request and could not drop one in.
 * Its trigger reads `Details`, which is the primitive's own word (0055) and is
 * the word this use wants — unlike `loom.menu`, whose `Menu` is why that one is
 * still unreachable and is filed rather than forced.
 *
 * It sits **after** the columns rather than beside the heading, because a
 * presentation opens over the page: above the fold of its own band it would drop
 * its panel across the first claim on each side. Below them it opens into the
 * gap before the next band.
 */
const TODAY = [
  "Three tools that each believe something different about what shipped",
  "A copy change that waits on a deploy window",
  "A rollback that is a redeploy, and a guess about which one",
  "Nobody who can say why the page says what it says",
] as const

const INSTEAD = [
  "One page, one record of every change to it, one place to read it",
  "A copy change reviewed in the words of the page and live when approved",
  "Undo computed from the change, so anything on record reverts",
  "Every change carries who asked, what was proposed and who answered",
] as const

/**
 * The sentence the popover holds, and it is deliberately not a disclaimer.
 *
 * A method note that says *results may vary* is a note that costs the band the
 * credibility it was added to buy. What this says is where the left column came
 * from, which is the one thing a reader who presses `Details` is asking.
 */
const METHOD =
  "The left column is the four complaints that came up in every one of nineteen onboarding calls this year, in their words rather than ours. Nothing here is measured against a named product."

export const comparisonWaysBand: Composition = {
  id: "comparison-ways",
  part: "comparison",
  label: "Comparison, the two ways of working",
  promise:
    "Two columns side by side — what it costs you today and what changes — with the method behind them in a panel a reader opens.",
  rationale:
    "A two-ways band is a loom.split holding one loom.card per column, each with its own heading and a loom.perk-list whose rows are loom.perk nodes. Every claim is a node with a state, so a row can be moved between the columns or dropped without rewriting the band, and the method sits in a loom.popover beneath rather than in a paragraph nobody reads.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.split",
    "loom.card",
    "loom.perk-list",
    "loom.perk",
    "loom.stack",
    "loom.popover",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Against what you have", anchor: "comparison" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Two ways to run the same page")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "lead", tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "Neither column is a product. One is how the work goes today in most of the teams we talk to, and the other is what moves once the page itself is the thing under review."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.split",
          props: { ratio: "even", align: "stretch" },
          children: [
            buildSlot(ids, "start", [
              buildElement(ids, {
                /**
                 * `outline` against the other column's `surface`, which is the
                 * quietest way a library with no decorative colour can say
                 * *this one is the one you are leaving*. A tinted left column
                 * would need a ground that reads as negative, and this library
                 * has `accent` and nothing else — a palette's accent is its
                 * good news on every one of the twenty-one starter palettes.
                 */
                type: "loom.card",
                props: { tone: "outline", padding: "loose" },
                children: [
                  buildElement(ids, {
                    type: "loom.heading",
                    props: { level: 3 },
                    children: [buildText(ids, "How it goes today")],
                  }),
                  buildElement(ids, {
                    type: "loom.perk-list",
                    props: { columns: "one", density: "loose" },
                    children: TODAY.map((label) =>
                      buildElement(ids, {
                        type: "loom.perk",
                        props: { label, state: "excluded" },
                      })
                    ),
                  }),
                ],
              }),
            ]),
            buildSlot(ids, "end", [
              buildElement(ids, {
                type: "loom.card",
                props: { tone: "surface", padding: "loose", elevation: "raised" },
                children: [
                  buildElement(ids, {
                    type: "loom.heading",
                    props: { level: 3 },
                    children: [buildText(ids, "How it goes with Overture")],
                  }),
                  buildElement(ids, {
                    type: "loom.perk-list",
                    props: { columns: "one", density: "loose" },
                    children: INSTEAD.map((label) =>
                      buildElement(ids, {
                        type: "loom.perk",
                        props: { label, state: "included" },
                      })
                    ),
                  }),
                ],
              }),
            ]),
          ],
        }),
        buildElement(ids, {
          type: "loom.stack",
          props: { direction: "row", gap: "snug", align: "center", wrap: true },
          children: [
            buildElement(ids, {
              type: "loom.prose",
              props: { size: "small", tone: "muted" },
              children: [buildText(ids, "Four complaints, from nineteen onboarding calls.")],
            }),
            buildElement(ids, {
              type: "loom.popover",
              props: { placement: "below", align: "start", width: "wide" },
              children: [
                buildElement(ids, {
                  type: "loom.prose",
                  props: { size: "small" },
                  children: [buildText(ids, METHOD)],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
}
