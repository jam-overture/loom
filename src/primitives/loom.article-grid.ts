import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { COLUMN_NAMES, GAP_NAMES, GAPS } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { space } from "./tokens.js"

/**
 * A wall of `loom.article` cells — the blog index, the press page, the case
 * studies, the recipe box.
 *
 * Its own column floors rather than `layout.ts`'s, for the reason
 * `loom.person-grid` gives about the opposite case: an article cell carries a
 * cover, a label, a title and a sentence, so it needs *more* width than a
 * feature tile, and borrowing the shared floors would put four articles across
 * a page where three is the most that reads. The **gap** scale is shared,
 * because a gap has no content to be measured against and two bands on one page
 * spacing themselves differently is exactly the mismatch `layout.ts` exists to
 * prevent.
 *
 * **`lead` is the one thing here that is not a grid.** A publication does not
 * set every piece at the same size; it runs one across the top and the rest
 * beneath, and a blog index that cannot say so looks like a card catalogue
 * rather than a front page. It is a prop and not structure because it passes
 * the granularity doc's sharper question exactly: *does changing it change the
 * set of nodes?* It does not. It changes how however-many cells are laid out,
 * which is the same thing `columns` does, and it truncates nothing, promotes
 * nothing and inserts nothing. The first cell was already first.
 *
 * The layout it asks for cannot be said inline, so it lives in the stylesheet
 * with the other position rules: the lead spans every column and flips its own
 * cover and body into a row, which is `:first-of-type` and nothing else knows
 * it. The row wraps back to a column on a narrow screen by `flex-wrap` against
 * a basis rather than by a media query, so the band stays free of the one thing
 * `auto-fit` was chosen to avoid.
 *
 * Like every container in the library it lays out and nothing else: it does not
 * style its children and does not require them to be articles. Rendering is
 * total (0008), and a grid that blanked itself over an unexpected child fails
 * worse than one with something odd in a cell — though `lead` is written for an
 * article and says nothing to a cell that is not one, which is the honest limit
 * of a rule that reaches into a sibling primitive's classes.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the grid fits what it can and wraps. */
    columns: z.enum(COLUMN_NAMES).optional(),
    gap: z.enum(GAP_NAMES).optional(),
    /**
     * Runs the first piece across the full width as a row. Changes no node —
     * the first cell is still the first cell and no cell is added or dropped.
     */
    lead: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Wider than `layout.ts`'s: a cover, a label, a title and a sentence need room. */
const MINIMUMS = { auto: "20rem", two: "26rem", three: "19rem", four: "15rem" } as const

export const loomArticleGrid = definePrimitive({
  type: "loom.article-grid",
  description:
    "A responsive grid of loom.article cells — the blog index, the press page, the case studies. Set lead to run the first piece across the top.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className: given.lead === true ? LIBRARY_CLASS.lead : undefined,
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
