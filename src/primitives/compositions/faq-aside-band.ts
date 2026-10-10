import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The questions, with the way out standing beside them rather than after them.
 *
 * ## What the part could not offer before this
 *
 * `faq` is a column of disclosures at a reading measure. `faq-grid` is the same
 * content with every answer already open, in cards. Both are **the questions
 * and nothing else** — a reader whose question is not among them reaches the
 * end of the band and the next band is the closing call to action, which is the
 * page asking for a decision from somebody who just failed to get an answer.
 *
 * The thing neither design has is a region for *the question we did not
 * anticipate*. That is not a prop on either of them and could not be: it is a
 * heading, a sentence and a control, which is three nodes, so by 0052 it is
 * structure. This band is the two of them side by side.
 *
 * ## Why it is a third design and not a `configure` of the first
 *
 * `compositions.test.ts` holds that every alternate design differs from its
 * canonical in the **set of nodes** it builds, and the rule is the one that
 * matters here rather than a formality to satisfy: the aside is a
 * `loom.card` holding a `loom.heading`, a `loom.prose` and a `loom.action`,
 * inside the `end` region of a `loom.split`. None of those four types appears
 * in `faq` at all. There is no sequence of `configure` operations against a
 * `loom.faq-list` that produces them, which is the test 0162 actually sets.
 *
 * ## The ratio, and the one thing it is working around
 *
 * `start-wide` (62/38) rather than `even`: a disclosure is a line of running
 * text and an aside is a label and a button, so an even split would set the
 * questions at half the page and leave the card with more room than it has
 * anything to put in. 62/38 is the widest the primitive currently offers
 * — `loom.split`'s `ratio` has three members and the roomiest asymmetric one is
 * this — and the aside is still a little wider than a designer would draw it.
 * That gap is the one filed from `primitives-55` about a fourth member, and it
 * is a prop rather than a structure, so this band takes the best of three and
 * is one `configure` from the fourth if it ever lands.
 *
 * ## Why the questions keep the reading measure and the list keeps one column
 *
 * `faq-list` takes `width` and `columns`, and inside a 62% column the right
 * answers are `full` and `one`. This is the near-miss the granularity doc warns
 * about read from the other side: `columns: "two"` here would be a floor fed to
 * `auto-fit` inside a column that is already narrow, so it would collapse back
 * to one at every width this band is ever drawn at and the prop would be a lie
 * the page tells about itself. `width: "full"` because the split has already
 * done the measuring — a `readable` inside a 62% column measures twice and
 * leaves the band ragged against the aside.
 *
 * ## The anchor belongs to the part
 *
 * `#faq`, the same as both other designs, because a nav link written against
 * the canonical has to keep working when a host swaps this one in. Asserted
 * for every part in `compositions.test.ts`.
 */
type Question = { readonly question: string; readonly answer: string; readonly open?: boolean }

const QUESTIONS: readonly Question[] = [
  {
    question: "Does it change anything without asking?",
    answer:
      "No. Every change arrives as a diff against the page as it stands, with the reasoning that produced it attached, and nothing is written until somebody approves it. The policy decides which changes need a person and which do not.",
    open: true,
  },
  {
    question: "What happens to a change we approved and then regretted?",
    answer:
      "It comes back out. Every change is stored as the operations that made it, so the inverse is computed rather than remembered, and reverting one does not revert the ones after it.",
  },
  {
    question: "Does this replace the people who build our pages?",
    answer:
      "It replaces the half-hour of moving a button and re-deploying to see it. The judgement about whether the button should move is still a person's, which is why the approval step is not optional.",
  },
  {
    question: "Can we use our own components?",
    answer:
      "Yes. A primitive is a React component, a props schema and a description, and the starter library is a set to choose from rather than a set you have to ship. A deployment registers the slice it wants and its own alongside.",
  },
  {
    question: "What does it cost us on every page view?",
    answer:
      "Nothing. Interpretation happens when somebody asks for a change, not when a reader arrives — a page that nobody is editing is a tree rendered from a store, with no model anywhere near it.",
  },
]

export const faqAsideBand: Composition = {
  id: "faq-aside",
  part: "faq",
  label: "FAQ, with a way out beside it",
  promise: "Five questions down the wide side, with a card offering a person to ask standing beside them.",
  rationale:
    "A questions band with an aside is a loom.split holding the loom.faq-list in its start region and a loom.card in its end region. The card's heading, sentence and action are nodes rather than props on the list, so the offer can be rewritten, linked elsewhere or dropped without touching a single question.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.split",
    "loom.faq-list",
    "loom.faq",
    "loom.card",
    "loom.action",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", anchor: "faq" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Questions people ask before they start")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.split",
          props: { ratio: "start-wide", align: "start" },
          children: [
            buildSlot(ids, "start", [
              buildElement(ids, {
                type: "loom.faq-list",
                props: { columns: "one", width: "full" },
                children: QUESTIONS.map((entry) =>
                  buildElement(ids, {
                    type: "loom.faq",
                    props: {
                      question: entry.question,
                      answer: entry.answer,
                      ...(entry.open === true ? { open: true } : {}),
                    },
                  })
                ),
              }),
            ]),
            buildSlot(ids, "end", [
              buildElement(ids, {
                type: "loom.card",
                props: { tone: "surface", padding: "loose" },
                children: [
                  buildElement(ids, {
                    type: "loom.heading",
                    props: { level: 3 },
                    children: [buildText(ids, "Still not the question you came with?")],
                  }),
                  buildElement(ids, {
                    type: "loom.prose",
                    props: { size: "small", tone: "muted" },
                    children: [
                      buildText(
                        ids,
                        "One of the four of us reads every one of these, and the answer usually arrives the same afternoon."
                      ),
                    ],
                  }),
                  buildElement(ids, {
                    type: "loom.action",
                    props: { href: "/contact", variant: "secondary", scale: "medium" },
                    children: [buildText(ids, "Ask us directly")],
                  }),
                ],
              }),
            ]),
          ],
        }),
      ],
    }),
}
