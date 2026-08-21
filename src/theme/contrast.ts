import type { Palette, PaletteSlot, ThemeId } from "./theme.js"

/**
 * The bar 0074 set, as a function a host can run against its own palettes.
 *
 * 0074 says a palette slot that primitives put text in meets 4.5:1 against every
 * background they pair it with, and the three starter palettes clear it because
 * a test iterating `STARTER_PALETTES` says so. `createThemeRegistry({ palettes })`
 * *replaces* that list (0049), so a host supplying its own gets `paletteSchema` —
 * which checks that every slot holds a colour and has no idea which slots are
 * read as text on which others — and nothing else. A host palette with a 2:1
 * subtle registers, resolves, re-themes and renders.
 *
 * This is the cheap half of the answer and deliberately the whole of it (0076):
 * an audit a host runs in its own tests, not a refusal at registration. The
 * expensive half would decide whether Loom *enforces* accessibility on a host or
 * merely meets it itself, and it would reject palettes that are legal today.
 *
 * It reports; it does not decide — the same bargain `auditRegistry` makes, for
 * the same reason.
 */

/** WCAG AA for body text. The bar 0074 chose, and the only one this asserts. */
export const TEXT_CONTRAST_MINIMUM = 4.5

/**
 * A foreground slot read on a background slot, and the primitives that put them
 * together.
 *
 * Read off `src/primitives` rather than imagined, which is what makes the check
 * worth failing over: every pairing here is one some component actually renders,
 * so a palette that fails one has a page in it that a reader cannot read. A
 * pairing nothing renders would be a bar chosen for its own sake.
 */
export type TextPairing = {
  readonly foreground: PaletteSlot
  readonly background: PaletteSlot
  /** Where it happens, so a failure names a page rather than two slot ids. */
  readonly where: string
}

export const PALETTE_TEXT_PAIRINGS: readonly TextPairing[] = [
  { foreground: "fg-default", background: "bg-canvas", where: "loom.page body copy" },
  { foreground: "fg-default", background: "bg-surface", where: "loom.card body copy" },
  { foreground: "fg-muted", background: "bg-canvas", where: "loom.prose tone muted" },
  { foreground: "fg-muted", background: "bg-surface", where: "loom.feature body" },
  { foreground: "accent", background: "bg-canvas", where: "loom.section eyebrow, loom.link current" },
  { foreground: "accent", background: "bg-surface", where: "loom.faq marker, loom.article kicker" },
  { foreground: "fg-on-accent", background: "accent", where: "loom.action primary label" },
  { foreground: "accent-strong", background: "accent-subtle", where: "loom.badge accent, loom.icon soft" },
  { foreground: "fg-default", background: "accent-subtle", where: "loom.section tone accent" },
  /**
   * `fg-subtle` is held to the body-text bar like the rest, which is 0074. The
   * slot recedes and none of what it carries is reliably large — a `loom.footer`
   * note row and a `loom.tier` note are ordinary small text — so a threshold of
   * 3:1 would be a bar chosen to fit the colours rather than the reader.
   * `bg-surface-muted` is here because `loom.perk` is the one primitive that
   * puts the pair together deliberately.
   */
  { foreground: "fg-subtle", background: "bg-canvas", where: "loom.footer note, loom.link-list group label" },
  { foreground: "fg-subtle", background: "bg-surface", where: "loom.tier note, loom.milestone marker" },
  { foreground: "fg-subtle", background: "bg-surface-muted", where: "loom.perk excluded marker" },
]

