import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ABOVE_BACKDROP, backdropLayers, PAINT_NAMES } from "./backdrop.js"
import { libraryStylesheet } from "./stylesheet.js"
import { radius } from "./tokens.js"

/**
 * Atmosphere behind whatever is put inside it: drifting colour, a ruled ground,
 * beams, or one pool of light.
 *
 * ## The gap this closes, which three runs looked for and missed
 *
 * `loom.hero` has had a `backdrop` prop since the first week, and **for
 * eighty-nine primitives it was the only thing on a Loom page that could paint
 * anything behind its content.** Everything else got one of three flat washes
 * off `loom.section`'s `tone`. So a page's first screen looked like a product
 * and the eight bands under it looked like a document, which is the exact
 * failure the maintainer's brief names — *"when we demo this it really needs to
 * pop"* — and it is not visible from `docs/hermes-port-map.md`, because
 * atmosphere is not a Hermes content model and the ledger only counts those.
 *
 * Three consecutive runs read the breadth mandate as *find a ninetieth content
 * model* and each came back with a definition list. The range that was actually
 * missing was a **surface**, not a shape.
 *
 * ## Why a wrapper rather than a prop on every band
 *
 * This is [0110](../../decisions/0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md)'s
 * argument, and that record asks its next member to be argued against it rather
 * than invented beside it, so: the alternative was `backdrop` on `loom.section`,
 * `loom.split`, `loom.mosaic`, `loom.tier-table` and everything else a band can
 * be. That is a prop on seventy schemas to say one thing — the cost
 * [0014](../../decisions/0014-the-reply-schema-must-fit-a-grammar-budget.md)
 * keeps naming — and it would still be unreachable for the band nobody thought
 * to give it to, **including every primitive a host registers itself**. A
 * wrapper says it once, works on anything, and comes off with a `remove`
 * instead of a hunt for the prop that turns it off.
 *
 * It also puts atmosphere where a page actually wants it, which is rarely
 * around exactly one band: a backdrop can hold three sections at once so the
 * light runs behind all of them, and no prop on a band can express that.
 *
 * ## Why `loom.hero` keeps its own prop anyway
 *
 * A hero's paint has to sit *inside* the hero's padding and be clipped by the
 * hero's own edges, and a wrapper is outside both. Widening the hero's enum to
 * this same vocabulary — which this run did — gets the five paints everywhere
 * without a second implementation: both read `backdrop.ts`. Removing the hero's
 * prop would break every stored tree that uses it for nothing.
 *
 * ## What the tree may say
 *
 * Which paint, and how the painted area is cornered. Not a colour (0049 — the
 * paints read palette slots, so re-theming a page re-themes its atmosphere),
 * not a duration, delay or easing (0055), and not an opacity, which is the
 * "tune it a bit" prop that would turn a reviewable choice into a number nobody
 * reads in a proposal.
 *
 * **There is no `none`.** A backdrop painting nothing is a node that draws
 * nothing, and `remove` says that better than `configure` does — the same
 * reason the paint list has no "subtle aurora" beside its aurora.
 *
 * ## What it cannot do, stated rather than half-done
 *
 * **It cannot bleed past its own box.** A backdrop clips to itself, so the
 * full-width glow behind a `width: "readable"` section is a backdrop placed
 * around that section's *parent*, not a prop on this one. Nothing in a render
 * reads a viewport or a page width (0008), so there is no honest way to express
 * "wider than me" here.
 *
 * **It is one paint, not two.** Beams over a lattice is a real look and it is
 * two nested backdrops, which works and costs a node. A `paints: []` array
 * would be a list wearing a prop's clothes.
 */

const props = z
  .object({
    /**
     * Five genuinely different renderings, not five shades of one — the test in
     * `backdrop.ts` is that a reader tells them apart at a glance. Changing it
     * changes no node, which is the granularity doc's sharper question, so it
     * is a prop rather than a delta in disguise.
     *
     * **Two of the five have a minimum height and the description says which.**
     * `grid` and `dots` are ruled at a stride measured in `rem`, so a band that
     * is not a few strides tall has nothing to rule; `aurora`, `rays` and
     * `spotlight` are written in the box's own units and hold at any aspect
     * ([0196](../../decisions/0196-a-paint-is-sized-by-the-box-it-is-given-and-says-so-when-it-cannot-be.md)).
     * It is in the description rather than in a refusal because a render is
     * total (0008) and a band four strides tall is a judgement rather than a
     * threshold — the fix for a model that picks wrongly is knowing, not being
     * stopped.
     */
    paint: z.enum(PAINT_NAMES).optional(),
    /**
     * How the painted area is cornered. It exists because a backdrop is as
     * useful inside a card as behind a band, and a square painted box inside a
     * rounded surface puts four bright corners outside the card's radius —
     * `overflow: hidden` is on this element, so no parent can fix it. The
     * vocabulary is `loom.media`'s rather than a fourth spelling of the same
     * idea.
     */
    corners: z.enum(["none", "sm", "md", "lg"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomBackdrop = definePrimitive({
  type: "loom.backdrop",
  description:
    "Atmosphere behind whatever is put inside it: drifting colour, a ruled grid, a lattice of dots, beams from above, or one pool of light. Wraps anything and draws nothing of its own. The grid and dots need a band a few hundred pixels tall to read as a ground; the other three work at any height.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          position: "relative",
          /**
           * Without this the layers below would stack against the nearest
           * ancestor that happens to have a z-index, so a backdrop inside a
           * card could paint over the card beside it. `isolate` makes this
           * element the context and keeps the whole effect local.
           */
          isolation: "isolate",
          overflow: "hidden",
          /** The paints reach the element's edges; padding here would inset them. */
          boxSizing: "border-box",
          width: "100%",
          ...(given.corners === undefined || given.corners === "none"
            ? {}
            : { borderRadius: radius(given.corners) }),
        },
      },
      libraryStylesheet(),
      ...backdropLayers(given.paint ?? "aurora"),
      /**
       * The content is lifted out of the layers' stacking order. This file used
       * to say source order was enough today and would stop being enough the
       * moment a child positioned itself; that was wrong, and `ABOVE_BACKDROP`
       * carries the correction — an absolutely positioned layer paints after
       * every static sibling, so source order was never doing anything. The
       * style is shared now because `loom.hero` had the same layers and not
       * this line.
       */
      createElement("div", { style: ABOVE_BACKDROP }, children)
    ),
})
