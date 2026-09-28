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
 * page or the fifth thing down it.
 *
 * ## The aspect, which is the same rule one turn further and was got wrong
 *
 * That rule was written against a band's *height* and the fields were sized by
 * `circle closest-side`, on the argument that *a circle sized by the shorter
 * side stays a glow at any aspect the band happens to have, where an ellipse
 * becomes the box*. The argument is sound and the choice it names is not: the
 * ellipse it was rejecting is the **default** one, which is `farthest-corner`
 * and does become the box. `ellipse closest-side` is a third thing nobody tried
 * — an ellipse inscribed in the field, reaching zero at all four sides and
 * transparent well before either corner — and it is what the rule was asking
 * for. A circle in a wide short field is a circle with the field empty either
 * side of it, which is the defect
 * [0196](../../decisions/0196-a-paint-is-sized-by-the-box-it-is-given-and-says-so-when-it-cannot-be.md) was
 * filed for: two small round smudges floating in a strip, nowhere near the
 * corners they are anchored to.
 *
 * Measured on 27 September against a control that renders this same wrapper
 * painting nothing: `aurora` put **6.0 units of ink per unit area** into a
 * 468-pixel band and **1.8** into a 135-pixel strip of the same width, under
 * `editorial`; `spotlight`, whose pool is already written in percentages of the
 * box, went 6.7 to 5.9 across the same pair. The paint that lost two-thirds of
 * itself is the one sized by a side rather than by the box.
 */

export const PAINT_NAMES = ["aurora", "grid", "dots", "rays", "spotlight"] as const
export type PaintName = (typeof PAINT_NAMES)[number]

/**
 * A radial fade to nothing, used as a mask rather than as a gradient. See the
 * first trap above for why this is not `… , transparent 100%` in a background.
 *
 * **`ellipse`, not `circle`**, and the aspect section above is the argument. It
 * is inert where the field is square — a hero at 1280 gives a 736 by 736 field
 * and the two keywords compute the same radii — and it is the whole of the fix
 * everywhere else.
 */
const CLOSEST_SIDE_FADE = "radial-gradient(ellipse closest-side, black 0%, transparent 100%)"

const LAYER: CSSProperties = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
}

/**
 * What a caller puts on the content it draws **over** these layers.
 *
 * Every layer above is `position: absolute`, and a positioned element paints
 * after its non-positioned siblings however the source is ordered. So a band
 * that emits its paints first and its words second gets the paints *on top of
 * the words* — which is not a subtle wash, it is `grid`'s 1px rules crossing a
 * 72px headline and reading as strikethrough. Source order looks like it is
 * doing the work and is not doing any.
 *
 * This is here rather than in each caller because it had already been
 * rediscovered twice. `loom.backdrop` and `loom.halo` each worked it out
 * independently and each left a comment saying source order *"stops being
 * enough the moment a child positions itself"* — and both were wrong about
 * when: it was never enough. `loom.hero`, which is where these paints were
 * written and the only band that had them for three weeks, never got the
 * wrapper at all, and shipped the defect for as long as it has had a backdrop.
 *
 * A style rather than a wrapping helper, because the three callers put it in
 * three different places: `loom.backdrop` and `loom.halo` have one content
 * element to lift, and `loom.hero` has two — its text column and its media
 * region are flex siblings, and a wrapper round the pair would collapse the
 * two-column layout the whole primitive exists to lay out.
 *
 * `z-index: 1` rather than `-1` on the layers: a negative index would put the
 * paint behind the caller's own background as well, which is the difference
 * between a hero's `panel` surface having atmosphere behind it and having
 * none. Every caller already declares `isolation: isolate`, so the 1 cannot
 * escape the band it belongs to.
 */
export const ABOVE_BACKDROP: CSSProperties = { position: "relative", zIndex: 1 }

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
 * How far above the band the beams of `rays` come from.
 *
 * **A length, and it used to be `-20%`**, which is the one measurement in this
 * file that was written against the wrong box dimension in the other direction
 * from the fields. A percentage in a conic gradient's position resolves against
 * the element, so the apex of the fan sat 160 pixels above a hero and 34 pixels
 * above a 170-pixel strip — and an apex that close to a band 1280 pixels wide
 * fans its beams out almost horizontally. Photographed on 27 September it is a
 * vanishing point rather than light: the finding that named it *"a grey
 * starburst that reads as an artifact"* was describing the geometry rather than
 * the palette, which is why it read as a fault on `bold` too, where there is
 * plenty of chroma.
 *
 * `10rem` is **the hero's own value**, not a new one: `-20%` of the 800-pixel
 * band these beams were drawn in is 160 pixels. So the case the paint was
 * designed for is unchanged to the pixel, and every shorter band now gets the
 * fan the hero gets instead of a flatter one. That is the whole of the hero-only
 * assumption this file's own header warns about, found in the last place it was
 * still hiding.
 */
