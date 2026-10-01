import { auditPalette, contrastRatio, TEXT_CONTRAST_MINIMUM } from "./contrast.js"
import { colorDifference, JUST_NOTICEABLE_DIFFERENCE } from "./separation.js"
import { paletteSchema, type Palette } from "./theme.js"

/**
 * Builds a palette that clears the bar, from three hues and a mode.
 *
 * `auditPalette` is the half of this pair that **reports**: it tells a host
 * whether the colors they chose can be read. This is the half that
 * **constructs**, and it exists because reporting is not much help on its own —
 * a host told that four of their twelve pairings fail still has to solve twelve
 * simultaneous contrast constraints by hand, and the usual outcome is that they
 * lighten a background until the warning goes away and ship a page nobody
 * looked at.
 *
 * The seventeen slots of a palette are not seventeen decisions. Three of them
 * are — *what color is the page, what color is the ink that carries meaning,
 * and what is the second color* — and the rest follow by rule. So this takes
 * the three and derives the rest, searching for a lightness that clears
 * `TEXT_CONTRAST_MINIMUM` with a margin rather than picking one and hoping.
 *
 * **It is a build-time tool, not a runtime one.** The palettes this library
 * ships are literals in `palettes.ts` — derived once, looked at, committed —
 * because a palette is reviewed by seeing it and diffed by reading it, and a
 * page whose colors are computed at import time is a page whose colors nobody
 * approved. Derive, look, paste. Never call this in a render.
 *
 * ## The one thing it cannot do for you
 *
 * **It will not put a brand color where a brand color does not go.** `accent`
 * is ink — eyebrows, kickers, the disclosure marker, the current nav item — so
 * a hue given here is darkened until it can carry text, and a pale mint or a
 * bright yellow comes back much darker than the brand book says. That is the
 * correct answer and it is the one `minimal` reached by hand: its green lives in
 * `border-accent` and `brand-secondary`, where it is an area rather than a
 * letterform, and `accent` is near-black.
 *
 * `deriveBrandPalette` is the shape of that answer: give it the brand color and
 * it decides, by measuring, whether it can be ink or has to be an area.
 */

/** How far above the AA bar a derived color lands. */
const MARGIN = 0.25

const TARGET = TEXT_CONTRAST_MINIMUM + MARGIN

/**
 * How far past the just-noticeable difference a derived line lands, in ΔE.
 *
 * The same reasoning as `MARGIN` and for the same reason it is not zero: a slot
 * solved to exactly the floor drops under it the first time somebody nudges a
 * background by a value. 2.3 is what `separation.ts` asserts, because it is the
 * published threshold; 3.0 is what this aims at, because it is the one a later
 * edit can afford to lose a little of. Written as the floor plus a margin rather
 * than as 3, so moving the published threshold moves this with it.
 */
const MARK_MARGIN = 0.7

export const MARK_SEPARATION_TARGET = JUST_NOTICEABLE_DIFFERENCE + MARK_MARGIN

export type PaletteMode = "light" | "dark"

export type HueSpec = {
  /** 0–360. */
  readonly hue: number
  /** 0–100. Zero gives a neutral grey, which is how the monochrome palettes are built. */
  readonly saturation: number
}

export type PaletteSpec = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly mode: PaletteMode
  /** The page itself. Its hue tints every neutral, which is what stops a palette looking like grey with color on top. */
  readonly canvas: HueSpec
  /** The color that carries meaning as text. Darkened, or lightened, until it can. */
  readonly accent: HueSpec
  /** The second color. Never carries text, so it keeps its chroma — this is what `loom.hero`'s aurora paints. */
  readonly secondary: HueSpec
  /**
   * Lightness of the canvas, the surface behind a card, and the muted well, in
   * that order. Defaults suit most palettes; a deeper dark mode or a warmer
   * paper is where you would change them.
   */
  readonly levels?: readonly [number, number, number]
  /**
   * Forces `accent` to the end of the range rather than to the lightest value
   * that clears the bar. A palette with no chroma has nothing to solve for, and
   * solving anyway leaves a mid-grey primary button that reads as a disabled
   * one.
   */
  readonly extremeAccent?: boolean
}

