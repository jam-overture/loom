import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { PrimitiveText } from "../render/text.js"

import { color, family, radius, size, space } from "./tokens.js"

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

/**
 * The two strings a perk owns rather than reads from the tree, declared here so
 * both primitives declare the same ones.
 *
 * These are the strings that prompted 0060: a marker glyph carries meaning the
 * perk's own label does not, so a screen-reader user reading "Priority support"
 * with no marker announced is told the opposite of what the page shows. They
 * cannot be props — that would put an accessible name in the space a model
 * writes — and until 0060 they were inline in the component and untranslatable.
 *
 * There is deliberately no key for `included`. A tick beside an item in a list
 * of what a plan includes says nothing the surrounding heading has not, and
 * announcing "Included" on every one of nine rows is how a list becomes
 * unlistenable. Only the two states that *contradict* the default are named.
 */
export const PERK_TEXT = {
  excluded: "Not included",
  coming: "Coming soon",
} as const

export type PerkTextKey = keyof typeof PERK_TEXT

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
const MARKERS: Readonly<Record<PerkState, { glyph: string; names: PerkTextKey | undefined; style: CSSProperties }>> = {
  included: {
    glyph: "✓",
    /** Decoration — see `PERK_TEXT` for why this one has no accessible name. */
    names: undefined,
    style: { background: color("accent-subtle"), color: color("accent-strong") },
  },
  excluded: {
    glyph: "✕",
    names: "excluded",
    style: { background: color("bg-surface-muted"), color: color("fg-subtle") },
  },
  coming: {
    glyph: "○",
    names: "coming",
    style: { background: color("bg-surface-muted"), color: color("fg-muted") },
  },
}

const MARKER_SIZE = "1.25rem"

/**
 * An excluded perk is dimmed rather than struck through. A line through text
 * means "this was here and is gone", which is what a diff says; a plan that
 * never included priority support is not a plan that lost it.
 */
const TEXT: Readonly<Record<PerkState, string>> = {
  included: color("fg-default"),
  excluded: color("fg-subtle"),
  coming: color("fg-muted"),
}

/** The row's own layout and color, for whichever element carries it. */
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

/**
 * The accessible name comes from `loom.text` rather than from this module's own
 * constant, so a deployment that replaced the string gets its replacement (0060).
 * `PERK_TEXT` is what the primitive *declares*; `text` is what the render
 * *resolved*, and only the second one has been through the host's overrides.
 */
export const perkMarker = (state: PerkState, text: PrimitiveText<PerkTextKey>): ReactNode => {
  const marker = MARKERS[state]
  const named = marker.names === undefined ? undefined : text[marker.names]

  return createElement(
    "span",
    {
      ...(named === undefined
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": named }),
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
      : createElement("span", { style: { fontSize: size(2), color: color("fg-subtle") } }, given.note)
  )
