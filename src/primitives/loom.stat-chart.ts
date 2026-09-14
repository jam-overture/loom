import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { space, type RampStep } from "./tokens.js"

/**
 * The same `loom.stat` children a grid would print in a row, plotted against a
 * scale instead.
 *
 * ## The gap this closes
 *
 * **Ninety-two primitives, and not one of them plotted a series.** `loom.stat`
 * prints one figure, `loom.meter` draws one proportion, `loom.spec` sets one
 * measured fact inline — every number in this library stood alone. A page could
 * say *"99.9% uptime"* and could not say *"here is uptime over six months"*,
 * which is the single most common thing a metrics band on a product page does.
 * It is the largest hole `docs/primitive-gap-inventory.md` found, and it is
 * first out of Tier A for that reason.
 *
 * ## Why this is a second container rather than a new pair
 *
 * A chart's child is a label and a number, which is exactly `loom.stat`'s
 * content model. Writing `loom.reading` beside it would be *"a second child type
 * that renders the same three fields"* — the thing `loom.milestone-row` was
 * built to avoid, and the reason that primitive exists as a second container
 * over `loom.milestone` rather than as a second pair.
 * [0054](../../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
 * says a container is its child's name plus the arrangement, so a second
 * arrangement of stats is `loom.stat-chart` and nothing had to be renamed.
 *
 * The practical proof that it is one content model: a `loom.stat-grid` and a
 * `loom.stat-chart` accept the same children, so re-plotting a metrics band is
 * one `configure` on the container and no change to the numbers at all.
 *
 * ## The scale, which is the interesting part
 *
 * A chart needs to know its largest value, and **this one cannot be told by its
 * children**: a render is a total pure projection of one node
 * ([0008](../../decisions/0008-the-renderer-is-a-total-pure-projection.md)), so
 * a container cannot read a child's props. Every obvious way round that is
 * worse than the constraint — React context makes a child's render depend on an
 * ancestor and breaks rendering a node on its own, which the portal does; and
 * repeating the maximum on every child is the same number written *n* times,
 * wrong the moment one of them is edited.
 *
 * **So CSS carries it.** This element declares the ceiling as a custom property,
 * custom properties inherit, and each bar computes its own height against it in
 * a `calc`. The cross-child arithmetic happens in the browser, which is allowed
 * to look at more than one node, rather than in a render function, which is
 * not. That is the bargain
 * [0079](../../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md)
 * already makes for `loom.mosaic`'s rhythm and `loom.heading`'s container-query
 * cap: the markup is unchanged, nothing is interpolated, and the browser reads
 * what the renderer may not.
 *
 * ## `max` is authored, and that is honest rather than a shortfall
 *
 * Because nothing can compute it, the ceiling is a prop, defaulting to `100` —
 * the scale of the percentages most marketing charts plot. An author who plots
 * revenue states the ceiling, and stating it is a real editorial choice rather
 * than a chore: where the axis stops is what decides whether a rise looks steep
 * or gentle, and a chart that picked its own ceiling would be making that
 * argument on the author's behalf.
 *
 * A value above the ceiling is **clamped, not overflowed** — the bar fills the
 * plot and stops. A chart drawing a bar out through the band above it is a
 * broken page; a bar at full height next to a printed value larger than the axis
 * is a chart that is merely scaled wrong, and only one of those is recoverable
 * by looking at it.
 *
 * ## What it does not do
 *
 * **Columns only.** Bars running horizontally are a different arrangement of the
 * same children, and by 0054 that is a *different container* with a different
 * name rather than an `orientation` prop — the same call `loom.milestone-list`
 * and `loom.milestone-row` already make. Unbuilt until somebody needs it.
 *
 * **One series.** Two series over one axis wants a child that carries two
 * magnitudes, which is a different content model and a different pair. Grouped
 * and stacked bars are the same story.
 *
 * **No axis labels, no gridlines.** A baseline rule and the printed value on
 * each column, which is what a marketing chart is: a shape to be read at a
 * glance with the numbers written on it. A chart that wants a *y* axis is a
 * chart being asked to do analysis, and the honest answer there is a real
 * charting library behind `loom.embed`.
 */

const PLOT_HEIGHTS = { short: 5, standard: 6, tall: 7 } as const

const props = z
  .object({
    /**
     * The top of the scale. Not a count of anything and not derived from the
     * children — see the scale note above — so it changes no node and is a real
     * prop by the granularity document's sharper question.
     */
    max: z.number().finite().positive().optional(),
    /**
     * How tall the plot is, off the spacing scale rather than in pixels, so a
     * chart in an airy preset breathes like everything around it.
     */
    plot: z.enum(["short", "standard", "tall"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * The plot height is a multiple of a spacing step rather than a step itself:
 * step 7 is a gap, and a chart wants a panel. The multiplier is the one number
 * here chosen by eye, against both starter presets at both widths.
 */
const plotHeight = (name: keyof typeof PLOT_HEIGHTS): string =>
  `calc(${space(PLOT_HEIGHTS[name] as RampStep)} * 3)`

export const loomStatChart = definePrimitive({
  type: "loom.stat-chart",
  description:
    "A run of loom.stat children plotted as columns against a scale — a trend or a comparison, rather than a row of separate figures. Each child needs a magnitude to be drawn; max is the top of the scale.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.statChart,
        /**
         * Both are inherited rather than passed: every `.loom-stat` below reads
         * them from here, which is the only route a child's height can depend on
         * a fact the parent knows.
         */
        style: {
          "--loom-chart-max": given.max ?? 100,
          "--loom-chart-plot": plotHeight(given.plot ?? "standard"),
        } as Record<string, unknown>,
      },
      libraryStylesheet(),
      children
    ),
})
