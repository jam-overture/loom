import type { Palette, PaletteSlot, ThemeId } from "./theme.js"

/**
 * The contrast bar, as a function a host can run against its own palettes (0074).
 *
 * A palette slot that primitives put text in meets 4.5:1 against every
 * background they pair it with, and the three starter palettes clear it because
 * a test iterating `STARTER_PALETTES` says so. `createThemeRegistry({ palettes })`
 * *replaces* that list (0049), so a host supplying its own gets `paletteSchema` —
 * which checks that every slot holds a color and has no idea which slots are
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

/** WCAG AA for body text — the bar this module holds every text slot to (0074). */
export const TEXT_CONTRAST_MINIMUM = 4.5

/**
 * The grounds every ink in the text ramp has to be readable on (0089).
 *
 * The one thing `registryPairings` cannot derive, and the reason it takes this
 * as an argument. A probe can see that `loom.action` puts children on `accent`
 * and that `loom.page` puts them on `bg-canvas`; nothing in either component
 * says the first is a filled control that answers its own ink with
 * `fg-on-accent` while the second is a page surface where a child brings
 * whichever ink it likes. Both set a color beside the ground and only one of
 * them means it.
 *
 * So the four are declared here. A ground on this list is one where a palette
 * owes the reader every ink in the ramp; a ground off it is one where the
 * primitive painting it has already answered what color the text is, and
 * holding a palette to `fg-muted` on `accent` would be a bar no palette can
 * pass — it is 1.00:1 in some palette however the palette is written.
 */
export const PALETTE_TEXT_GROUNDS: readonly PaletteSlot[] = [
  "bg-canvas",
  "bg-surface",
  "bg-surface-muted",
  "accent-subtle",
  /**
   * The fifth, and the one that had to be found rather than chosen. This list
   * was settled when nothing in the library painted `bg-overlay` at all, and
   * the record settling it provided for exactly this case (0089): a new ground
   * turning up in `groundsOutsideTheRamp` means either a primitive is painting
   * somewhere unconsidered or this list has fallen behind the library.
   * `loom.overlay` shipped on 15 September and puts arbitrary children on its
   * scrim, so the second is what happened — six days of it, seen by nobody,
   * because the derivation could not follow a ground painted by a stacked
   * sibling until today.
   *
   * It is on this list rather than beside `accent` because the primitive has
   * *not* answered the ink. `loom.action` fills `accent` and writes
   * `fg-on-accent` on it, and holding a palette to `fg-muted` there is a bar no
   * palette can pass. An overlay sets `fg-default` at its root and then takes
   * whatever a model puts inside it, the way a card does.
   */
  "bg-overlay",
]

/**
 * How a pairing comes about, which decides what a failure means (0089).
 *
 * **`painted`** — one primitive sets both ends. A palette that fails one has a
 * page in it nobody can read, and no tree can avoid it, so this is the bar.
 *
 * **`composed`** — a primitive sets an ink and leaves the ground to whatever it
 * is placed in. Reachable in a legal tree and reported, not asserted: see
 * `PaletteAudit.composedFailures` for why the two are counted apart.
 */
export type PairingBasis = "painted" | "composed"

/**
 * A foreground slot read on a background slot, and where they meet.
 *
 * Read off `src/primitives` rather than imagined, which is what makes the check
 * worth failing over: every pairing here is one some component actually
 * renders, so a palette that fails one has a page in it that a reader cannot
 * read. A pairing nothing renders would be a bar chosen for its own sake.
 *
 * That was a promise a person kept by hand until it was nine pairings out of
 * date. Both halves of it are now checked against the components themselves —
 * `registryPairings` derives what the library renders, and `pairings.test.ts`
 * fails if this list is missing any of it or carries a row nothing renders.
 *
 * **What the derivation does not see, so this list does not claim it.** The
 * probe renders each primitive with nothing configured but its closed choices,
 * so an element a component draws only when an optional prop is given never
 * exists, and the ink it would paint is never derived. That is not a gap the
 * check can close — the alternative is a probe that invents a price and a date,
 * and a pairing derived from an invented value is a fact about the invention —
 * so `RegistryPairings.unprobedProps` names where it stops instead. A row here
 * may therefore be `painted` on the strength of a component read by a person
 * where the probe could only reach `composed`; the checks allow that direction
 * and refuse the other, because declaring a stricter bar than the derivation
 * found is safe and declaring a softer one is how a real failure goes quiet.
 */
export type TextPairing = {
  readonly foreground: PaletteSlot
  readonly background: PaletteSlot
  readonly basis: PairingBasis
  /** Where it happens, so a failure names a page rather than two slot ids. */
  readonly where: string
}

