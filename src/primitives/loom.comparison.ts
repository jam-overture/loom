import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { LIBRARY_CLASS } from "./stylesheet.js"
import { color, family, size, space, weight } from "./tokens.js"

/**
 * One intersection of a comparison: what this subject does about this criterion.
 *
 * It is the smallest node in the library's only two-dimensional band, and it
 * exists as a node rather than as a string in an array for the reason 0052
 * gives about every list: a row of cells is repeated content, and `cells:
 * string[]` on the row would be `insert` and `remove` wearing a prop's name.
 * A cell that is a node can be re-authored, attributed, and reversed on its
 * own — which is what "Partial" becoming "Yes, from v2" has to be.
 *
 * **The mark is a prop and the value is a child**, and the split is 0052's
 * third clause read carefully. A cell's *text* — "Unlimited", "3 seats" — is
 * one string that is the whole of what the node says, so it is a text child
 * like `loom.badge`'s label. The *mark* is not text at all: it is one of three
 * verdicts the primitive draws, and the glyph is derived from it rather than
 * chosen, so a proposal cannot put a tick beside something a reader does not
 * get. That is the same call `perk-content.ts` makes and for the same reason.
 *
 * Where this parts company with a perk is the accessible name. A perk's tick
 * is deliberately unnamed — a list headed *what you get* says "included" nine
 * times without help, and announcing it on every row is how a list becomes
 * unlistenable. A comparison cell has no such heading over it: a bare tick in
 * a grid means nothing until something says *yes*, and the row and column
 * headers give the question rather than the answer. So all three marks are
 * named (0060), and none of the three is decoration.
 *
 * `role` is the one prop here that chooses markup rather than content, and it
 * is a display mode by 0052 — a closed set of two renderings, one `configure`
 * apart. It is also the thing that makes the band *a table* rather than a grid
 * of boxes: a `subject` cell is the `<th scope="col">` a screen reader reads
 * back when it reaches this column six rows later, and a library that could
 * not say which cells those were would be drawing a table and shipping a
 * mosaic.
 */

