import type { IdFactory } from "../../ids.js"
import { buildElement } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Four numbers on a surface: the band that changes the page's rhythm.
 *
 * This is the shortest composition in the catalogue and the one with the
 * clearest job. A landing page that is five bands of cards on the same ground
 * reads as a list however good each band is; a full-width surface with four
 * large figures on it is the break, and it is what makes the band after it read
 * as a new argument rather than as more of the last one.
 *
 * ## Why it is a section with a tone, not a bare grid
 *
 * `loom.stat-grid` on the page's own canvas is four numbers floating in the
 * flow. The surface tone is what makes it a band, and it belongs to
 * `loom.section` rather than to the grid for the reason 0054 gives about names:
 * a grid is what it does with its children, and painting a ground is not that.
 *
 * ## Caption, not a second label
 *
 * Each `loom.stat` gets a `value`, a `label` and no caption. The caption exists
 * for the figure that needs a qualifier — "measured over 90 days" — and putting
 * one under every number is how a proof band turns into a footnote. Three of
 * the four here are round enough to stand alone, and the one that would need
 * qualifying is deliberately not in the set: a starting composition should not
 * ship a number that needs defending.
 */
const METRICS = [
  { value: "12k+", label: "Teams shipping weekly" },
  { value: "99.98%", label: "Uptime last quarter" },
  { value: "4 min", label: "Median time to first board" },
  { value: "40+", label: "Tools it reads and writes" },
] as const

export const metricsBand: Composition = {
  id: "metrics",
  label: "Metrics",
  promise: "A full-width surface carrying four large figures with their labels.",
  rationale:
    "Four numbers are four loom.stat nodes in a loom.stat-grid, on a loom.section with the surface tone so the band breaks the page's rhythm. Each figure is a node, so one can be replaced without disturbing the other three.",
  uses: ["loom.section", "loom.stat-grid", "loom.stat"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "surface", width: "wide" },
      children: [
        buildElement(ids, {
          type: "loom.stat-grid",
          props: { columns: "four", align: "center" },
          children: METRICS.map((metric) =>
            buildElement(ids, { type: "loom.stat", props: { value: metric.value, label: metric.label } })
          ),
        }),
      ],
    }),
}
