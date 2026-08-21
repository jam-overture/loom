import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAP_NAMES, GAPS } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * Whatever it is given, in cells of deliberately unequal width — the band a
 * page uses when a grid of identical rectangles would read as a table.
 *
 * Every container in this library before it lays its children out identically:
 * `auto-fit` over one minimum width, every cell the same. That is the right
 * default and it is what a *list* of things should look like. It is also why a
 * feature band built here comes out as eight equal boxes, which the marketing
 * lane filed on 20 August after building one against a reference page whose
 * equivalent band mixes three sizes and does not read as a kit.
 *
 * **The rhythm is the container's, and that is the decision.** The obvious fix
 * is a `span` prop on the child, and it is wrong twice over: it makes a child
 * responsible for the parent's layout — the coupling `loom.split` avoids by
 * keeping `ratio` on the arranger — and it puts a number in the tree that means
 * nothing until you know how many columns its parent has. Here the arrangement
 * stays where the arranging happens, the children are untouched, and a tree can
 * hold `loom.feature` cells or `loom.card` cells or one of each without any of
 * them knowing they are in a mosaic.
 *
 * Each rhythm is a **repeating cycle whose spans fill a six-column row exactly**,
 * so the band stays regular however many children it is given and a tail that
 * does not complete a cycle simply runs short rather than reflowing the rest.
 * `grid-auto-flow` is left alone deliberately: `dense` would backfill a short
 * row by pulling a later child forward, and a container that renders its
 * children out of tree order is a container the tree no longer describes.
 *
 * Named by 0062 — a general arranger with no child of its own is named for the
 * arrangement alone, and *mosaic* is what that arrangement is. It carries no
 * hyphen, so 0054's stem rule reads it as a whole name rather than as a
 * container that lost its child. A model that wants this and knows it as a
 * *bento* finds it through the description.
 *
 * The layout cannot be said inline, for two reasons and the second is new here:
 * a span belongs to a child this primitive does not style, and **the whole
 * rhythm has to switch off on a narrow screen**. Below the breakpoint every
 * cell is full width, because six columns on a phone is six columns of four
 * characters. That is the first width media query in this library, and
 * [0079](../../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md)
 * is where it is argued: the markup is unchanged by it, so the render stays the
 * pure function of the tree that 0008 requires.
 */

const RHYTHMS = ["alternating", "showcase", "lead"] as const

const RHYTHM_CLASS: Readonly<Record<(typeof RHYTHMS)[number], string>> = {
  alternating: LIBRARY_CLASS.mosaicAlternating,
  showcase: LIBRARY_CLASS.mosaicShowcase,
  lead: LIBRARY_CLASS.mosaicLead,
}

const props = z
  .object({
    /**
     * Three cycles, each summing to a full row:
     *
     * - `alternating` — wide, narrow, narrow, wide. The default, and the one
     *   that reads as composed rather than as decorated.
     * - `showcase` — two halves, then three thirds. A pair of headline cells
     *   over a row of supporting ones.
     * - `lead` — the first cell across the full width, the rest three across.
     *   The same move `loom.article-grid` makes for a front page, available to
     *   a band that is not articles.
     *
     * Changing it changes no node: nothing is added, dropped, promoted or
     * reordered, and the first cell was already first. It is the granularity
     * doc's sharper question answered in one line.
     */
    rhythm: z.enum(RHYTHMS).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomMosaic = definePrimitive({
  type: "loom.mosaic",
  description:
    "Its children in cells of unequal width on a repeating rhythm — the bento band. The general mosaic; prefer a named band where one fits.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className: `${LIBRARY_CLASS.mosaic} ${RHYTHM_CLASS[given.rhythm ?? "alternating"]}`,
        style: {
          /**
           * `display` and `grid-template-columns` are **not** here, and that is
           * load-bearing rather than an omission: an inline style beats a rule,
           * so a column count set here would be unreachable from the media
           * query that has to change it. The gap has no breakpoint, so it stays.
           */
          gap: GAPS[given.gap ?? "normal"],
          width: "100%",
        },
      },
      children,
      /**
       * Last, unlike every other emitter in this library, because this is the
       * first primitive whose rules **count its children**. A leading `<style>`
       * is `:nth-child(1)` to any renderer that does not hoist it, which would
       * shift every cell in the cycle by one. `loom.article-grid` sidesteps the
       * same trap with `:first-of-type`; a mosaic holds children of no
       * particular type, so it has to move the element instead.
       */
      libraryStylesheet()
    ),
})
