import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"

/**
 * Rows and columns of whatever it is given — the ordinary table a document is
 * written with.
 *
 * The library had two tables before this one and neither is this.
 * `loom.tier-table` is a pricing band, and says so in its own comment: a row of
 * cards that happen to line up. `loom.comparison-table` is a matrix of
 * verdicts, and its cells draw a tick, a cross or a dash because that is what a
 * comparison *is*. Between them they cannot render
 * `| Where | What it means | Whose problem |`, which is the median table in a
 * course, a changelog, a spec sheet or a documentation page — and `Loom
 * lessons` filed exactly that on 22 August, having degraded every table in
 * thirteen lessons into one card per row with each cell labelled by its header.
 * That is the standard responsive fallback and it loses the column-wise scan
 * that made the author write a table in the first place.
 *
 * **It is the third general arranger**, so it is named for the arrangement
 * alone and not for a child it does not have
 * ([0062](../../decisions/0062-a-general-arranger-is-named-for-the-arrangement-alone.md)) —
 * `loom.stack`, `loom.grid`, `loom.mosaic`, and now this. It sits with them
 * rather than at the top of the catalogue for the reason that file gives: a
 * model should meet `loom.comparison-table` and `loom.tier-table` before it has
 * any reason to reach for the general one.
 *
 * **Rows are nodes and columns are positions**
 * ([0084](../../decisions/0084-in-a-two-dimensional-band-rows-are-nodes-and-columns-are-positions.md)),
 * unchanged and for the same reasons, so adding a column is a change to every
 * row and the delta model says so. The header row is a **region** rather than
 * the first child (0051): the table places it in `<thead>`, which is somewhere
 * the flow of children does not go, and "the first row is the header" is a rule
 * no schema states and every `move` breaks.
 *
 * **Every prop here is a rendering and none of them is a count.** `rules`,
 * `density` and `tone` change how however-many rows are painted; nothing here
 * decides how many rows exist, which is the question `docs/primitive-granularity.md`
 * says to ask instead of matching on a prop's name.
 */