/** sRGB channel, linearised. WCAG's own curve. */
const channel = (value: number): number => {
  const c = value / 255

  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/**
 * The colour as three 0–255 channels, or nothing when it is a form this cannot
 * measure.
 *
 * `colourSchema` accepts more than hex — `rgb()`, `hsl()`, a named colour, and
 * eight-digit hex with an alpha. Only three- and six-digit hex are measured
 * here, and the rest answer `undefined` rather than a guess:
 *
 * - a named colour needs the CSS colour table, which is 148 entries of vocabulary
 *   this module would then own
 * - `hsl()` and modern `rgb()` syntax are a parser, and a parser that is subtly
 *   wrong reports a passing ratio for a failing pair, which is worse than
 *   reporting nothing
 * - an alpha composites against whatever is behind it, so its contrast is not a
 *   property of the two slots at all
 *
 * Answering "I could not measure this" is the same move `not-probeable` makes in
 * the conformance probe: a check that cannot answer says so, rather than passing.
 */
const channelsOf = (colour: string): readonly [number, number, number] | undefined => {
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(colour)?.[1]
  if (hex === undefined) return undefined

  const pairs =
    hex.length === 3 ? [...hex].map((digit) => `${digit}${digit}`) : [0, 2, 4].map((at) => hex.slice(at, at + 2))

  const [r, g, b] = pairs.map((pair) => Number.parseInt(pair, 16))

  return r === undefined || g === undefined || b === undefined ? undefined : [r, g, b]
}

/**
 * The WCAG contrast ratio between two colours, or `undefined` when either is a
 * form `channelsOf` declines to guess at.
 */
export const contrastRatio = (a: string, b: string): number | undefined => {
  const [first, second] = [a, b].map(channelsOf)
  if (!first || !second) return undefined

  const luminance = ([r, g, b]: readonly [number, number, number]): number =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

  const [high, low] = [luminance(first), luminance(second)].sort((x, y) => y - x)

  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

/** A pairing that was measured, whether or not it cleared the bar. */
export type MeasuredPairing = {
  readonly pairing: TextPairing
  readonly ratio: number
  readonly meets: boolean
}

/** A pairing whose colours could not be measured, and which colour stopped it. */
export type UnmeasuredPairing = {
  readonly pairing: TextPairing
  readonly foreground: string
  readonly background: string
}

/** What the bar found in one palette: what was measured, what failed, what could not be. */
export type PaletteAudit = {
  readonly palette: ThemeId
  readonly measured: readonly MeasuredPairing[]
  /** Measured and under the bar. The list a host asserts empty. */
  readonly failures: readonly MeasuredPairing[]
  /**
   * Neither a pass nor a failure. Separate from `failures` for the reason
   * `notProbeable` is separate in the registry audit: a host that wants the
   * guarantee asserts both empty, and a host whose palette is written in `hsl()`
   * can tell "unreadable" from "unmeasurable".
   */
  readonly unmeasured: readonly UnmeasuredPairing[]
}

/** Measures every pairing the primitives render, in one palette. Refuses nothing. */
export const auditPalette = (palette: Palette): PaletteAudit => {
  const results = PALETTE_TEXT_PAIRINGS.map((pairing) => {
    const foreground = palette.slots[pairing.foreground] ?? ""
    const background = palette.slots[pairing.background] ?? ""
    const ratio = contrastRatio(foreground, background)

    return ratio === undefined
      ? { pairing, unmeasured: { pairing, foreground, background } }
      : { pairing, measured: { pairing, ratio, meets: ratio >= TEXT_CONTRAST_MINIMUM } }
  })

  const measured = results.flatMap((result) => (result.measured ? [result.measured] : []))

  return {
    palette: palette.id,
    measured,
    failures: measured.filter((entry) => !entry.meets),
    unmeasured: results.flatMap((result) => (result.unmeasured ? [result.unmeasured] : [])),
  }
}

const describePairing = (pairing: TextPairing): string =>
  `${pairing.foreground} on ${pairing.background} (${pairing.where})`

/** One line per problem, for a CLI or a failing test's message. Empty when clean. */
export const describePaletteAudit = (audit: PaletteAudit): string =>
  [
    ...audit.failures.map(
      (entry) =>
        `${audit.palette}: ${describePairing(entry.pairing)} is ${entry.ratio.toFixed(2)}:1, under ${TEXT_CONTRAST_MINIMUM}:1`
    ),
    ...audit.unmeasured.map(
      (entry) =>
        `${audit.palette}: ${describePairing(entry.pairing)} could not be measured — "${entry.foreground}" on "${entry.background}" is not hex`
    ),
  ].join("\n")
