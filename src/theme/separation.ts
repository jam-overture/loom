import { labOf } from "./lab.js"
import type { Palette, PaletteSlot, ThemeId } from "./theme.js"

/**
 * Whether two slots a reader is meant to tell apart are far enough apart to be
 * told apart. The other half of what a palette owes a page.
 *
 * `contrast.ts` measures an ink against the ground behind it, which is
 * legibility: can this be read at all. Nothing measured **difference between
 * two slots a reader is meant to distinguish from each other** — a stressed
 * word beside the words either side of it, a link inside the paragraph it sits
 * in, a quiet note under a less quiet one. Both are the palette's promise and
 * only one of them was checked.
 *
 * The gap was found the expensive way, on 23 August: `loom.emphasis` asked for
 * `weight("heading")`, got a font pack that declares the same weight for
 * headings and body, and rendered a stressed word identical to its neighbours.
 * Every test passed, because every test asked whether the token was real. The
 * lesson generalises past that instance and is the reason this module exists:
 * **a token is a promise about provenance, not about difference.**
 *
 * ## Why this is not a second contrast bar
 *
 * A contrast ratio compares luminance, and two slots can differ in hue while
 * matching in luminance — 1.00:1 and plainly different colours. Asking WCAG's
 * question here would report a pair as identical that a reader distinguishes at
 * a glance, and would miss a pair that differs in luminance alone by less than
 * an eye can resolve.
 *
 * So this measures CIELAB ΔE, and the threshold is **borrowed rather than
 * invented**, which is what 0089 said the missing check would have to manage:
 * the just-noticeable difference is a published property of human vision, not a
 * number chosen to fit these palettes.
 *
 * It reports; it does not decide — the bargain `auditPalette` and
 * `auditRegistry` both make, for the same reason (0076).
 */

/**
 * ΔE below which two colours are the same colour to a reader.
 *
 * The conventional just-noticeable difference for CIE76 under controlled
 * viewing. It is a floor and not a target: a pair at 2.4 is technically
 * distinguishable and is not *distinct*, which is why what this module asserts
 * is that nothing falls under it rather than that everything comfortably clears
 * it.
 *
 * CIE76 is used rather than CIEDE2000 deliberately. It is known to overstate
 * differences among saturated blues, and it is twelve lines that a reader can
 * check against the formula — where CIEDE2000 is a page of rotation terms
 * nobody reviewing a palette would verify. The error runs in the safe
 * direction for the one thing asserted here: a pair CIE76 calls collapsed is
 * collapsed under any metric.
 */
export const JUST_NOTICEABLE_DIFFERENCE = 2.3

/**
 * The CIE76 colour difference between two colours, or `undefined` when either
 * is a form `channelsOf` declines to guess at.
 *
 * The conversion is `lab.ts`'s, shared with the module that measures how much
 * colour a single slot has: both are distances in the same space, and two
 * copies of it would be two answers to where a colour sits.
 */
export const colourDifference = (a: string, b: string): number | undefined => {
  const [first, second] = [a, b].map(labOf)
  if (!first || !second) return undefined

  const [lightness, green, blue] = first
  const [otherLightness, otherGreen, otherBlue] = second

  return Math.sqrt(
    (lightness - otherLightness) ** 2 + (green - otherGreen) ** 2 + (blue - otherBlue) ** 2
  )
}

/**
 * How the reader is told the two apart, which decides what a collapse means.
 *
 * **`colour-only`** — nothing but the colour separates them where they meet. A
 * palette that collapses one has a page in it where two different things look
 * like one thing, and no tree can avoid it.
 *
 * **`also-marked`** — a rule, a border or an outline separates them as well, so
 * the two colours are free to be equal. `minimal` is the argument for this
 * basis existing: its `bg-surface` *is* its `bg-canvas`, deliberately, because
 * every card in that palette is defined by its border. What is asserted for
 * these is the weaker and still real claim — the mark itself has to be visible
 * against both.
 */
export type PeerBasis = "colour-only" | "also-marked"

type PeerBase = {
  readonly first: PaletteSlot
  readonly second: PaletteSlot
  /** Where a reader meets them together, so a collapse names a page. */
  readonly where: string
}

