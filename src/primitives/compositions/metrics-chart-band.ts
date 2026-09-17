import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The numbers band with the number moving: one measure, six months of it.
 *
 * ## The gap this closes is not a missing primitive, it is an unreachable one
 *
 * `docs/primitive-gap-inventory.md` called a figure drawn from numbers *"the
 * single largest hole"* in the library, and `loom.stat-chart` closed it on #289
 * with a doc comment that says exactly what the hole was:
 *
 * > A page could say *"99.9% uptime"* and could not say *"here is uptime over
 * > six months"*, which is the single most common thing a metrics band on a
 * > product page does.
 *
 * The primitive shipped and **no band in the catalogue used it.** Twenty-three
 * designs, one of them a metrics band, and that one is four flat figures in a
 * `loom.stat-grid`. So the answer to the largest hole was reachable only by
 * someone who already knew the type existed and wrote nine nodes by hand —
 * which is the *phrasebook's* half of the same complaint the composition layer
 * was built to answer. This band is the primitive's entry in the phrasebook.
 *
 * ## Why it is a design and not a `configure` of `metrics`
 *
 * This is the one pair in the catalogue where 0162's bar is genuinely close,
 * and it is worth being exact rather than confident.
 *
 * `loom.stat-chart` and `loom.stat-grid` take **the same children** — that is
 * 0054 working, and `loom.stat-chart`'s own header advertises it: *"re-plotting
 * a metrics band is one `configure` on the container and no change to the
 * numbers at all."* Read only that far and this band is a `configure` of
 * `metrics` and does not belong here.
 *
 * It is not, and the reason is what the children have to carry. A plotted child
 * needs a `magnitude` or it draws nothing, and the canonical metrics band's
 * four figures are `12k+`, `99.98%`, `4 min` and `40+` — **four different
 * units, none of them on one scale**, and no ceiling exists that plots them
 * together. Turning that band into this one is not a `configure` of the
 * container; it is six new children replacing four, with a different subject
 * (*one measure over time* rather than *four facts about now*), which is
 * `remove` and `insert` by any reading of 0052.
 *
 * Put the other way round: the sentence `loom.stat-chart` advertises is true of
 * a grid whose children are **already one series**, and the reason to keep both
 * bands is that a marketing page wants both kinds of claim.
 *
 * ## The axis stops at 100 and is authored, which is the editorial choice
 *
 * `max` is a prop because nothing can compute it — a render is a total pure
 * projection of one node (0008), so the container cannot read its children —
 * and `loom.stat-chart` argues that being forced to state it is a feature:
 * where the axis stops is what decides whether a rise looks steep or gentle.
 * Stated here at `100` because the series is a percentage and a percentage's
 * ceiling is not a matter of opinion. **A band that plots revenue has to think
 * about this**, and that is the right place for the thought to happen.
 *
 * ## The numbers are modest and they agree with the rest of the catalogue
 *
 * The series ends at 96%, which is the figure `hero-split` puts on a meter in
 * its product surface. That is deliberate: a host who drops in both bands gets
 * a page whose two claims are the same claim, and a starting point that is
 * internally consistent is worth more than one whose numbers were each invented
 * alone. The rise is steady rather than a hockey stick for the reason
 * `hero-split` gives about its own figures — a starting point somebody edits
 * should model good numbers, not impressive ones.
 */
const SERIES = [
  { value: "58%", label: "Apr", magnitude: 58 },
  { value: "66%", label: "May", magnitude: 66 },
  { value: "71%", label: "Jun", magnitude: 71 },
  { value: "80%", label: "Jul", magnitude: 80 },
  { value: "88%", label: "Aug", magnitude: 88 },
  { value: "96%", label: "Sep", magnitude: 96 },
] as const

export const metricsChartBand: Composition = {
  id: "metrics-chart",
  part: "metrics",
  label: "Metrics, one measure plotted",
  promise: "A band plotting one measure across six months as columns, with each month's figure written on it.",
  rationale:
    "A trend band is a loom.stat-chart holding one loom.stat per point, each carrying the magnitude that gives it a height. Every point is a node, so a seventh month is one insert and the series can be re-plotted as a grid with one configure on the container.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.stat-chart", "loom.stat"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "surface", width: "wide", eyebrow: "Measured" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Nearly everything gets read before it lands")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted" },
          children: [
            buildText(
              ids,
              "Share of changes that a person approved before they reached the main branch, across every repository we track."
            ),
          ],
        }),
        buildElement(ids, {
          type: "loom.stat-chart",
          props: { max: 100, plot: "standard" },
          children: SERIES.map((point) =>
            buildElement(ids, {
              type: "loom.stat",
              props: { value: point.value, label: point.label, magnitude: point.magnitude },
            })
          ),
        }),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "small", tone: "muted" },
          children: [buildText(ids, "Six months to September. The axis stops at 100%.")],
        }),
      ],
    }),
}
