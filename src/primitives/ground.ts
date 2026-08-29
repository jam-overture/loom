import { createElement, type CSSProperties, type ReactNode } from "react"

import { LIBRARY_CLASS } from "./stylesheet.js"
import { colour, motion } from "./tokens.js"

/**
 * What is painted *behind* a band, as layers rather than as a background.
 *
 * These were `loom.hero`'s private property until 29 August, and three of the
 * five were unreachable from anywhere else on a page: a hero could stand on two
 * drifting colour fields and every other band in the library stood on a flat
 * rectangle. That is the difference between a page that looks designed and one
 * that looks laid out, and it was welded to the one primitive a page uses once.
 *
 * So the layers live here, `loom.hero` reads them, and `loom.backdrop` is the
 * surface that lets anything else stand on the same ground.
 *
 * **Why every one of them is a layer and not a `background`.** A single
 * background property can express none of these: `aurora` needs two fields
 * animated independently of each other, and the other three need to *stop*
 * somewhere short of their own edges. Both are separate elements or they are
 * nothing.
 *
 * **Why every one of them fades with a mask rather than to a colour.** A
 * gradient to `transparent` interpolates towards transparent *black*, so a
 * field greys out on its way to nothing and the element's own square edge stays
 * visible where the gradient has not finished. A mask fades opacity alone, so
 * the colour is the palette's to the last pixel — and, more usefully, a ground
 * fades to whatever it happens to be sitting on without this file knowing what
 * that is. `loom.marquee`'s edges are the same argument reached from the other
 * side.
 *
 * Every layer is `aria-hidden` and `pointer-events: none`. None of them is a
 * node: a ground has no interior anybody addresses, which is what keeps five
 * renderings a prop rather than five primitives (0052).
 */

export const GROUND_NAMES = ["none", "aurora", "grid", "dots", "rays"] as const
export type GroundName = (typeof GROUND_NAMES)[number]

/**
 * The mask every ruled ground wears. A ruling that runs to the edge of its band
 * reads as a table; one that dissolves before it gets there reads as depth.
 */
const fadeFrom = (origin: string, reach: string): string =>
  `radial-gradient(ellipse at ${origin}, black 0%, transparent ${reach})`

/**
 * `border-radius: inherit` on every layer, and it is what lets the band above
 * decide not to clip.
 *
 * A ground inside a rounded band has to be rounded or its square corners show
 * through, and the obvious way to get that is `overflow: hidden` on the band.
 * That turns the band into a **scroll container**, which is not a cosmetic
 * difference: a `view()` timeline resolves against its nearest scroll container,
 * so a `loom.reveal` inside such a band is measured against a box that never
 * scrolls and never advances. Found by probing the first page built with both,
 * where the whole arriving band was simply finished at every scroll position.
 *
 * So the radius travels with the layer and the band stays transparent to
 * scrolling. This is the load-bearing declaration in this file.
 */
const layer = (
  key: string,
  style: CSSProperties,
  className?: string,
  children?: ReactNode
): ReactNode =>
  createElement(
    "div",
    {
      key,
      className,
      "aria-hidden": true,
      style: { position: "absolute", pointerEvents: "none", borderRadius: "inherit", ...style },
    },
    children
  )

const masked = (image: string, mask: string): CSSProperties => ({
  backgroundImage: image,
  maskImage: mask,
  WebkitMaskImage: mask,
})

/**
 * Two slow-drifting colour fields.
 *
 * **`accent-strong`, not `accent`**, and the difference is a finding the
 * marketing routine filed on 20 August. A slot cannot be both near-black text
 * and a tinted field: `minimal` sets `accent` to `#0a0a0a` on purpose, because
 * the library reads that slot as *ink* — eyebrows, kickers, the disclosure
 * marker, the current nav item — far more often than as a fill. This is the one
 * place in the library that reads a slot as a large area of colour, so it is
 * this that has to move. On the white-paper palette the hero was rendering a
 * grey cloud across its top-left corner.
 *
 * The finding suggested `accent-subtle`, and it would fix the smudge by making
 * the field vanish: that slot is a *tile background* — `#e6ebf2` and `#effbf5` —
 * which at 32% on a light canvas is nothing at all. `accent-strong` is the slot
 * that must hold up as a glyph against `accent-subtle`, so every palette gives
 * it real chroma.
 */
