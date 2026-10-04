import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, size, READABLE_MEASURE, type RampStep } from "./tokens.js"

/**
 * A run of points, bulleted or numbered — the list a page's prose is written
 * in.
 *
 * Fifty primitives could sell a plan, prove it with a wall of quotes and answer
 * a question about it, and none of them could write *three bullet points*.
 * That is not a hole in the Hermes catalogue, because Hermes never had one to
 * port: its lists were `features: string[]` and `items: FaqItem[]`, fields
 * inside a block rather than a thing a page could say on its own. It is a hole
 * in the layer underneath the bands, and every surface in this repository has
 * been working around it — a run of `loom.prose` nodes set in a `loom.stack`,
 * which renders as paragraphs, reads to a screen reader as paragraphs, and is
 * paragraphs.
 *
 * **The four list primitives are not four spellings of one thing**, and the
 * catalogue has to keep them apart or a model will pick whichever it read last:
 *
 * | Use | Primitive |
 * | --- | --- |
 * | Points in prose — what this is for | `loom.list` / `loom.list-item` |
 * | What a plan includes, with a tick or a cross | `loom.perk-list` / `loom.perk-list-item` |
 * | Somewhere to go | `loom.link-list` / `loom.link` |
 * | Things that happened in order, on a rail | `loom.milestone-list` / `loom.milestone` |
 *
 * The three others each carry a *marker with a meaning* — a state, a
 * destination, a point on a timeline — and a page that reaches for one of them
 * to make three ordinary points gets furniture it did not ask for. This is the
 * one with nothing attached, which is why it is the one that was missing.
 *
 * **Every prop here is a rendering, and none of them is a count.** `marker`
 * chooses among three renderings of the same set of nodes — a disc, a number,
 * nothing — so swapping a set of points into a set of steps is one `configure`
 * against the list, not a `remove` and an `insert` that would lose every row's
 * author and history. That is 0052's closed-set clause, and it is the same call
 * `loom.divider` makes about its ornaments. Nothing here decides *how many*
 * points exist, which is the question the granularity doc says to ask instead
 * of matching on a prop's name.
 */

const props = z
  .object({
    /**
     * Three renderings, and the element follows the choice: `number` is an
     * `<ol>` because a numbered list is an ordered one and a screen reader
     * should be told so, `bullet` and `none` are a `<ul>`. `none` is the list
     * whose rows carry their own marker — a row of `loom.badge`, a checklist
     * the tree drew itself — and it keeps the list semantics that a `loom.stack`
     * of paragraphs throws away.
     */
    marker: z.enum(["bullet", "number", "none"]).optional(),
    /** `tight` is a spec to scan; `loose` is a row that is a sentence each. */
    density: z.enum(["tight", "comfortable", "loose"]).optional(),
    size: z.enum(["small", "body", "lead"]).optional(),
    /** Off by default, for the same reason it is off on `loom.prose`. */
    measured: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const STEPS: Readonly<Record<"small" | "body" | "lead", RampStep>> = { small: 2, body: 3, lead: 5 }

const DENSITY_CLASS: Readonly<Record<"tight" | "comfortable" | "loose", string | undefined>> = {
  tight: LIBRARY_CLASS.listTight,
  comfortable: undefined,
  loose: LIBRARY_CLASS.listLoose,
}

const MARKERS = {
  bullet: { element: "ul", listStyleType: "disc" },
  number: { element: "ol", listStyleType: "decimal" },
  none: { element: "ul", listStyleType: "none" },
} as const

export const loomList = definePrimitive({
  type: "loom.list",
  description:
    "A bulleted or numbered list of loom.list-item rows — the points a page makes in prose, with no marker meaning attached.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const marker = MARKERS[given.marker ?? "bullet"]
    const density = DENSITY_CLASS[given.density ?? "comfortable"]

    return createElement(
      marker.element,
      {
        ...loom.editable,
        className: [LIBRARY_CLASS.list, density].filter((name) => name !== undefined).join(" "),
        style: {
          listStyleType: marker.listStyleType,
          /**
           * The indent is `em` rather than a step off the spacing scale, and
           * deliberately: a marker hangs beside the first line of its row, so
           * the gap that reads correctly is the one measured in the type it
           * hangs beside. A spacious preset would otherwise push a bullet a
           * finger's width from the words it belongs to.
           */
          paddingInlineStart: given.marker === "none" ? "0" : "1.4em",
          fontFamily: family("body"),
          fontSize: size(STEPS[given.size ?? "body"]),
          lineHeight: 1.6,
          color: colour("fg-default"),
          ...(given.measured === true ? { maxWidth: READABLE_MEASURE } : {}),
        },
      },
      libraryStylesheet(),
      children
    )
  },
})
