import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
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
 * **Four renderings, one content model, one prop** — 0052's closed-set clause,
 * the same call `loom.code` makes about a terminal and `loom.divider` makes
 * about an ornament. All four say *this span is louder*; they differ in how,
 * and the element follows the **meaning** because a screen reader is told which
 * is which:
 *
 * - `strong` is `<strong>` — importance. The word you would not drop.
 * - `subtle` is `<em>` — stress. The word that carries the distinction.
 * - `marked` is `<mark>` — relevance. The phrase in a headline that the page is
 *   really about, which is the one modern landing pages reach for most and the
 *   one nothing in this library could draw.
 * - `washed` is `<strong>` too — the same claim about the word, spoken the same
 *   way, drawn as light instead of as weight. See below; the shared element is
 *   the point rather than a compromise.
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
 *
 * ## `washed`, and why a word rather than a headline
 *
 * Accent-washed display type is arguably the single most characteristic device
 * of the tier the maintainer's brief points at, and for ninety-two primitives
 * **nothing in this library could draw it**: `loom.heading` is flat
 * `fg-default` at every level, and the three tones above offered weight, slant
 * and a highlight. The 12 September report put the design question precisely —
 * whether the wash belongs on `loom.heading`, which is the whole headline, or
 * here, which is one word of it — and answered it, correctly, for the harder
 * one: **a washed word is addressable.** Moving the wash from *faster* to
 * *ship* is a `move` against a node with its own author and its own history. As
 * a `display: "washed"` prop on the heading it would have been a `configure`
 * that repaints the entire line, and *which word* would not have been sayable
 * at all.
 *
 * It shares `<strong>`'s element deliberately. A wash and a bold face are the
 * same claim about the word — *this is the one you would not drop* — made at
 * two volumes, so a screen reader should hear the same thing from both. The
 * three-way rule above is that the element follows the **meaning**, and two
 * renderings of one meaning is what that rule predicts rather than a case it
 * fails to cover.
 *
 * **The two slots are `accent-strong` and `brand-secondary`**, and this was the
 * one real trap in building it. The obvious spelling is `accent` to
 * `brand-secondary`, and under `editorial` — one of the two starter palettes —
 * those two slots hold *the same hex*, `#4a5b78`, because a single-accent
 * palette mirrors its accent into its secondary. A wash between a colour and
 * itself is a flat fill: the primitive would have rendered a gradient nobody
 * could see, under the palette every screenshot in this repository is taken in
 * first. That is `tokens.ts`' standing warning — a token promises the value
 * comes from the theme and promises nothing about it *differing from the one
 * beside it* — met one axis across from where it bit `weight("heading")`.
 * `accent-strong` and `brand-secondary` are the pair `loom.hero`'s aurora
 * already paints, and `src/theme/palettes.ts` states that every palette gives
 * both real chroma *because* they are painted as areas. A wash across type is
 * an area. `library.test.ts` asserts the two differ in every registered
 * palette, because this rendering is the thing that silently stops working if
 * one ever does not.
 *
 * A restrained palette still gets a restrained wash — `editorial` runs slate to
 * slate through two steps rather than hue to hue — and that is the palette
 * being honest rather than the primitive failing.
 */

const props = z
  .object({
    tone: z.enum(["strong", "subtle", "marked", "washed"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

type Tone = {
  readonly element: string
  readonly style: CSSProperties
  /**
   * Set only where a rendering cannot be written inline. A tone carrying one
   * emits the shared stylesheet and a tone without one emits nothing, so the
   * class and the stylesheet it needs cannot drift apart — and the three tones
   * that were here before render byte-for-byte as they did.
   */
  readonly className?: string
}

const TONES: Readonly<Record<"strong" | "subtle" | "marked" | "washed", Tone>> = {
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
  washed: {
    element: "strong",
    className: LIBRARY_CLASS.washed,
    /**
     * **Everything visual is in the rule and nothing is here**, which is the
     * stylesheet's first mechanic doing real work rather than being obeyed: an
     * inline style beats a rule, so a `color` set here would defeat the
     * `@supports` fallback and the forced-colours rule both — and the failure
     * mode of defeating them is a word nobody can see.
     *
     * `bolder` is the one declaration that survives inline, because it is a
     * weight rather than a colour and it is the same relative-to-context
     * reasoning `strong` uses above: a wash under `bold-sans`, whose pack
     * declares `headingWeight: 400` beside `bodyWeight: 400`, would otherwise be
     * a coloured word at the weight of the sentence around it.
     */
    style: { fontWeight: "bolder" },
  },
}

export const loomEmphasis = definePrimitive({
  type: "loom.emphasis",
  description:
    "A span inside a sentence that matters more than the words around it — bold, italic, highlighted, or washed in the palette's two accent colours. Its text is a child.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const tone = TONES[given.tone ?? "strong"]

    return createElement(
      tone.element,
      {
        ...loom.editable,
        ...(tone.className === undefined ? {} : { className: tone.className }),
        style: tone.style,
      },
      ...(tone.className === undefined ? [] : [libraryStylesheet()]),
      children
    )
  },
})
