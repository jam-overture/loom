import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { color, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * Something happening on a date, in a place, that a reader can get into: the
 * date first, then what it is, where it is, a line about it, and the way in.
 *
 * Hermes' `events` block and its `EventItem` shape, which
 * `docs/hermes-port-map.md` left as the last of the four pairs and marked *its
 * own pair* on the ground that a venue and a ticket link have nowhere to go on a
 * `loom.milestone`. That is right and it is confirmed here — `loom.milestone`
 * has **no slots at all**, so neither a badge strip nor a control can be put on
 * one, and a "what's on" band whose events cannot be booked is a list of things
 * you have already missed.
 *
 * ## Why it is not `loom.offering` with a date
 *
 * This is the sharper question, and it is sharper than the milestone one because
 * the field lists very nearly match: a name, a short prominent value, qualifiers,
 * a sentence, a control. `loom.offering` already ports Hermes'
 * `class-schedule` — a class at 6:30 on a Tuesday in Studio 2 — which is a dated
 * happening in a place by any reading.
 *
 * The separation is where the loud thing sits, and it is a fact about the markup
 * rather than about the fields:
 *
 * - **An offering's price is a trailing detail.** The name is the headline and
 *   the amount is set beside it, at the end of the line, because what a reader is
 *   choosing between is *the things*.
 * - **An event's date is the leading one.** A reader scanning a what's-on band is
 *   scanning dates — they are choosing between *the days* — so the date is set
 *   first, in the accent, with a rule between it and everything else. It is the
 *   column a finger runs down.
 *
 * Same fields, opposite reading order, and no prop on `loom.offering` could say
 * it: moving a value from the end of a row to the start of it, and giving it a
 * separator, is a different layout rather than a different setting. That is the
 * same test `loom.offering` itself passed against `loom.tier`, and it is the
 * reason `class-schedule` stays where it is: a class *is* an offering, chosen
 * among other classes; a conference talk is an event, chosen among other dates.
 *
 * ## What became nodes, and what stayed props
 *
 * - **The qualifiers** — "Free", "Workshop", "In person", "Sold out" — are
 *   `loom.badge` nodes in the `meta` region. There is never exactly one, which
 *   is 0052's repeated-content clause and `loom.offering`'s call about its nine
 *   qualifier fields.
 * - **`link`** is a `loom.action` in the `action` region rather than two props.
 *   A primitive that reimplemented a ticket link as a label and a URL would be a
 *   second call to action with its own copy of 0053's scheme allowlist to keep
 *   in step, and no way to be a secondary control when the page wants one quiet.
 * - **`name`, `date`, `location` and `description` stayed props.** Exactly one
 *   of each, per record. `description` is a prop by
 *   [0094](../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md)
 *   and not by preference: this card turns no field into a children flow, so
 *   there is nothing for a sentence to be moved within, and it sits beside
 *   `loom.credential` on that question rather than beside `loom.offering`.
 * - **`date` is free text and required**, which is the only required optional-ish
 *   field in the pair and is deliberate. Free text for Hermes' own stated reason
 *   — *"e.g. `March 12, 2026`, `Q2 2026`; not parsed"* — because a parsed date
 *   refuses "Spring 2026" and forces a locale and a format onto a primitive with
 *   no business choosing either. Required because an event without one is not an
 *   event; it is an offering, and the library has that.
 *
 * ## The reader aims at the control
 *
 * 0066 settles it in advance: an event is **acted on**, so no overlay is emitted,
 * the name is an ordinary link when there is something to read, and the thing
 * that gets you in is a real control in a region pinned to the card's end.
 *
 * ## One card that reads as a row when it is given the width
 *
 * A what's-on band is a column of full-width rows; a "three upcoming" teaser on a
 * home page is three cards. That is `loom.offering`'s question — how much room
 * was this card given — and it gets `loom.offering`'s answer: containment on the
 * article, one `@container` rule past 40rem, and nothing in the tree saying
 * which. The date's separating rule appears with the row and not before it,
 * because a horizontal rule under a date in a narrow card is a divider between
 * nothing.
 *
 * ## What is deliberately not here
 *
 * **A `state: "upcoming" | "past"` prop**, though `loom.milestone` carries the
 * closest thing to a precedent for one and it would pass 0052 cleanly. It is out
 * on grammar-budget grounds (0014): a page that wants to mark an event over can
 * already put a `loom.badge` in the `meta` region, which is a node someone placed
 * and a reviewer can see, where a prop is a field the model must decide about on
 * every event it ever writes. If a run finds that a past event needs to be
 * *dimmed* rather than *labelled* — a rendering rather than a word — that is the
 * argument for adding it, and it should be made with a page that needed it.
 */

const props = z
  .object({
    name: z.string().min(1).max(200),
    /**
     * Free text, never parsed, and required. See the note above: "12 March
     * 2026", "Q2 2026" and "Every second Tuesday" are one field.
     */
    date: z.string().min(1).max(64),
    location: z.string().min(1).max(120).optional(),
    /**
     * The line about it. A prop rather than a `loom.prose` child, by 0094: this
     * card has no children flow for a sentence to be moved within.
     */
    note: z.string().min(1).max(400).optional(),
    /** Links the name. The control that gets you in belongs in the `action` region. */
    href: linkUrlSchema.optional(),
    /** `featured` is the one date a page is steering towards. */
    emphasis: z.enum(["plain", "featured"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * A featured event is lifted by a ring rather than by scale, for the reason
 * `loom.tier` and `loom.offering` both give: a scaled card in a grid overlaps
 * its neighbours' hover targets and stops rendering its own border at one pixel.
 */
const SURFACES = {
  plain: {
    background: color("bg-surface"),
    border: `1px solid ${color("border-subtle")}`,
  },
  featured: {
    background: color("bg-surface"),
    border: `1px solid ${color("border-accent")}`,
    boxShadow: `0 0 0 1px ${color("accent")}, 0 32px 64px -48px ${color("accent-strong")}`,
  },
} as const

export const loomEvent = definePrimitive({
  type: "loom.event",
  description:
    "Something happening on a date, in a place, with a way in — the date first, then what it is. A cell of a loom.event-grid.",
  props,
  /**
   * **Deliberately no `interactive` declaration**, and for `loom.offering`'s
   * reason rather than by omission. `href` links the *name*; 0066 puts a real
   * `loom.action` in the `action` region on purpose, and declaring this a target
   * would make the Gate refuse the library's own intended composition — which is
   * how a check ends up switched off. 0068 states the test the two answers
   * differ on: no overlay is emitted here, so the reader's aim is the control's.
   */
  slots: ["meta", "action"],
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props>) => {
    const meta = loom.slots["meta"]
    const action = loom.slots["action"]

    const name = createElement(
      "h3",
      {
        key: "name",
        style: {
          margin: "0",
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: size(4),
          lineHeight: 1.25,
          color: color("fg-default"),
        },
      },
      given.href === undefined
        ? given.name
        : createElement(
            "a",
            {
              href: given.href,
              className: LIBRARY_CLASS.underline,
              style: { color: "inherit", textDecoration: "none" },
            },
            given.name
          )
    )

    return createElement(
      "article",
      {
        ...loom.editable,
        className: `${LIBRARY_CLASS.event} ${LIBRARY_CLASS.lift}`,
        style: {
          ...SURFACES[given.emphasis ?? "plain"],
          padding: space(5),
          borderRadius: radius("lg"),
          color: color("fg-default"),
        },
      },
      libraryStylesheet(),
      createElement(
        "div",
        /**
         * The element the `@container` rule flips, and it has to be inside the
         * element that declares the containment rather than being it.
         */
        { key: "frame", className: LIBRARY_CLASS.eventFrame },
        createElement(
          "p",
          {
            key: "when",
            className: LIBRARY_CLASS.eventWhen,
            style: {
              margin: "0",
              fontFamily: family("heading"),
              fontWeight: weight("heading"),
              fontSize: size(4),
              lineHeight: 1.15,
              textWrap: "balance",
              /**
               * `accent` rather than the `accent-strong` a `loom.offering` sets
               * its price in, and the difference is size rather than taste.
               * `accent-strong` exists to keep *small* emphatic text legible — a
               * validation message, a price set at the end of a line. A date at
               * heading size has all the weight it needs from the ramp, and the
               * lighter accent is the one every other large accent-colored
               * thing in the library already wears.
               *
               * There is a second reason and it is worth knowing before someone
               * "fixes" this: `accent-strong on bg-surface` is declared
               * **composed** in `src/theme/contrast.ts`, so painting it here
               * promotes it to a bar every palette must clear. Every palette
               * does clear it, and the row is arguably already wrong —
               * `loom.offering` paints exactly that pairing today and the probe
               * cannot see it, because it renders each primitive with default
               * props and a price is optional. That is filed rather than fixed
               * here: the file belongs to another lane.
               */
              color: color("accent"),
            },
          },
          given.date
        ),
        createElement(
          "div",
          { key: "body", className: LIBRARY_CLASS.eventBody },
          name,
          given.location === undefined
            ? null
            : createElement(
                "p",
                {
                  key: "location",
                  style: {
                    margin: "0",
                    fontFamily: family("body"),
                    fontSize: size(2),
                    lineHeight: 1.5,
                    color: color("fg-muted"),
                  },
                },
                given.location
              ),
          given.note === undefined
            ? null
            : createElement(
                "p",
                {
                  key: "note",
                  style: {
                    margin: "0",
                    fontFamily: family("body"),
                    fontSize: size(3),
                    lineHeight: 1.6,
                    color: color("fg-muted"),
                  },
                },
                given.note
              ),
          meta === undefined
            ? null
            : createElement(
                "div",
                {
                  key: "meta",
                  style: {
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: space(2),
                    marginBlockStart: space(1),
                  },
                },
                meta
              )
        ),
        action === undefined
          ? null
          : createElement(
              "div",
              /**
               * A grid, so a lone action fills the width it is given the way a
               * ticket button is expected to, without the action itself having
               * to know it is in an event. The `auto` start margin that pins it
               * to the card's floor is in the stylesheet, because the row layout
               * has to cancel it.
               */
              { key: "action", className: LIBRARY_CLASS.eventAction, style: { gap: space(2) } },
              action
            )
      )
    )
  },
})
