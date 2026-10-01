import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { anchorAttributes, anchorSchema, anchorStyle } from "./anchor.js"
import { color, family, radius, size, space, weight } from "./tokens.js"

/**
 * The aside a page steps out of its own flow to make — a note, a caveat, the
 * thing the reader will otherwise get wrong.
 *
 * Every documentation site has one and this library did not, which mattered
 * more than it sounds: the documentation, lessons and marketing surfaces all
 * compose registered primitives (0067) and all three have prose that needs to
 * stop and say *careful here*. Without this they have two options — a paragraph
 * that looks like the paragraphs around it, or a `loom.card` — and the second
 * is the interesting failure.
 *
 * **Why this is not `loom.card` with `tone: "accent"`.** That composition draws
 * something that looks close, and it is wrong in two ways a screenshot cannot
 * show. A card is a `<div>`: a generic surface whose meaning is entirely in
 * what a tree puts on it, which is the right answer for a card and the wrong
 * one here, because an aside *is* a semantic — content related to the page but
 * set apart from it, and `<aside>` is the element assistive technology already
 * knows that by. And the label would have to be a `loom.heading` to be bold,
 * which puts "Note" into the document outline beside the section titles, so a
 * reader navigating by headings gets a page whose structure is half furniture.
 * The label here is a fixed field on a paragraph: exactly one of it, it labels
 * the content rather than being it, and by 0052 that is a prop.
 *
 * **The marker is a region rather than an icon enum**, which is 0051's test
 * read straight: the callout places it in a gutter beside the content, where
 * the flow of children does not go, and "the first child is the icon" is a rule
 * no schema states and every `move` breaks. It also means the marker is
 * whatever the library already draws — a `loom.icon`, a `loom.badge`, an
 * `loom.avatar` on a callout that quotes somebody — instead of a closed list of
 * glyphs this primitive would have to own and keep in step with `loom.icon`'s.
 *
 * **Two tones, and the missing third is a finding rather than a hex.** Every
 * callout system in the world has a red one, and this one cannot: a Loom
 * palette declares an accent, a secondary brand and a set of neutrals, and
 * *none of them means danger*. Painting a warning red here would take a literal
 * — the one thing `tokens.ts` exists to make impossible — and it would be a
 * literal that survives a re-theme, so a palette designed around red would get
 * a warning that vanishes into it. Filed for `Loom daily build`; until a
 * palette can say what danger looks like, a caveat is an `accent` callout whose
 * marker and title say what it is, and that is honest rather than approximate.
 */

const props = z
  .object({
    /**
     * `accent` is the callout the page wants read; `neutral` is the aside it
     * wants available. Two renderings of one content model, so promoting a note
     * to a warning is one `configure` rather than a node with a new identity.
     */
    tone: z.enum(["accent", "neutral"]).optional(),
    /**
     * The label — "Note", "Before you start", "This changes in v2". Exactly one
     * of it and it labels rather than carries the content, which is 0052's
     * fixed-field half. Deliberately not an enum of the four names a callout
     * system usually ships: the label is content, it is the sentence a writer
     * would have written, and a closed set here would be this library deciding
     * what a page is allowed to be careful about.
     */
    title: z.string().min(1).max(120).optional(),
    /** The name this aside answers to, so a link on the page can point at it. */
    anchor: anchorSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * Both grounds carry `fg-default` body copy and both pairings are measured in
 * `PALETTE_TEXT_PAIRINGS` — `fg-default` on `accent-subtle` explicitly, and
 * `fg-default` on `bg-surface-muted` by dominating the `fg-subtle` pairing that
 * is measured there. The title on the accent tone is `accent-strong`, which is
 * the other measured pairing on that ground. What is *not* here is `accent` ink
 * on `accent-subtle`, which reads as the obvious choice for a tinted panel's
 * label and fails 0074's bar at 4.43:1 — the 22 August finding, avoided rather
 * than rediscovered.
 */
const TONES = {
  accent: {
    background: color("accent-subtle"),
    rule: color("accent"),
    title: color("accent-strong"),
  },
  neutral: {
    background: color("bg-surface-muted"),
    rule: color("border-strong"),
    title: color("fg-default"),
  },
} as const

export const loomCallout = definePrimitive({
  type: "loom.callout",
  description:
    "An aside a page steps out of its flow to make — a note or a caveat, with an optional title and a marker region. Its body is children.",
  props,
  slots: ["marker"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const tone = TONES[given.tone ?? "accent"]
    const marker = loom.slots["marker"]

    const body = createElement(
      "div",
      {
        key: "body",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: space(2),
          /**
           * A flex item refuses to be narrower than its content unless told it
           * may. Without this a `loom.code-span` in the body widens the whole
           * aside past its column — the 20 August scrollbar failure, one level
           * in.
           */
          minWidth: "0",
          flex: "1 1 auto",
        },
      },
      given.title === undefined
        ? null
        : createElement(
            "p",
            {
              key: "title",
              style: {
                margin: "0",
                fontFamily: family("heading"),
                fontWeight: weight("heading"),
                fontSize: size(3),
                lineHeight: 1.3,
                letterSpacing: "0.01em",
                color: tone.title,
              },
            },
            given.title
          ),
      children
    )

    return createElement(
      "aside",
      {
        ...loom.editable,
        ...anchorAttributes(given.anchor),
        style: {
          ...anchorStyle(given.anchor),
          display: "flex",
          alignItems: "flex-start",
          gap: space(3),
          padding: space(4),
          background: tone.background,
          /**
           * The rule is on the inline-start edge and it is the whole of what
           * makes this read as a callout rather than a tinted box. It is a
           * border rather than a pseudo-element so that it flows with the
           * panel's height under any content, and `borderStartStartRadius` is
           * left square: a rule that curves at its ends stops reading as a rule.
           */
          borderInlineStart: `3px solid ${tone.rule}`,
          borderStartEndRadius: radius("md"),
          borderEndEndRadius: radius("md"),
          fontFamily: family("body"),
          fontSize: size(3),
          lineHeight: 1.6,
          color: color("fg-default"),
          width: "100%",
          minWidth: "0",
          boxSizing: "border-box",
        },
      },
      marker === undefined
        ? null
        : createElement(
            "div",
            {
              key: "marker",
              style: {
                display: "flex",
                flex: "0 0 auto",
                /**
                 * Aligned to the first line's cap height rather than to the top
                 * of the box. A glyph set flush with a padded edge sits a hair
                 * above the words it introduces, which reads as a mistake even
                 * to someone who could not name it.
                 */
                marginBlockStart: "0.1em",
              },
            },
            marker
          ),
      body
    )
  },
})
