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
 *
 * ## The tiles arrive one row at a time, and nothing here declares an order
 *
 * Each tile is inside a `loom.reveal`, which is the first use of that primitive
 * anywhere in the catalogue and the reason it was written
 * ([0174](../../../decisions/0174-a-band-wears-the-treatment-its-own-content-earns.md)).
 * A reveal around the *grid* would fade six tiles in together, which is one
 * thing happening; a reveal around *each tile* gives every tile a view timeline
 * of its own, so the second row arrives when the second row is reached. On a
 * phone, where the same six tiles are one column, they arrive one at a time —
 * the same markup, a different cascade, and nothing measured a viewport to get
 * it (0008).
 *
 * **This band earns it and most bands do not.** A cascade says *these are
 * peers, and here they come*; a band whose children are not peers has no
 * sequence to stagger, and a treatment on every band is a treatment that says
 * nothing. Six interchangeable tiles is the case 0174's first clause is about.
 *
 * **What it costs is six wrapper nodes, and what it buys is that they are
 * nodes.** A tile that should not move is one `remove` — of the reveal, not of
 * the tile — which is the same bargain the rest of this catalogue makes and the
 * reason a `stagger` prop on the grid would have been worse than a node each.
 * It is also six nodes against the grammar budget
 * ([0014](../../../decisions/0014-the-reply-schema-must-fit-a-grammar-budget.md)),
 * which is the honest cost and is why this is not done to every grid band in
 * the catalogue.
 *
 * `loom.reveal` gained a line the day this shipped: a wrapper between a grid
 * and its cell has to be transparent to stretching or the row's short cards end
 * above its tall ones. Nothing had put a reveal inside an arranger before, so
 * nothing had found it.
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
  part: "features",
  label: "Feature grid",
  promise: "A titled band with a lead sentence over six feature tiles that wrap to the width and arrive row by row as the reader reaches them.",
  rationale:
    "A feature band is a loom.section carrying the title in its heading slot and a loom.feature-grid holding one loom.feature per claim, each inside a loom.reveal so it arrives as the reader scrolls to it. Each tile is a node, so a feature can be added, dropped or reordered on its own, and a tile that should not move is one node removed.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.feature-grid", "loom.reveal", "loom.feature"],
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
              type: "loom.reveal",
              props: { motion: "rise" },
              children: [
                buildElement(ids, {
                  type: "loom.feature",
                  props: { icon: feature.icon, title: feature.title, body: feature.body, surface: "card" },
                }),
              ],
            })
          ),
        }),
      ],
    }),
}