export const PALETTE_TEXT_PAIRINGS: readonly TextPairing[] = [
  // Painted: one primitive sets the ink and the ground beneath it.
  { foreground: "fg-default", background: "bg-canvas", basis: "painted", where: "loom.page body copy" },
  { foreground: "fg-default", background: "bg-surface", basis: "painted", where: "loom.card body copy" },
  { foreground: "fg-default", background: "bg-surface-muted", basis: "painted", where: "loom.callout body, loom.code panel" },
  { foreground: "fg-default", background: "accent-subtle", basis: "painted", where: "loom.section tone accent" },
  { foreground: "fg-muted", background: "bg-surface", basis: "painted", where: "loom.feature body" },
  { foreground: "fg-muted", background: "bg-surface-muted", basis: "painted", where: "loom.form hint, loom.badge neutral" },
  { foreground: "fg-on-accent", background: "accent", basis: "painted", where: "loom.action primary label" },
  { foreground: "accent", background: "bg-surface", basis: "painted", where: "loom.quote attribution" },
  { foreground: "accent-strong", background: "accent-subtle", basis: "painted", where: "loom.badge accent, loom.icon soft" },
  /**
   * Painted, and the derivation cannot see it. `loom.offering` sets its price in
   * `accent-strong` on the `bg-surface` of the card it drew, so both ends are
   * one primitive's — but the price element exists only when the optional
   * `price` prop is given, and the probe gives it nothing. It was declared
   * `composed` for exactly that reason, which meant a palette failing it would
   * have been reported rather than refused, on a page nobody can read.
   *
   * `loom.field` reaches the same pairing the other way, by floating its ink
   * into a card, and is kept in the `where` because it is the case a reader is
   * more likely to hit.
   */
  {
    foreground: "accent-strong",
    background: "bg-surface",
    basis: "painted",
    where: "loom.offering price, loom.field inside a card",
  },
  /**
   * `fg-subtle` is held to the body-text bar like the rest (0074). The
   * slot recedes and none of what it carries is reliably large — a `loom.footer`
   * note row and a `loom.tier` note are ordinary small text — so a threshold of
   * 3:1 would be a bar chosen to fit the colors rather than the reader.
   */
  /**
   * Painted across a stack rather than down a chain: `loom.overlay` sets the ink
   * on its root, paints `bg-overlay` on a scrim in grid cell `1 / 1`, and lays
   * the words over it in the same cell one layer up. Read as an ancestor chain
   * the two ends never meet, which is why this row was missing for the six days
   * between the primitive shipping and the probe learning to see a sibling.
   *
   * `painted` and not `composed`: both ends are the primitive's own and no
   * container can change either. The scrim is drawn at 0.78 or 0.92 opacity over
   * a ground the author supplied, so clearing this is necessary and not
   * sufficient — an unreadable photograph is `loom.overlay`'s own standing
   * finding and not a thing a palette can answer.
   */
  { foreground: "fg-default", background: "bg-overlay", basis: "painted", where: "loom.overlay content over its scrim" },
  { foreground: "fg-subtle", background: "bg-surface", basis: "painted", where: "loom.footer note row" },
  { foreground: "fg-subtle", background: "bg-surface-muted", basis: "painted", where: "loom.perk excluded marker" },

  /**
   * Composed: the ink is set here and the ground comes from whatever the
   * primitive is placed in. Every ink that floats, on every ground the ramp is
   * held to — which is the full set rather than the ones somebody pictured,
   * because a tree may nest any of them inside any other (0008).
   */
  { foreground: "fg-muted", background: "bg-canvas", basis: "composed", where: "loom.prose tone muted" },
  { foreground: "fg-muted", background: "accent-subtle", basis: "composed", where: "loom.feature body inside an accent section" },
  { foreground: "fg-subtle", background: "bg-canvas", basis: "composed", where: "loom.footer note, loom.link-list group label" },
  { foreground: "accent", background: "bg-canvas", basis: "composed", where: "loom.section eyebrow, loom.link current" },
  { foreground: "accent", background: "bg-surface-muted", basis: "composed", where: "loom.faq marker inside a muted well" },
  { foreground: "accent-strong", background: "bg-canvas", basis: "composed", where: "loom.field validation message" },
  { foreground: "accent-strong", background: "bg-surface-muted", basis: "composed", where: "loom.field inside a muted well" },
  /**
   * The overlay's content is whatever a model put in it, so every ink that
   * floats lands here the way it lands on a card. Under all twenty-one starter
   * palettes `bg-overlay` holds the same value as `bg-surface`, so these four
   * measure what their `bg-surface` rows already measure — which is the point:
   * a host is free to give the slot its own value, and until now nothing would
   * have read it.
   */
  { foreground: "fg-muted", background: "bg-overlay", basis: "composed", where: "loom.prose tone muted over a photograph" },
  { foreground: "fg-subtle", background: "bg-overlay", basis: "composed", where: "loom.footer note inside an overlay" },
  { foreground: "accent", background: "bg-overlay", basis: "composed", where: "loom.section eyebrow over a photograph" },
  { foreground: "accent-strong", background: "bg-overlay", basis: "composed", where: "loom.field validation message inside an overlay" },
  /**
   * The two the library does not clear. Both are an ink placed on the tinted
   * panel, both are reachable in an ordinary tree — a perk list inside a
   * `loom.section tone="accent"` is the whole of it — and neither is a bar
   * chosen to fit the colors: `accent` is 4.43:1 on `plum` and `fg-subtle` is
   * 3.76:1 on `carbon`, against a 4.5 that every other pairing here clears.
   *
   * They are listed rather than omitted because the alternative is an audit
   * that is silent about the pairings it would fail, which is the exact fault
   * this list was rewritten to fix. What to move — the panel toward the canvas,
   * or the ink toward `fg-muted` — costs something either way, both costs are
   * measured, and until the choice is made `composedFailures` carries these two
   * in the open (0089).
   */
  { foreground: "accent", background: "accent-subtle", basis: "composed", where: "loom.faq marker inside an accent section" },
  { foreground: "fg-subtle", background: "accent-subtle", basis: "composed", where: "loom.perk note inside an accent section" },
]

