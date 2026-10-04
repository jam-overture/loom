import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * One number and what it counts.
 *
 * `value` and `label` are props rather than child text nodes, and that is the
 * other half of 0052's rule: a *fixed field* stays a prop, because there is
 * exactly one of it and changing it is exactly a `configure`. Only *repeated*
 * content earns its own node. Making these children would mean a stat whose
 * label had been deleted was still a valid tree.
 *
 * ## Why the type is in the stylesheet now
 *
 * It was inline until `loom.stat-chart` existed, and it could not stay there.
 * The stylesheet's first mechanic is that **an inline style beats a rule**, so a
 * property a second arrangement needs to change must not also be set on the
 * element — and a chart needs the figure at a column's size rather than a
 * headline's. This is exactly `loom.milestone`'s move, made for
 * `loom.milestone-row` and written up in that file: *a child that lays itself
 * out inline cannot be rearranged by the container it is in.*
 *
 * Nothing about a stat on its own changed. Every declaration moved verbatim, the
 * classes are scoped to this library, and a stat outside a chart renders as it
 * always did — which `library.test.ts` holds by rendering one of each and
 * comparing.
 *
 * ## `magnitude`, and why it is not a duplicate of `value`
 *
 * `value` is the string a reader sees: `"99.9%"`, `"$1.2M"`, `"2.4×"`. It is
 * formatted, it carries its unit, and it is frequently not a number at all.
 * `magnitude` is where the figure sits on a scale — `99.9`, `1.2`, `2.4` — and
 * it exists because **a bar cannot be drawn from a formatted string**.
 *
 * Those are two facts rather than one fact written twice, which is the test
 * worth applying before adding a second field of the same shape
 * ([0115](../../decisions/0115-three-fields-of-one-shape-are-a-list-wearing-three-names.md)):
 * `"$1.2M"` and `"$800K"` print in the units their author chose and plot at 1.2
 * and 0.8, and no single field can be both without the primitive parsing prose.
 *
 * It is **optional**, and a stat without it is untouched — no class, no custom
 * property, no bar. That is what keeps every stat in every stored tree rendering
 * exactly as it did, and it is why a chart draws a bar only for the children
 * that can carry one rather than a zero-height stub for the ones that cannot.
 */

const props = z
  .object({
    value: z.string().min(1).max(24),
    label: z.string().min(1).max(80),
    caption: z.string().min(1).max(160).optional(),
    /**
     * Finite and non-negative: a bar is a length, and neither a negative number
     * nor an infinity is one. A chart of changes that go both ways is a
     * different primitive with a baseline in the middle, and is not this one
     * pretending.
     */
    magnitude: z.number().finite().nonnegative().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomStat = definePrimitive({
  type: "loom.stat",
  description:
    "A single figure with a short label — one cell of a loom.stat-grid. Give it a magnitude as well as a value to plot it in a loom.stat-chart.",
  props,
  slots: [],
  /**
   * `magnitude` is where the figure sits on a scale, which draws a bar and prints
   * nothing. A reader reads `value`; the two are not one fact twice.
   */
  copy: ["value", "label", "caption"],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className:
          given.magnitude === undefined
            ? LIBRARY_CLASS.stat
            : `${LIBRARY_CLASS.stat} ${LIBRARY_CLASS.statPlotted}`,
        /**
         * The one value that has to be on the element: a rule cannot carry a
         * number that differs per node. It is read by `loom.stat-chart`'s rule
         * against the ceiling that chart inherits down, which is how the bar
         * gets its height without any node reading another node.
         */
        ...(given.magnitude === undefined
          ? {}
          : { style: { "--loom-stat-magnitude": given.magnitude } as Record<string, unknown> }),
      },
      libraryStylesheet(),
      createElement("span", { className: LIBRARY_CLASS.statValue }, given.value),
      createElement("span", { className: LIBRARY_CLASS.statLabel }, given.label),
      given.caption === undefined
        ? null
        : createElement("span", { className: LIBRARY_CLASS.statCaption }, given.caption)
    ),
})
