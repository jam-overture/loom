import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"

/**
 * The band that answers *how is this different from what I use now* — subjects
 * across the top, criteria down the side, and a verdict at every intersection.
 *
 * It is the library's only genuinely two-dimensional primitive, and the one
 * decision it forced is recorded in
 * [0084](../../decisions/0084-in-a-two-dimensional-band-rows-are-nodes-and-columns-are-positions.md):
 * **rows are nodes and columns are positions.** A row is a thing a delta can
 * insert, remove and move. A column is not — it has no node of its own, only
 * one cell in each of many rows — so anything scoped to a whole column belongs
 * to this container and is expressed as a rule keyed on position. `feature` is
 * the only such thing the band needs, and it is why it lives here rather than
 * as an `emphasis` on a cell that would have to be set five times and kept in
 * step by hand.
 *
 * `feature` passes the granularity test the way `loom.feature-grid`'s `columns`
 * does: it changes what is *painted*, never which nodes exist. Ask the sharper
 * question — does changing this prop change the set of nodes? — and the answer
 * is no. It names an ordinal rather than an id for the same reason the rhythm
 * of a `loom.mosaic` is a named cycle: a static stylesheet cannot have a node id
 * interpolated into it (0055), and the position is the only handle a column has.
 *
 * **It is a real `<table>`**, which `loom.tier-table` is deliberately not. The
 * pricing band is a row of cards that happen to line up; this one is a matrix
 * whose whole value is that the third answer in the second column can be found
 * by a reader who arrived at it from either edge. That reader may be using a
 * screen reader, and `<th scope="col">` and `<th scope="row">` are the only
 * things that make the fifteenth cell say *Reversible, Codegen, No* instead of
 * *No*. A grid of `<div>`s cannot say it at any price.
 *
 * The header row is a **region** rather than the first child (0051): the table
 * places it in `<thead>`, which is somewhere the flow of children does not go,
 * and "the first row is the header" is a rule no schema states and every `move`
 * breaks — which is exactly the trap `loom.tier` names about its own action.
 */

const props = z
  .object({
    /**
     * The table's own name, rendered as its `<caption>`. Worth setting: it is
     * what a screen reader announces on arrival, and a table introduced only by
     * a heading two nodes away is a table a reader meets with no idea what is
     * being compared.
     */
    caption: z.string().min(1).max(140).optional(),
    /**
     * Which subject column is the one this page is steering towards, counted
     * from the first subject rather than from the criterion column.
     *
     * Beyond the fourth there is nothing to select, because each position is a
     * static rule and the rules are finite. Four is where a comparison stops
     * being readable anyway; a fifth subject is a column a reader scrolls to.
     */
    feature: z.enum(["none", "first", "second", "third", "fourth"]).optional(),
    density: z.enum(["tight", "loose"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const FEATURE_CLASS: Readonly<Record<NonNullable<Props["feature"]>, string | undefined>> = {
  none: undefined,
  first: LIBRARY_CLASS.compareFeatureFirst,
  second: LIBRARY_CLASS.compareFeatureSecond,
  third: LIBRARY_CLASS.compareFeatureThird,
  fourth: LIBRARY_CLASS.compareFeatureFourth,
}

export const loomComparisonTable = definePrimitive({
  type: "loom.comparison-table",
  description:
    "A feature-by-feature comparison — a region of loom.comparison subjects across the top, and a loom.comparison-row per criterion.",
  props,
  slots: ["columns"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const columns = loom.slots["columns"]
    const feature = FEATURE_CLASS[given.feature ?? "none"]
    const captionId = given.caption === undefined ? undefined : `${String(loom.nodeId)}-caption`

    const table = createElement(
      "table",
      {
        ...(captionId === undefined ? {} : { "aria-labelledby": captionId }),
        className: [LIBRARY_CLASS.compare, given.density === "tight" ? LIBRARY_CLASS.compareTight : undefined, feature]
          .filter((name) => name !== undefined)
          .join(" "),
        style: {
          /**
           * `separate` rather than `collapse`, because the criterion column is
           * `position: sticky` and a collapsed border belongs to the table
           * rather than to the cell it was drawn on — so it stays behind while
           * the cell it edges travels, and the sticky column ends up with the
           * borders of whichever row happens to be under it.
           */
          borderCollapse: "separate",
          borderSpacing: "0",
          width: "100%",
          fontFamily: family("body"),
          color: colour("fg-default"),
        },
      },
      columns === undefined ? null : createElement("thead", null, columns),
      createElement("tbody", null, children)
    )

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          minWidth: "0",
          width: "100%",
          background: colour("bg-surface"),
          border: `1px solid ${colour("border-subtle")}`,
          borderRadius: radius("lg"),
          /** Clips the table's corners to the panel's radius. */
          overflow: "hidden",
        },
      },
      libraryStylesheet(),
      /**
       * The caption sits **outside** the scrolling region, which is why it is a
       * `<div>` named by `aria-labelledby` rather than a `<caption>`.
       *
       * A `<caption>` takes the width of the table it captions, and this table
       * is deliberately wider than a phone — so on the screen where the caption
       * matters most it is the half-sentence clipped by the panel's edge, and
       * scrolling to read it scrolls the answers away. Out here it wraps to the
       * band's own width and stays put while the columns move under it. The
       * name reaches assistive technology by the same association `loom.field`
       * uses for its hint: one id, minted from the node's own, and the text is
       * announced once because only the table points at it.
       */
      given.caption === undefined || captionId === undefined
        ? null
        : createElement(
            "div",
            {
              id: captionId,
              style: {
                padding: `${space(4)} ${space(4)} ${space(3)}`,
                fontFamily: family("heading"),
                fontWeight: weight("heading"),
                fontSize: size(4),
                lineHeight: 1.3,
                color: colour("fg-default"),
              },
            },
            given.caption
          ),
      createElement(
        "div",
        {
          style: {
            /**
             * The band scrolls sideways inside its own edge rather than
             * widening the page, which is the 20 August phone-scrollbar finding
             * answered the way `loom.code` answers it: a comparison of four
             * subjects is wider than a phone and nothing about that is a fault
             * to design away. `min-width: 0` is what lets this be narrower than
             * its content when the band is a flex or grid track.
             */
            overflowX: "auto",
            minWidth: "0",
          },
        },
        table
      )
    )
  },
})