const props = z
  .object({
    /**
     * The table's own name, rendered above it. Worth setting: it is what a
     * screen reader announces on arrival, and a table introduced only by a
     * heading two nodes away is a table a reader meets with no idea what is
     * being listed.
     */
    caption: z.string().min(1).max(140).optional(),
    /**
     * `panel` is the bordered surface a band on a landing page wants; `plain` is
     * the table set into running prose, where a second box around it would be a
     * card inside a card. `plain` is the default, because the majority of the
     * tables this exists for are in documents.
     */
    tone: z.enum(["plain", "panel"]).optional(),
    /**
     * How much of the grid is drawn. `rows` rules between rows only, which is
     * what a reader tracking a line across needs and all they need; `grid` adds
     * the verticals, for a table dense enough that a column edge is doing work;
     * `none` is the open table a typographer would set, held together by
     * alignment alone.
     */
    rules: z.enum(["rows", "grid", "none"]).optional(),
    density: z.enum(["tight", "comfortable", "loose"]).optional(),
    /**
     * That this table's body cells hold sentences rather than values — the one
     * fact about a table's content that changes what its narrow rendering
     * should be, and the one fact no rule in `stylesheet.ts` can see.
     *
     * Leave it off and nothing changes: a table of figures, dates or labels
     * fits a phone today and is right there. Set it and the body cells take a
     * readable measure below 48rem, so the band overflows and scrolls the way a
     * wide table is supposed to, instead of squeezing three sentences into a
     * hundred pixels each. Measured at 390px: one row went from 360 pixels tall
     * — 43% of a phone screen, for one row — to 193.
     *
     * **It is a prop because both ways of avoiding one were measured and
     * neither works.** `min-inline-size: fit-content(12rem)` is precisely this
     * rule conditioned on the content, leaving a short cell alone and lifting a
     * long one, and Chromium ignores the declaration outright. An unconditional
     * minimum takes a four-column table of figures from 350px to 744px and
     * makes the table that was *right* start scrolling. So the primitive has to
     * be told.
     *
     * Being told is `loom.table-cell`'s `numeric` exactly, and that is the
     * precedent rather than a coincidence: typography rather than content,
     * nothing here parses a cell, and a table that sets it wrongly renders a
     * table that is merely wider than it needed to be.
     *
     * By the granularity rule it is a rendering and not a count — it changes
     * how however-many rows are painted, and changing it changes no node. It is
     * deliberately **not** called `cells`: that name belongs to the `cells:
     * Cell[]` prop this schema must never grow, and `library.test.ts` asserts
     * its absence.
     *
     * **It names the content and not the layout**, which is
     * [0160](../../decisions/0160-a-prop-that-unblocks-a-rendering-names-the-content-and-never-the-layout.md)
     * and the one thing to preserve if this is ever revisited. `narrow: "stack"`
     * would read better at the call site and would pin every tree that set it to
     * the rendering the library had in September; *these cells are sentences* is
     * true now and stays true, and what to do about it stays the library's.
     */
    prose: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const DENSITY_CLASS: Readonly<Record<NonNullable<Props["density"]>, string | undefined>> = {
  tight: LIBRARY_CLASS.tableTight,
  comfortable: undefined,
  loose: LIBRARY_CLASS.tableLoose,
}

/**
 * The name the scrolling region falls back to when the table has no caption.
 *
 * Declared rather than asked of the tree (0060), for the same reason
 * `loom.waiting-state` declares its one word: there is nothing a model could
 * say here that the table does not already say, and a deployment in French has
 * one string to replace. A caption is better and the primitive's own
 * documentation already asks for one — this is the floor under the tables that
 * did not get the message, so that the focus stop they now have has a name.
 */
const BAND_TEXT = { band: "Table" } as const

type BandTextKey = keyof typeof BAND_TEXT

const RULES_CLASS: Readonly<Record<NonNullable<Props["rules"]>, string | undefined>> = {
  rows: undefined,
  grid: LIBRARY_CLASS.tableGrid,
  none: LIBRARY_CLASS.tableFlush,
}

export const loomTable = definePrimitive({
  type: "loom.table",
  description:
    "Rows and columns of whatever it is given — the general table, with a region of column headings and a loom.table-row per row. Set prose when its cells hold sentences rather than values.",
  props,
  slots: ["columns"],
  copy: ["caption"],
  text: BAND_TEXT,
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, BandTextKey>) => {
    const columns = loom.slots["columns"]
    const panel = given.tone === "panel"
    const captionId = given.caption === undefined ? undefined : `${String(loom.nodeId)}-caption`

    const table = createElement(
      "table",
      {
        ...(captionId === undefined ? {} : { "aria-labelledby": captionId }),
        className: [
          LIBRARY_CLASS.table,
          panel ? LIBRARY_CLASS.tablePanel : undefined,
          DENSITY_CLASS[given.density ?? "comfortable"],
          RULES_CLASS[given.rules ?? "rows"],
          given.prose === true ? LIBRARY_CLASS.tableProse : undefined,
        ]
          .filter((name) => name !== undefined)
          .join(" "),
        style: {
          /**
           * `separate` rather than `collapse`, for the reason
           * `loom.comparison-table` gives: a heading column is `position:
           * sticky` in a panel, and a collapsed border belongs to the table
           * rather than to the cell it was drawn on — so it stays behind while
           * the cell it edges travels.
           */
          borderCollapse: "separate",
          borderSpacing: "0",
          /** No stylesheet resets this, so the size below is the border box rather than the content box. */
          boxSizing: "border-box",
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
          /** No stylesheet resets this, so the size below is the border box rather than the content box. */
          boxSizing: "border-box",
          minWidth: "0",
          width: "100%",
          ...(panel
            ? {
                background: colour("bg-surface"),
                border: `1px solid ${colour("border-subtle")}`,
                borderRadius: radius("lg"),
                /** Clips the table's corners to the panel's radius. */
                overflow: "hidden",
              }
            : {}),
        },
      },
      libraryStylesheet(),
      /**
       * The caption sits **outside** the scrolling region, which is why it is a
       * `<div>` named by `aria-labelledby` rather than a `<caption>`.
       *
       * A `<caption>` takes the width of the table it captions, and a table with
       * five columns in it is wider than a phone — so on the screen where the
       * caption matters most it would be the half-sentence clipped by the band's
       * edge, and scrolling to read it scrolls the rows away. Out here it wraps
       * to the band's own width and stays put while the columns move under it.
       */
      given.caption === undefined || captionId === undefined
        ? null
        : createElement(
            "div",
            {
              id: captionId,
              style: {
                padding: panel ? `${space(4)} ${space(4)} ${space(3)}` : `0 0 ${space(3)}`,
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
          /**
           * The table scrolls sideways inside its own edge rather than widening
           * the page — the same answer `loom.code` and `loom.comparison-table`
           * give, and for the same reason: five columns are wider than a phone
           * and nothing about that is a fault to design away.
           *
           * What the region was missing is everything except the overflow. A
           * scroll container is focusable by default in some browsers and not
           * in others, so it is made focusable and named — the caption where
           * there is one, a declared word where there is not, because an
           * unnamed focus stop is worse than none. `group` rather than
           * `region`, so that a document with six tables in it does not put six
           * landmarks ahead of the page's own. `loom.carousel` settled all of
           * this on 28 August; this band simply never picked it up.
           *
           * There is **no `scroll-padding-inline-start` here** and there is one
           * on the comparison band. A criterion column is a declared width, so
           * a snap can be told how much room to leave it; a general table's
           * heading column is as wide as whatever somebody typed, and padding a
           * snap by a width nobody declared would be a guess that is wrong on
           * every table but one.
           */
          className: LIBRARY_CLASS.scrollX,
          tabIndex: 0,
          role: "group",
          ...(captionId === undefined ? { "aria-label": loom.text.band } : { "aria-labelledby": captionId }),
        },
        table
      )
    )
  },
})
