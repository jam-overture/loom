import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { space } from "./tokens.js"

/**
 * Two regions side by side, wrapping to one column when there is no room.
 *
 * Ported from Hermes' `side-by-side` layout, which was a page-level setting with
 * one hero and one content column. Here it is an ordinary primitive that can
 * appear anywhere and nest, which is the difference the composition model makes.
 *
 * The two regions are named — `start` and `end` — rather than being "the first
 * child" and "the second child". A model asked to swap the sides emits one
 * `configure`, not two `move`s that have to be applied in the right order; and a
 * split with only one side filled is a legible tree rather than an ambiguous one.
 *
 * It wraps by flex-basis rather than a media query. Rendering is a pure function
 * with no stylesheet to attach, so responsiveness has to come from layout that
 * is intrinsically responsive — which is also why nothing here reads a viewport.
 *
 * Each column declares its own inline-size containment, which is the other half
 * of that sentence: this primitive reads no width itself, and it is the reason
 * anything inside it can.
 */

const props = z
  .object({
    ratio: z.enum(["even", "start-wide", "end-wide"]).optional(),
    align: z.enum(["start", "center", "stretch"]).optional(),
    /** Reverses the visual order without moving a node, so it is reversible by `configure`. */
    reverse: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Basis percentages, floored well above the wrap threshold so both sides wrap together. */
const RATIOS = {
  even: ["50%", "50%"],
  "start-wide": ["62%", "38%"],
  "end-wide": ["38%", "62%"],
} as const

const ALIGNMENTS = {
  start: "flex-start",
  center: "center",
  stretch: "stretch",
} as const

const column = (basis: string, ...content: readonly ReactNode[]): ReactNode =>
  createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: space(3),
        flex: `1 1 calc(${basis} - ${space(5)})`,
        minWidth: "min(100%, 18rem)",
        /**
         * **A column says how wide it is, so what is in it can ask.** This is
         * the narrow column on a wide screen that `loom.heading` names as the
         * limit of a viewport unit — a level-1 headline beside a picture at
         * 1000px is in 460px of space and was sized as though it had the
         * window. Declaring containment here is what makes `cqi` mean this
         * column, and it costs nothing to a child that never asks.
         *
         * The flex basis is definite and the minimum is explicit, so inline-size
         * containment takes nothing away: this column's width was never
         * decided by its contents.
         */
        containerType: "inline-size",
      },
    },
    ...content
  )

export const loomSplit = definePrimitive({
  type: "loom.split",
  description: "Two side-by-side regions, start and end, that stack when the page is narrow.",
  props,
  slots: ["start", "end"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const [startBasis, endBasis] = RATIOS[given.ratio ?? "even"]

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexWrap: "wrap",
          flexDirection: given.reverse === true ? "row-reverse" : "row",
          alignItems: ALIGNMENTS[given.align ?? "stretch"],
          gap: space(5),
          width: "100%",
        },
      },
      /** Unslotted children join the start column, so nothing a tree holds is dropped. */
      column(startBasis, loom.slots["start"], children),
      column(endBasis, loom.slots["end"])
    )
  },
})
