import type { CSSProperties } from "react"

import { colour, family, radius, size, space, weight, type RampStep } from "./tokens.js"

/**
 * The paint and the sizing shared by the library's two controls.
 *
 * `loom.action` is an anchor and `loom.button` is a `<button type="submit">`,
 * and they are two primitives for a reason that has nothing to do with how they
 * look: one goes somewhere and one sends something, which is the difference
 * between a destination the Gate can read and a form the submission seam
 * addressed (0065). To a reader they are the same object, and a page where the
 * "Read the thesis" link and the "Send" button are two pixels apart in padding
 * is a page nobody chose to design that way.
 *
 * So the vocabulary lives here rather than in either of them — the same reason
 * `layout.ts` holds the arrangement names and `perk-content.ts` holds the perk's
 * three states. A fourth variant added later cannot land on one control and
 * miss the other.
 */

export const CONTROL_VARIANTS = ["primary", "secondary", "quiet"] as const
export type ControlVariant = (typeof CONTROL_VARIANTS)[number]

export const CONTROL_SCALES = ["small", "medium", "large"] as const
export type ControlScale = (typeof CONTROL_SCALES)[number]

const PAINT: Readonly<Record<ControlVariant, CSSProperties>> = {
  primary: {
    background: colour("accent"),
    color: colour("fg-on-accent"),
    border: `1px solid ${colour("accent")}`,
  },
  secondary: {
    background: "transparent",
    color: colour("fg-default"),
    border: `1px solid ${colour("border-strong")}`,
  },
  quiet: {
    background: "transparent",
    color: colour("accent"),
    border: "1px solid transparent",
  },
}

const SIZING: Readonly<Record<ControlScale, { text: RampStep; pad: RampStep }>> = {
  small: { text: 2, pad: 2 },
  medium: { text: 3, pad: 3 },
  large: { text: 4, pad: 4 },
}

/**
 * Property order matters here and is not cosmetic: React writes an inline style
 * in insertion order, so reordering these changes every rendered page's markup
 * without changing a pixel. The order below is the one `loom.action` shipped
 * with, kept so that extracting this file changed no output at all.
 */
export const controlStyle = (variant: ControlVariant, scale: ControlScale): CSSProperties => {
  const sizing = SIZING[scale]

  return {
    ...PAINT[variant],
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: space(2),
    paddingBlock: space(sizing.pad),
    paddingInline: space((sizing.pad + 2) as RampStep),
    borderRadius: radius("full"),
    fontFamily: family("body"),
    fontWeight: weight("heading"),
    fontSize: size(sizing.text),
    lineHeight: 1.2,
    textDecoration: "none",
  }
}
