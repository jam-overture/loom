import { createElement, type CSSProperties, type ReactNode } from "react"

import { LIBRARY_CLASS } from "./stylesheet.js"
import { colour, motion } from "./tokens.js"

/**
 * The atmosphere a band is painted on, as layers rather than as a background.
 *
 * This file exists because for three weeks **`loom.hero` was the only primitive
 * in eighty-nine that could paint anything behind its content**, and its two
 * paints were written inline where nothing else could reach them. Every other
 * band on a Loom page got `bg-canvas`, `bg-surface` or `accent-subtle` — three
 * flat washes — which is the difference between a page that reads as a product
 * and a page that reads as a document, and it was invisible from the port map
 * because atmosphere is not a Hermes content model.
 *
 * Five paints, and the test each one had to pass to be here is **a reader can
 * tell it apart from the other four at a glance**, not "it is a different
 * number". Two colour fields drifting, a ruled blueprint, a lattice of points,
 * beams from above, one pool of light. A sixth that was merely a dimmer aurora
 * would be [0052](../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
 * shades-of-one mistake in the one place this library has room for it.
 *
 * ## What a paint may not do
 *
 * **Name a colour.** Hermes' gradient heroes took `from`, `to` and `via` as raw
 * hex from the page author, so re-theming a page left its hero behind. Every
 * value below is a palette slot, which is what keeps a re-theme one `configure`
 * on the root ([0049](../../decisions/0049-a-theme-is-three-ids-in-the-tree.md)).
 *
 * **Carry a duration.** The drift is a class in the shared stylesheet and the
 * tree says only which paint it wants ([0055](../../decisions/0055-motion-is-a-static-stylesheet-the-primitive-emits.md)).
 *
 * **Reach the reader.** Every layer is `aria-hidden` with `pointer-events:
 * none`. A backdrop that could be tabbed into, or read out, is decoration
 * pretending to be content.
 *
 * ## The two traps, both found the hard way and both still live here
 *
 * **Fade with a mask, never to `transparent`.** A gradient that ends at
 * `transparent` interpolates towards transparent *black*, so an accent field
 * greys out on its way to nothing and the element's own square edge stays
 * visible where the gradient has not finished. A mask fades opacity alone, so
 * the colour is the palette's to the last pixel.
 *
 * **A field hangs inside its band, not off the corner.** The obvious way to
 * write a glow in a corner is negative insets and a bigger box; with the
 * `overflow: hidden` a backdrop needs, that renders as a rectangle with two
 * hard sides — the clip cutting through the middle of the glow. Each field sits
 * inside the band and its own mask reaches zero at its own edges.
 *
 * ## Every paint is centred on its band, and that is a rule rather than taste
 *
 * These five were written for `loom.hero`, which is one screen tall and is the
 * first thing on the page, so they were all anchored to the top edge and
 * brightest there: `ellipse at 50% 0%`, a pool `at 50% 0%`, an elliptical mask
 * that fills whatever box it is given.
 *
 * **Every one of those is a hero-only assumption, and each produced a visible
 * defect the first time a short band used it.** In a band three hundred pixels
 * tall, a field masked by an *ellipse* is not a glow, it is a horizontal smear
 * with a hard top edge; a pool anchored at `0%` is a bright bar ruled across
 * the band's top. Both read as dirt on the page rather than as light behind it.
 *
 * So: **a paint is brightest at the middle of its band and reaches nothing at
 * every edge**, because a backdrop cannot know whether its band is the top of a
 * page or the fifth thing down it. `circle closest-side` rather than the
 * default ellipse is the same rule for the fields — a circle sized by the
 * *shorter* side stays a glow at any aspect the band happens to have, where an
 * ellipse becomes the box.
 */

export const PAINT_NAMES = ["aurora", "grid", "dots", "rays", "spotlight"] as const
export type PaintName = (typeof PAINT_NAMES)[number]

/**
 * A radial fade to nothing, used as a mask rather than as a gradient. See the
 * first trap above for why this is not `… , transparent 100%` in a background.
 */
const CLOSEST_SIDE_FADE = "radial-gradient(circle closest-side, black 0%, transparent 100%)"

const LAYER: CSSProperties = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
}

/**
 * A third of an opacity is what a hero's fields have carried since they
 * shipped, and it is too much once the same paint is a band rather than a
 * screen: the field is smaller, so the colour is concentrated, and under a
 * low-chroma palette — `editorial`'s accent is a slate `#34425a` — a
 * concentrated tint is not light behind the band, it is a grey blob on it.
 * Spread out it reads as atmosphere; concentrated it reads as dirt.
 *
 * This is the 20 August finding's unresolved half. Moving to `accent-strong`
 * fixed the *slot*; nothing fixed the fact that a palette may have very little
 * chroma to give, and no primitive can know that it does. Filed.
 */
const AURORA_OPACITY = 0.26

/**
 * **`accent-strong`, not `accent`**, and the difference is a finding the
 * marketing routine filed on 20 August. A slot cannot be both near-black text
 * and a tinted field: `minimal` sets `accent` to `#0a0a0a` on purpose, because
 * the library reads that slot as *ink* — eyebrows, kickers, the disclosure
 * marker, the current nav item — far more often than as a fill. These paints
 * are the only place in the library that reads a slot as a large area of
 * colour, so it is they that have to move.
 *
 * `accent-subtle` would fix the smudge by making the paint vanish: that slot is
 * a *tile background* — `#e6ebf2` and `#effbf5` — which at a third of an opacity
 * on a light canvas is nothing at all. `accent-strong` is the slot that must
 * hold up as a glyph against `accent-subtle`, so every palette gives it real
 * chroma.
 */
