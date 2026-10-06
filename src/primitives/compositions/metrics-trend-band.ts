import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The shape of a number over time, read rather than written.
 *
 * ## A fourth design of `metrics`, and the one the other three cannot be
 *
 * The part now has four and they divide cleanly, which is the test that none of
 * them is padding:
 *
 * | band | what it is |
 * | --- | --- |
 * | `metrics` | four authored figures, to be believed |
 * | `metrics-chart` | authored figures **plotted**, so the shape is the claim |
 * | `metrics-live` | four figures **read**, each a labelled socket until it answers |
 * | this | a figure's **shape over time**, read |
 *
 * `metrics-chart` can plot and cannot be current; `metrics-live` is current and
 * cannot plot. The band a product page actually wants — *here is uptime over
 * six months, from the status page* — is the one neither of them is, and it is
 * a different set of nodes from both: `loom.trend` is one node where
 * `metrics-chart` builds a `loom.stat-chart` over six `loom.stat`s, because the
 * points of a read series are an answer's rows and rows are never nodes
 * ([0233](../../../decisions/0233-a-bound-twin-is-earned-by-a-system-of-record-and-a-row-shape-the-primitive-can-declare.md)).
 *
 * Under 0171 the swap loses nothing in any direction — all four are the
 * full-width break of figures that stops a page reading as a list of card
 * bands — so it is a design and `COMPOSITION_PARTS` does not move.
 *
 * ## One plot and one figure beside it, which is not decoration
 *
 * The band is a `loom.trend` and a `loom.tally`, and the pairing is doing work
 * the plot cannot do alone. A chart of twelve columns says *the direction*; the
 * number a reader quotes to their colleague is one figure, and `loom.trend`
 * prints its points from the number with no grouping available — its own header
 * says so and names the remedy:
 *
 * > A chart's column labels are short by nature and the band that needs
 * > `1,200,000` wants a `loom.tally` beside the plot rather than inside it.
 *
 * So that is what this is. Two bindings, two nodes, one claim — and the figure
 * is the one place an adapter may return a formatted string, which is
 * `loom.tally`'s own escape and the reason the limit on the plot is a limit
 * rather than a defect.
 *
 * ## `max` is in the band and that is the editorial decision in it
 *
 * `100` is the default and is right for the percentages most marketing charts
 * plot, and this band states it anyway, because a chart's ceiling is the one
 * number on it that argues: where the axis stops decides whether a rise looks
 * steep or gentle. `loom.trend` will not compute it from the answer for exactly
 * that reason, so the band owns it — and a deployment plotting revenue changes
 * one prop rather than waiting for the primitive to guess.
 *
 * ## It arrives unconnected
 *
 * `feedBand`'s rule, unchanged: a composition naming a source id would make
 * every deployment that had not registered it report a binding it never agreed
 * to make. So this names binding *keys* and no source, and the plot shows its
 * `empty` region — a dashed panel at the height the chart will take, with one
 * line naming what goes in it and the control that connects it.
 */
export const metricsTrendBand: Composition = {
  id: "metrics-trend",
  part: "metrics",
  label: "Metrics, as a shape over time",
  promise:
    "A series read from a connected source and plotted as columns, with the one figure a reader quotes beside it.",
  rationale:
    "A trend a page cannot go stale on is a loom.trend, which reads its whole series from a binding and draws its own columns — so this builds a different set of nodes from the authored chart band, where every point is a loom.stat node. A loom.tally sits beside it because a plot prints its points unformatted by design and the figure a reader repeats is one number. It drops in unconnected, showing the plot's empty region and the control that connects it.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.trend",
    "loom.tally",
    "loom.empty-state",
    "loom.icon",
    "loom.action",
    "loom.split",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "surface", width: "wide", eyebrow: "Record" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Not a number we chose — the shape of the last twelve months")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "Point this at the table the figures already live in. The columns are whatever it answers, so the band is current without anybody remembering to come back and edit it."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.split",
          props: { ratio: "start-wide", align: "center" },
          children: [
            buildElement(ids, {
              type: "loom.trend",
              props: { binding: "uptimeByMonth", max: 100, plot: "tall", suffix: "%" },
              children: [
                buildSlot(ids, "empty", [
                  buildElement(ids, {
                    type: "loom.empty-state",
                    props: {
                      outline: "dashed",
                      align: "center",
                      cause: "empty",
                      stature: "compact",
                    },
                    children: [
                      buildSlot(ids, "media", [
                        buildElement(ids, {
                          type: "loom.icon",
                          props: { shape: "bare", tone: "neutral", size: "medium" },
                          children: [buildText(ids, "▤")],
                        }),
                      ]),
                      buildSlot(ids, "heading", [
                        buildElement(ids, {
                          type: "loom.heading",
                          props: { level: 3 },
                          children: [buildText(ids, "Nothing plotted yet")],
                        }),
                      ]),
                      buildText(
                        ids,
                        "A month and a number per row is all this reads. Everything else in the table is ignored."
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
            buildElement(ids, {
              type: "loom.tally",
              props: {
                binding: "uptimeNow",
                label: "Uptime, rolling 90 days",
                caption: "From your status page",
                suffix: "%",
              },
            }),
          ],
        }),
      ],
    }),
}
