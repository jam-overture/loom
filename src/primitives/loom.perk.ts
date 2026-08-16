import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, radius, size, space } from "./tokens.js"

/**
 * One line of "what you get": a marker, a claim, and an optional clarification.
 *
 * Hermes' `PricingTier` shape held these as `features: string[]` — a list of
 * bare strings inside a struct inside a list, which is the case 0052 was
 * argued from at two levels of nesting. Adding one perk to one tier of four was
 * a `configure` replacing the whole tier record; here it is an `insert` of one
 * node into one list, weighed on its own and reversible on its own.
 *
 * The port also gains something Hermes could not express at all. A bare string
 * can only mean "included", so a tier that wanted to show what it *lacks* —
 * the comparison every pricing table is actually making — had to write "No
 * priority support" and hope the reader noticed the "No". `state` makes the
 * three cases three renderings of one node, which is the half of 0052 that
 * keeps a closed set of renderings a prop: swapping a perk from included to
 * excluded is one `configure`, not a remove and an insert that would lose the
 * line's identity and its history.
 */

const props = z
  .object({
    label: z.string().min(1).max(140),
    /**
     * A clarification the claim itself should not carry — "up to 10 seats",
     * "fair use". One of it, exactly, so it is a prop rather than a child.
     */
    note: z.string().min(1).max(120).optional(),
    state: z.enum(["included", "excluded", "coming"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

type State = NonNullable<Props["state"]>

/**
 * The marker is a glyph rather than an icon set, for the reason `loom.feature`
 * gives about its own: an icon set is a registry of its own, and a URL would
 * put a network fetch behind a line that must render instantly. Unlike
 * `loom.feature`, the glyph here is **not** the tree's to choose — it is
 * derived from `state`, so a proposal cannot put a tick beside something a
 * reader does not get.
 */
const MARKERS: Readonly<Record<State, { glyph: string; label: string | undefined; style: CSSProperties }>> = {
  included: {
    glyph: "✓",
    /**
     * No accessible name, on purpose. A tick beside an item in a list of what a
     * plan includes tells a screen-reader user nothing the surrounding heading
     * has not already said, and announcing "Included" on every one of nine rows
     * is how a list becomes unlistenable. The two states that *contradict* the
     * default are the ones that carry meaning no text conveys, so those are
     * named and this one is decoration.
     */
    label: undefined,
    style: { background: colour("accent-subtle"), color: colour("accent-strong") },
  },
  excluded: {
    glyph: "✕",
    label: "Not included",
    style: { background: colour("bg-surface-muted"), color: colour("fg-subtle") },
  },
  coming: {
    glyph: "○",
    label: "Coming soon",
    style: { background: colour("bg-surface-muted"), color: colour("fg-muted") },
  },
}

const MARKER_SIZE = "1.25rem"

/**
 * An excluded perk is dimmed rather than struck through. A line through text
 * means "this was here and is gone", which is what a diff says; a plan that
 * never included priority support is not a plan that lost it.
 */
const TEXT: Readonly<Record<State, string>> = {
  included: colour("fg-default"),
  excluded: colour("fg-subtle"),
  coming: colour("fg-muted"),
}

export const loomPerk = definePrimitive({
  type: "loom.perk",
  description:
    "One line of what a plan includes — a marker, a claim, and an optional note. A row of a loom.perk-list.",
  props,
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const state = given.state ?? "included"
    const marker = MARKERS[state]

    return createElement(
      "li",
      {
        ...loom.editable,
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: space(3),
          listStyle: "none",
          fontFamily: family("body"),
          fontSize: size(3),
          lineHeight: 1.5,
          color: TEXT[state],
        },
      },
      createElement(
        "span",
        {
          ...(marker.label === undefined
            ? { "aria-hidden": true }
            : { role: "img", "aria-label": marker.label }),
          style: {
            ...marker.style,
            display: "inline-flex",
            flex: `0 0 ${MARKER_SIZE}`,
            alignItems: "center",
            justifyContent: "center",
            width: MARKER_SIZE,
            height: MARKER_SIZE,
            /** Centres the marker on the first line's cap height, not its box. */
            marginBlockStart: "0.15em",
            borderRadius: radius("full"),
            fontSize: size(1),
            lineHeight: 1,
          },
        },
        marker.glyph
      ),
      createElement(
        "span",
        { style: { display: "flex", flexDirection: "column", gap: space(1) } },
        createElement("span", null, given.label),
        given.note === undefined
          ? null
          : createElement(
              "span",
              { style: { fontSize: size(2), color: colour("fg-subtle") } },
              given.note
            )
      )
    )
  },
})
