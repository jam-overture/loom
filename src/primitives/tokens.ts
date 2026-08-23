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
 *
 * **What a token does not promise.** It promises the value comes from the
 * theme. It promises nothing about that value being *different from the one
 * beside it*, and the difference is where this library has actually been bitten:
 * `loom.emphasis` marked a stressed word with `weight("heading")` and rendered
 * it identically to the sentence around it under `bold-sans`, whose pack
 * declares `headingWeight: 400` beside `bodyWeight: 400`. Nothing was wrong —
 * the token was *equal*. So where a primitive's whole job is to stand out from
 * its context, reach for a value that is relative to that context (`bolder`,
 * `em`, `currentColor`) rather than for a second token and a hope that the two
 * differ. Filed on 23 August for the general case, which is `src/theme/`'s.
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
 * The one family in this library that a font pack does not supply.
 *
 * A code panel and a key cap need a monospace face, and a font pack declares
 * `headingFamily`, `bodyFamily` and `accentFamily` — none of which is one.
 * Filed for `Loom daily build`, whose file `src/theme/theme.ts` is; a font pack
 * that named its own mono is a better answer than a stack chosen here, because
 * a pack built around Berkeley Mono should get to say so.
 *
 * Written as a `var()` with the stack as its **fallback** rather than as the
 * stack alone, so the day `--loom-mono-family` is emitted every code block in
 * every deployment picks it up with nothing here to change. Until then the
 * fallback is what resolves, and it is a system stack rather than a webfont:
 * nothing to load, and identical under every palette, which is what keeps the
 * re-theme guarantee (0049) true for a primitive that needs a face the theme
 * has not got.
 */
export const MONOSPACE_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

export const monospace = (): string => `var(--loom-mono-family, ${MONOSPACE_STACK})`

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