const GLOW = "accent-strong"
const GLOW_SECOND = "brand-secondary"

const auroraField = (slot: typeof GLOW | typeof GLOW_SECOND, position: CSSProperties): ReactNode =>
  createElement("div", {
    key: slot,
    className: LIBRARY_CLASS.aurora,
    "aria-hidden": true,
    style: {
      position: "absolute",
      width: "min(46rem, 78%)",
      height: "min(46rem, 100%)",
      background: colour(slot),
      maskImage: CLOSEST_SIDE_FADE,
      WebkitMaskImage: CLOSEST_SIDE_FADE,
      opacity: AURORA_OPACITY,
      pointerEvents: "none",
      ...position,
    },
  })

/**
 * A ruled ground — lines or points — fading out before it reaches the copy.
 *
 * Both are one repeating gradient under a mask centred on the band, which is
 * what keeps them decoration: a lattice that ran edge to edge at full strength
 * would compete with every word set on it. `5rem` and `1.5rem` are the two
 * rhythms rather than one scaled twice, because a blueprint reads at a stride
 * you can count and a lattice reads as texture.
 */
const ruled = (
  key: string,
  background: string,
  tile: string | undefined,
  reach: string
): ReactNode => {
  const fade = `radial-gradient(ellipse at 50% 50%, black 0%, transparent ${reach})`

  return createElement("div", {
    key,
    "aria-hidden": true,
    style: {
      ...LAYER,
      background,
      ...(tile === undefined ? {} : { backgroundSize: tile }),
      maskImage: fade,
      WebkitMaskImage: fade,
    },
  })
}

/**
 * Every paint, as the layers that draw it. The array is what a primitive
 * spreads into its own root; an empty one is not a member, because a backdrop
 * that paints nothing is a node to `remove` rather than a value to `configure`.
 */
export const backdropLayers = (paint: PaintName): readonly ReactNode[] => {
  if (paint === "aurora") {
    return [
      auroraField(GLOW, { insetInlineStart: "0", insetBlockStart: "0" }),
      /** Started part-way through the cycle so the two fields never move in step. */
      auroraField(GLOW_SECOND, {
        insetInlineEnd: "0",
        insetBlockEnd: "0",
        animationDelay: `calc(${motion("slow")} * -8)`,
      }),
    ]
  }

  if (paint === "grid") {
    const line = colour("border-subtle")

    return [
      ruled(
        "grid",
        `repeating-linear-gradient(to right, ${line} 0 1px, transparent 1px 5rem), repeating-linear-gradient(to bottom, ${line} 0 1px, transparent 1px 5rem)`,
        undefined,
        "72%"
      ),
    ]
  }

  if (paint === "dots") {
    /**
     * `border-strong` rather than `border-subtle`, which the grid uses: a point
     * covers a fraction of the area a line does, so the same value that reads
     * as a faint rule reads as nothing at all. The token that is *equal* to its
     * neighbour is the failure `tokens.ts` warns about, and this is the same
     * mistake one step along — a token that is correct for a different amount
     * of ink.
     */
    return [
      ruled(
        "dots",
        `radial-gradient(${colour("border-strong")} 1px, transparent 1px)`,
        "1.5rem 1.5rem",
        "68%"
      ),
    ]
  }

  if (paint === "rays") {
    /**
     * Beams from a point above the band, as a repeating conic gradient centred
     * off the top edge. The double mask is the whole effect: the conic fades
     * down the page so the beams dissolve rather than ending, and the second
     * pass narrows them to the middle so the band's own corners stay clean.
     */
    const beams = `repeating-conic-gradient(from 200deg at 50% -20%, ${colour(GLOW)} 0deg 4deg, transparent 4deg 11deg)`
    const fade = "linear-gradient(to bottom, black 0%, transparent 85%)"
    const narrow = "radial-gradient(ellipse at 50% 30%, black 0%, transparent 78%)"

    return [
      createElement("div", {
        key: "rays",
        "aria-hidden": true,
        style: {
          ...LAYER,
          background: beams,
          opacity: 0.18,
          maskImage: `${fade}, ${narrow}`,
          WebkitMaskImage: `${fade}, ${narrow}`,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        },
      }),
    ]
  }

  /**
   * One pool of light over the middle of the band, and the paint to reach for
   * when something on it has to be the thing you look at. It is deliberately
   * *not* the aurora with one field deleted: the pool is wide, centred and
   * still, where a field is round, cornered and drifting.
   *
   * A flat colour under an elliptical **mask**, for the first trap above rather
   * than for symmetry — written as a gradient ending at `transparent` it is a
   * pool of light that turns grey on its way out, which is most visible in
   * exactly the palettes whose accent has least chroma to begin with.
   */
  const pool = "radial-gradient(ellipse 62% 78% at 50% 50%, black 0%, transparent 72%)"

  return [
    createElement("div", {
      key: "spotlight",
      "aria-hidden": true,
      style: {
        ...LAYER,
        background: colour(GLOW),
        opacity: 0.18,
        maskImage: pool,
        WebkitMaskImage: pool,
      },
    }),
  ]
}
