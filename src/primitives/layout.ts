import { space } from "./tokens.js"

/**
 * The arrangement vocabulary the compose-and-arrange primitives share.
 *
 * `loom.stack` and `loom.grid` say the same three things about their children —
 * how far apart, how aligned, how many across — and a second copy of the gap
 * scale is how two containers that look identical in a mock end up two pixels
 * apart on the page. The code-style rule against duplicating style constants
 * across a feature is the reason this file exists rather than a `GAPS` in each.
 *
 * These are the *named* steps, not the whole ramp. A primitive that took a raw
 * `1…8` would be handing a model eight indistinguishable numbers and asking it
 * to have taste; a primitive that takes `snug` is asking it to have intent. The
 * scale below is contiguous — steps two through six — so the names order the
 * same way the ramp does under every style preset.
 */

export const GAP_NAMES = ["none", "tight", "snug", "normal", "loose", "roomy"] as const
export type GapName = (typeof GAP_NAMES)[number]

/**
 * Six names is more resolution than any other prop in the library carries, and
 * it is deliberate here: a stack is the one primitive used at every scale on a
 * page, from the glyph beside a label to the distance between two bands. Every
 * other prop that could have been a length was given three options because
 * three was all the distinctions that mattered. Here they all matter, and the
 * grammar budget (0014) is spent on the primitive that spends it best.
 */
export const GAPS: Readonly<Record<GapName, string>> = {
  none: "0",
  tight: space(2),
  snug: space(3),
  normal: space(4),
  loose: space(5),
  roomy: space(6),
}

export const ALIGN_NAMES = ["start", "center", "end", "stretch", "baseline"] as const
export type AlignName = (typeof ALIGN_NAMES)[number]

/** Cross-axis placement. The names are CSS's own, less the flexbox `flex-` prefix. */
export const ALIGNMENTS: Readonly<Record<AlignName, string>> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
}

export const JUSTIFY_NAMES = ["start", "center", "end", "between"] as const
export type JustifyName = (typeof JUSTIFY_NAMES)[number]

/** Main-axis distribution. `between` is the only one that is not a simple edge. */
export const JUSTIFICATIONS: Readonly<Record<JustifyName, string>> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
}

export const COLUMN_NAMES = ["auto", "two", "three", "four"] as const
export type ColumnName = (typeof COLUMN_NAMES)[number]

/**
 * A **floor for each column, never a count** — the distinction the granularity
 * doc names as the easiest one to get wrong. Fed to `auto-fit`, so `three`
 * means "columns no narrower than this, which is three of them at a common
 * page width and one of them on a phone". Nothing here truncates a list, so
 * changing it changes no node, which is what keeps it a prop.
 *
 * Shared with `loom.feature-grid`, which had these values first and keeps them
 * unchanged. Two grids in one library that wrap at different widths is a
 * difference nobody chose and everybody sees.
 */
export const COLUMN_MINIMUMS: Readonly<Record<ColumnName, string>> = {
  auto: "16rem",
  two: "22rem",
  three: "17rem",
  four: "13rem",
}
