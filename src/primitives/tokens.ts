import { RAMP_STEPS, type PaletteSlot } from "../theme/theme.js"

/**
 * The only way a primitive in this library names a colour, a size, or a length.
 *
 * A ported primitive is not done until it renders under both starter palettes,
 * and the failure that rule exists to catch is a literal — one `#0a0a0a` left
 * behind in a renderer, invisible until someone re-themes the page and the text
 * disappears into the background. Routing every value through here means the
 * mistake has to be made deliberately rather than by forgetting.
 *
 * These are `var()` references, not values: the primitive never learns which
 * palette is mounted, which is what makes a re-theme one `configure` on the
 * root and nothing else (0049).
 */

export type RampStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** A compile-time check that the step vocabulary and the emitted ramp agree. */
const RAMP_STEP_COUNT: 8 = RAMP_STEPS

export const RAMP: readonly RampStep[] = Array.from(
  { length: RAMP_STEP_COUNT },
  (_unused, index) => (index + 1) as RampStep
)

export const colour = (slot: PaletteSlot): string => `var(--loom-${slot})`

/** A length off the style preset's spacing scale. */
export const space = (step: RampStep): string => `var(--loom-spacing-${step})`

/** A size off the font pack's type ramp. */
export const size = (step: RampStep): string => `var(--loom-scale-${step})`

export const radius = (name: "sm" | "md" | "lg" | "full"): string => `var(--loom-radius-${name})`

export const family = (role: "heading" | "body"): string => `var(--loom-${role}-family)`

export const weight = (role: "heading" | "body"): string => `var(--loom-${role}-weight)`

export const motion = (speed: "fast" | "medium" | "slow"): string => `var(--loom-motion-${speed})`

/**
 * The reading measure, as a length rather than a palette slot.
 *
 * Line length is a typographic constant — around 65 characters — not something a
 * palette or a preset varies, so it is expressed in `ch` and stays here rather
 * than becoming a theme variable nobody would ever set differently.
 */
export const READABLE_MEASURE = "68ch"

export const WIDTHS = {
  full: "100%",
  wide: "1120px",
  readable: READABLE_MEASURE,
} as const

export type WidthName = keyof typeof WIDTHS
