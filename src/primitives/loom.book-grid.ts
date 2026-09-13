import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAP_NAMES, GAPS } from "./layout.js"
import { libraryStylesheet } from "./stylesheet.js"
import { space } from "./tokens.js"

/**
 * A shelf of `loom.book` cells — the books someone wrote, the ones they
 * recommend, or the one they are halfway through.
 *
 * **It is `-grid` and not `-shelf`, and the rename is the point.**
 * `docs/hermes-port-map.md` proposed `loom.book-shelf` and said to read the name
 * as a prediction rather than a commitment.
 * [0054](../../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
 * says a container is its child's name plus **the arrangement**, and *shelf* is
 * a metaphor for books rather than a word for what this element does with its
 * children — which is `repeat(auto-fit, minmax(…))`, the same thing seven other
 * containers in this library do under the name `-grid`. A reader who has met
 * `loom.article-grid` can predict this one; nobody can predict `-shelf` except
 * by knowing it is about books. Three earlier proposals in that document changed
 * the same way for the same reason, and getting it right before it ships is the
 * whole of 0054's consequence: a container that changes its arrangement changes
 * its name, and a rename breaks every stored tree.
 *
 * **`one` is in the vocabulary and it is the second Hermes block.** The shared
 * `COLUMN_NAMES` runs `auto | two | three | four`, which is right for a wall of
 * covers and cannot say the thing `currently-reading` is: a short, focused list
 * — Hermes caps it at eight — of full-width rows, cover beside text. That is not
 * a second primitive and it is not a `variant` prop; `loom.book` already reads
 * as a row when it is given the width, so all this has to do is give it the
 * width. `loom.offering-grid` and `loom.perk-list` set the precedent and gave
 * the same reason.
 *
 * It stays a prop under the granularity doc's sharper question — *does changing
 * it change the set of nodes?* It does not. Every book that was in the band is
 * still in it, in the same order; only the floor each column is fitted against
 * moves. A `columns` that truncated the shelf at four would be `remove` in
 * disguise and would fail.
 *
 * **Its floors are its own, and narrower than any other card grid's.** A book
 * cover is 2:3, so a cell needs about half the width an article's 16:10 cover
 * does, and borrowing `layout.ts`'s shared floors would leave a wall of
 * paperbacks with more air than paper. Every card grid in this library declares
 * its own for this reason; the **gap** scale is shared, because a gap has no
 * content to be measured against and two bands on one page spacing themselves
 * differently is exactly the mismatch `layout.ts` exists to prevent.
 *
 * Like every container here it lays out and nothing else: it does not style its
 * children and does not require them to be books. Rendering is total (0008).
 */

const COLUMNS = ["auto", "one", "two", "three", "four"] as const

const props = z
  .object({
    /**
     * A floor for each column, never a count — the distinction the granularity
     * doc names as the easiest one to get wrong. `one` is a full-width column,
     * which is where a `loom.book` becomes a row.
     */
    columns: z.enum(COLUMNS).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * **Sized against a phone first, which is the opposite of every other grid in
 * this library and the right way round for this one.** A 12rem floor is a
 * perfectly ordinary card minimum and it puts *one* book on a 390px screen — a
 * 2:3 cover at full width is 585px tall, so a seven-book shelf became a
 * four-thousand-pixel scroll of one cover per screen. A shelf is the one band
 * where that is plainly wrong: books are read two and three across on a phone
 * because a cover stays legible at a thumbnail's size, which is what a cover is
 * for. 9rem is the floor at which 350px of usable width fits two columns and a
 * gap; `four` is 10rem for the same reason.
 *
 * The screenshot is what found this, and no assertion in the suite could have:
 * every column count is valid CSS and the band has no overflow at any of them.
 */
const MINIMUMS: Readonly<Record<(typeof COLUMNS)[number], string>> = {
  auto: "9rem",
  one: "100%",
  two: "19rem",
  three: "14rem",
  four: "10rem",
}

export const loomBookGrid = definePrimitive({
  type: "loom.book-grid",
  description:
    "A shelf of loom.book cells — books written, recommended, or being read. Set columns to one for a full-width reading list.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MINIMUMS[given.columns ?? "auto"]}), 1fr))`,
          gap: given.gap === undefined ? space(5) : GAPS[given.gap],
          width: "100%",
          alignItems: "stretch",
        },
      },
      libraryStylesheet(),
      children
    ),
})
