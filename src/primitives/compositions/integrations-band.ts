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
          props: { rings: "two", guides: "dashed" },
          children: [
            buildSlot(ids, "mark", [buildElement(ids, { type: "loom.logo", props: { name: "Overture" } })]),
            ...TOOLS.map((tool) => buildElement(ids, { type: "loom.logo", props: { name: tool } })),
          ],
        }),
      ],
    }),
}
