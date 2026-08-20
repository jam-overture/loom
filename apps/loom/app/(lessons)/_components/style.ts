import type { CSSProperties } from "react"

/**
 * What the furniture wears.
 *
 * Every value here is a custom property the mounted theme sets, which is the
 * whole point: the answer box and the confidence control are not primitives and
 * cannot be (0067 permits the machinery and forbids a second component library),
 * but they can refuse to name a colour. Re-theme the course and the buttons move
 * with it, because there is nothing here to move separately.
 */

export const ink = "var(--loom-fg-default)"
export const inkMuted = "var(--loom-fg-muted)"
export const inkSubtle = "var(--loom-fg-subtle)"
/**
 * Two accents, because they are two jobs, and one theme proved it.
 *
 * `accent` is what a filled control is made of, and `highlight` is what points
 * at something. Under a palette whose accent is a colour those read as the same
 * decision, which is why this file had one token until the house theme arrived
 * with `accent: #0a0a0a` — a black primary button, deliberately, so that the
 * green is left free to be a highlight rather than the largest element on the
 * page. Everything that used `accent` to *emphasise* went black overnight and
 * emphasised nothing.
 *
 * So: fills and rings that mean "this is the button" take `accent`; the one
 * thing on a page that is being pointed at takes `highlight`, on `highlightTint`
 * inside `highlightEdge`. Both still come from the theme, and a palette that
 * makes them the same colour again is welcome to.
 */
export const accent = "var(--loom-accent)"
export const highlight = "var(--loom-accent-strong)"
export const highlightTint = "var(--loom-accent-subtle)"
export const highlightEdge = "var(--loom-border-accent)"
export const edge = "var(--loom-border-default)"
export const surface = "var(--loom-bg-surface)"
export const surfaceMuted = "var(--loom-bg-surface-muted)"
export const radius = "var(--loom-radius-md)"
export const bodyFamily = "var(--loom-body-family)"

export const column = (gap: number): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: `var(--loom-spacing-${gap})`,
})

export const row = (gap: number): CSSProperties => ({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: `var(--loom-spacing-${gap})`,
})

export const panel: CSSProperties = {
  border: `1px solid ${edge}`,
  borderRadius: radius,
  padding: "var(--loom-spacing-5)",
  background: surface,
}

export const label: CSSProperties = {
  fontFamily: bodyFamily,
  fontSize: "var(--loom-scale-2)",
  color: inkMuted,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
}

export const note: CSSProperties = {
  fontFamily: bodyFamily,
  fontSize: "var(--loom-scale-2)",
  color: inkMuted,
  lineHeight: 1.6,
  margin: 0,
}

export const button = (selected: boolean): CSSProperties => ({
  fontFamily: bodyFamily,
  fontSize: "var(--loom-scale-3)",
  padding: "var(--loom-spacing-2) var(--loom-spacing-4)",
  borderRadius: radius,
  border: `1px solid ${selected ? accent : edge}`,
  background: selected ? accent : "transparent",
  color: selected ? "var(--loom-fg-on-accent)" : ink,
  cursor: "pointer",
})

export const textarea: CSSProperties = {
  fontFamily: bodyFamily,
  fontSize: "var(--loom-scale-3)",
  lineHeight: 1.6,
  color: ink,
  background: surfaceMuted,
  border: `1px solid ${edge}`,
  borderRadius: radius,
  padding: "var(--loom-spacing-3)",
  minHeight: "9rem",
  width: "100%",
  resize: "vertical",
}
