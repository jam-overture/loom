import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The same three plans, drawn as a matrix instead of as cards.
 *
 * `pricing-band` is three `loom.tier` cards, each holding its own five-row perk
 * list. This is one `loom.comparison-table` whose columns are the plans and
 * whose rows are the capabilities. Identical information, and a genuinely
 * different reading: cards are read **down** — *what do I get for $24* — and a
 * matrix is read **across** — *which of these three has single sign-on.*
 *
 * A page with three plans and five perks wants the cards. A page with three
 * plans and fourteen capabilities wants this, because fourteen rows repeated in
 * three cards is the same sentence written three times and a reader comparing
 * two plans has to hold one card in their head while they read the other.
 *
 * ## Why it is a second design and not a prop on the first
 *
 * This is the clearest case in the catalogue, and worth writing down because it
 * is the one a future run will be tempted to collapse. A `layout: "cards" |
 * "matrix"` prop on `loom.tier-table` would render both of these, and it would
 * be wrong by 0052 on the plainest reading of the rule: **the two build
 * different sets of nodes.** Cards are `loom.tier` holding `loom.perk-list`
 * holding `loom.perk-list-item`; the matrix is `loom.comparison-row` holding
 * `loom.comparison`. There is no `configure` from one to the other, because
 * there is no node in the first that corresponds to a node in the second. A
 * prop that would have to delete forty nodes and build thirty-eight others is
 * `remove` and `insert` wearing a prop's clothes.
 *
 * ## The price row is a row, and the button row is a row
 *
 * Both are `loom.comparison-row`s like any other, with `loom.comparison` cells
 * carrying text rather than a `mark`. `loom.comparison`'s schema allows exactly
 * this — *omit it for a cell whose whole answer is its text: a price, a count,
 * a caveat* — so the price band and the calls to action are ordinary rows a
 * model can move, and not a header the primitive special-cases.
 *
 * The consequence worth knowing: **the buttons are at the bottom.** In the card
 * design each button is pinned to the foot of its own card, which is better
 * when there are five rows. Here a reader who has scrolled fourteen
 * capabilities arrives at the buttons having just read the thing that decides
 * them, which is better when there are fourteen. Neither is a defect; it is the
 * trade the two designs exist to offer.
 *
 * ## `feature: "second"` and not `first`
 *
 * The steered column is Team, which is the middle plan and the one the card
 * design also badges as popular. Keeping the two designs pointed at the same
 * plan is not a rule the library enforces — it cannot, they are separate
 * subtrees — but a catalogue that recommends different plans depending on which
 * band you dropped is a catalogue with an opinion it did not mean to have.
 */
type Row = {
  readonly heading: string
  readonly note?: string
  /** Three answers, one per plan, in column order. */
  readonly cells: readonly {
    readonly mark?: "yes" | "no" | "partial"
    readonly text?: string
    readonly note?: string
  }[]
}

const PLANS = ["Starter", "Team", "Enterprise"] as const

const ROWS: readonly Row[] = [
  {
    heading: "Per person, per month",
    cells: [{ text: "Free" }, { text: "$24" }, { text: "Let's talk" }],
  },
  {
    heading: "People included",
    cells: [{ text: "Up to 3" }, { text: "Unlimited" }, { text: "Unlimited" }],
  },
  {
    heading: "Connected repositories",
    cells: [{ text: "One" }, { text: "Unlimited" }, { text: "Unlimited" }],
  },
  {
    heading: "History kept",
    cells: [{ text: "30 days" }, { text: "Full" }, { text: "Full", note: "With export" }],
  },
  {
    heading: "Review rules",
    cells: [{ mark: "no" }, { mark: "partial", note: "Up to 20" }, { mark: "yes" }],
  },
  {
    heading: "Held changes need a named approver",
    cells: [{ mark: "no" }, { mark: "yes" }, { mark: "yes" }],
  },
  {
    heading: "Single sign-on",
    cells: [{ mark: "no" }, { mark: "no" }, { mark: "yes" }],
  },
  {
    heading: "Audit log of every decision",
    cells: [{ mark: "partial", note: "90 days" }, { mark: "yes" }, { mark: "yes" }],
  },
  {
    heading: "Self-hosted deployment",
    cells: [{ mark: "no" }, { mark: "no" }, { mark: "yes" }],
  },
  {
    heading: "Support",
    cells: [{ text: "Community" }, { text: "Next business day" }, { text: "Named contact" }],
  },
]

const CALLS: readonly { readonly label: string; readonly href: string; readonly variant: "primary" | "secondary" }[] = [
  { label: "Start free", href: "/start", variant: "secondary" },
  { label: "Start a trial", href: "/start", variant: "primary" },
  { label: "Contact sales", href: "/contact", variant: "secondary" },
]

export const pricingMatrixBand: Composition = {
  id: "pricing-matrix",
  part: "pricing",
  label: "Pricing, as a capability matrix",
  promise: "Three plans as columns and ten capabilities as rows, with the middle plan steered and a button under each.",
  rationale:
    "A pricing matrix is a loom.comparison-table whose columns region names the plans and whose children are a loom.comparison-row per capability. The price and the buttons are ordinary rows rather than a header the primitive special-cases, so any of them can be moved or dropped on its own.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.comparison-table",
    "loom.comparison-row",
    "loom.comparison",
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
            children: [buildText(ids, "Every capability, and which plan has it")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [
              buildText(ids, "Every plan includes the whole product. What changes is how many of you there are."),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.comparison-table",
          props: {
            feature: "second",
            caption: "The three plans compared on the ten capabilities teams ask about.",
            density: "tight",
          },
          children: [
            /**
             * The subjects go in a `loom.comparison-row` *inside* the slot, not
             * as bare cells in it — `comparison-band.ts` learned that from a
             * screenshot showing every mark one column right of its heading,
             * and the note there is worth reading before editing this.
             */
            buildSlot(ids, "columns", [
              buildElement(ids, {
                type: "loom.comparison-row",
                props: {},
                children: PLANS.map((plan) =>
                  buildElement(ids, {
                    type: "loom.comparison",
                    props: { role: "subject" },
                    children: [buildText(ids, plan)],
                  })
                ),
              }),
            ]),
            ...ROWS.map((row) =>
              buildElement(ids, {
                type: "loom.comparison-row",
                props: { heading: row.heading, ...(row.note === undefined ? {} : { note: row.note }) },
                children: row.cells.map((cell) =>
                  buildElement(ids, {
                    type: "loom.comparison",
                    props: {
                      ...(cell.mark === undefined ? {} : { mark: cell.mark }),
                      ...(cell.note === undefined ? {} : { note: cell.note }),
                    },
                    children: cell.text === undefined ? [] : [buildText(ids, cell.text)],
                  })
                ),
              })
            ),
            buildElement(ids, {
              type: "loom.comparison-row",
              props: {},
              children: CALLS.map((call) =>
                buildElement(ids, {
                  type: "loom.comparison",
                  props: {},
                  children: [
                    buildElement(ids, {
                      type: "loom.action",
                      props: { href: call.href, variant: call.variant, scale: "medium" },
                      children: [buildText(ids, call.label)],
                    }),
                  ],
                })
              ),
            }),
          ],
        }),
      ],
    }),
}