/** HSL to a six-digit hex, which is the only form `contrastRatio` measures. */
export const hslHex = (hue: number, saturation: number, lightness: number): string => {
  const a = (saturation / 100) * Math.min(lightness / 100, 1 - lightness / 100)

  const channel = (n: number): string => {
    const k = (n + hue / 30) % 12
    const value = lightness / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))

    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0")
  }

  return `#${channel(0)}${channel(8)}${channel(4)}`
}

/**
 * The lightest ink (or darkest, on a dark palette) at this hue that still clears
 * `target` against `on`.
 *
 * Lightest rather than merely sufficient, because a color dragged further than
 * it needs to go loses its hue: an accent solved to 8% lightness is black
 * whatever its hue said, and a palette of five of those is five identical
 * palettes. Twenty-four bisection steps put it within about 0.000006 of the
 * boundary, which is far finer than the 1/255 the hex can express.
 */
export const solveLightness = (
  hue: number,
  saturation: number,
  on: string,
  target: number,
  darkening: boolean
): string => {
  let low = darkening ? 0 : 50
  let high = darkening ? 50 : 100
  let best = hslHex(hue, saturation, darkening ? 0 : 100)

  for (let step = 0; step < 24; step += 1) {
    const middle = (low + high) / 2
    const candidate = hslHex(hue, saturation, middle)

    if ((contrastRatio(candidate, on) ?? 0) >= target) {
      best = candidate
      if (darkening) low = middle
      else high = middle
    } else if (darkening) high = middle
    else low = middle
  }

  return best
}

const DEFAULT_LEVELS: Readonly<Record<PaletteMode, readonly [number, number, number]>> = {
  light: [98, 100, 94],
  dark: [10, 14, 8],
}

/**
 * The lightness *nearest* `from` at this hue whose color clears `target` ΔE
 * against every one of `grounds`.
 *
 * Nearest rather than furthest, which is the opposite of `solveLightness` and
 * for the mirror of its reason. An ink is dragged as far as the bar allows
 * because a letterform has to be read; a line only has to be **found**, and a
 * border pushed further than it needs to go stops being the subtle tier and
 * becomes the default one. The tiers are a ramp and the gaps between them carry
 * meaning (0204), so the search moves a line the least it can.
 *
 * Both directions are tried at each step and the darker one wins a tie, because
 * on a light palette the grounds are above the border and moving down is the
 * direction that gains separation from all three at once.
 *
 * Falls back to `from` when nothing within 40 points of lightness clears the
 * target, which is a palette whose three grounds surround the tier — the
 * derivation cannot fix that by moving one slot, and `auditMarkGroundings` is
 * what says so.
 */
export const solveMarkLightness = (
  hue: number,
  saturation: number,
  from: number,
  grounds: readonly string[],
  target: number
): string => {
  const nearestGround = (candidate: string): number =>
    Math.min(...grounds.map((ground) => colorDifference(candidate, ground) ?? 0))

  for (let step = 0; step <= 40; step += 0.125) {
    for (const lightness of step === 0 ? [from] : [from - step, from + step]) {
      const candidate = hslHex(hue, saturation, lightness)
      if (lightness >= 0 && lightness <= 100 && nearestGround(candidate) >= target) return candidate
    }
  }

  return hslHex(hue, saturation, from)
}

/**
 * Derives a palette. Total: it always returns one, and `auditPalette` on the
 * result is the check that it worked — see `derivePaletteChecked` for the pair.
 */
