import { Children, createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAPS, GAP_NAMES } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * The fifth general arranger: children in a row that runs past the edge of the
 * page, and snaps.
 *
 * `loom.grid` wraps, `loom.stack` wraps, `loom.mosaic` re-cuts its rows and
 * `loom.marquee` moves on its own. None of them can say the thing a phone
 * actually wants of eight testimonial cards, which is *put them in a row I can
 * push*. 0054 lists `carousel` in the arrangement vocabulary and this is it,
 * named for the arrangement alone because its children are whatever the band is
 * made of — a card, a quote, a shot, a tier.
 *
 * ## No JavaScript, and no state in the tree
 *
 * There is no `activeIndex`, no arrows, and no dots. Which item a reader is
 * looking at is the reader's, not the page's: a render is a pure function of
 * the tree (0008), so a tree-carried index would be a band that starts on the
 * fourth card for everyone at once. Scroll position is the browser's own state
 * and it already survives everything — a resize, a reload, a back button — so
 * the whole primitive is `overflow-x: auto` and `scroll-snap-type`, which is
 * also why it works on a page served with no scripting at all.
 *
 * The one thing that costs is a keyboard. A scroll container is focusable by
 * default in some browsers and not in others, so it is made focusable here and
 * given a name and a role to match — an unnamed focus stop is worse than none.
 * It is not declared `interactive`: 0064 is about HTML's rule that a target may
 * not sit inside a target, and a `div` with a `tabindex` is not one. A card
 * inside this one is still the reader's target, which is the whole point of the
 * band.
 *
 * ## Why it does not fade at its edges
 *
 * `loom.marquee` dissolves at both ends and it is right to: the content there
 * is always mid-travel, so a mask is the difference between a band that ends
 * and a band that is cut. A scroller is the opposite case at the only position
 * every reader starts from — at rest, the first item is flush against the
 * leading edge, so the same mask washes out content that is fully arrived and
 * reads as a rendering fault. A scroll-linked mask would say the true thing and
 * it is not static CSS the way 0055 requires the rest of the library's motion to
 * be, so the affordance is the honest one instead: **an item is never wider
 * than 82% of the band**, so the next one is always visibly cut off, on every
 * screen, at rest.
 */

const props = z
  .object({
    /**
     * A floor for each item's width, never a count — the distinction the
     * granularity doc names as the easiest one to get wrong. Nothing here
     * truncates the row: `wide` on a phone is the same eight items as `narrow`
     * on a laptop, with more of each one on screen at a time.
     *
     * The names are local rather than `COLUMN_NAMES`, for `loom.offering-grid`'s
     * reason: `two` and `three` are counts across a page, and a carousel has no
     * such number to name — its row is as long as its children are.
     */
    item: z.enum(["narrow", "medium", "wide"]).optional(),
    gap: z.enum(GAP_NAMES).optional(),
    /**
     * Where an item comes to rest. `start` lines the row up against the leading
     * edge, which is what a run of cards wants; `center` brings each item to
     * the middle, which is what a single large shot wants.
     */
    snap: z.enum(["start", "center"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * The `min(…, 82%)` is the affordance, and the percentage is of the band rather
 * than of the page: at every width the reader can see that something follows.
 * The floors are the grid's own two smallest columns and one step above them,
 * so a card in a carousel and the same card in a `loom.grid` are the same size
 * rather than nearly.
 */
const ITEM_WIDTHS: Readonly<Record<NonNullable<Props["item"]>, string>> = {
  narrow: "min(16rem, 82%)",
  medium: "min(22rem, 82%)",
  wide: "min(30rem, 82%)",
}

/**
 * The name a reader hears when the row takes focus. It is the primitive's own
 * rather than the tree's (0063), because it describes what the element *is* —
 * what is in it is what its children say.
 */
const CAROUSEL_TEXT = { label: "Scrollable row" } as const

type CarouselTextKey = keyof typeof CAROUSEL_TEXT

export const loomCarousel = definePrimitive({
  type: "loom.carousel",
  description:
    "A row of children that scrolls sideways and snaps — cards a reader pushes through on a phone. No script, no state in the tree.",
  props,
  text: CAROUSEL_TEXT,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, CarouselTextKey>) => {
    const width = ITEM_WIDTHS[given.item ?? "medium"]

    const cells = Children.toArray(children).map((child, index) =>
      createElement(
        "div",
        {
          key: `cell-${index}`,
          className: LIBRARY_CLASS.carouselCell,
          /**
           * The width is per-render and the snapping is not, which is the split
           * the whole file turns on: a prop's value has to be inline, and an
           * inline value beats every rule, so anything a `@media` or a
           * reduced-motion block has to cancel must never be set here.
           */
          style: { flex: `0 0 ${width}` },
        },
        child
      )
    )

    return createElement(
      "div",
      {
        ...loom.editable,
        className:
          given.snap === "center"
            ? `${LIBRARY_CLASS.carousel} ${LIBRARY_CLASS.carouselCentred}`
            : LIBRARY_CLASS.carousel,
        role: "group",
        "aria-label": loom.text.label,
        tabIndex: 0,
        style: { gap: GAPS[given.gap ?? "normal"] },
      },
      libraryStylesheet(),
      ...cells
    )
  },
})
