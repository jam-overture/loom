import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { space } from "./tokens.js"

/**
 * The control that walks a reader along a run of things: the numbers, and the
 * two ends.
 *
 * The library could already go *out* of a page and *across* one — `loom.link-trail`
 * is the way back up a hierarchy, `loom.nav` is the map of the site — and had
 * nothing that went *along*. An archive, a blog, a catalogue and a search
 * result all end at the same missing band, and until this file the page either
 * loaded everything or stopped at whatever the first screen held.
 *
 * **The children are `loom.link` nodes, which is 0054 doing the whole of the
 * work.** A page number is a link to a page, and there is no sense in which it
 * is anything else; a second primitive for it would be `loom.link` with a
 * container's name on it. That the current page is marked at all is
 * `loom.link`'s `current` prop, which shipped for the site header and turns out
 * to be the same fact — *the page you are on* — asked at a different scale. A
 * gap in a long run is a `text` child reading `…`, because an ellipsis in a
 * pager is a piece of prose saying there are more, and it is deliberately not a
 * link to nowhere.
 *
 * **Previous and next are regions and not children**, on 0051's test and for
 * `loom.nav`'s reason exactly: the pager puts them at its two ends *regardless
 * of how many numbers there are*, and "the first child is Previous and the last
 * is Next" is a rule no schema states and every `move` breaks. It is also the
 * one arrangement fact a row of links cannot express — `loom.link-list` with
 * `direction: "row"` will run all of them left to right, which is why that
 * primitive is not this one with a different label.
 *
 * **What a page number looks like is a set of properties `loom.link` does not
 * set inline**, and that sentence is the design rather than an implementation
 * note. This library's stylesheet says an inline style beats a rule, so a
 * container can only add to its children what they left unspoken. The tile's
 * border, radius, minimum width and background were all reachable; its block
 * padding was not, because `loom.link` set two pixels of it on the element —
 * so that moved into `.loom-link` on the same day as this, and a hit area a
 * thumb can find is the thing that moved it.
 *
 * The current page is marked by a lit border on a raised tile rather than by a
 * filled accent one, and that is 0145's lesson taken second-hand: the fill
 * would have to win against a colour `loom.link` sets inline, and a palette
 * with little chroma to spare would have given accent text on an accent ground.
 * A border and a ground that differ from the page carry the mark in greyscale.
 */

const props = z
  .object({
    /**
     * How the three parts sit when the row is wider than they are, which on a
     * laptop it always is.
     *
     * `center` keeps them together as one group in the middle of the band.
     * `start` lines the group up with the column of text above it. `spread`
     * pushes the two ends to the band's edges and centres the numbers between
     * them, which is the archive-footer shape — and at 1280px it is a long way
     * between *Newer* and *Older*, so it is the member you ask for rather than
     * the one you get.
     *
     * All three draw the same nodes in the same order, which is what keeps this
     * a prop: it is the granularity doc's "how however-many children are laid
     * out" and not "how many there are".
     */
    align: z.enum(["start", "center", "spread"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const ROW = {
  start: "flex-start",
  center: "center",
  spread: "space-between",
} as const

export const loomLinkPager = definePrimitive({
  type: "loom.link-pager",
  description:
    "A page-through control: loom.link children as the numbers, with previous and next regions at the ends. Mark the page the reader is on with a link's current prop.",
  props,
  slots: ["previous", "next"],
  copy: [],
  text: { pagination: "Pagination" },
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, "pagination">) =>
    createElement(
      "nav",
      {
        ...loom.editable,
        "aria-label": loom.text.pagination,
        className: LIBRARY_CLASS.pager,
        style: {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: ROW[given.align ?? "center"],
          gap: space(2),
          width: "100%",
        },
      },
      libraryStylesheet(),
      createElement(
        "div",
        { style: { display: "flex", alignItems: "center", flex: "0 0 auto" } },
        loom.slots["previous"] ?? null
      ),
      createElement(
        "div",
        {
          className: LIBRARY_CLASS.pagerNumbers,
          style: {
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: space(1),
            /**
             * `spread` is the only arrangement where the middle takes the slack,
             * and taking it is exactly what puts the two ends at the edges
             * without either of them knowing the other exists. The other two
             * let the numbers be their own width so the group stays together.
             *
             * `min-width: 0` is what lets a long run wrap rather than push
             * `Next` off the row.
             */
            flex: given.align === "spread" ? "1 1 auto" : "0 1 auto",
            minWidth: "0",
          },
        },
        children
      ),
      createElement(
        "div",
        { style: { display: "flex", alignItems: "center", flex: "0 0 auto" } },
        loom.slots["next"] ?? null
      )
    ),
})
