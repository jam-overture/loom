import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, radius } from "./tokens.js"

/**
 * A span inside a sentence that matters more than the words around it.
 *
 * This closes the 19 August finding from `Loom lessons`, and the finding is
 * worth reading before this primitive is judged, because the gap it describes
 * was not a missing convenience. A Loom text node is a string (0001) and no
 * primitive in the library marked a span *inside* a paragraph, so a surface
 * whose prose contained `**` or `*` had three options and all three were bad:
 * print the markers, strip them, or wrap the span in a `loom.badge` — a pill in
 * the middle of a sentence, which is not what a badge means. The lessons
 * surface stripped them, and every distinction its questions turned on was lost
 * on the way to the page.
 *
 * **Three renderings, one content model, one prop** — 0052's closed-set clause,
 * the same call `loom.code` makes about a terminal and `loom.divider` makes
 * about an ornament. All three say *this span is louder*; they differ in how,
 * and the element follows the choice because a screen reader is told which is
 * which:
 *
 * - `strong` is `<strong>` — importance. The word you would not drop.
 * - `subtle` is `<em>` — stress. The word that carries the distinction.
 * - `marked` is `<mark>` — relevance. The phrase in a headline that the page is
 *   really about, which is the one modern landing pages reach for most and the
 *   one nothing in this library could draw.
 *
 * Swapping between them is one `configure` against a node whose text keeps its
 * author and its history. Three primitives instead would have made it a
 * `remove` and an `insert`, and the sentence would forget who wrote the word.
 *
 * **`marked` is the only one that paints**, and it paints with the one tinted
 * pairing this library has measured: `fg-default` on `accent-subtle` is in
 * `PALETTE_TEXT_PAIRINGS` and clears 0074's bar in every registered palette.
 * The obvious alternative — `accent` ink on the same ground — does not, which
 * the 22 August contrast finding established the hard way. A `<mark>` also
 * needs both halves set rather than one: browsers give it a yellow ground and
 * black ink of their own, and a page that set only the background would keep
 * the black under a dark palette.
 */

const props = z
  .object({
    tone: z.enum(["strong", "subtle", "marked"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const TONES: Readonly<Record<"strong" | "subtle" | "marked", { element: string; style: CSSProperties }>> = {
  strong: {
    element: "strong",
    /**
     * **`bolder`, not the heading weight, and this is the whole of what the
     * screenshots caught.** The obvious spelling is `weight("heading")`, which
     * is what every other primitive here reaches for and what this was
     * written as first. It renders *nothing* under `bold-sans`, whose font pack
     * declares `headingWeight: 400` beside `bodyWeight: 400` — a legitimate
     * pack, since that family carries its emphasis in size and colour rather
     * than in weight, and a stressed word inside a paragraph that came out
     * identical to the words on either side of it.
     *
     * A token cannot fix this, because the failure is that the token is
     * *equal* to its surroundings rather than wrong. `bolder` is relative to
     * the inherited weight by definition, so the span is heavier than whatever
     * it is set in under every pack, including one nobody has registered yet.
     * It is the same argument `loom.kbd` makes for `em` over a ramp step, one
     * axis across.
     */
    style: { fontWeight: "bolder", color: colour("fg-default") },
  },
  subtle: {
    element: "em",
    style: { fontStyle: "italic", color: "inherit" },
  },
  marked: {
    element: "mark",
    style: {
      background: colour("accent-subtle"),
      color: colour("fg-default"),
      /**
       * Padded and rounded in `em`, so the highlight grows with the type it
       * marks. A headline phrase and a footnote phrase get the same *shape* of
       * highlight rather than the same number of pixels, and the block padding
       * is deliberately smaller than the inline padding: a `<mark>` that padded
       * evenly would push the lines of a wrapped paragraph apart wherever it
       * fell.
       */
      paddingBlock: "0.05em",
      paddingInline: "0.2em",
      borderRadius: radius("sm"),
      /** A highlight that wraps gets its padding and its corners on both lines. */
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
    },
  },
}

export const loomEmphasis = definePrimitive({
  type: "loom.emphasis",
  description:
    "A span inside a sentence that matters more than the words around it — bold, italic, or highlighted. Its text is a child.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const tone = TONES[given.tone ?? "strong"]

    return createElement(tone.element, { ...loom.editable, style: tone.style }, children)
  },
})
