import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import { colour, family, radius, size, space } from "./tokens.js"

/**
 * What a perk *is*, shared by the two primitives that are one.
 *
 * `loom.perk-list-item` and `loom.perk` hold the same content model and draw
 * the same thing. They differ in one respect and it is the reason both exist:
 * one is an `<li>` and belongs inside a `loom.perk-list`, the other is a
 * `<div>` that stands alone. Duplicating the schema and the marker vocabulary
 * across the two modules would mean a state added to one and forgotten in the
 * other, which is the failure mode a shared module exists to prevent.
 *
 * It is not itself a primitive and registers nothing. Files here are named for
 * the type they implement (`loom.perk.ts`); this one is named for what it
 * holds, the way `tokens.ts` and `url.ts` are.
 */

export const perkProps = z
  .object({
    label: z.string().min(1).max(140),
    /**
     * A clarification the claim itself should not carry — "up to 10 seats",
     * "fair use". One of it, exactly, so it is a prop rather than a child, and
     * the second string that keeps a perk on the props side of 0059.
     */
    note: z.string().min(1).max(120).optional(),
    state: z.enum(["included", "excluded", "coming"]).optional(),
  })
  .strict()

export type PerkProps = z.infer<typeof perkProps>

export type PerkState = NonNullable<PerkProps["state"]>

/**
 * The marker is a glyph rather than an icon set, for the reason `loom.feature`
 * gives about its own: an icon set is a registry of its own, and a URL would
 * put a network fetch behind a line that must render instantly. Unlike
 * `loom.feature`, the glyph here is **not** the tree's to choose — it is
 * derived from `state`, so a proposal cannot put a tick beside something a
 * reader does not get.
 */
const MARKERS: Readonly<Record<PerkState, { glyph: string; label: string | undefined; style: CSSProperties }>> = {
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
const TEXT: Readonly<Record<PerkState, string>> = {
  included: colour("fg-default"),
  excluded: colour("fg-subtle"),
  coming: colour("fg-muted"),
}

/** The row's own layout and colour, for whichever element carries it. */
export const perkRowStyle = (state: PerkState): CSSProperties => ({
  display: "flex",
  alignItems: "flex-start",
  gap: space(3),
  listStyle: "none",
  fontFamily: family("body"),
  fontSize: size(3),
  lineHeight: 1.5,
  color: TEXT[state],
})

export const perkMarker = (state: PerkState): ReactNode => {
  const marker = MARKERS[state]

  return createElement(
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
  )
}

export const perkText = (given: PerkProps): ReactNode =>
  createElement(
    "span",
    { style: { display: "flex", flexDirection: "column", gap: space(1) } },
    createElement("span", null, given.label),
    given.note === undefined
      ? null
      : createElement("span", { style: { fontSize: size(2), color: colour("fg-subtle") } }, given.note)
  )
