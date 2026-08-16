import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { space } from "./tokens.js"

/**
 * The pricing band: plans side by side, at the width they need to be read.
 *
 * The name is not a choice this run made — 0054 wrote `loom.tier-table` over
 * `loom.tier` into the record as one of the pairs it named in advance, so that
 * the review of this unit could be about the content model rather than about
 * what to call it.
 *
 * It is a grid of cards rather than a `<table>`, and the arrangement word is
 * still honest: `table` names the *kind* of arrangement — a fixed set of
 * columns compared against a shared set of rows — which is what a reader sees
 * and what the band is called. A genuine `<table>` is the right markup for a
 * feature-by-feature comparison matrix, which is a different band with a
 * different child and is not this one.
 *
 * `columns` is a minimum column width fed to `auto-fit`, exactly as
 * `loom.feature-grid` argues: it is a floor, so three tiers on a narrow screen
 * stack rather than being cut to two. Nothing about it changes which tiers
 * exist, which is the question the granularity doc says to ask instead of
 * matching on the prop's name.
 */

const props = z
  .object({
    /** A floor for each column, not a count: the band fits what it can and wraps. */
    columns: z.enum(["auto", "two", "three", "four"]).optional(),
    density: z.enum(["tight", "loose"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * Wider floors than `loom.feature-grid` uses, because a tier holds a price at
 * the top of the type ramp and a checklist under it. A pricing card that wraps
 * "$1,200" onto two lines has failed at the one job it has.
 */
const MINIMUMS = { auto: "18rem", two: "24rem", three: "19rem", four: "15rem" } as const

export const loomTierTable = definePrimitive({
  type: "loom.tier-table",
  description: "The pricing band — a responsive row of loom.tier plans, compared side by side.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MINIMUMS[given.columns ?? "auto"]}), 1fr))`,
          gap: given.density === "tight" ? space(4) : space(5),
          width: "100%",
          /**
           * Stretch, so every card in a row is as tall as the tallest and their
           * footers line up. A featured tier's ring is drawn outside its border
           * box, so the band also needs room not to clip it against a section
           * that ends flush with the cards.
           */
          alignItems: "stretch",
          paddingBlock: space(1),
        },
      },
      children
    ),
})
