import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAP_NAMES, GAPS } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * A run of content that arrives as the reader scrolls to it.
 *
 * The library has had an entrance since its first band — `loom.hero`'s copy
 * fades and lifts into place in four steps — and it has only ever fired *on
 * load*, on the one band that is already on the screen when the page opens.
 * Everything below the fold has animated to an empty room and been finished
 * before anybody scrolled far enough to see it. That is the whole of the gap
 * this closes: the same motion, driven by where the reader is rather than by
 * when the document parsed.
 *
 * **It is driven by CSS and by nothing else.** There is no observer, no
 * measurement and no script: `animation-timeline: view()` hands the browser the
 * element's own position in the scrollport as the clock. That is 0055 read
 * literally — motion is a static stylesheet the primitive emits — and it is why
 * a primitive that would have needed `IntersectionObserver` in any other
 * library needs nothing here that a `<style>` cannot say.
 *
 * **Where it is anchored, and why that is the whole safety argument.** A
 * scroll-driven animation holds its element at the *start* of the animation
 * until the timeline advances, so getting the range wrong does not make a page
 * look wrong — it makes content that never arrives. The range is
 * [0096](../../decisions/0096-a-scroll-driven-entrance-is-anchored-to-entry.md):
 * `entry 0%` to `entry 100%`, so the animation is complete the moment the
 * element has fully entered its scrollport, and an element that *cannot* scroll
 * — one whose scrollport is a clipped box no taller than itself, which is every
 * `loom.card` and every `loom.marquee` — reads as fully entered and is simply
 * finished. The alternative anchors, on `cover` or `contain`, are the ones that
 * leave a page with a hole in it.
 *
 * **A browser that has never heard of a scroll timeline plays it on load.**
 * `animation-timeline` is one declaration and an unknown declaration is
 * dropped, leaving the `animation` above it intact — so the fallback is not
 * written anywhere, it is what remains. Every child rises once as the document
 * paints, which is exactly `loom.hero`'s entrance and a perfectly good page.
 * Nothing is ever hidden by a feature the browser does not have.
 *
 * **It holds still while the page is being edited** (0091). A control that
 * arrives when scrolled to is hostile to the one activity edit mode exists for,
 * and unlike `loom.marquee` there is nothing to compromise about: the classes
 * are simply not applied, and every child renders where it will end up. That
 * makes `loom.editable` the whole test, and there is no second copy of anything
 * to give a node two elements.
 *
 * **Why the stagger is not a prop.** The obvious fifth prop would set the delay
 * between one child and the next, and it would do nothing in any browser that
 * supports what this primitive is for: `animation-delay` is ignored on a
 * scroll-driven animation, because the timeline is a position rather than a
 * clock. The sequencing comes free and is better than a delay would be — each
 * child has its own view timeline, so a column arrives one row at a time at the
 * reader's own pace, and a row of three arrives together because all three
 * genuinely did.
 */

const props = z
  .object({
    /**
     * Three genuinely different arrivals rather than three speeds of one:
     * lifting from below, appearing in place, and settling from slightly
     * oversized. No duration among them, which is 0055 — a tree may say which
     * variant of a motion it wants and may not say how long it takes.
     */
    effect: z.enum(["rise", "fade", "settle"]).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const EFFECT_CLASS: Readonly<Record<NonNullable<Props["effect"]>, string | undefined>> = {
  /** The library's existing entrance, and the reason it needs no class of its own. */
  rise: undefined,
  fade: LIBRARY_CLASS.revealFade,
  settle: LIBRARY_CLASS.revealSettle,
}

export const loomReveal = definePrimitive({
  type: "loom.reveal",
  description:
    "A column of content whose children arrive one at a time as the reader scrolls to them. Holds still while the page is being edited.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const still = loom.editable !== undefined

    return createElement(
      "div",
      {
        ...loom.editable,
        className: still
          ? undefined
          : [LIBRARY_CLASS.reveal, EFFECT_CLASS[given.effect ?? "rise"]]
              .filter((name) => name !== undefined)
              .join(" "),
        style: {
          display: "flex",
          flexDirection: "column",
          gap: GAPS[given.gap ?? "loose"],
          width: "100%",
        },
      },
      libraryStylesheet(),
      children
    )
  },
})