const aurora = (): readonly ReactNode[] => {
  const FADE = "radial-gradient(closest-side, black 0%, transparent 100%)"

  /**
   * The two fields are wrapped in a clip of their own rather than clipped by the
   * band, because a field grows to `scale(1.25)` on its way round the cycle and
   * would otherwise reach past the band's edge. This is the one ground that
   * needs clipping at all, and putting it here is what keeps the band from
   * being a scroll container — see the note on `layer`.
   */

  /**
   * Each field sits *inside* the band and its mask reaches zero at its own
   * edges, so the band's `overflow: hidden` never cuts through anything still
   * bright. A field hung off the corner on negative insets is the obvious way
   * to write this and it renders as a rectangle with two hard sides — the clip
   * crossing the middle of the glow.
   */
  const field = (slot: "accent-strong" | "brand-secondary", position: CSSProperties): ReactNode =>
    layer(
      slot,
      {
        width: "min(46rem, 78%)",
        height: "min(46rem, 100%)",
        background: colour(slot),
        maskImage: FADE,
        WebkitMaskImage: FADE,
        opacity: 0.32,
        ...position,
      },
      LIBRARY_CLASS.aurora
    )

  return [
    layer("aurora", { inset: "0", overflow: "hidden" }, undefined, [
      field("accent-strong", { insetInlineStart: "0", insetBlockStart: "0" }),
      /** Started part-way through the cycle so the two fields never move in step. */
      field("brand-secondary", {
        insetInlineEnd: "0",
        insetBlockEnd: "0",
        animationDelay: `calc(${motion("slow")} * -8)`,
      }),
    ]),
  ]
}

/**
 * The layers for one ground, in paint order.
 *
 * `none` is a real member and returns nothing, rather than being the absence of
 * a call: a band that says which ground it stands on and a band that says
 * nothing are the same page, and the caller should not have to know which of
 * the two it is holding.
 */
export const groundLayers = (ground: GroundName): readonly ReactNode[] => {
  if (ground === "aurora") return aurora()

  if (ground === "grid") {
    const lines = `repeating-linear-gradient(to right, ${colour("border-subtle")} 0 1px, transparent 1px 5rem), repeating-linear-gradient(to bottom, ${colour("border-subtle")} 0 1px, transparent 1px 5rem)`

    return [layer("grid", { inset: "0", ...masked(lines, fadeFrom("50% 0%", "72%")) })]
  }

  if (ground === "dots") {
    /**
     * The stop is at `1.1px` rather than at `1px`, and the extra tenth is what
     * makes the dot a dot: a hard stop from the ink straight to nothing is
     * aliased into a small square on any display that is not drawing at a whole
     * pixel, which is most of them.
     */
    const dot = `radial-gradient(circle at center, ${colour("border-default")} 0 1px, transparent 1.1px)`

    return [
      layer("dots", {
        inset: "0",
        backgroundSize: "1.5rem 1.5rem",
        ...masked(dot, fadeFrom("50% 50%", "78%")),
      }),
    ]
  }

  if (ground === "rays") {
    /**
     * A fan of thin beams from a point above the band's top edge, which is
     * where a light source has to be for the beams to read as light rather than
     * as a pie chart. `from 190deg` starts the repeat just past vertical so the
     * fan is not symmetrical about the centre line — a symmetrical one reads as
     * a diagram.
     *
     * The beams are `accent-strong` for the reason the aurora's fields are: it
     * is the one slot every palette gives real chroma, because it has to hold
     * up as a glyph against `accent-subtle`.
     */
    const beams = `repeating-conic-gradient(from 191deg at 50% -14%, ${colour("accent-strong")} 0deg 0.6deg, transparent 0.6deg 9deg)`

    /**
     * The two numbers here were set by looking at the band rather than by
     * reasoning about it, and the first attempt is worth recording because it
     * is the mistake this ground invites. Beams every five degrees at 22%
     * opacity is not light — it is a perspective grid, and it read as a
     * wireframe tunnel drawn across the headline. A ray ground works when the
     * reader does not notice it is there: twice the spacing, half the ink, and
     * a mask that gives up less than half way down.
     */
    return [
      layer("rays", {
        inset: "0",
        opacity: 0.11,
        ...masked(beams, fadeFrom("50% 0%", "48%")),
      }),
    ]
  }

  return []
}
