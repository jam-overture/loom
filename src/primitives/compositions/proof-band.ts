import type { IdFactory } from "../../ids.js"
import { buildElement } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The quiet row under the hero: who else uses this.
 *
 * Six `loom.logo` nodes and a label. It is the smallest band in the catalogue
 * and it is here because of what it does to the band above it — a hero
 * followed immediately by a feature grid reads as a claim followed by more
 * claims, and the same hero followed by six names reads as a claim with
 * something behind it.
 *
 * ## Names, not images
 *
 * `loom.logo` takes an optional `image` and falls back to a wordmark drawn from
 * the name. The wordmark is what ships, for the reason the hero has no
 * screenshot: a starting composition cannot carry an asset, and a band that
 * arrived with six broken images would be worse than one that arrived with six
 * words. It also happens to be the honest default — a customer's logo is a
 * thing a deployment has permission to use and a library does not.
 *
 * The names are ordinary company-shaped words with no owner. A real one here
 * would be this library putting a false customer claim into a tree that a page
 * may publish before anyone re-reads it, which is a different kind of mistake
 * from a placeholder that looks like a placeholder.
 *
 * ## Why the label is a prop and the names are nodes
 *
 * Straight 0052. There is exactly one line above the row, so it is
 * `logo-cloud`'s `label` prop; there are however-many names in it, so each is a
 * node that can be inserted, removed and moved on its own. A `names: string[]`
 * prop would be `insert` and `remove` in a prop bag, and adding a seventh
 * customer would rewrite the whole row as one unreadable `configure`.
 */
const CUSTOMERS = ["Northwind", "Kestrel", "Aperture Labs", "Meridian", "Halcyon", "Blackpine"] as const

export const proofBand: Composition = {
  id: "proof",
  label: "Logo wall",
  promise: "A quiet row of six customer names under a single line of introduction.",
  rationale:
    "Social proof is a loom.logo-cloud with one loom.logo per name. The introducing line is the container's own prop because there is exactly one of it; the names are nodes because a page adds and drops them one at a time.",
  uses: ["loom.section", "loom.logo-cloud", "loom.logo"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide" },
      children: [
        buildElement(ids, {
          type: "loom.logo-cloud",
          props: { label: "Trusted by teams at", align: "center" },
          children: CUSTOMERS.map((name) => buildElement(ids, { type: "loom.logo", props: { name } })),
        }),
      ],
    }),
}
