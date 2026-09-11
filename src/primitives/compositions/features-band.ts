import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The "what makes this different" band: a titled section over six tiles.
 *
 * `loom.feature-grid` was the second primitive this library shipped and it has
 * never had a heading, correctly — it lays out and nothing else, and a grid
 * that carried its own title could not be put inside a section that had one.
 * What that leaves is the assembly nobody had written down: a `loom.section`
 * whose `heading` slot holds the title, a lead paragraph under it, and the grid
 * beneath both.
 *
 * ## The eyebrow is on the section and the title is a node
 *
 * Both are text a reader sees, so the split looks arbitrary until you ask
 * 0052's question. The eyebrow is one short label, of which a band has exactly
 * one or none, and it is set in the section's own chrome — it is the fixed
 * field. The title is a `loom.heading`, which is a node, because a page moves
 * headings, changes their level, and sometimes puts two paragraphs where one
 * was. `loom.section` already made this call in its slot; the composition just
 * has to honour it.
 *
 * ## Six tiles, not three
 *
 * Three tiles in a `columns: "three"` grid is one clean row and looks like a
 * finished band, which is exactly why the catalogue ships six. A starting
 * composition is a thing someone *edits*, and the second row is what shows the
 * grid wrapping — a person who deletes two tiles learns the band survives it,
 * where a person handed one perfect row learns nothing and finds out on a
 * phone. Six also happens to be the median feature count on a real page.
 *
 * ## Glyphs, not icons
 *
 * `loom.feature`'s `icon` is a single character by design — an icon set is a
 * registry rather than a prop. These are the ones that read at tile size in
 * both starter palettes and carry no brand.
 */
const FEATURES = [
  { icon: "◆", title: "One source of truth", body: "Every change lands in one place, with the reason it was made attached to it." },
  { icon: "⟲", title: "Reversible by default", body: "Anything you can do here you can undo, in one step, without a restore." },
  { icon: "◷", title: "Ready in minutes", body: "Connect a repository and the first board builds itself from what is already there." },
  { icon: "⛨", title: "Reviewed before it lands", body: "Rules you write decide what goes straight through and what waits for a person." },
  { icon: "◫", title: "Works with what you have", body: "Read and write through the tools your team already opens every morning." },
  { icon: "◎", title: "Answers, not dashboards", body: "Ask what changed this week and get the change, not a chart of it." },
] as const

export const featuresBand: Composition = {
  id: "features",
  label: "Feature grid",
  promise: "A titled band with a lead sentence over six feature tiles that wrap to the width.",
  rationale:
    "A feature band is a loom.section carrying the title in its heading slot and a loom.feature-grid holding one loom.feature per claim. Each tile is a node, so a feature can be added, dropped or reordered on its own.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.feature-grid", "loom.feature"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { eyebrow: "Why teams switch", width: "wide", anchor: "features" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "The parts you were going to build yourself")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "lead", tone: "muted", measured: true },
            children: [buildText(ids, "Six things that are true on the first day, not after a quarter of setup.")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.feature-grid",
          props: { columns: "three", density: "loose" },
          children: FEATURES.map((feature) =>
            buildElement(ids, {
              type: "loom.feature",
              props: { icon: feature.icon, title: feature.title, body: feature.body, surface: "card" },
            })
          ),
        }),
      ],
    }),
}
