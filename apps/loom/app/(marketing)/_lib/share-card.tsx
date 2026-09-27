import type { PaletteSlot, ResolvedTheme } from "@jam-overture/loom"
import type { ReactElement } from "react"

import type { ShareCard } from "./share"

/**
 * The card, drawn.
 *
 * **This is the one thing on this site that is not a Loom tree, and the reason
 * is worth stating rather than hiding.** A share card is a PNG. The renderer is
 * a total pure projection into React (0008), a primitive paints itself by
 * reading `var(--loom-accent)` off the root, and the image renderer resolves no
 * cascade and no custom properties at all — so there is no arrangement of the
 * seam by which a registered primitive can draw one pixel of this file. It is
 * filed for `Loom daily build` as the gap it is: the framework has one
 * projection, and a surface that needs the same page in a second medium has to
 * draw it by hand.
 *
 * What that does **not** license is a component library. There is one element
 * here, it is private to this module, no page imports it, and it is a picture of
 * a page rather than a piece of one.
 *
 * The rule the site does keep, it keeps exactly: **not one colour, size or
 * weight below is written down here.** Every one is read off the registered
 * theme the address selects — the palette's slots, the font pack's ramp and
 * weights, the style preset's radii and spacing — so `?theme=bold` unfurls in
 * the bold palette, and a palette edited in `src/theme` moves this card without
 * anybody remembering it exists.
 *
 * Every ink-on-ground pair below is one `PALETTE_TEXT_PAIRINGS` already holds to
 * 4.5:1 (0074). `share-card.test.tsx` measures them under all three starter
 * palettes rather than taking that on trust — an unreadable card is a failure
 * only a stranger would ever see, which is the kind this site tests for.
 */

/** 1.91:1, which is what every unfurler crops to. */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const

export const ink = (theme: ResolvedTheme, slot: PaletteSlot): string => {
  const colour = theme.palette.slots[slot]

  if (colour === undefined) {
    throw new Error(`loom: the ${theme.palette.id} palette has no ${slot}`)
  }

  return colour
}

/**
 * A step of the theme's own type ramp, by index.
 *
 * The ramp is eight px values smallest first, and the packs disagree about them
 * on purpose — `bold-sans` tops out at 88 where `minimal-sans` stops at 72 — so
 * reading the step rather than a number is what makes the card's typography the
 * theme's rather than this file's.
 */
const step = (theme: ResolvedTheme, index: number): number => {
  const size = theme.fontPack.scaleRamp[index]

  if (size === undefined) {
    throw new Error(`loom: ${theme.fontPack.id} has no type step ${index}`)
  }

  return size
}

const space = (theme: ResolvedTheme, index: number): number => {
  const size = theme.stylePreset.spacingScale[index]

  if (size === undefined) {
    throw new Error(`loom: ${theme.stylePreset.id} has no spacing step ${index}`)
  }

  return size
}

/**
 * The ink used for each thing on the card, and the ground it sits on.
 *
 * Exported as data so the contrast test measures what is drawn rather than a
 * second list of what somebody believed was drawn. A pairing added to the card
 * and not to this map is a pairing the element cannot use — there is nowhere
 * else for a colour to come from.
 */
export const CARD_PAIRINGS: readonly {
  readonly what: string
  readonly foreground: PaletteSlot
  readonly background: PaletteSlot
}[] = [
  { what: "the wordmark", foreground: "fg-default", background: "bg-canvas" },
  { what: "an accent pill", foreground: "accent-strong", background: "accent-subtle" },
  { what: "a neutral pill", foreground: "fg-muted", background: "bg-surface-muted" },
  { what: "the headline", foreground: "fg-default", background: "bg-canvas" },
  { what: "the supporting line", foreground: "fg-muted", background: "bg-canvas" },
  { what: "the footnote and the address", foreground: "fg-subtle", background: "bg-canvas" },
]

/**
 * The one band of colour on the card, and the only place the palette is painted
 * as an area rather than read as ink.
 *
 * `accent-strong` and `brand-secondary` are the two slots every palette gives
 * real chroma to for exactly this — `palettes.ts` says so in terms, and
 * `loom.hero`'s aurora is the other place that uses them this way. Nothing sits
 * on top of it, so it is decoration that cannot make anything unreadable.
 */
const banner = (theme: ResolvedTheme): ReactElement => (
  <div
    style={{
      display: "flex",
      height: space(theme, 2),
      width: "100%",
      backgroundImage: `linear-gradient(90deg, ${ink(theme, "accent-strong")}, ${ink(
        theme,
        "brand-secondary"
      )})`,
    }}
  />
)

/**
 * The verdict, as `loom.badge` wears one: the accent pair when the visitor can
 * still act on it, the neutral pair when they cannot.
 *
 * Both pairs are ones the library already paints and the palettes are already
 * held to. The library has no red and that is a recorded decision, so a refusal
 * cannot be painted as a refusal — what it can be is not painted as the tone
 * this site uses to say *look here*, which is `toneFor`'s whole point.
 */
const eyebrow = (
  theme: ResolvedTheme,
  words: string,
  tone: "accent" | "neutral"
): ReactElement => (
  <div
    style={{
      display: "flex",
      backgroundColor: ink(theme, tone === "accent" ? "accent-subtle" : "bg-surface-muted"),
      color: ink(theme, tone === "accent" ? "accent-strong" : "fg-muted"),
      borderRadius: theme.stylePreset.radii.full,
      paddingTop: space(theme, 1),
      paddingBottom: space(theme, 1),
      paddingLeft: space(theme, 3),
      paddingRight: space(theme, 3),
      fontSize: step(theme, 1),
      fontWeight: theme.fontPack.headingWeight,
      letterSpacing: "0.06em",
    }}
  >
    {words}
  </div>
)

export const shareCardImage = (card: ShareCard, theme: ResolvedTheme): ReactElement => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundColor: ink(theme, "bg-canvas"),
      fontFamily: theme.fontPack.bodyFamily,
    }}
  >
    {banner(theme)}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        justifyContent: "space-between",
        paddingTop: space(theme, 6),
        paddingBottom: space(theme, 6),
        paddingLeft: space(theme, 6),
        paddingRight: space(theme, 6),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            color: ink(theme, "fg-default"),
            fontFamily: theme.fontPack.headingFamily,
            fontSize: step(theme, 4),
            fontWeight: theme.fontPack.headingWeight,
            letterSpacing: "-0.01em",
          }}
        >
          {card.wordmark}
        </div>
        {card.eyebrow === undefined ? (
          <div style={{ display: "flex" }} />
        ) : (
          eyebrow(theme, card.eyebrow, card.tone ?? "neutral")
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            color: ink(theme, "fg-default"),
            fontFamily: theme.fontPack.headingFamily,
            fontSize: step(theme, 6),
            fontWeight: theme.fontPack.headingWeight,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {card.headline}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: space(theme, 3),
            color: ink(theme, "fg-muted"),
            fontSize: step(theme, 4),
            fontWeight: theme.fontPack.bodyWeight,
            lineHeight: 1.4,
          }}
        >
          {card.supporting}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${ink(theme, "border-default")}`,
          paddingTop: space(theme, 2),
          color: ink(theme, "fg-subtle"),
          fontSize: step(theme, 1),
        }}
      >
        <div style={{ display: "flex" }}>{card.footnote ?? ""}</div>
        <div style={{ display: "flex" }}>{card.address}</div>
      </div>
    </div>
  </div>
)
