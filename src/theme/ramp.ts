/**
 * A ramp step as a CSS length, and the width at which it is what the pack said.
 *
 * A font pack declares eight type sizes and a style preset eight spacing steps,
 * both as plain numbers, and `apply.ts` mounted them as pixels. That is the
 * whole of why a page built in Loom did not fit a phone: `--loom-scale-8` was
 * 72px at every width, so a hero headline on a 390px screen was given three
 * characters a line, and `--loom-spacing-4` plus `--loom-spacing-6` took 35% of
 * that screen in gutter before a word was set. Filed by `Loom marketing` on
 * 13 October against the one surface built entirely in the framework — measured
 * there, because the only instrument that sees it is a camera.
 *
 * **A tree cannot fix it and must not be able to.** There is no prop, no theme
 * and no node that means *smaller on a phone*, and there is not going to be
 * one: a render is a pure function of one node
 * ([0008](../../decisions/0008-the-renderer-is-a-total-pure-projection.md)), so
 * a primitive handed a viewport would make the same tree a different page. The
 * surface's own stylesheet cannot fix it either — a second source of truth for
 * type and spacing is exactly what the re-theme guarantee
 * ([0049](../../decisions/0049-a-theme-is-three-ids-in-the-tree.md)) cannot
 * have.
 *
 * So the width is read where this repository already reads it: in CSS.
 * [0079](../../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md)
 * drew that line for `loom.mosaic` and drew it in the right place — *no
 * viewport in the render function*, and a rule in a stylesheet is not in the
 * render function. A `clamp()` is the same bargain one step earlier: the markup
 * is unchanged, nothing is interpolated, `themeVariables` is as pure as it was
 * — the same theme yields the same strings — and the browser rather than the
 * render function is what knows how wide the page is.
 *
 * ## What a declared number now means
 *
 * **A maximum, reached at `48rem` and held above it.** Below that a step is
 * compressed toward the largest value its quantity can hold on a phone, and a
 * step already that small is emitted as the plain pixel length it always was.
 * The consequence worth stating is the one that is easy to miss: **nothing
 * changes at or above 768px.** A reader on a laptop sees the ramp the pack
 * declared, to the pixel.
 */

/**
 * The width at which a ramp is exactly what its pack declared.
 *
 * `48rem` is the library's one width and 0079 set the bar for a second high on
 * purpose. This is not a second one — a `clamp()` has no breakpoint in it, and
 * naming the width the library already switches `loom.mosaic` on is the whole
 * reason to prefer this number to a better-looking one.
 */
const FULL_WIDTH_PX = 768

/**
 * How much of the distance between the hold and the declared number survives on
 * a narrow screen.
 *
 * **It is not a taste.** `loom.primitives` capped `loom.heading`'s top step at
 * `11cqi` on 20 August, found by measuring which words lost their last letter
 * in a 390px screen. `0.46` is the ratio that reproduces that cap from the
 * pack's own number — a 72px step floors at 42.84px where `11cqi` is 42.90px —
 * so the figure a lane arrived at by photographing one pack is now derived for
 * every step of every pack, including the ones nothing has photographed.
 */
const COMPRESSION = 0.46

/** Which ramp a step belongs to. They differ only in what a phone can hold. */
export type RampKind = "type" | "space"

/**
 * Whether the emitted length may read the width.
 *
 * `"fixed"` is for a medium with no cascade and no viewport — an image renderer
 * or an email body, which `inline-variables.ts` substitutes values into. A
 * `clamp()` in container units is not a literal length: it is strictly worse
 * there than the pixel it replaced, because nothing in that medium resolves it.
 * A caller asking for literals gets the pack's declared numbers.
 */
export type RampMode = "fluid" | "fixed"

/**
 * The value each ramp is compressed toward, and the reason the two differ.
 *
 * Type holds at 18px because step 3 is body copy in every registered pack and
 * step 4 is 17–20: a ramp that shrank those would be trading a headline that
 * does not fit for paragraphs nobody can read. Space holds at 8px because
 * whitespace has no legibility floor — only a floor at which a gap stops
 * reading as one — and a phone wants less of it, not a little less.
 */
const HOLD_PX: Readonly<Record<RampKind, number>> = { type: 18, space: 8 }

/**
 * Two decimal places, rounded **up**.
 *
 * Up rather than to nearest, and the preferred value is why. A coefficient
 * rounded down reaches the declared size a little *after* `48rem` rather than
 * at it — `20px` resolved to 19.97 at 768 before this was `ceil`, which is the
 * one property the whole construction promises and the kind of defect only
 * arithmetic over every registered pack finds. On a floor a hundredth of a
 * pixel is beneath anything a reader or a camera can see.
 */
const round = (value: number): number => Math.ceil(value * 100) / 100

/**
 * The smallest this step is ever rendered.
 *
 * Monotone in `step` by construction — the identity at or below the hold, and
 * affine with a positive slope above it — which is what keeps a ramp a ramp. A
 * narrow screen reorders nothing: if the declared steps ascend, so do these,
 * and so does every width between the two bounds.
 */
const rampFloor = (step: number, kind: RampKind): number => {
  const hold = HOLD_PX[kind]

  return step <= hold ? step : hold + (step - hold) * COMPRESSION
}

/**
 * One ramp step, as the length `apply.ts` mounts.
 *
 * The preferred value is `cqi` rather than `vw` for the reason `loom.heading`
 * learned in the same place: with no ancestor declaring containment `cqi` is
 * the small viewport width, so a step on the open page behaves as it always
 * did, and a step inside a `loom.card` or one half of a `loom.split` is held to
 * the column it is actually in because those declare the containment for it to
 * read.
 */
export const rampLength = (step: number, kind: RampKind, mode: RampMode): string => {
  if (mode === "fixed") return `${step}px`

  const floor = round(rampFloor(step, kind))

  /** A step a phone already holds is the plain length it has always been. */
  if (floor >= step) return `${step}px`

  return `clamp(${floor}px, ${round((step / FULL_WIDTH_PX) * 100)}cqi, ${step}px)`
}