export const derivePalette = (spec: PaletteSpec): Palette => {
  const ink = spec.mode === "light"
  const [canvasL, surfaceL, mutedL] = spec.levels ?? DEFAULT_LEVELS[spec.mode]
  const { hue: ch, saturation: cs } = spec.canvas
  const { hue: ah, saturation: as } = spec.accent
  const { hue: sh, saturation: ss } = spec.secondary

  const bgCanvas = hslHex(ch, cs, canvasL)
  const bgSurface = hslHex(ch, cs, surfaceL)
  const bgSurfaceMuted = hslHex(ch, cs + 2, mutedL)

  /**
   * Every ink slot is solved against the *worst* of the three grounds it is
   * rendered on rather than against the canvas, because `loom.card` puts body
   * copy on the surface and `loom.perk` puts the subtle slot on the muted well.
   * Solving against the canvas alone is how a palette passes the eye and fails
   * the audit on two pairings nobody was looking at.
   */
  const tightest = [bgCanvas, bgSurface, bgSurfaceMuted].sort(
    (a, b) =>
      (contrastRatio(a, ink ? "#000000" : "#ffffff") ?? 0) -
      (contrastRatio(b, ink ? "#000000" : "#ffffff") ?? 0)
  )[0] as string

  const accentSubtle = ink ? hslHex(ah, Math.min(as, 55), 94) : hslHex(ah, Math.min(as, 30), 16)
  const accent =
    spec.extremeAccent === true
      ? hslHex(ah, as, ink ? 7 : 97)
      : solveLightness(ah, as, tightest, TARGET, ink)

  return paletteSchema.parse({
    id: spec.id,
    name: spec.name,
    description: spec.description,
    slots: {
      "bg-canvas": bgCanvas,
      "bg-surface": bgSurface,
      "bg-surface-muted": bgSurfaceMuted,
      "bg-overlay": bgSurface,
      "fg-default": hslHex(ch, Math.min(cs + 6, 20), ink ? 7 : 96),
      /** A step past the bar, so the muted slot is visibly quieter than the default one. */
      "fg-muted": solveLightness(ch, Math.min(cs + 8, 22), tightest, TARGET + 1.6, ink),
      "fg-subtle": solveLightness(ch, Math.min(cs + 6, 18), tightest, TARGET, ink),
      "fg-on-accent": solveLightness(ah, 12, accent, TARGET + 0.5, !ink),
      accent,
      "accent-strong": solveLightness(ah, Math.min(as + 8, 100), accentSubtle, TARGET, ink),
      "accent-subtle": accentSubtle,
      /** Areas, never text, so they keep their chroma and are not solved for. */
      "brand-secondary": hslHex(sh, ss, ink ? 52 : 62),
      "brand-secondary-strong": hslHex(sh, Math.min(ss + 6, 100), ink ? 38 : 48),
      "border-default": hslHex(ch, cs + 4, ink ? 86 : 22),
      "border-strong": hslHex(ch, cs + 4, ink ? 12 : 90),
      /**
       * The one border tier that is solved rather than picked. At the default
       * levels it lands two points of lightness from the muted well, which is
       * under the just-noticeable difference — so eight of the palettes in
       * `palettes.ts` shipped a card edge a reader could not find, and one of
       * them drew it in the well's own color. The other two tiers are 4 to 15
       * and 74 to 98 from every ground at every hue this derives, so they are
       * picked; if that ever stops being true, this is the function to reach for.
       */
      "border-subtle": solveMarkLightness(
        ch,
        cs + 3,
        ink ? 92 : 17,
        [bgCanvas, bgSurface, bgSurfaceMuted],
        MARK_SEPARATION_TARGET
      ),
      "border-accent": hslHex(ah, Math.min(as, 70), ink ? 58 : 62),
    },
  })
}

/**
 * The palette and its audit together, which is how a host should call this: the
 * derivation is a rule and the audit is the check on it, and a rule that has
 * never been checked is a rule that will eventually be wrong at one hue.
 *
 * **`clean` means legible, not distinguishable.** It is `auditPalette` and
 * nothing else: every ink clears the contrast bar on every ground it is
 * rendered on. Whether two slots a reader is meant to tell apart are far enough
 * apart to be told apart is `auditSeparation`, and a host that wants both runs
 * both — five of the palettes this function derived collapse a pair that one
 * measures and the other does not.
 */
export const derivePaletteChecked = (
  spec: PaletteSpec
): { readonly palette: Palette; readonly clean: boolean } => {
  const palette = derivePalette(spec)

  return { palette, clean: auditPalette(palette).failures.length === 0 }
}

/**
 * Whether a brand color can carry text on a given ground.
 *
 * The question a host actually has, and the one they are usually answering
 * wrongly: *can we put our orange in `accent`?* If this says no, the honest
 * places for it are `border-accent` and `brand-secondary` — a rule, a ring, a
 * tinted field — and `accent` takes a near-neutral ink instead.
 */
export const canCarryText = (color: string, on: string): boolean =>
  (contrastRatio(color, on) ?? 0) >= TEXT_CONTRAST_MINIMUM
