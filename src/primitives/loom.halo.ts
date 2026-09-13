import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, radius } from "./tokens.js"

/**
 * Light around one thing, so a reader's eye lands on it before the things
 * beside it.
 *
 * ## The gap this closes
 *
 * Ninety-one primitives in, **nothing in this library could make one card
 * matter more than the card next to it.** A pricing band draws three tiers that
 * are typographically identical; the one a page is actually selling is marked
 * by nothing at all. `loom.card` has a `tone` — `surface`, `outline`, `muted` —
 * and every one of them is a flat treatment that says *this is a card*, not
 * *this is the one*. A page could say "Most popular" in a `loom.badge` and the
 * words were the whole of it.
 *
 * That is the second half of the gap
 * [0130](../../decisions/0130-atmosphere-is-a-wrapper-and-the-paints-are-one-vocabulary.md)
 * opened. Atmosphere gave a *band* weather; nothing gave one item inside a band
 * emphasis. The 12 September report named it in as many words — *"nothing draws
 * attention to one card among several — no glow, no lit border, no ring on the
 * featured tier"* — and named the record it would have to be argued against,
 * which is why this is a third member rather than a guess.
 *
 * ## Why a wrapper, again, and what is new in the argument
 *
 * 0110 and 0130 both reached it: the alternative is `featured: true` on
 * `loom.tier`, `loom.card`, `loom.feature`, `loom.offering`, `loom.product`,
 * `loom.person` and everything else that can be one of several — a prop on
 * dozens of schemas to say one thing
 * ([0014](../../decisions/0014-the-reply-schema-must-fit-a-grammar-budget.md)),
 * still unreachable for the card nobody thought to give it to, **including
 * every primitive a host registers itself**.
 *
 * The reason this is not simply 0130 with a different paint is **geometry, and
 * it is the opposite geometry**. A backdrop paints *behind* its children and
 * clips to its own box; 0130 states in its consequences that it cannot bleed
 * past that box. A halo's whole job is the other side of that edge: `glow`
 * paints *outside* the box it is given, and `ring` paints *over* the boundary
 * rather than under it. So this primitive deliberately sets **no
 * `overflow: hidden`**, which is the one line a backdrop could never drop, and
 * it is why a sixth backdrop paint could not have been this.
 *
 * It also inverts the trap `backdrop.ts` documents. A field there *"hangs
 * inside its band, not off the corner"*, because with the clip a backdrop needs,
 * negative insets render as a rectangle with two hard sides. Here negative
 * insets are exactly right, for the same reason read backwards: there is no clip
 * to cut through the light.
 *
 * ## What the tree may say
 *
 * Which light, and how the lit area is cornered. Not a colour
 * ([0049](../../decisions/0049-a-theme-is-three-ids-in-the-tree.md) — the two
 * slots are the palette's), not a duration or an easing
 * ([0055](../../decisions/0055-motion-is-a-static-stylesheet-the-primitive-emits.md)),
 * and not an intensity, which is the "tune it a bit" number that turns a
 * reviewable choice into a value nobody reads in a proposal.
 *
 * **There is no label prop, and that is the granularity rule rather than
 * economy.** "Most popular" is content, content is a node
 * ([0052](../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)),
 * and `loom.badge` already draws it. A halo draws the eye; a badge says why. The
 * two are composed, so a page can move the words without touching the light and
 * re-mark a different tier with one `move`.
 *
 * **There is no `none`.** A halo lighting nothing is a node that draws nothing,
 * and `remove` says that better than `configure` — 0130's rule for its paints,
 * and it applies here unchanged.
 *
 * ## The three, and the test each had to pass
 *
 * 0130's membership test is **a reader tells it apart from the others at a
 * glance**, not *it is a different number*, and a member that was an existing
 * one at a lower opacity would be 0052's shades-of-one mistake. Three:
 *
 * - **`ring`** — a hairline of gradient traced round the edge. Crisp, and it
 *   changes the *boundary* of the thing.
 * - **`trace`** — the same rim with the light travelling round it. This is the
 *   closest call in the set and it is worth saying why it passes: the
 *   difference a reader sees is not brightness, it is **movement**, which is a
 *   difference in kind. The cheap alternative — a boolean `animate` beside
 *   `ring` — is the prop 0055 exists to refuse.
 * - **`glow`** — a soft bloom outside the box, with no crisp edge anywhere. It
 *   changes the *space around* the thing rather than its boundary, which is why
 *   a page can legibly nest a glow round a ring and get both.
 *
 * ## What a palette can take away, and what it cannot
 *
 * `accent-strong` and `brand-secondary` are the slots used because they are the
 * two every palette in this repository gives real chroma to, precisely because
 * they are the ones painted as areas — `src/theme/palettes.ts` says so in its
 * own words, and `library.test.ts` asserts they differ in every registered
 * palette, because a wash between a colour and itself is a flat fill.
 *
 * That still leaves how *much* chroma, which no primitive can know — the
 * unresolved half of the 20 August aurora finding, arriving at a second
 * primitive rather than as a new defect. `bold` puts yellow-to-red on a black
 * canvas and the same markup reads as neon; `editorial`'s two slots are both a
 * muted slate on an off-white ground, and nothing this file can write will make
 * a slate line glow.
 *
 * **So the rims do not rely on it.** `RIM_OFFSET` below is the whole of that
 * argument: a light that stands *off* the edge is legible as geometry, and
 * geometry survives a palette with no colour to spare, a greyscale printer and
 * a reader who cannot separate the two hues. Colour is what makes a halo
 * beautiful; distance is what makes it work. Only `glow` is still carried by
 * chroma alone, and it is the one of the three that is allowed to be quiet,
 * because a bloom has no job on a page where nothing else is bright either.
 */

