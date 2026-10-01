import { RAMP_STEPS, type PaletteSlot } from "../theme/theme.js"

/**
 * The only way a primitive in this library names a color, a size, or a length.
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

export const color = (slot: PaletteSlot): string => `var(--loom-${slot})`

/** A length off the style preset's spacing scale. */
export const space = (step: RampStep): string => `var(--loom-spacing-${step})`

/** A size off the font pack's type ramp. */
export const size = (step: RampStep): string => `var(--loom-scale-${step})`

export const radius = (name: "sm" | "md" | "lg" | "full"): string => `var(--loom-radius-${name})`

export const family = (role: "heading" | "body"): string => `var(--loom-${role}-family)`

export const weight = (role: "heading" | "body"): string => `var(--loom-${role}-weight)`

export const motion = (speed: "fast" | "medium" | "slow"): string => `var(--loom-motion-${speed})`

/**
 * The fallback for the one family a font pack is allowed not to supply.
 *
 * A code panel and a key cap need a monospace face, and for a while no pack
 * could name one. That is fixed: a pack declares `monoFamily`
 * ([0085](../../decisions/0085-a-font-pack-declares-a-face-when-something-reads-it.md)),
 * it is emitted as `--loom-mono-family`, and a pack built around Berkeley Mono
 * gets to say so. Nothing here changed when it landed, because this was written
 * as a `var()` with the stack as its **fallback** rather than as the stack
 * alone — which is the whole reason the seam cost one file to open.
 *
 * `monoFamily` is the one face a pack may decline, so the fallback is not dead
 * code and still resolves for every pack that does. It is a system stack rather
 * than a webfont: nothing to load, and identical under every palette, which is
 * what keeps the re-theme guarantee (0049) true for a primitive whose theme has
 * not answered.
 *
 * **`family("mono")` is deliberately not a thing.** The signature is
 * `family(role: "heading" | "body")`, and a third member would be right if you
 * want the roles symmetrical — but `monospace()` is not the same shape, because
 * it carries a fallback the other two do not need. If you widen `family`, the
 * fallback has to survive the move.
 */
export const MONOSPACE_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

export const monospace = (): string => `var(--loom-mono-family, ${MONOSPACE_STACK})`

/**
 * The color a line takes when the line is the only thing being drawn.
 *
 * `border-subtle` is the right slot for the **edge of a box**: a card is mostly
 * fill, the fill is what tells a reader it is a card, and the edge only has to
 * stop the fill. It is the wrong slot for a rule between two table rows, the
 * rail down a timeline, the hairline under a top bar, or a scrollbar thumb —
 * anything with no fill of its own to be read by. That distinction was written
 * down on 26 September as the rule an audit should be run against, and this is
 * the audit's answer in one place rather than in forty.
 *
 * **Measured with `src/theme/separation.ts`, whose ΔE is the metric this
 * repository already decided is the right question for "can a reader tell these
 * two apart" (0089).** CIE76 difference between the slot and the ground it is
 * drawn on, across the two starter palettes, against a just-noticeable
 * difference of 2.3:
 *
 * | palette · ground | `border-subtle` | `border-default` |
 * | --- | --- | --- |
 * | editorial · `bg-surface` | 6.48 | 9.06 |
 * | editorial · `bg-surface-muted` | **0.90** | 4.15 |
 * | bold · `bg-surface` | **2.49** | 7.80 |
 * | bold · `bg-canvas` | 9.02 | 14.32 |
 *
 * Two things in that table are why this helper exists rather than a note.
 *
 * **`border-subtle` falls under the just-noticeable difference on a muted
 * ground, and the palette it does that on is a light one.** 0.90 on
 * `editorial`'s `bg-surface-muted` is the worst pair in the starter set — worse
 * than anything on `bold` — so the 26 September framing, that this is a thing
 * the dark palette does, is not what is happening. It is a thing the token does
 * wherever the ground it lands on happens to be near it, and three of the eight
 * starter palettes put it under the floor on some ground.
 *
 * **A contrast ratio says the opposite and is the wrong instrument.** WCAG
 * contrast puts every one of these between 1.005 and 1.38, which reads as "all
 * four cells are equally invisible, so changing the slot buys nothing." That is
 * the error `separation.ts` was written to stop: a ratio compares luminance, and
 * these are neutrals a few values apart where luminance is the least sensitive
 * thing about the comparison. ΔE says the change is a three-to-fourfold
 * increase in separation, and ΔE is the metric with a published threshold
 * behind it.
 *
 * `border-strong` is the wrong end of the same ramp — 87 to 98, near-black on a
 * light palette — which is why `loom.table` and `loom.comparison-table` keep it
 * for the one rule under a header and take this for the rules between rows.
 */
export const hairline = (): string => color("border-default")

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
