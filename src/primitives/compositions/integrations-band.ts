import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * What it works with, circling what it is.
 *
 * `proofBand` says who uses it. This says **what it plugs into**, which is a
 * different objection from a different reader: the one who believes the product
 * works and does not believe it will work *here*.
 *
 * ## Why `loom.orbit` and not another logo wall
 *
 * A `loom.logo-cloud` of eight marks says *these exist*. An orbit puts a mark in
 * the middle and circles the rest around it, which says *these connect to that*
 * — the relationship is the content, and it is the one thing a row of logos
 * cannot draw. The primitive's own description calls it "the works-with band",
 * so this composition is using it for exactly what it was ported for.
 *
 * ## The centre is a slot and the ring is children
 *
 * `mark` is a region the primitive *places* — dead centre, with the ring sized
 * around it — so by [0051](../../../decisions/0051-a-slot-is-a-region-the-primitive-places.md)
 * it is a slot. The tools are a run of children the primitive arranges, so they
 * are nodes: a ninth integration is an `insert` and the ring re-spaces itself,
 * because the spacing is the orbit's arithmetic rather than anything authored
 * per logo.
 *
 * ## Wordmarks, not images, and the reason is the same one three bands give
 *
 * `loom.logo` falls back to setting the name as a wordmark when it has no
 * `image`, which is what keeps this band complete without shipping eight
 * third-party requests inside a tree a host might publish. It also happens to be
 * the honest thing for a starting composition: these are placeholder names, and
 * a placeholder *logo* would look like a claim about a partnership nobody has.
 *
 * ## What the first photograph of this band in a page changed
 *
 * Three props, and none of the content. Photographed at a page's width on
 * 25 September this was *a ring of words*: eight small grey names on a faint
 * circle, a ninth the same size in the middle, and the dashed guide drawn
 * straight through several of them.
 *
 * - **`surface: "card"` on every tool**, so each mark is a thing on the ring
 *   rather than a word floating over it, and the guide passes behind it.
 * - **`guides: "spokes"`**, which draws the connector from each seat back to
 *   the middle. The relationship is this band's whole claim over a logo wall
 *   and nothing in the picture had ever drawn it.
 * - **`rings: "one"`** rather than two. Eight *plates* alternating between two
 *   radii crowd the hub they are meant to be circling; eight bare words did
 *   not, which is why the band could not have been written this way before the
 *   marks had tiles under them.
 *
 * The middle is not plated, and that is deliberate rather than an omission:
 * `loom.orbit` grounds the region it places
 * ([0192](../../../decisions/0192-a-region-a-primitive-places-is-a-region-it-may-ground.md)),
 * so a plate here would be a tile inside a hub.
 */
const TOOLS = ["GitHub", "Linear", "Figma", "Slack", "Notion", "Vercel", "Sentry", "Stripe"] as const

export const integrationsBand: Composition = {
  id: "integrations",
  part: "integrations",
  label: "Works with",
  promise: "Eight tools circling a mark in the middle, with the centre named.",
  rationale:
    "A works-with band is a loom.orbit holding a loom.logo per tool, with the product's own mark in its centre slot. Each tool is a node, so one can be added or dropped and the ring re-spaces itself.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.orbit", "loom.logo"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", tone: "surface", eyebrow: "Works with", anchor: "integrations" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true, align: "center" },
            children: [buildText(ids, "It reads and writes the things you already keep")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted", align: "center" },
          children: [buildText(ids, "Nothing is migrated and nothing is mirrored. It works where the work already is.")],
        }),
        buildElement(ids, {
          type: "loom.orbit",
          props: { rings: "one", guides: "spokes" },
          children: [
            buildSlot(ids, "mark", [buildElement(ids, { type: "loom.logo", props: { name: "Overture" } })]),
            ...TOOLS.map((tool) =>
              buildElement(ids, { type: "loom.logo", props: { name: tool, surface: "card" } })
            ),
          ],
        }),
      ],
    }),
}