const props = z
  .object({
    /**
     * Three renderings of one idea, not three strengths of it. Changing it
     * changes no node, which is the granularity document's sharper question, so
     * it is a prop rather than a delta wearing a prop's clothes.
     */
    light: z.enum(["ring", "trace", "glow"]).optional(),
    /**
     * How the lit area is cornered. A halo is almost always around something
     * rounded, and a square rim round a rounded card reads as a mistake at four
     * corners — but the radius is the *card's* fact and no render can read a
     * child's props, so the page states it once here. The vocabulary is
     * `loom.backdrop`'s and `loom.media`'s rather than a third spelling.
     */
    corners: z.enum(["none", "sm", "md", "lg"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * How far outside its own box a rim is drawn, and **the whole reason a rim is
 * legible on a palette with no chroma to spare.**
 *
 * Written flush at `inset: 0` — which is where it was, and what the first pair
 * of screenshots caught — a rim is a 2px gradient laid exactly over the card's
 * own 1px border. Under `bold` that is a yellow-to-red line on a black card and
 * it is the brightest thing on the page. Under `editorial`, whose accent slots
 * are both a muted slate and whose cards already carry a dark border, it is a
 * slightly thicker dark line: present in the markup, correct by every
 * assertion, and **not distinguishable from the two unlit tiers beside it**,
 * which is the one thing this primitive exists to do.
 *
 * Colour could not fix that, because the palette is the thing with no chroma
 * and no primitive can know it. **Geometry can.** Pulled out four pixels, the
 * rim is separated from the card's own edge by a strip of the page's ground, so
 * what a reader sees is *two* boundaries rather than one heavier one — and two
 * boundaries read in greyscale, on a colour-blind display, and under the
 * quietest palette anybody registers.
 *
 * This is the capability 0130 names as the difference between the two wrappers
 * doing real work rather than being stated: a backdrop clips, so it could not
 * have drawn a single pixel of this.
 */
const RIM_OFFSET = "4px"

type Light = {
  readonly className?: string
  /**
   * Above the content for the two that draw a boundary, below it for the one
   * that blooms. A rim under the content would be painted over by any child
   * carrying a background of its own, which every card does; a bloom over the
   * content would wash the words it is meant to be drawing attention to.
   */
  readonly depth: 0 | 2
  /** Set on the two that stand off the edge; the bloom starts at the edge itself. */
  readonly offset?: string
  readonly style?: CSSProperties
}

const LIGHTS: Readonly<Record<"ring" | "trace" | "glow", Light>> = {
  ring: { className: LIBRARY_CLASS.haloRing, depth: 2, offset: RIM_OFFSET },
  trace: { className: LIBRARY_CLASS.haloTrace, depth: 2, offset: RIM_OFFSET },
  glow: {
    depth: 0,
    style: {
      /**
       * Three shadows rather than one, and none of them cast downwards. A
       * `box-shadow` offset on the block axis is elevation — the thing
       * `.loom-lift` already draws on hover — and reads as *raised* rather than
       * as *lit*. Centred at zero offset with a negative spread, the light is
       * strongest just outside the edge and gone a little further out, which is
       * what a glow looks like.
       *
       * A shadow fades through its own alpha rather than by interpolating
       * towards `transparent`, so this is the one place in the library that can
       * fade a palette slot to nothing without the mask `backdrop.ts` needs —
       * its first documented trap, avoided here by not being a gradient.
       *
       * **Two shadows rather than three, and the one dropped was a crisp
       * `0 0 0 1px` rim.** It made the bloom read better on a light palette and
       * it cost the claim this member is in the set on: with a hard line at its
       * own edge, `glow` was `ring` with a blur behind it rather than a
       * different thing, which is exactly 0130's shades-of-one mistake. The
       * bloom carries it alone or it is not a third light.
       */
      boxShadow: [
        `0 0 40px -12px ${colour("accent-strong")}`,
        `0 0 80px -24px ${colour("brand-secondary")}`,
      ].join(", "),
    },
  },
}

const layer = (light: Light, rootRadius: string | null): ReactNode =>
  createElement("div", {
    key: "halo",
    "aria-hidden": true,
    ...(light.className === undefined ? {} : { className: light.className }),
    style: {
      position: "absolute",
      inset: light.offset === undefined ? "0" : `calc(-1 * ${light.offset})`,
      /**
       * A light at the edge takes the root's radius by inheriting it. A light
       * standing off the edge cannot: a rim pulled four pixels out and drawn at
       * the same radius is flatter than the corner it is following, so it
       * crosses the card's own curve twice and reads as a misprint. The offset
       * is added to the radius, which is the arc a concentric rim actually has.
       */
      ...(light.offset === undefined || rootRadius === null
        ? { borderRadius: "inherit" }
        : { borderRadius: `calc(${rootRadius} + ${light.offset})` }),
      boxSizing: "border-box",
      pointerEvents: "none",
      zIndex: light.depth,
      ...light.style,
    },
  })

export const loomHalo = definePrimitive({
  type: "loom.halo",
  description:
    "Light around one thing so it is read before the things beside it: a gradient rim, a rim the light travels round, or a soft glow outside the edge. Wraps anything, draws nothing of its own, and takes the corner radius of whatever it is lighting.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const light = LIGHTS[given.light ?? "ring"]
    const rootRadius =
      given.corners === undefined || given.corners === "none" ? null : radius(given.corners)

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          position: "relative",
          /**
           * The lights stack against this element rather than against whatever
           * ancestor happens to carry a `z-index`, so a halo inside a grid
           * cannot paint over the cell beside it. `loom.backdrop` isolates for
           * the same reason; the difference is that a backdrop also clips, and
           * this deliberately does not — see the geometry paragraph above.
           */
          isolation: "isolate",
          boxSizing: "border-box",
          width: "100%",
          /**
           * **A wrapper has to be transparent to stretching, and the first
           * screenshot is what proved this is not free.** Three tiers in a
           * `loom.grid` are stretched to the tallest of them; a card is a grid
           * item and fills its cell, and the moment a halo is between them the
           * card is a block in a taller box instead. The rim then hugs the
           * *cell* and the card ends short of it, which photographs as a lit
           * box with a strip of nothing along the bottom — on two of the three
           * tiers, which is worse than on all three.
           *
           * `height: 100%` takes the stretch, and `grid` passes it on: a grid
           * item stretches in both axes by default, so the child fills this the
           * way it filled the cell before the halo was put round it. Against a
           * parent with no definite height both are inert, which is every halo
           * that is not in a stretched row.
           */
          height: "100%",
          display: "grid",
          ...(rootRadius === null ? {} : { borderRadius: rootRadius }),
        },
      },
      libraryStylesheet(),
      layer(light, rootRadius),
      /**
       * Lifted out of the lights' stacking order explicitly rather than by
       * source order, which stops being enough the moment a child positions
       * itself — a class of defect that shows up only on the one page that does
       * it.
       *
       * It is a grid for the reason above: the stretch has two levels to cross,
       * and a block here would absorb it one short of the child.
       */
      createElement("div", { style: { position: "relative", zIndex: 1, display: "grid" } }, children)
    )
  },
})
