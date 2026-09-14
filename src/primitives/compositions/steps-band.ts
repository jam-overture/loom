import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * How it works, in three numbered moves laid across the page.
 *
 * The nine original bands could say what a product *is* (`features`), what it
 * has done (`metrics`), who likes it (`testimonials`) and what it costs
 * (`pricing`). None of them could say **what happens next**, which is the band a
 * visitor who is already convinced actually reads.
 *
 * ## Why `loom.milestone-row` rather than a grid of cards
 *
 * Three cards in a `loom.grid` say *three things*. A milestone row says *three
 * things in order*, because it draws the rail between them — and sequence is
 * the entire content of this band. The two are the same three children in two
 * arrangements, which is what [0054](../../../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)'s
 * naming rule is about, and choosing the one that carries the ordering is the
 * whole editorial decision this composition makes on a page author's behalf.
 *
 * ## The markers are words, not an automatic count
 *
 * `marker: "01"` is authored on each step. Nothing numbers them, deliberately:
 * a render is a total pure projection of one node
 * ([0008](../../../decisions/0008-the-renderer-is-a-total-pure-projection.md)),
 * so no milestone can know it is the second of three, and a container that
 * numbered its children would be the cross-child read that record forbids.
 *
 * The honest consequence, stated because somebody will meet it: **inserting a
 * step between the first and second leaves the markers wrong**, and that is a
 * `configure` on each of the two that follow. It is the cost of the ordering
 * being visible in the content rather than implied by position, and the same
 * trade a numbered list in prose makes.
 *
 * ## `state`, and why every step here is `done`
 *
 * `loom.milestone` carries `done | current | planned`, which is for a roadmap
 * rather than for a process. A "how it works" band describes what the *reader*
 * will do, so none of the three is in progress and marking one `current` would
 * be a claim about a visitor nobody has met. Left at the default.
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

export const stepsBand: Composition = {
  id: "steps",
  label: "How it works",
  promise: "Three numbered steps laid across the page, with a rail running between them.",
  rationale:
    "A process band is a loom.milestone-row holding a loom.milestone per step, under a loom.section with its own heading. The row is chosen over a grid because it draws the rail, and sequence is the content of this band.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.milestone-row", "loom.milestone"],
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
          type: "loom.milestone-row",
          props: { rail: "line" },
          children: STEPS.map((step) =>
            buildElement(ids, {
              type: "loom.milestone",
              props: { marker: step.marker, title: step.title, body: step.body },
            })
          ),
        }),
      ],
    }),
}
