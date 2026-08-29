import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GROUND_NAMES, groundLayers } from "./ground.js"
import { GAP_NAMES, GAPS } from "./layout.js"
import { libraryStylesheet } from "./stylesheet.js"
import { radius, space } from "./tokens.js"

/**
 * A ground for whatever is put on it: drifting colour fields, a ruled grid, a
 * dot matrix, or a fan of beams behind an ordinary band of a page.
 *
 * This is the library's fifty-first primitive to arrange content and the first
 * one to *decorate* it, and the gap it closes is the one the maintainer named
 * when he asked for a library that pops. Every band before it stands on a flat
 * rectangle. `loom.hero` alone had a backdrop, welded to the one primitive a
 * page uses once, at the top, before the reader has decided to care — so the
 * whole rest of a Loom page looked laid out where its first band looked
 * designed.
 *
 * **It is a surface rather than an arranger, which is what makes it a
 * primitive rather than a prop.** `loom.card` is the precedent and the
 * comparison worth drawing: a card is a *raised* surface holding whatever is
 * put on it, and this is a *decorated* one. Neither says anything about what it
 * holds. The alternative — a `ground` prop on `loom.section` — was rejected
 * because the ground would then be reachable only where a section is, and a
 * page wants one behind a `loom.split`, behind three cards in a `loom.grid`,
 * and behind a band that is a single `loom.marquee`. Adding it to each is four
 * copies of one idea; wrapping is one node and one `insert`.
 *
 * **Nothing here is a node, and that is 0052 rather than convenience.** Ask the
 * sharper question the granularity doc asks — *does changing this prop change
 * the set of nodes?* — and every prop below answers no. `ground` selects among
 * five closed renderings of the same nothing: there is no interior to a dot
 * matrix, nothing in it to address, and no `insert` anybody would ever want to
 * aim at it. That is the granularity doc's second atomic exception — *things
 * with no interesting interior* — reached by a container rather than by a leaf.
 *
 * **The content sits above the ground because it says so.** CSS paints
 * positioned descendants after the inline content of unpositioned ones,
 * whatever their document order, so a ground layer left to itself is painted
 * *over* the text rather than behind it. The wrapper below carries one
 * `position: relative` for that reason and no other; the same repair went into
 * `loom.hero` in the same run, where the defect had been shipped since the
 * library's first band.
 */

const props = z
  .object({
    /**
     * Which ground is painted. Shared with `loom.hero`'s `backdrop`, from
     * `ground.ts`, so the two bands of a page that stand on a grid stand on the
     * *same* grid — 5rem rules, fading from the top edge — rather than on two
     * that were written a fortnight apart.
     */
    ground: z.enum(GROUND_NAMES).optional(),
    /**
     * `bleed` runs the ground to its own edges, for a band that spans the page.
     * `panel` rounds and clips it, for a ground that reads as one object among
     * the things above and below it.
     */
    shape: z.enum(["bleed", "panel"]).optional(),
    /**
     * How far the content is held off the ground's edges. A ruled ground with
     * text flush against it reads as a mistake, so the default is generous —
     * and it is a prop rather than a constant because a ground behind a single
     * full-bleed image wants none of it.
     */
    padding: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomBackdrop = definePrimitive({
  type: "loom.backdrop",
  description:
    "A decorated ground for whatever is put on it: drifting colour fields, a ruled grid, a dot matrix, or a fan of beams.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const panelled = given.shape === "panel"

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          position: "relative",
          /**
           * Its own stacking context, so a ground never reaches past this band —
           * a page with two backdrops is two grounds, not one argument about
           * which of them is on top.
           */
          isolation: "isolate",
          /**
           * **No `overflow: hidden`, and that is the least obvious decision in
           * this file.** A rounded band with a ground in it wants to clip, and
           * the first version of this primitive did — which quietly turned every
           * backdrop into a **scroll container**, because that is what
           * `overflow: hidden` makes. A `loom.reveal` placed inside one then
           * resolved its `view()` timeline against a box that never scrolls, sat
           * at a fixed progress past the end of its range, and never animated at
           * all. The specimen page built for this run did exactly that, and
           * nothing but a probe of `animation.timeline.currentTime` could see it.
           *
           * The clip belongs to the ground rather than to the band: every layer
           * carries `border-radius: inherit`, and the one ground that grows past
           * its own box — `aurora`, whose fields scale — clips itself. So the
           * corners are right and a band a reader scrolls through stays a band a
           * reader scrolls through.
           */
          /** No stylesheet resets these, so padding would otherwise widen the band past its parent. */
          boxSizing: "border-box",
          width: "100%",
          padding: GAPS[given.padding ?? "roomy"],
          borderRadius: panelled ? radius("lg") : "0",
        },
      },
      libraryStylesheet(),
      ...groundLayers(given.ground ?? "aurora"),
      children === null
        ? null
        : createElement(
            "div",
            {
              style: {
                /** See the note above: this one declaration is the whole of it. */
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: space(5),
              },
            },
            children
          )
    )
  },
})
