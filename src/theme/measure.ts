import { relativeLuminance, contrastRatio } from "./contrast.js"
import { labOf } from "./lab.js"
import type { Palette, PaletteSlot, ThemeId } from "./theme.js"

/**
 * What a palette *is*, as numbers a stylesheet can use.
 *
 * A palette hands a primitive seventeen strings. `var(--loom-accent-strong)` is
 * a colour to a reader and an opaque token to everything else: CSS cannot ask
 * how much colour is in it, and a primitive that spreads it over half a band has
 * no way to find out before it does.
 *
 * Two things the library builds needed exactly that and could not have it, both
 * filed on 11 September by the lane that builds the primitives:
 *
 * - **A paint assumes there is chroma to spend.** The same aurora that is
 *   luminous behind `bold`'s gold and red is a grey blob behind `editorial`'s
 *   two slates, because a low-chroma tint spread over a light canvas is
 *   indistinguishable from dirt. One opacity was serving both, and no primitive
 *   could know which palette it was in.
 * - **A dark wash is not expressible.** `bg-overlay` is a *surface* — white
 *   under most of the starter palettes — so reading it as a scrim gives white
 *   text on a white veil. A hard-coded black would render one page correctly and
 *   break re-theming for every other palette (0049).
 *
 * Both are answered here, and answered the same way: **measured from the
 * palette, never declared on it.** A declared field would have to be added to
 * `paletteSchema`, which every palette must satisfy in full — so every host
 * palette in existence would stop validating, and a host that did fill it in
 * could fill it in wrongly. Nothing checks a claim about how much colour a
 * colour has. Measuring it cannot be wrong and costs a host nothing (0131).
 *
 * It reports; it does not decide — the bargain `auditPalette` and
 * `auditSeparation` both make, for the same reason (0076). How strong a wash to
 * draw with these numbers is the primitive's call, and which pair to hand a
 * reader is the palette's.
 */

/**
 * The greatest chroma sRGB can reach: pure blue, `#0000ff`, at C* 133.82.
 *
 * Chroma is reported as a fraction of it, so `1` means *as saturated as a screen
 * goes* and the scale does not depend on which palettes happen to be registered.
 * A normalisation against the library's own maximum would be a number that moved
 * whenever somebody added a palette.
 */
export const MAX_SRGB_CHROMA = 133.82

/**
 * The slots a palette puts its colour in, and the only ones whose chroma tells
 * anybody anything.
 *
 * The neutral tiers are near-grey **on purpose** — `derivePalette` builds every
 * background, ink and rule from the canvas hue at a saturation it caps in the
 * teens, so measuring them would report the tint of the paper rather than what a
 * paint has to work with. The accent tier and the brand tier are where a palette
 * spends its chroma, and they are what a band spreads behind content.
 *
 * Declared rather than derived, for the reason `PALETTE_TEXT_GROUNDS` is: which
 * slots mean *colour* rather than *paper* is what the vocabulary means, not
 * something a probe can read off a component.
 */
export const PALETTE_CHROMA_SLOTS: readonly PaletteSlot[] = [
  "accent",
  "accent-strong",
  "accent-subtle",
  "brand-secondary",
  "brand-secondary-strong",
]

/**
 * Relative luminance at or under which a wash genuinely darkens what is beneath
 * it.
 *
 * Derived rather than chosen. A wash drawn at full strength brings what is under
 * it to its own luminance `L`; for the ink it carries to clear the body-text bar
 * against that, the ink needs a luminance of at least `4.5 × (L + 0.05) − 0.05`,
 * which at `L = 0.15` is 0.85 — a near-white and nothing else. Above this a
 * "dark" scrim is dark in name only, so the pair is reported as one that does not
 * darken rather than silently offered as one that does.
 *
 * Every starter palette's scrim sits under 0.015, two orders of magnitude
 * inside it; the ceiling exists for host palettes, where it is a real question.
 */
export const SCRIM_DARK_CEILING = 0.15

