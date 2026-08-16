import { createElement } from "react"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { perkMarker, perkProps, perkRowStyle, perkText, type PerkProps } from "./perk-content.js"

/**
 * One row of a `loom.perk-list`: a marker, a claim, and an optional
 * clarification. An `<li>`, and named for it.
 *
 * Hermes' `PricingTier` shape held these as `features: string[]` — a list of
 * bare strings inside a struct inside a list, which is the case 0052 was argued
 * from at two levels of nesting. Adding one perk to one tier of four was a
 * `configure` replacing the whole tier record; here it is an `insert` of one
 * node into one list, weighed on its own and reversible on its own.
 *
 * The port also gains something Hermes could not express at all. A bare string
 * can only mean "included", so a tier that wanted to show what it *lacks* — the
 * comparison every pricing table is actually making — had to write "No priority
 * support" and hope the reader noticed the "No". `state` makes the three cases
 * three renderings of one node, which is the half of 0052 that keeps a closed
 * set of renderings a prop: swapping a perk from included to excluded is one
 * `configure`, not a remove and an insert that would lose the line's identity
 * and its history.
 *
 * **This shipped as `loom.perk` and was renamed on 16 August** at the
 * maintainer's direction, which [0060](../../decisions/0060-a-suffix-that-names-the-markup-earns-its-place.md)
 * records as `Proposed` because 0054 says "no `-item` suffix, ever". The
 * argument for the rename is that the suffix here is not saying "this belongs
 * to a list" — the tree already says that — but naming the element the
 * primitive *is*. `loom.perk` is now the standalone `<div>`, and the two are
 * different markup for the same content rather than one primitive pretending to
 * be at home in both places.
 */

export const loomPerkListItem = definePrimitive({
  type: "loom.perk-list-item",
  description:
    "One row of a loom.perk-list — a marker, a claim, and an optional note. An <li>; use loom.perk to stand alone.",
  props: perkProps,
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<PerkProps>) =>
    createElement(
      "li",
      { ...loom.editable, style: perkRowStyle(given.state ?? "included") },
      perkMarker(given.state ?? "included"),
      perkText(given)
    ),
})
