import type { CSSProperties } from "react"

import { colour, radius, space } from "./tokens.js"

/**
 * The shape shared by every primitive that presents a region, and the three
 * things about it that are easy to get wrong once and invisible afterwards.
 *
 * `present` and `dismiss` landed in the behaviour vocabulary on 20 September
 * ([0176](../../decisions/0176-a-control-may-be-answerable-to-another-control-and-they-agree-through-the-dom.md))
 * and nothing in the library declared either until this file existed. Three
 * primitives declare them now — a menu, a popover and a lightbox — and they are
 * one shape with three regions in it, so the shape is here for `control.ts`'s
 * reason: a fourth presentation added later cannot land on one of them and miss
 * the others.
 *
 * ## 1. The trigger goes in the root, and nothing else may come between
 *
 * `PresentControl` publishes `data-loom-presented` on **its own parent element**,
 * read from a ref at mount. So the element a primitive places the control in is
 * the element the state appears on, and the region has to be laid out inside
 * *that* element for a descendant selector to reach it.
 *
 * The tempting arrangement is the one that breaks it. A lightbox wants its
 * trigger over the corner of a thumbnail, which reads as *put the control in the
 * box holding the thumbnail* — and that box is not the root, so the attribute
 * lands one level down, the hide rule keyed on the root matches nothing, and the
 * region is permanently open. **The control is a direct child of the root and is
 * positioned from the stylesheet instead**, by the class the runtime stamps on it
 * (`control.ts`), which is what that class is for.
 *
 * ## 2. The rule hides on `"false"` and never reveals on `"true"`
 *
 * Every control in the vocabulary renders `null` until an effect has proved
 * scripting runs. So on a page served without it there is no button, no
 * attribute, and no rule that matches — which means the region must be **visible
 * by default and hidden by the rule**. Written the other way round, a page with
 * scripting off has a panel nothing can open and nothing to say why. 0176 states
 * it as a consequence; `presentation.test.ts` asserts it against the sheet.
 *
 * ## 3. A region's `display` may not be set inline
 *
 * The rule that hides it is a rule, and an inline `display` beats a rule — the
 * trap `stylesheet.ts` lists first and `loom.nav` sprang in its first week. So
 * every presented region in this library declares its `display` in the sheet and
 * keeps everything that varies by prop on the element.
 */

/**
 * A panel that hangs off a trigger, above the page's own content and above a
 * sticky `loom.nav` — whose own layer is 20, and whose comment has said "below a
 * modal" since the day it was written.
 */
export const PANEL_LAYER = 30

/**
 * A region drawn over the whole viewport. Above the panels, because a lightbox
 * opened from a menu row covers the menu it was opened from.
 */
export const FRAME_LAYER = 40

export const PLACEMENT_NAMES = ["below", "above"] as const
export type PlacementName = (typeof PLACEMENT_NAMES)[number]

export const EDGE_NAMES = ["start", "end"] as const
export type EdgeName = (typeof EDGE_NAMES)[number]

/**
 * Which way the panel hangs, as the one inset that positions it plus the gap
 * between it and the trigger.
 *
 * A prop rather than a measurement, deliberately. Flipping a panel that would
 * fall off the bottom of the window is a thing only the browser knows, and the
 * only portable way to ask is to measure the viewport in script — which is a
 * client boundary this library does not open per primitive (`behaviour.ts`). So
 * a page says which way its panel hangs, and a panel at the foot of a page says
 * `above`.
 */
export const PLACEMENTS: Readonly<Record<PlacementName, CSSProperties>> = {
  below: { insetBlockStart: "100%", marginBlockStart: space(2) },
  above: { insetBlockEnd: "100%", marginBlockEnd: space(2) },
}

/** Which edge of the trigger the panel lines up with. */
export const EDGES: Readonly<Record<EdgeName, CSSProperties>> = {
  start: { insetInlineStart: "0" },
  end: { insetInlineEnd: "0" },
}

/**
 * The root of a presentation: the box the state is published on, the box the
 * trigger sits in, and the box the region is positioned against.
 *
 * `inline-flex` rather than `block` so the root is as wide as its trigger and
 * can sit in a row of nav links or beside a heading. `display` is set here and
 * not in the sheet because nothing has to hide *the root*, only the region
 * inside it.
 */
export const PRESENTATION_ROOT: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
}

/**
 * The paint on a panel that floats over the page: the page's own overlay
 * surface, a hairline, and a shadow deep enough to separate it from whatever it
 * covers.
 *
 * `bg-overlay` and not `bg-surface`, which is the one choice here worth stating.
 * The palette declares a slot for exactly this — the surface a thing *over* the
 * page is drawn on — and a panel in `bg-surface` laid over a `bg-surface` card
 * is a panel with no edge but its hairline under half the starter palettes.
 */
export const panelPaint = (): CSSProperties => ({
  background: colour("bg-overlay"),
  border: `1px solid ${colour("border-subtle")}`,
  borderRadius: radius("md"),
  boxShadow: `0 28px 60px -32px ${colour("fg-default")}`,
})