/** sRGB channel, linearized. WCAG's own curve. */
const channel = (value: number): number => {
  const c = value / 255

  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/**
 * The color as three 0–255 channels, or nothing when it is a form this cannot
 * measure.
 *
 * `colorSchema` accepts more than hex — `rgb()`, `hsl()`, a named color, and
 * eight-digit hex with an alpha. Only three- and six-digit hex are measured
 * here, and the rest answer `undefined` rather than a guess:
 *
 * - a named color needs the CSS color table, which is 148 entries of vocabulary
 *   this module would then own
 * - `hsl()` and modern `rgb()` syntax are a parser, and a parser that is subtly
 *   wrong reports a passing ratio for a failing pair, which is worse than
 *   reporting nothing
 * - an alpha composites against whatever is behind it, so its contrast is not a
 *   property of the two slots at all
 *
 * Answering "I could not measure this" is the same move `not-probeable` makes in
 * the conformance probe: a check that cannot answer says so, rather than passing.
 *
 * Exported because `separation.ts` measures the same palette in a different
 * color space and has to decline the same forms for the same reasons. Two
 * parsers would be two answers to "is this measurable".
 */
export const channelsOf = (color: string): readonly [number, number, number] | undefined => {
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color)?.[1]
  if (hex === undefined) return undefined

  const pairs =
    hex.length === 3 ? [...hex].map((digit) => `${digit}${digit}`) : [0, 2, 4].map((at) => hex.slice(at, at + 2))

  const [r, g, b] = pairs.map((pair) => Number.parseInt(pair, 16))

  return r === undefined || g === undefined || b === undefined ? undefined : [r, g, b]
}

const luminance = ([r, g, b]: readonly [number, number, number]): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

/**
 * Relative luminance, or `undefined` for a form `channelsOf` declines to guess
 * at.
 *
 * A ratio is a question about two colors; **how dark is this** is a question
 * about one, and `measure.ts` has to ask it — a scrim is asked to darken what is
 * under it, and darkening is a property of the wash rather than of a pair. It is
 * computed here, with WCAG's curve, rather than a second time somewhere else
 * against a curve half a rounding away from this one.
 */
export const relativeLuminance = (color: string): number | undefined => {
  const channels = channelsOf(color)

  return channels === undefined ? undefined : luminance(channels)
}

/**
 * The WCAG contrast ratio between two colors, or `undefined` when either is a
 * form `channelsOf` declines to guess at.
 */
