import { createElement } from "react"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import {
  perkMarker,
  perkProps,
  perkRowStyle,
  perkText,
  PERK_TEXT,
  type PerkProps,
  type PerkTextKey,
} from "./perk-content.js"

/**
 * A perk on its own: a marker, a claim, and an optional clarification, in a
 * `<div>` that belongs to no list.
 *
 * It is the same content model as `loom.perk-list-item` and draws the same
 * thing. The difference is the element, and the element is the point — this is
 * the reassurance under a call to action ("✓ No card required"), the single
 * qualifier beside a price, the one line in a split's column. Those are not
 * lists of one, and marking them up as an `<li>` in no `<ul>` is markup that
 * says something untrue about the page.
 *
 * Both exist because the rename that produced them
 * ([0061](../../decisions/0061-a-suffix-that-names-the-markup-earns-its-place.md))
 * observed that the row inside a list and the line standing alone are the same
 * *content* and different *markup*, and that a library which offers only the
 * `<li>` forces every standalone use to misuse it. What it costs is a model
 * choosing between two names; what makes the choice easy is that each name says
 * where it goes.
 *
 * The content model is shared rather than copied — see `perk-content.ts` — so a
 * fourth state added later cannot land in one of these and miss the other.
 */

export const loomPerk = definePrimitive({
  type: "loom.perk",
  description:
    "A single perk standing on its own — a marker, a claim, and an optional note. Use loom.perk-list-item inside a list.",
  props: perkProps,
  slots: [],
  copy: ["label", "note"],
  text: PERK_TEXT,
  component: ({ loom, props: given }: LoomPrimitiveProps<PerkProps, PerkTextKey>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          ...perkRowStyle(given.state ?? "included"),
          /** Shrink-wraps rather than filling its parent, so it sits inline under a CTA. */
          alignSelf: "flex-start",
        },
      },
      perkMarker(given.state ?? "included", loom.text),
      perkText(given)
    ),
})
