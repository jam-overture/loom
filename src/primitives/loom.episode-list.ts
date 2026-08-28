import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * A run of `loom.episode` rows — a podcast back-catalogue, a video playlist, a
 * mixtape, a reel.
 *
 * Named `-list` rather than `-grid`, and under 0054 that is a claim about the
 * markup rather than a preference: **the arrangement word names what the
 * container does with its children**, and what this one does is stack them in a
 * single column with a hairline between. Every `-grid` in the library is a
 * `repeat(auto-fit, minmax(…))` and this is deliberately not one. A
 * back-catalogue is scanned for *one* of its rows, which wants every title at a
 * single leading edge, and a `loom.episode` is a row rather than a card for the
 * same reason.
 *
 * The cost is stated plainly because a later run will hit it: **there is no
 * three-across band of episodes**, and there cannot be one with this child. A
 * grid of playable cards is a different arrangement of a different shape, and
 * building it by giving this container a `columns` prop would produce three
 * squeezed rows rather than three cards — which is the arrangement-versus-count
 * confusion `docs/primitive-granularity.md` warns about, arriving from the
 * container's side.
 *
 * **It styles its rows through the stylesheet rather than through props**, for
 * `loom.milestone-list`'s reasons and with the same two consequences. A row
 * cannot know it is the first or last of its siblings — a render is a pure
 * function of one node — so the flush ends and the rules between are things only
 * CSS can say. And the renderer does not inject props into children (0009), so
 * the alternative was a `configure` per row to change the density of one band,
 * with *n* chances for a model to leave them disagreeing.
 *
 * The selectors are `:first-of-type` and `article + article` rather than
 * `:first-child` and `* + *`, which is not fussiness: a primitive emits the
 * library stylesheet as its own first child, and a renderer that does not hoist
 * it leaves a `<style>` element sitting exactly where `:first-child` looks.
 * Matching on the element type is true under both renderers.
 */

const props = z
  .object({
    /** `tight` sets it as a back-catalogue to scan; `loose` as a shelf to browse. */
    density: z.enum(["tight", "loose"]).optional(),
    /**
     * The hairline between rows. `none` keeps the rhythm and drops the rules,
     * which is what a short reel wants and a thirty-track list does not.
     */
    separators: z.enum(["rule", "none"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomEpisodeList = definePrimitive({
  type: "loom.episode-list",
  description:
    "A run of loom.episode rows in one column — a podcast back-catalogue, a video playlist, or a set of tracks.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className: [
          LIBRARY_CLASS.episodeList,
          given.density === "tight" ? LIBRARY_CLASS.episodeListTight : undefined,
          given.density === "loose" ? LIBRARY_CLASS.episodeListLoose : undefined,
          given.separators === "none" ? undefined : LIBRARY_CLASS.episodeListRuled,
        ]
          .filter((name) => name !== undefined)
          .join(" "),
        style: {
          display: "flex",
          flexDirection: "column",
          width: "100%",
        },
      },
      libraryStylesheet(),
      children
    ),
})