export const contrastRatio = (a: string, b: string): number | undefined => {
  const [first, second] = [a, b].map(channelsOf)
  if (!first || !second) return undefined

  const [high, low] = [luminance(first), luminance(second)].sort((x, y) => y - x)

  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

/** A pairing that was measured, whether or not it cleared the bar. */
export type MeasuredPairing = {
  readonly pairing: TextPairing
  readonly ratio: number
  readonly meets: boolean
}

/** A pairing whose colors could not be measured, and which color stopped it. */
export type UnmeasuredPairing = {
  readonly pairing: TextPairing
  readonly foreground: string
  readonly background: string
}

/** What the bar found in one palette: what was measured, what failed, what could not be. */
export type PaletteAudit = {
  readonly palette: ThemeId
  readonly measured: readonly MeasuredPairing[]
  /**
   * Measured, `painted`, and under the bar. The list a host asserts empty.
   *
   * Painted only, because a painted failure is a page nobody can read and no
   * tree can avoid it — both ends are one primitive's own. That is a defect in
   * the palette with one fix, and asserting it empty is a promise a palette can
   * keep.
   */
  readonly failures: readonly MeasuredPairing[]
  /**
   * Measured, `composed`, and under the bar — reported rather than asserted.
   *
   * The split is not a softer bar for the same fault, and it is worth being
   * plain about why, because a second list is exactly where an inconvenient
   * failure would go to be forgotten.
   *
   * A composed pairing needs a tree that puts the two together. It is reachable
   * — `loom.perk` inside a `loom.section tone="accent"` is an ordinary page —
   * but whether a given deployment reaches it depends on trees nobody has
   * written yet, and the fix is not always the palette's: an ink that fails on
   * one ground and clears the other three may be a panel that wants moving.
   * Loom measures and reports, and imposing is the host's call — the bargain
   * the contrast bar already makes, applied here one level in (0076).
   *
   * What keeps it honest is that nothing may be *demoted* into it. A pairing
   * any primitive paints is `painted` in the declared list whatever else also
   * composes it, and `library.test.ts` fails if the declared basis is softer
   * than the derivation's.
   */
  readonly composedFailures: readonly MeasuredPairing[]
  /**
   * Neither a pass nor a failure. Separate from `failures` for the reason
   * `notProbeable` is separate in the registry audit: a host that wants the
   * guarantee asserts both empty, and a host whose palette is written in `hsl()`
   * can tell "unreadable" from "unmeasurable".
   */
  readonly unmeasured: readonly UnmeasuredPairing[]
}

/**
 * Measures every pairing the primitives render, in one palette. Refuses nothing.
 *
 * `pairings` defaults to the list Loom's own library renders. A host passes its
 * own — `registryPairings(registry, PALETTE_TEXT_GROUNDS)` derives it from the
 * components rather than asking anyone to keep a list — and gets the bar held
 * to the primitives it actually registered rather than to ours.
 */
export const auditPalette = (
  palette: Palette,
  pairings: readonly TextPairing[] = PALETTE_TEXT_PAIRINGS
): PaletteAudit => {
  const results = pairings.map((pairing) => {
    const foreground = palette.slots[pairing.foreground] ?? ""
    const background = palette.slots[pairing.background] ?? ""
    const ratio = contrastRatio(foreground, background)

    return ratio === undefined
      ? { pairing, unmeasured: { pairing, foreground, background } }
      : { pairing, measured: { pairing, ratio, meets: ratio >= TEXT_CONTRAST_MINIMUM } }
  })

  const measured = results.flatMap((result) => (result.measured ? [result.measured] : []))
  const under = measured.filter((entry) => !entry.meets)

  return {
    palette: palette.id,
    measured,
    failures: under.filter((entry) => entry.pairing.basis === "painted"),
    composedFailures: under.filter((entry) => entry.pairing.basis === "composed"),
    unmeasured: results.flatMap((result) => (result.unmeasured ? [result.unmeasured] : [])),
  }
}

const describePairing = (pairing: TextPairing): string =>
  `${pairing.foreground} on ${pairing.background} (${pairing.where})`

/**
 * One line per problem, for a CLI or a failing test's message. Empty when clean.
 *
 * Composed failures are printed too, and said to be composed. A description
 * that showed only what is asserted would let a reader take an empty string for
 * a clean palette, and on eight of the palettes in this library that would be
 * false.
 */
export const describePaletteAudit = (audit: PaletteAudit): string =>
  [
    ...audit.failures.map(
      (entry) =>
        `${audit.palette}: ${describePairing(entry.pairing)} is ${entry.ratio.toFixed(2)}:1, under ${TEXT_CONTRAST_MINIMUM}:1`
    ),
    ...audit.composedFailures.map(
      (entry) =>
        `${audit.palette}: ${describePairing(entry.pairing)} is ${entry.ratio.toFixed(2)}:1, under ${TEXT_CONTRAST_MINIMUM}:1 — composed, reported not asserted`
    ),
    ...audit.unmeasured.map(
      (entry) =>
        `${audit.palette}: ${describePairing(entry.pairing)} could not be measured — "${entry.foreground}" on "${entry.background}" is not hex`
    ),
  ].join("\n")
