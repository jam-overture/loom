import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, size, weight } from "./tokens.js"

/**
 * A measured fact about the thing it sits on: a figure and the unit it counts.
 *
 * **Why this exists, and it is 0052 read on three fields nobody thought of as a
 * list.** Hermes' `PropertyListing` holds `beds`, `baths` and `sqft` as three
 * fixed string fields side by side. Read them once and they are three
 * properties; read them twice and they are *the same shape, three times*, which
 * is the definition of repeated content. A listing that wants to say "parking:
 * 2" or "built 1994" or "0.4 acres" cannot, ever, without a developer shipping
 * a fourth field — and that is the wall
 * [`docs/primitive-granularity.md`](../../docs/primitive-granularity.md) says is
 * invisible until a visitor hits it. So they are nodes here: one `insert` each,
 * one `move` each, one inverse each.
 *
 * It is the same call `docs/hermes-port-map.md` makes about
 * `hours-of-operation`'s seven weekday fields, and about `loom.pin` against the
 * `hotspots[]` array it would otherwise have been.
 *
 * **Why it is not `loom.stat`.** Both are a value and a label, and they are two
 * primitives for the reason the port map's collapse rule gives from the other
 * side: *two things that want different markup are two primitives.* A stat is a
 * band's headline — a figure at `size(7)` in the accent, stacked over its label,
 * standing on its own in a row of four. A spec is a detail *attached to
 * something else* — set at reading size, inline, run together with its
 * neighbours behind a middot, and never the loudest thing in its card. Rendering
 * a listing's `1,450 sqft` at stat size would make the specification shout down
 * the price it belongs to. `loom.meter` was separated from `loom.stat` on this
 * same argument.
 *
 * **The separator is this primitive's and not its container's.** A specs row is
 * `3 beds · 2 baths · 1,450 sqft`, and the middots are between siblings, which
 * no render of one node can know (0008). So they are a position selector in
 * `stylesheet.ts` — `.loom-spec + .loom-spec::before` — which is the same
 * mechanism the rail's last dot and the article grid's lead piece use, scoped to
 * a library class so it reaches nothing on the host's page. Putting them on the
 * container instead would mean a spec dropped into a `loom.stack` lost them, and
 * how a primitive is punctuated is part of what that primitive is.
 *
 * Both fields are props rather than children for 0052's other half: there is
 * exactly one figure and exactly one unit, changing either is exactly a
 * `configure`, and a spec whose label had been deleted by a `remove` would still
 * be a valid tree.
 */

const props = z
  .object({
    /**
     * Free text, never parsed — the call `loom.tier` made about `price` and
     * `loom.article` about `kicker`. Hermes' own shape says it: *"all metric
     * fields kept as free-text strings so authors can use whatever conventions
     * they like ("3", "3 BR", "1,200 sf")"*. A number here would refuse
     * `"1,450"`, `"2.5"` and `"Studio"` alike, and force a locale decision onto
     * a primitive with no business making one.
     */
    value: z.string().min(1).max(24),
    /**
     * Optional, and the fixture that found this is the honest argument for it:
     * a studio flat's first specification is `Studio`, a title's is `Freehold`,
     * an appliance's is `A+++`. Each is a fact with no unit to count, and a
     * required label would force the author to invent one — `Studio` *layout* —
     * which is worse writing than the field it satisfies. The figure is the
     * thing; the unit is what the figure is sometimes in.
     */
    label: z.string().min(1).max(40).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomSpec = definePrimitive({
  type: "loom.spec",
  description:
    "One measured fact — a figure and the unit it counts, set inline. Beds, baths, square feet, vCPUs, gigabytes. Runs together with its siblings behind a middot.",
  props,
  slots: [],
  copy: ["value", "label"],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) =>
    createElement(
      "span",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.spec,
        /**
         * Reading size, not display size. `display` and `gap` are in the
         * stylesheet with the separator rule, because an inline value there
         * would beat the rule that draws the middot between two of these.
         */
        style: { fontSize: size(3), lineHeight: 1.4 },
      },
      libraryStylesheet(),
      createElement(
        "span",
        {
          key: "value",
          style: {
            fontFamily: family("heading"),
            fontWeight: weight("heading"),
            color: colour("fg-default"),
          },
        },
        given.value
      ),
      given.label === undefined
        ? null
        : createElement(
            "span",
            {
              key: "label",
              style: { fontFamily: family("body"), color: colour("fg-muted") },
            },
            given.label
          )
    ),
})