/**
 * Two slots a reader is meant to tell apart, and what tells them apart.
 *
 * A discriminated union rather than an optional field, so an `also-marked`
 * peer cannot be declared without naming the mark that does the marking. A
 * claim that something else carries the pair is only worth making if the
 * something else can be measured too.
 */
export type PeerPairing =
  | (PeerBase & { readonly basis: "colour-only" })
  | (PeerBase & { readonly basis: "also-marked"; readonly mark: PaletteSlot })

/**
 * The pairs the library actually asks a reader to distinguish.
 *
 * Declared rather than derived, and that is not the compromise it looks like.
 * A probe can see that `loom.link` sets `accent` inside a `loom.prose` that set
 * `fg-default`; nothing in either component says the reader is *meant* to tell
 * them apart, because that is what the two mean rather than what they render —
 * the same thing `PALETTE_TEXT_GROUNDS` has to declare, for the same reason
 * (0089).
 *
 * Two rules keep the list honest, both borrowed from `PALETTE_TEXT_PAIRINGS`:
 * every row names somewhere the library really puts the two together, and
 * **nothing may be demoted.** A pair that is `colour-only` in any place where
 * the boundary is what the reader reads is `colour-only` here, whatever else
 * marks it elsewhere: `loom.card` outlines its surface, and `loom.section
 * tone="surface"` paints the same fill on the same canvas with no border at
 * all, so the pair answers for the section. Where two primitives mark a pair
 * with different rules, the row names the fainter of them.
 *
 * *Where the boundary is what the reader reads* is doing real work in that
 * sentence and is a judgement rather than a derivation. `loom.avatar` and
 * `loom.media` paint the muted well on an unbordered ground too, and they are
 * not why those rows exist: what a reader is meant to see in an avatar is the
 * monogram and in a media frame is the picture, and the ink and the picture are
 * held to their own bars elsewhere. A well whose edge nobody looks for is not a
 * pair anybody is being asked to tell apart.
 */
export const PALETTE_PEER_PAIRINGS: readonly PeerPairing[] = [
  {
    first: "fg-default",
    second: "fg-muted",
    basis: "colour-only",
    where: "loom.prose tone muted under a default one",
  },
  {
    first: "fg-muted",
    second: "fg-subtle",
    basis: "colour-only",
    where: "loom.tier note under its body, loom.milestone",
  },
  /**
   * The row that fails, and the reason the module is worth its tests. A
   * `loom.link` in a paragraph is `accent` on the `fg-default` around it, at
   * rest with no underline — the wipe-in rule arrives on hover — and no
   * difference in weight. Colour is the whole of the signal.
   */
  {
    first: "fg-default",
    second: "accent",
    basis: "colour-only",
    where: "loom.link tone accent inside a paragraph",
  },
  {
    first: "bg-canvas",
    second: "bg-surface",
    basis: "colour-only",
    where: "loom.section tone surface, which paints a band and no border",
  },
  {
    first: "bg-canvas",
    second: "accent-subtle",
    basis: "colour-only",
    where: "loom.section tone accent, likewise",
  },
  {
    first: "bg-surface",
    second: "bg-surface-muted",
    basis: "also-marked",
    mark: "border-subtle",
    where: "loom.code panel inside a card",
  },
  {
    first: "bg-canvas",
    second: "bg-surface-muted",
    basis: "also-marked",
    mark: "border-subtle",
    where: "loom.code panel on a page; loom.callout marks the same pair harder",
  },
]

/** A peer that was measured, whether or not it came apart. */
export type MeasuredPeer = {
  readonly pairing: PeerPairing
  readonly difference: number
  /**
   * How far the mark is from whichever of the two it is nearer to — the mark's
   * worst case, since it has to be visible against both.
   *
   * `undefined` for a `colour-only` peer, which has no mark, and for a mark
   * written in a form this cannot measure. The second case judges the pair on
   * its colours alone, which is the safe direction: a defence that cannot be
   * measured is not counted as one.
   */
  readonly markDifference: number | undefined
  readonly separated: boolean
}

/** A peer whose colours could not be measured, and which colour stopped it. */
export type UnmeasuredPeer = {
  readonly pairing: PeerPairing
  readonly first: string
  readonly second: string
}