const props = z
  .object({
    /**
     * `subject` is a column header — the name of the thing being compared, and
     * the cell that belongs in a `loom.comparison-table`'s `columns` region.
     * `value` is the default and is an ordinary cell in the body.
     */
    role: z.enum(["value", "subject"]).optional(),
    /**
     * The verdict, drawn as a glyph and announced by name. Omit it for a cell
     * whose whole answer is its text — a price, a count, a caveat.
     */
    mark: z.enum(["yes", "no", "partial"]).optional(),
    /** A qualifier the answer itself should not carry — "fair use", "from v2". */
    note: z.string().min(1).max(120).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * The three verdicts a comparison offers, and the reason there are three.
 *
 * Two would force every honest "sort of" into a lie in one direction or the
 * other, which is the failure mode of every comparison table anyone distrusts.
 * A fourth would be a scale, and a scale wants a number rather than a glyph.
 */
const CELL_TEXT = {
  yes: "Yes",
  no: "No",
  partial: "Partial",
} as const

type MarkKey = keyof typeof CELL_TEXT

/**
 * Three glyphs from one family, which took a screenshot to get right.
 *
 * `◐` was the first choice — a half-filled disc says *some of this* better than
 * anything else does — and it is a *geometric shape* where `✓` and `✕` are
 * dingbats, so it resolved from a different fallback face and rendered a
 * hairline crescent a third the weight of its neighbours. `−` is a
 * mathematical operator, which is the family `✓` and `✕` sit beside in every
 * face that has them, and it draws at the same weight. Beside a tick and a
 * cross it reads as *neither*, which is what partial means.
 *
 * The colors are **not here**. They are class names resolved by the library's
 * stylesheet, because a featured column repaints its own ink — an inline color
 * would beat that rule and be unreachable from it, which is the first trap
 * `stylesheet.ts` names.
 */
const MARKS: Readonly<Record<MarkKey, { glyph: string; className: string }>> = {
  yes: { glyph: "✓", className: LIBRARY_CLASS.compareYes },
  no: { glyph: "✕", className: LIBRARY_CLASS.compareNo },
  partial: { glyph: "\u2212", className: LIBRARY_CLASS.comparePartial },
}

/**
 * **The width this cell will not go below is not here any more**, and where it
 * went is [0155](../../decisions/0155-a-container-may-only-add-to-its-children-what-they-left-unspoken.md)'s
 * rule applied to the second place it has been found.
 *
 * It used to be `min-width: 7rem`, set inline, one line below this comment. The
 * comment argued that the pair of minimums — this one and the criterion
 * column's — were "the intrinsic answer to a narrow screen, with no width query
 * to declare", and half of that is still true: the arithmetic belongs to the
 * content and not to a breakpoint. The half that was wrong is that it never
 * varies. A criterion column sized to read as a sentence at 1280 is a criterion
 * column that leaves 44 blank pixels of the next subject at 390, and the band
 * spent a month telling a phone reader there was one subject when there were
 * four.
 *
 * An inline style beats a rule, so while these two numbers were here the file
 * that draws the band could not reach either of them. They are now
 * `.loom-compare th, .loom-compare td` and `.loom-compare .loom-compare-key` in
 * `stylesheet.ts`, at the same values, and the narrow rendering is a media
 * query over there. **Do not set a width on this element again** — the failure
 * mode is silent, and the test that would catch it asserts the absence rather
 * than the presence.
 */

export const loomComparison = definePrimitive({
  type: "loom.comparison",
  description:
    "One cell of a loom.comparison-row — a yes/no/partial mark, a short value, or both. Set role to subject for a column header.",
  props,
  slots: [],
  text: CELL_TEXT,
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, MarkKey>) => {
    const subject = given.role === "subject"
    const verdict = given.mark

    const glyph: ReactNode =
      verdict === undefined
        ? null
        : createElement(
            "span",
            {
              className: MARKS[verdict].className,
              role: "img",
              "aria-label": loom.text[verdict],
              style: { fontSize: size(4), lineHeight: 1 },
            },
            MARKS[verdict].glyph
          )

    const answer: ReactNode =
      glyph === null && children === null
        ? null
        : createElement(
            "span",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: space(2),
              },
            },
            glyph,
            children
          )

    return createElement(
      subject ? "th" : "td",
      {
        ...loom.editable,
        ...(subject ? { scope: "col" } : {}),
        style: {
          /**
           * No padding here. Density is the table's decision — one band is a
           * spec to scan and another is a page to read, and neither is a
           * property of one cell — so the length is a rule the container
           * switches, and an inline value would make that rule inert.
           */
          textAlign: "center",
          /**
           * A subject's name aligns to the top of its cell so that three
           * subjects read along one line whether or not each has a note under
           * it; centring them puts the one without a note between the two lines
           * of the ones that have. An answer stays centred in the row it is the
           * answer to.
           */
          verticalAlign: subject ? "top" : "middle",
          fontFamily: subject ? family("heading") : family("body"),
          /**
           * `bolder` rather than `weight("heading")`, and it is a repair rather
           * than a preference. A subject's name is a column heading whose whole
           * job is to be distinguishable from the answers under it, and a token
           * promises only that a value came from the theme — never that it
           * differs from the one beside it. `bold-sans` declares
           * `headingWeight: 400` beside `bodyWeight: 400`, so under that pack
           * this row rendered identical to its own data, with `<th>`'s browser
           * default overridden into normal on the way. `bolder` is relative to
           * the inherited weight by definition and is therefore heavier under
           * every pack, including one nobody has registered yet. Found by
           * screenshotting `loom.table` under the same pack on 24 August; see
           * `tokens.ts` for the general warning and `loom.emphasis` for the
           * first instance of it.
           */
          fontWeight: subject ? "bolder" : weight("body"),
          fontSize: size(3),
          lineHeight: 1.4,
          color: color("fg-default"),
        },
      },
      answer,
      given.note === undefined
        ? null
        : createElement(
            "span",
            {
              className: LIBRARY_CLASS.compareNote,
              style: { display: "block", marginBlockStart: space(1), fontSize: size(1), lineHeight: 1.4 },
            },
            given.note
          )
    )
  },
})
