import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * One dated thing a reader can turn up to: when it is, what it is called, where
 * it happens, and the control that gets them a place.
 *
 * Hermes' `events` block, and the port map is right that it is its own pair
 * rather than a `loom.milestone`: **an `EventItem` carries a venue and a ticket
 * link a milestone has nowhere to put.** The deeper difference is tense. A
 * milestone-list is a *history* — a rail of things that already happened, whose
 * arrangement is a sequence and whose markers are read in order. An events band
 * is a set of **offers to act on**, each one independent of the ones around it,
 * and the moment one of them has a *Get tickets* button the rail's shape is
 * wrong: a connector line between two things a reader is choosing *between*
 * says they are one story.
 *
 * ## What became nodes
 *
 * **The qualifiers** — `loom.badge` nodes in the `meta` region. Hermes has none
 * of these fields and that is the gap this port fills rather than transcribes:
 * an events band on a real page says *Workshop*, *Free*, *Online*, *Two seats
 * left*, and the set is open in exactly the way `loom.offering`'s nine
 * qualifier fields were. A block that had shipped `format` and `price` as props
 * would have needed a third and a fourth within a month.
 *
 * **The ticket link** — a `loom.action` in the `action` region, not a
 * `btnText` + `link` pair. A primitive that reimplemented a control as two
 * props would carry its own copy of 0053's scheme allowlist and its own idea of
 * what a button looks like, both of which would drift.
 *
 * ## What stayed props
 *
 * `name`, `date`, `location`, `summary`, `href` — exactly one of each per
 * record, and no second one is imaginable. `date` is **free text and never
 * parsed**, which is Hermes' own call inherited rather than re-litigated and
 * the same one `loom.milestone`'s `marker` and `loom.article`'s `kicker` make:
 * a parsed date refuses "Q2 2026" and "March 12–14", and forces a locale
 * decision onto a primitive with no business making one.
 *
 * `summary` is a prop rather than a `loom.prose` child by
 * [0094](../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md):
 * an event's content model has no repeated part, so there is no children flow
 * for a sentence to be a node *among*, and making it one would buy no
 * reachability at the cost of a node on every card in the band.
 *
 * ## The reader aims at the button
 *
 * 0066, and this is the side of it `loom.offering` is on rather than the side
 * `loom.episode` is on — the two pairs in this run sit on opposite sides of the
 * same record. An event is **acted on**: you register, you book, you buy a
 * ticket. So no overlay is emitted, the name is an ordinary link when there is
 * a page to read about it, and the thing that gets you a seat is a real control
 * in a region. A card whose whole surface was clickable *under* its own ticket
 * button is the defect 0066 exists to stop, and it is invisible in every
 * screenshot.
 *
 * ## Why the date is the one piece of colour
 *
 * The accent sits on the date and not on the venue, and that is the repair
 * `loom.credential` made on 26 August applied in advance rather than
 * discovered again. Accent-coloured *words* beside a linked name read as a
 * second link — under `bold`, where the accent is a saturated yellow, it is
 * unmissable — and clicking them does nothing. A date is unmistakably not a
 * destination, so it can carry the colour that gives a card of grey text some
 * life without promising anything it will not do.
 */