/** What one palette does with the pairs its reader has to tell apart. */
export type PaletteSeparation = {
  readonly palette: ThemeId
  readonly measured: readonly MeasuredPeer[]
  /**
   * Colour-only peers under the threshold: two things that look like one thing,
   * with nothing else to go on. The list a host asserts empty.
   */
  readonly collapsed: readonly MeasuredPeer[]
  /**
   * Marked peers whose colours have collapsed **and** whose mark has too — a
   * card that is neither filled nor outlined. Separate from `collapsed` because
   * it is a different defect with a different fix, and because a marked pair
   * whose mark is doing its job is not a defect at all.
   */
  readonly unmarked: readonly MeasuredPeer[]
  /** Neither separated nor collapsed: a colour this cannot measure. */
  readonly unmeasured: readonly UnmeasuredPeer[]
}

const markOf = (pairing: PeerPairing): PaletteSlot | undefined =>
  pairing.basis === "also-marked" ? pairing.mark : undefined

/**
 * How far a mark is from the *nearer* of the two it separates.
 *
 * The worst of the two rather than the average, because a rule that disappears
 * into one side of the boundary it draws has stopped drawing it.
 */
const markSeparation = (mark: string, first: string, second: string): number | undefined => {
  const toFirst = colourDifference(mark, first)
  const toSecond = colourDifference(mark, second)

  return toFirst === undefined || toSecond === undefined ? undefined : Math.min(toFirst, toSecond)
}

/**
 * Measures every declared peer in one palette. Refuses nothing.
 *
 * `peers` defaults to the pairs Loom's own library puts in front of a reader. A
 * host with its own primitives declares its own, the way it passes its own
 * pairings to `auditPalette`.
 */
export const auditSeparation = (
  palette: Palette,
  peers: readonly PeerPairing[] = PALETTE_PEER_PAIRINGS
): PaletteSeparation => {
  const results = peers.map((pairing) => {
    const first = palette.slots[pairing.first] ?? ""
    const second = palette.slots[pairing.second] ?? ""
    const difference = colourDifference(first, second)

    if (difference === undefined) return { unmeasured: { pairing, first, second } }

    const mark = markOf(pairing)
    const markDifference =
      mark === undefined ? undefined : markSeparation(palette.slots[mark] ?? "", first, second)

    return {
      measured: {
        pairing,
        difference,
        markDifference,
        separated:
          difference >= JUST_NOTICEABLE_DIFFERENCE ||
          (markDifference !== undefined && markDifference >= JUST_NOTICEABLE_DIFFERENCE),
      },
    }
  })

  const measured = results.flatMap((result) => (result.measured ? [result.measured] : []))
  const apart = measured.filter((entry) => !entry.separated)

  return {
    palette: palette.id,
    measured,
    collapsed: apart.filter((entry) => entry.pairing.basis === "colour-only"),
    unmarked: apart.filter((entry) => entry.pairing.basis === "also-marked"),
    unmeasured: results.flatMap((result) => (result.unmeasured ? [result.unmeasured] : [])),
  }
}

const describePeer = (pairing: PeerPairing): string =>
  `${pairing.first} and ${pairing.second} (${pairing.where})`

/** One line per problem, for a CLI or a failing test's message. Empty when clean. */
export const describeSeparationAudit = (audit: PaletteSeparation): string =>
  [
    ...audit.collapsed.map(
      (entry) =>
        `${audit.palette}: ${describePeer(entry.pairing)} differ by ${entry.difference.toFixed(2)}, under ${JUST_NOTICEABLE_DIFFERENCE} — nothing else tells them apart`
    ),
    ...audit.unmarked.map(
      (entry) =>
        `${audit.palette}: ${describePeer(entry.pairing)} differ by ${entry.difference.toFixed(2)} and their mark by ${(entry.markDifference ?? 0).toFixed(2)}, both under ${JUST_NOTICEABLE_DIFFERENCE}`
    ),
    ...audit.unmeasured.map(
      (entry) =>
        `${audit.palette}: ${describePeer(entry.pairing)} could not be measured — "${entry.first}" and "${entry.second}" are not both hex`
    ),
  ].join("\n")
