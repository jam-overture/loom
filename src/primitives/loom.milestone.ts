import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, hairline, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * One entry on a rail: a marker, a title, and what happened.
 *
 * **This is the port's biggest collapse so far.** Seven Hermes blocks are the
 * same content model wearing different words — `timeline` (date, title,
 * description), `journey` (year, title, narrative), `roadmap` (status, title,
 * description), `changelog` (version, date, title, description),
 * `process-steps` (title, description), `course-modules` (number, title,
 * summary) and `event-agenda` (time, title). Every one of them is *a short
 * label on the left, a title, and a sentence*, arranged down a vertical rule.
 *
 * Porting them as seven pairs would have produced fourteen primitives that a
 * model has to choose between on the strength of their names, all rendering the
 * same DOM. 0052 asks what is a node and what is a prop; this asks the question
 * before it — **what is one primitive** — and the answer is that a roadmap is a
 * timeline whose markers are statuses. So `marker` is free text, because Hermes
 * was right to keep its dates unparsed: "2024", "v2.1", "01", "Q1", "9:00" and
 * "March 2025" are all the same field.
 *
 * The three fields are props rather than children for 0052's fixed-field half,
 * and for the reason 0059 names: they are *two or more strings meaningless
 * apart*, the same call `loom.feature` and `loom.stat` make. A milestone with
 * its title removed is not a milestone with a gap in it.
 *
 * `state` is the exception worth naming. It is a prop because it selects among
 * a closed set of renderings rather than deciding what exists — but a dot that
 * is hollow instead of filled says "not yet" to someone looking and nothing at
 * all to someone listening, so the two states that contradict the default carry
 * a declared accessible name (0060), exactly as `loom.perk` does. There is no
 * name for `done` for the same reason there is none for an included perk:
 * announcing "Completed" on all nine rows of a history is how a list becomes
 * unlistenable.
 */

const props = z
  .object({
    /**
     * The label on the left, unparsed on purpose: a date, a version, a step
     * number, a quarter, a time of day. Hermes kept this free text across all
     * seven blocks and that judgement is inherited rather than re-litigated —
     * a parsed date would refuse "Q1 2025" and force a locale decision onto a
     * primitive that has no business making one.
     */
    marker: z.string().min(1).max(32).optional(),
    title: z.string().min(1).max(160),
    body: z.string().min(1).max(400).optional(),
    state: z.enum(["done", "current", "planned"]).optional(),
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

type State = NonNullable<Props["state"]>

const DOT_SIZE = "0.75rem"

const DOTS: Readonly<Record<State, { names: "current" | "planned" | undefined; style: CSSProperties }>> = {
  done: {
    /** The default state names nothing — see the note above about nine rows. */
    names: undefined,
    style: { background: colour("accent"), borderColor: colour("accent") },
  },
  current: {
    names: "current",
    style: {
      background: colour("accent"),
      borderColor: colour("accent"),
      /** A ring rather than a bigger dot, so the rail's centre line does not move. */
      boxShadow: `0 0 0 4px ${colour("accent-subtle")}`,
    },
  },
  planned: {
    names: "planned",
    style: { background: colour("bg-canvas"), borderColor: colour("border-strong") },
  },
}

export const loomMilestone = definePrimitive({
  type: "loom.milestone",
  description:
    "One entry on a rail — a marker (date, version, step number), a title, and what happened. A row of a loom.milestone-list.",
  props,
  slots: [],
  text: {
    current: "In progress",
    planned: "Planned",
  },
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props, "current" | "planned">) => {
    const state: State = given.state ?? "done"
    const dot = DOTS[state]
    const named = dot.names === undefined ? undefined : loom.text[dot.names]
    const linked = given.href !== undefined

    const title: ReactNode = createElement(
      "h3",
      {
        key: "title",
        className: linked ? LIBRARY_CLASS.underline : undefined,
        style: {
          margin: "0",
          alignSelf: "flex-start",
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: size(4),
          lineHeight: 1.25,
          color: colour("fg-default"),
        },
      },
      given.title
    )

    const content = createElement(
      linked ? "a" : "div",
      {
        ...(linked ? { href: given.href } : {}),
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: space(2),
          textDecoration: "none",
          color: colour("fg-default"),
        },
      },
      title,
      given.body === undefined
        ? null
        : createElement(
            "p",
            {
              key: "body",
              style: {
                margin: "0",
                fontFamily: family("body"),
                fontSize: size(3),
                lineHeight: 1.6,
                color: colour("fg-muted"),
              },
            },
            given.body
          )
    )

    return createElement(
      "li",
      {
        ...loom.editable,
        /**
         * **Its own layout is in the stylesheet, and that is load-bearing.** An
         * inline style beats a rule, so a marker column and a rail direction
         * written here would be unreachable from the container — and there are
         * two containers now: a `loom.milestone-list` runs these down a rail
         * and a `loom.milestone-row` lays the same entries across as a process
         * band. What stays inline is everything neither arrangement varies.
         */
        className: LIBRARY_CLASS.milestone,
        style: { listStyle: "none" },
      },
      libraryStylesheet(),
      createElement(
        "div",
        {
          key: "marker",
          className: LIBRARY_CLASS.railMarker,
          style: {
            fontFamily: family("body"),
            fontSize: size(2),
            lineHeight: 1.6,
            fontVariantNumeric: "tabular-nums",
            color: colour("fg-subtle"),
            whiteSpace: "nowrap",
          },
        },
        given.marker
      ),
      createElement(
        "div",
        {
          key: "rail",
          className: LIBRARY_CLASS.railTrack,
          /**
           * The direction is the *arrangement's* — down beside a marker on a
           * rail, across above one in a row — so it is in the stylesheet with
           * the rest of what a container varies.
           */
          style: { display: "flex", alignItems: "center", gap: space(1) },
        },
        createElement("span", {
          key: "dot",
          ...(named === undefined ? { "aria-hidden": true } : { role: "img", "aria-label": named }),
          className: LIBRARY_CLASS.railDot,
          style: {
            ...dot.style,
            flex: `0 0 ${DOT_SIZE}`,
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: radius("full"),
            borderStyle: "solid",
            borderWidth: "2px",
          },
        }),
        /**
         * The connector, drawn by every entry and hidden on the last one by the
         * library stylesheet. A rail cannot be a border on the list, because it
         * would run past the final dot; and an entry cannot know it is last,
         * because a render is a pure function of one node. `:last-child` is the
         * only thing that knows, which is what the stylesheet is for.
         */
        createElement("span", {
          key: "line",
          className: LIBRARY_CLASS.railLine,
          "aria-hidden": true,
          /** Its thickness is the arrangement's — 2px wide down a rail, 2px tall across a row. */
          style: { background: hairline() },
        })
      ),
      /**
       * The gap below an entry belongs to the list and is set in the
       * stylesheet, so it is deliberately **not** set here: an inline style
       * wins on specificity, and one written here would make `density` and the
       * flush last entry unreachable. The cost is that a milestone rendered
       * outside a list sits tight against the next one, which is a legible tree
       * rendering plainly rather than a broken one (0008).
       */
      createElement("div", { key: "content", className: LIBRARY_CLASS.railBody }, content)
    )
  },
})