const RAYS_APEX = "-10rem"

/**
 * A ruled ground — lines or points — fading out before it reaches the copy.
 *
 * Both are one repeating gradient under a mask centred on the band, which is
 * what keeps them decoration: a lattice that ran edge to edge at full strength
 * would compete with every word set on it.
 *
 * **`core` is where that mask stops being a point.** The fade was
 * `black 0%, transparent <reach>`, which is fully opaque at the centre pixel and
 * nowhere else, so the strongest line a blueprint ever drew was three quarters
 * of its own colour and the rest fell away from there. A core holds the mask
 * open over the middle of the band and then fades on the same reach — still
 * brightest at the middle and still nothing at every edge, which is this file's
 * rule unchanged, with a plateau where it had a peak. Measured over a
 * text-free thousand-pixel square of a 468-pixel band under `editorial`, the
 * grid's strongest line went from 11 values of a channel to 21, which is its
 * token's full contrast against the canvas and the most a mask can honestly
 * give it.
 *
 * The lattice takes **no core**, and that is the asymmetry rather than an
 * oversight: its points are `border-strong` and already land at 88 values, so
 * the same change would take a texture that is *"legible but noisy"* over a
 * band of figures and make it noisier. One knob, two settings, because the two
 * paints are carrying very different amounts of ink to begin with. `5rem` and `1.5rem` are the two
 * rhythms rather than one scaled twice, because a blueprint reads at a stride
 * you can count and a lattice reads as texture.
 *
 * **These two are the paints that cannot read their box, and the vocabulary now
 * says so.** A stride is a length: a band 170 pixels tall holds two rules of a
 * five-rem grid, and two rules are not a blueprint however much contrast they
 * are given. No mask fixes that, and sizing the stride to the band would make
 * the blueprint a different blueprint at every height — the one thing a ruled
 * ground may not be, because what it is *for* is a stride a reader can count.
 * So the limit is stated rather than engineered around
 * ([0196](../../decisions/0196-a-paint-is-sized-by-the-box-it-is-given-and-says-so-when-it-cannot-be.md)),
 * it is in the primitive's own description where a model reads it, and the
 * three paints that *can* adapt were fixed instead.
 */
const ruled = (
  key: string,
  background: string,
  tile: string | undefined,
  core: string,
  reach: string
): ReactNode => {
  const fade = `radial-gradient(ellipse at 50% 50%, black 0%, black ${core}, transparent ${reach})`

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
    /**
     * **`border-default`, and it used to be `border-subtle`.** The same mistake
     * the `dots` comment below names, made one step earlier and left standing
     * for sixteen days: a token correct for a different amount of ink.
     *
     * Measured against the blank-wrapper control on 27 September, `grid` put
     * **0.25 units of ink per unit area** into a 468-pixel band under
     * `editorial` where `aurora` put 6.0 and `spotlight` 6.7 — an order of
     * magnitude quieter than everything else in the vocabulary, at every height
     * and under both starter palettes. `border-subtle` on `editorial` is
     * `#efefe9` against a `#fafaf7` canvas, which is eleven values of one
     * channel, and that is a blueprint nobody has ever seen.
     *
     * This is the 26 September audit's rule arriving at its first case: **a
     * border beside a fill may be subtle; a border that is the whole mark takes
     * `border-default`.** A ruled ground is nothing but its lines. `strong` is
     * the wrong end of the same ramp — near-black on `editorial` — which is why
     * the lattice takes it and the blueprint does not: a point covers a
     * fraction of the area a line does.
     */
    const line = colour("border-default")

    return [
      ruled(
        "grid",
        `repeating-linear-gradient(to right, ${line} 0 1px, transparent 1px 5rem), repeating-linear-gradient(to bottom, ${line} 0 1px, transparent 1px 5rem)`,
        undefined,
        "30%",
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
        "0%",
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
    const beams = `repeating-conic-gradient(from 200deg at 50% ${RAYS_APEX}, ${colour(GLOW)} 0deg 4deg, transparent 4deg 11deg)`
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
