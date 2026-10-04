import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, radius, size, space, weight } from "./tokens.js"

/**
 * What a region says when it holds nothing — and the first primitive in this
 * library written for a page whose content it cannot see.
 *
 * Ninety-two primitives assume their content arrived. That was true while every
 * word on a Loom page was authored into the tree, and it stopped being true on
 * 11 September: [0058](../../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
 * gave the tree a way to ask a question, and stated in as many words that **a
 * source with nothing to report answers `ready` with an empty list** rather than
 * failing. So a legitimately empty region is now a thing that happens, and until
 * this file the library's answer to it was a band that rendered as a heading
 * over a gap.
 *
 * The alternative to having one is not "no empty state". It is **every surface
 * inventing its own**, which is what the gap inventory predicted on 13
 * September, and what the portal and the demo would each have written within a
 * week of each other in slightly different words with slightly different
 * spacing.
 *
 * **Why this is not `loom.callout` with the padding turned up.** A callout is a
 * thing the page is telling you about the page — an aside, a warning, a note —
 * and it sits *within* content. An empty state is the content: it takes the
 * whole of the region the missing thing would have occupied, it is the only
 * thing there, and its job is to offer the one action that would fill the space
 * rather than to inform. That difference is visible in the markup (this centres
 * in its region and holds its own height; a callout hugs its text) and it is
 * visible to a model choosing between them, which is the test 0052 sets for
 * whether two things are one thing with a prop.
 *
 * **Why the regions are slots and the sentence is children.** 0051's test: the
 * primitive places the glyph above the title and the action below the sentence
 * whatever the tree's child order is, and "the first child is the icon" is a
 * rule no schema states and every `move` breaks. The sentence is ordinary
 * children because it is prose and 0059 sends prose to `text` — so re-wording
 * it is a `configure` on the words rather than on this node.
 *
 * **What it deliberately does not do: decide whether it is shown.** A tree
 * cannot say "this node when the list is empty, that one otherwise", and this
 * primitive does not pretend otherwise — it renders what it was given, always.
 * Nothing in the library reads `loom.data` yet, and the seam that would let a
 * bound node choose its own presence is a framework question rather than this
 * one's. Filed.
 */

const props = z
  .object({
    /**
     * The edge around the space. `dashed` is the one a reader has met — it
     * reads as *a place something goes* rather than as a panel — and `none` is
     * for an empty state already inside a card or a framed region, where a
     * second border is a box in a box.
     *
     * It changes nothing about which nodes exist, so it is a prop under the
     * granularity test, and it is the enum rather than a `bordered: boolean`
     * because `solid` is a real third answer and a boolean cannot hold it.
     */
    outline: z.enum(["dashed", "solid", "none"]).optional(),
    align: z.enum(["start", "center"]).optional(),
    /**
     * How much of the region it claims. `standard` is a band of the page;
     * `compact` is a panel inside a card or a column, where a full band of
     * whitespace reads as a rendering fault rather than as a considered space.
     */
    stature: z.enum(["compact", "standard"]).optional(),
    /**
     * **Which nothing this is**, and the only prop here a sighted reader cannot
     * see.
     *
     * This file's own opening quotes the half of 0058 that motivated it — *a
     * source with nothing to report answers `ready` with an empty list* — and
     * the sentence ends **"rather than failing"**. That record is explicit that
     * the two are different answers and that *"collapsing those two is the
     * mistake"*, and until this prop the library collapsed them at the last
     * step: a region that could not load rendered identically to one that was
     * legitimately empty, and a reader who was not looking at it was told
     * nothing either way.
     *
     * `outline: "solid"` already lets a page *look* like it is reporting
     * something. What it cannot do is **say so**, which is the half that
     * reaches somebody using a screen reader — so `unavailable` is announced as
     * a `role="status"` and `empty` is not. A region with nothing in it yet is
     * not an event; a region that failed to load is.
     *
     * It changes no node, so it is a prop under the granularity test, and it is
     * two members rather than a `failed: boolean` for the reason the enum above
     * gives: a third answer is thinkable — a region a viewer is not permitted to
     * see is neither empty nor broken — and a boolean could not hold it.
     */
    cause: z.enum(["empty", "unavailable"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * Dashes are drawn at the border width, so a 1px dash under a quiet palette is
 * a dotted line a reader reads as an artefact. 2px is where it becomes a
 * deliberate edge, and it is the one place in this file where the value differs
 * by outline rather than being shared.
 */
const OUTLINES: Readonly<Record<NonNullable<Props["outline"]>, CSSProperties>> = {
  dashed: { border: `2px dashed ${colour("border-subtle")}`, borderRadius: radius("lg") },
  solid: { border: `1px solid ${colour("border-subtle")}`, borderRadius: radius("lg") },
  none: {},
}

export const loomEmptyState = definePrimitive({
  type: "loom.empty-state",
  description:
    "The empty state: what a region says when it holds nothing — a glyph, a title, a line, and the action that would fill it. Regions: media, heading, actions.",
  props,
  slots: ["media", "heading", "actions"],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const centred = given.align !== "start"
    const compact = given.stature === "compact"
    const media = loom.slots["media"]

    return createElement(
      "div",
      {
        ...loom.editable,
        /**
         * Polite rather than assertive: it waits for a pause instead of cutting
         * across what is being read. A region that failed to load is worth
         * knowing about and is not worth interrupting a sentence for.
         */
        ...(given.cause === "unavailable" ? { role: "status" } : {}),
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: centred ? "center" : "flex-start",
          justifyContent: "center",
          textAlign: centred ? "center" : "start",
          gap: space(3),
          /** Without this, padding widens the band past the column holding it. */
          boxSizing: "border-box",
          width: "100%",
          paddingBlock: compact ? space(5) : space(8),
          paddingInline: compact ? space(4) : space(6),
          ...OUTLINES[given.outline ?? "dashed"],
        },
      },
      media === undefined
        ? null
        : createElement(
            "div",
            {
              /**
               * The glyph is dropped to `fg-subtle` and sat on a tinted disc,
               * because an icon at full strength is the loudest thing in a
               * region whose whole subject is that there is nothing here. The
               * disc is `bg-surface-muted` rather than an accent tint for the
               * same reason: an empty state that draws the eye competes with
               * the content that did arrive elsewhere on the page.
               */
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: space(8),
                height: space(8),
                borderRadius: radius("full"),
                background: colour("bg-surface-muted"),
                color: colour("fg-subtle"),
                marginBlockEnd: space(1),
              },
            },
            media
          ),
      loom.slots["heading"] ??
        null,
      children === undefined || children === null
        ? null
        : createElement(
            "div",
            {
              style: {
                /**
                 * A sentence explaining an absence is short by nature, and a
                 * short sentence set across a full band is one word per line at
                 * the ends. This is narrower than the library's reading measure
                 * on purpose.
                 */
                maxWidth: "34rem",
                fontFamily: family("body"),
                fontWeight: weight("body"),
                fontSize: size(3),
                lineHeight: 1.6,
                color: colour("fg-muted"),
              },
            },
            children
          ),
      loom.slots["actions"] === undefined
        ? null
        : createElement(
            "div",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: centred ? "center" : "flex-start",
                gap: space(3),
                paddingBlockStart: space(2),
              },
            },
            loom.slots["actions"]
          )
    )
  },
})
