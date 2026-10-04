import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAP_NAMES, GAPS } from "./layout.js"
import { space } from "./tokens.js"

/**
 * A band of `loom.event` cells — the what's-on, the tour dates, the three
 * upcoming on a home page.
 *
 * `-grid` rather than the `-list` a reader might expect from the band's usual
 * shape, and it is 0054 being applied rather than ignored: the arrangement word
 * names *what the container does with its children*, and what this one does is
 * `repeat(auto-fit, minmax(…))`. A single full-width column is one setting of
 * that grid rather than a different mechanism, which is exactly what
 * `loom.offering-grid` established when it faced the same choice.
 *
 * **It is the one grid in the library that defaults to `one`**, and the default
 * is the argument for keeping the word honest rather than against it. A
 * what's-on band is a column of full-width rows almost every time it is written,
 * and a `loom.event` *becomes* a row exactly when it is given that width — so
 * the common case needs no prop at all, and the teaser band that wants three
 * across says `columns: "three"` and gets three cards out of the same children.
 *
 * It is still a **floor and never a count** — the distinction
 * `docs/primitive-granularity.md` names as the easiest one to get wrong.
 * Nothing here truncates the band, so changing it changes no node, which is what
 * keeps it a prop rather than `insert`/`remove` in disguise.
 *
 * `alignItems: stretch` is load-bearing rather than copied along: a `loom.event`
 * pins its action to the card's floor with an `auto` margin, which means nothing
 * unless the cell fills the row's height.
 */

const COLUMNS = ["auto", "one", "two", "three"] as const

const props = z
  .object({
    /**
     * A floor for each column, never a count. Defaults to `one` — the full-width
     * column a what's-on band is written in, and the width at which a
     * `loom.event` reads as a row with its date in the margin.
     */
    columns: z.enum(COLUMNS).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * Wider than `loom.offering-grid`'s at every step, because an event card leads
 * with a free-text date set at heading size: "Thursday 12 March 2026" in a
 * 19rem cell is four lines and a card that is mostly date.
 */
const MINIMUMS: Readonly<Record<(typeof COLUMNS)[number], string>> = {
  auto: "22rem",
  one: "100%",
  two: "28rem",
  three: "21rem",
}

export const loomEventGrid = definePrimitive({
  type: "loom.event-grid",
  description:
    "A band of loom.event cells — a what's-on, tour dates, the next three. A full-width column by default; set columns for a teaser band of cards.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MINIMUMS[given.columns ?? "one"]}), 1fr))`,
          gap: given.gap === undefined ? space(4) : GAPS[given.gap],
          width: "100%",
          /** Equal-height cells, which is what makes a pinned action mean anything. */
          alignItems: "stretch",
        },
      },
      children
    ),
})
