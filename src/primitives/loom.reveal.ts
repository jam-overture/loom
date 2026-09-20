import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * A band that arrives as the reader reaches it: whatever is put inside lifts
 * and fades into place, driven by the page's own scroll position.
 *
 * This is what separates a page that reads as a product from a page that reads
 * as a document, and the library had every ingredient except the trigger.
 * `.loom-rise` has existed since [0055](../../decisions/0055-motion-is-a-static-stylesheet-the-primitive-emits.md)
 * and fires **on load** — so the four bands below the fold have finished
 * animating before anybody scrolled to them, and the page a visitor actually
 * reads is a static one. Nothing in this library has ever responded to a
 * reader's own movement through the page.
 *
 * ## Why it is a wrapper rather than a prop
 *
 * The alternative was `reveal: true` on `loom.section`, `loom.hero`,
 * `loom.feature-grid` and every other band. That is a prop on seventy schemas
 * to say one thing — the cost
 * [0014](../../decisions/0014-the-reply-schema-must-fit-a-grammar-budget.md)
 * keeps naming — and it would still be unreachable for the band nobody thought
 * to give it to, including every primitive a host registers itself. A wrapper
 * says it once, works on anything, and is taken off by a `remove` rather than
 * by finding the prop that turns it off.
 *
 * The honest cost is a node that draws nothing and one more element between a
 * band and its parent. A `display: contents` root would erase the second and
 * cannot be animated at all, so this is the trade rather than an oversight.
 * [0110](../../decisions/0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md)
 * is the record.
 *
 * ## What the tree may say about it
 *
 * Which variant, and nothing else — no duration, no delay, no easing, no
 * distance (0055). "The band now arrives over four seconds" is not the small
 * reversible edit a Gate is built to weigh, so the animation belongs to the
 * registered component and the tree picks from two words.
 *
 * ## What it cannot do, stated rather than half-done
 *
 * **The cascade inside a band is not here, and it does not need to be.** Six
 * tiles arriving one after another is the effect a wall of cards wants, and a
 * `stagger` prop here could not give it: this primitive's children are whatever
 * it wraps, which for a band is one grid, and staggering a single grid against
 * nothing is staggering nothing. What works instead is **a reveal around each
 * cell** — every cell then has a view timeline of its own and arrives when it
 * personally enters the scrollport, so a grid comes in by row with no ordering
 * declared anywhere and none to keep in step when a tile is inserted.
 *
 * That was written as a workaround and it is the better mechanism. A declared
 * stagger is a list of delays that go wrong the moment the reader's window is a
 * different shape; a per-cell timeline is the reader's own scroll position
 * answering the question. `featuresBand` is the catalogue's use of it, under
 * [0174](../../decisions/0174-a-band-wears-the-treatment-its-own-content-earns.md),
 * and it is what made the stretch note on the root below necessary.
 *
 * ## Nothing here can hide a band, and that is a property rather than a hope
 *
 * A scroll-driven entrance is one declaration away from a page whose content is
 * invisible, so every way it can fail leaves the content visible:
 *
 * - **A browser without scroll-driven animations** never sees the rule at all —
 *   the whole block is inside `@supports (animation-timeline: view())`, so the
 *   starting `opacity: 0` does not exist there either.
 * - **A band already on screen when the page loads** has a view timeline
 *   already past its range, and `animation-fill-mode: both` holds it at the end
 *   state. Nothing above the fold waits for a scroll that has happened.
 * - **A page too short to scroll** is the same case: fully in view, therefore
 *   finished.
 * - **A reader who asked for reduced motion** gets the content at full opacity
 *   with no animation, which is 0055's rule that reduced motion removes
 *   movement and never feedback.
 * - **Print** holds it still and visible too, which is the one of these that had
 *   to be found rather than reasoned about: a printed page has no scrollport, so
 *   without the rule every band below the first screen prints blank.
 * - **Edit mode** holds it still and visible, for
 *   [0091](../../decisions/0091-motion-stops-in-edit-mode-and-that-is-where-a-decorative-duplicate-belongs.md)'s
 *   reason and one this primitive adds: a portal preview is not a page anybody
 *   scrolls, so a band waiting for a scroll would be a band that is never
 *   there. `loom.editable` being present only in edit mode is the whole test.
 *
 * The one case left, stated because it will surprise somebody: **photographing
 * a page**. A full-page screenshot is taken without scrolling, so a band that
 * has not entered is captured at the opacity it honestly has. Anything that
 * shoots a Loom page — a share card, a preview thumbnail — should ask the
 * browser for reduced motion, which is one flag and gives the finished page.
 */

const props = z
  .object({
    /** `rise` lifts as it fades; `fade` only fades, for something already in place. */
    motion: z.enum(["rise", "fade"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomReveal = definePrimitive({
  type: "loom.reveal",
  description:
    "A band that lifts and fades into place as the reader scrolls to it. Wraps anything; holds still while the page is being edited.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className: [
          LIBRARY_CLASS.reveal,
          given.motion === "fade" ? LIBRARY_CLASS.revealFade : undefined,
          loom.editable === undefined ? undefined : LIBRARY_CLASS.revealStill,
        ]
          .filter((name) => name !== undefined)
          .join(" "),
        /**
         * **A wrapper has to be transparent to stretching**, and this is
         * `loom.halo`'s paragraph of the same name arriving at its second
         * wrapper rather than a new argument. Six tiles in a `loom.feature-grid`
         * are stretched to the tallest of them; a tile is a grid item and fills
         * its cell, and the moment a reveal is between them the tile is a block
         * in a taller box instead — so a card row that lined up yesterday has
         * ragged bottoms today, on whichever cards happen to be short.
         *
         * `display: grid` passes the stretch on to the child, and `height: 100%`
         * takes it from a parent that hands height down rather than stretching
         * its items. Against a parent with no definite height both are inert,
         * which is every reveal that is not in a stretched row — including every
         * reveal around a whole band, which is what this primitive was written
         * for and what it kept doing correctly while this was missing.
         *
         * Nothing could have caught it. A reveal around a band has one child at
         * full width, so the defect needs a reveal *inside* an arranger to
         * appear at all, and until this catalogue put one there no tree in the
         * repository had one.
         */
        style: { display: "grid", height: "100%" },
      },
      libraryStylesheet(),
      children
    ),
})