/**
 * A ground that darkens what is under it, and the ink that is guaranteed to read
 * on it.
 *
 * A pair rather than a colour, because the guarantee is the point: the two are
 * the palette's **own body-copy pair, whichever way round is darker**. Under a
 * light palette that is the ink used as the ground and the page used as the ink;
 * under a dark one it is the page used as the ground and the ink left where it
 * is. Either way both ends come from the palette, so a scrim re-themes like
 * everything else, and its contrast is one the palette already owes a reader —
 * `fg-default` on `bg-canvas` is a painted pairing the contrast bar asserts
 * (0074), so a scrim cannot be legible in one palette and not in another.
 *
 * Inverting is what makes it free. The alternative — deriving a new dark colour
 * from the palette's hue — invents a colour nobody approved, and then owes the
 * reader a foreground that has never been measured against it.
 */
export type Scrim = {
  readonly ground: PaletteSlot
  readonly foreground: PaletteSlot
  /** Of the ground. How much this wash can actually darken. */
  readonly luminance: number
  /** Of the pair, which is the palette's own body-copy ratio. */
  readonly ratio: number
  /** Whether the ground is under `SCRIM_DARK_CEILING`. */
  readonly darkens: boolean
}

/**
 * How much colour is in one slot, as a fraction of the most sRGB can hold, or
 * `undefined` when the colour is a form `channelsOf` declines to guess at.
 *
 * CIELAB chroma rather than HSL saturation: a palette is judged by eye, and
 * `hsl()`'s saturation says a pale mint and a deep forest hold the same amount
 * of colour when a reader can see that one of them is grey. This is the space
 * `separation.ts` already measures difference in, for the same reason.
 */
export const slotChroma = (colour: string): number | undefined => {
  const lab = labOf(colour)
  if (lab === undefined) return undefined

  const [, green, blue] = lab

  return Math.min(1, Math.hypot(green, blue) / MAX_SRGB_CHROMA)
}

/**
 * The palette's scrim pair, or `undefined` when either end is a colour this
 * cannot measure — `undefined` rather than a guess, so a host whose palette is
 * written in `hsl()` is told the wash is unavailable instead of being handed a
 * pair that might be the wrong way round.
 */
export const paletteScrim = (palette: Palette): Scrim | undefined => {
  const ink = palette.slots["fg-default"] ?? ""
  const page = palette.slots["bg-canvas"] ?? ""

  const inkLuminance = relativeLuminance(ink)
  const pageLuminance = relativeLuminance(page)
  const ratio = contrastRatio(ink, page)
  if (inkLuminance === undefined || pageLuminance === undefined || ratio === undefined) {
    return undefined
  }

  const inkIsDarker = inkLuminance < pageLuminance
  const luminance = inkIsDarker ? inkLuminance : pageLuminance

  return {
    ground: inkIsDarker ? "fg-default" : "bg-canvas",
    foreground: inkIsDarker ? "bg-canvas" : "fg-default",
    luminance,
    ratio,
    darkens: luminance <= SCRIM_DARK_CEILING,
  }
}

/** Everything measurable about one palette that its slots do not say. */
export type PaletteMeasures = {
  readonly palette: ThemeId
  /**
   * Chroma per slot, normalised, for the slots that carry colour. A slot whose
   * colour could not be measured is **absent** rather than zero: zero is a real
   * answer meaning grey, and `graphite`'s accent really is 0.000.
   */
  readonly chroma: Readonly<Partial<Record<PaletteSlot, number>>>
  readonly scrim: Scrim | undefined
}

/** Measures one palette. Refuses nothing, and reports what it could not measure by leaving it out. */
export const paletteMeasures = (palette: Palette): PaletteMeasures => {
  const chroma: Partial<Record<PaletteSlot, number>> = {}

  for (const slot of PALETTE_CHROMA_SLOTS) {
    const measured = slotChroma(palette.slots[slot] ?? "")
    if (measured !== undefined) chroma[slot] = measured
  }

  return { palette: palette.id, chroma, scrim: paletteScrim(palette) }
}

/**
 * The decimal places a chroma is emitted to.
 *
 * Fixed rather than trimmed, and the reason is not tidiness: a variable whose
 * text length varied with the palette would make the page describing a tree a
 * few bytes longer in one palette than in another, and *the same tree in every
 * palette, byte for byte* is a promise the theme model makes and a marketing
 * page now measures and prints (0049). Three places resolve a step of 0.4 in
 * C*, finer than the 1/255 a hex can express.
 */
export const CHROMA_PLACES = 3

/** A chroma as a stylesheet reads it: unitless, so `calc()` can multiply by it. */
export const chromaValue = (chroma: number): string => chroma.toFixed(CHROMA_PLACES)