const props = z
  .object({
    name: z.string().min(1).max(200),
    /**
     * Free text, never parsed: "March 12, 2026", "Q2 2026", "Thu 6:30 PM".
     * Set at the leading edge, large, in tabular figures so a column of dates
     * lines its digits up.
     */
    date: z.string().min(1).max(64),
    location: z.string().min(1).max(120).optional(),
    /** The sentence under the name. A prop rather than a node — see 0094 above. */
    summary: z.string().min(1).max(400).optional(),
    /** Links the name, for a page about the event. The control belongs in `action`. */
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * The date column's width, as a function of the row's — `loom.episode`'s
 * `clamp()` reached a second time, and for the same reason a container query
 * was not needed there. The floor holds "March 12, 2026" to three lines on a
 * 390px screen; the ceiling is where a two-word date starts leaving a hole.
 */
const DATE_BASIS = "clamp(4.5rem, 18%, 8rem)"

export const loomEvent = definePrimitive({
  type: "loom.event",
  description:
    "One dated thing a reader can turn up to — when, what it is called, where it happens, and the control that gets them a place. A row of a loom.event-list.",
  props,
  /**
   * **Deliberately no `interactive` declaration**, for `loom.offering`'s reason
   * rather than by omission. `href` links the *name*; 0066 puts a real
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
          color: colour("fg-default"),
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

    const venue: ReactNode =
      given.location === undefined
        ? null
        : createElement(
            "p",
            {
              key: "location",
              style: {
                display: "flex",
                alignItems: "center",
                gap: space(2),
                margin: "0",
                fontFamily: family("body"),
                fontSize: size(2),
                lineHeight: 1.5,
                color: colour("fg-muted"),
              },
            },
            createElement(
              "svg",
              {
                key: "pin",
                viewBox: "0 0 24 24",
                width: "1em",
                height: "1em",
                fill: "none",
                stroke: colour("fg-subtle"),
                strokeWidth: 1.8,
                strokeLinecap: "round" as const,
                strokeLinejoin: "round" as const,
                /** Decorative: the venue is written out beside it in words. */
                "aria-hidden": true,
                focusable: "false",
                style: { flex: "0 0 auto" },
              },
              createElement("path", { key: "body", d: "M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" }),
              createElement("circle", { key: "dot", cx: 12, cy: 10, r: 2.6 })
            ),
            given.location
          )

    return createElement(
      "article",
      {
        ...loom.editable,
        className: `${LIBRARY_CLASS.event} ${LIBRARY_CLASS.lift}`,
        style: {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: space(4),
          padding: space(5),
          background: colour("bg-surface"),
          border: `1px solid ${colour("border-subtle")}`,
          borderRadius: radius("lg"),
          color: colour("fg-default"),
        },
      },
      libraryStylesheet(),
      createElement(
        "p",
        {
          key: "date",
          style: {
            flex: `0 0 ${DATE_BASIS}`,
            margin: "0",
            fontFamily: family("heading"),
            fontWeight: weight("heading"),
            fontSize: size(4),
            lineHeight: 1.2,
            fontVariantNumeric: "tabular-nums",
            /**
             * `accent` rather than `accent-strong`, and the reason is a
             * boundary rather than a shade. This card paints its own
             * `bg-surface`, so whatever ink goes on it is a **painted** pairing
             * — the tier `src/theme/contrast.ts` asserts rather than merely
             * reports. `accent on bg-surface` is already declared painted and
             * already clears 0074's bar; `accent-strong on bg-surface` is
             * declared *composed*, and a primitive that painted it would demote
             * a real assertion to a report without deleting a row, which is
             * precisely the edit `pairings.test.ts` exists to catch.
             *
             * Measured before settling for it, so this is a choice rather than
             * a retreat: across all 21 registered palettes the worst
             * `accent-strong on bg-surface` is 4.83:1 and the worst `accent` is
             * 4.75:1, both clear. Promoting the declaration would be safe and
             * it is not this lane's file. Filed.
             */
            color: colour("accent"),
          },
        },
        given.date
      ),
      createElement(
        "div",
        {
          key: "body",
          style: {
            display: "flex",
            flexDirection: "column",
            gap: space(2),
            flex: "1 1 12rem",
            minInlineSize: 0,
          },
        },
        name,
        venue,
        given.summary === undefined
          ? null
          : createElement(
              "p",
              {
                key: "summary",
                style: {
                  margin: "0",
                  fontFamily: family("body"),
                  fontSize: size(3),
                  lineHeight: 1.6,
                  color: colour("fg-muted"),
                },
              },
              given.summary
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
            {
              key: "action",
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: space(2),
                /**
                 * Pinned to the row's trailing edge, and it survives the wrap:
                 * when the card is too narrow to hold three columns the control
                 * takes a line of its own and stays at the end of it, which is
                 * where a reader who has decided already will look for it.
                 */
                marginInlineStart: "auto",
              },
            },
            action
          )
    )
  },
})
