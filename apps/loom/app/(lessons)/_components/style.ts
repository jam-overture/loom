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
export const accent = "var(--loom-accent)"
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
