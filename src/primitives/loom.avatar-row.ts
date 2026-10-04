import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAPS } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * A run of `loom.avatar` faces, overlapping — the cluster a page puts beside
 * "and four thousand others".
 *
 * It is a `loom.stack` set to a row in every respect but the one that matters:
 * a stack puts a gap *between* its children, and this puts each face partly
 * over the one before it. That is not a gap of a negative size — it needs the
 * later face to paint over the earlier one and to carry a ring in the page's own
 * canvas colour so the edge reads, which is two properties a gap does not have.
 * Named by 0054: the child is `loom.avatar`, the arrangement is a row.
 *
 * **The overlap is the container's, not the avatar's**, and that is the whole
 * design decision here. The obvious alternative — an `overlap` prop on
 * `loom.avatar` — makes a child responsible for how its parent arranges it,
 * which is the coupling `loom.split` avoids by keeping `ratio` on the arranger,
 * and it means an avatar carries a prop that is inert everywhere except inside
 * one parent. So the negative margin and the ring live in the stylesheet,
 * scoped to this container's class and applied to whatever it is given —
 * generically, by position, without naming a child type. `loom.article-grid`'s
 * `lead` is the same mechanic and this is the tidier instance of it: nothing
 * here reaches into a sibling primitive's classes.
 *
 * Which face sits on top is left to the paint order, so each one overlaps the
 * one before it. Reversing that — the first face over the second, the second
 * over the third — needs a descending `z-index` per position, which CSS can
 * only express as a bounded ladder of `nth-child` rules that quietly stops
 * working at whatever number it stops at. A prop that worked for eight faces
 * and not for nine is worse than no prop.
 *
 * Every prop decides how however-many faces are arranged and none decides how
 * many there are, which is the granularity doc's sharper question answered the
 * short way.
 */

const props = z
  .object({
    /**
     * `overlap` is the cluster; `spaced` is the same faces set apart, for a row
     * of authors where each one is a person rather than a count. Two renderings
     * of one arrangement, so it is an enum on this container rather than two
     * containers a `move` could not turn into each other.
     */
    spacing: z.enum(["overlap", "spaced"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomAvatarRow = definePrimitive({
  type: "loom.avatar-row",
  description:
    "A run of loom.avatar faces, overlapping into a cluster or set apart — the “and four thousand others” band.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className: given.spacing === "spaced" ? undefined : LIBRARY_CLASS.cluster,
        style: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          /**
           * A spaced row gets its gap from the shared scale; a cluster gets
           * none, because the overlap *is* the spacing and a gap fighting a
           * negative margin is two rules deciding one distance.
           */
          gap: given.spacing === "spaced" ? GAPS.snug : "0",
        },
      },
      children,
      /**
       * Last, because the overlap rule is `> * + *` and a leading `<style>`
       * would make the *first* face the one with a preceding sibling — pulling
       * it half a face to the left of where the row starts. `loom.mosaic` moves
       * it for the same reason and says more about why.
       */
      libraryStylesheet()
    ),
})
