import { createElement, type ReactNode } from "react"

import { LIBRARY_CLASS } from "./stylesheet.js"
import { space } from "./tokens.js"

/**
 * The mark a tile carries when the tile itself is the link.
 *
 * Shared by `loom.card` and `loom.feature` rather than written twice, on
 * `layout.ts`'s argument for the three named aspect ratios: two copies of one
 * affordance are one rewrite away from disagreeing, and the whole point of this
 * one is that a reader learns it once and then recognises it.
 *
 * The reasoning for why a hover treatment was not enough is in `loom.card`,
 * beside the decision it replaced. What lives here is only the shape.
 *
 * `aria-hidden`, because the anchor already has an accessible name — the
 * content of the tile — and a screen reader announcing an arrow after it is
 * noise rather than information. `pointer-events: none` in the stylesheet, so
 * the mark never becomes a smaller target inside the large one the tile exists
 * to be.
 */

/**
 * Points the way a Latin script reads. There is no logical-property equivalent
 * of an arrow and this library has no right-to-left rendering yet; a page set
 * in Arabic would want it mirrored, and nothing here does that.
 */
export const LINK_MARK = "→"

/**
 * The chip's own width. Named because the clearance below is derived from it.
 *
 * The stylesheet carries the same number as a literal and cannot import this
 * one — it is static text with nothing interpolated into it, which is what makes
 * it byte-identical under every theme. So a test holds the two in step instead;
 * that is the cost of the property, paid where it can be seen.
 */
export const LINK_MARK_SIZE = "1.75rem"

/**
 * The trailing room a line of text has to stop short of, for a tile that draws
 * the mark over its own words rather than over a picture. Not a token, because
 * it is the sum of one — the gap — and a fixed chip.
 */
export const LINK_MARK_CLEARANCE = `calc(${LINK_MARK_SIZE} + ${space(3)})`

export const linkMark = (): ReactNode =>
  createElement("span", { key: "mark", "aria-hidden": true, className: LIBRARY_CLASS.arrow }, LINK_MARK)
