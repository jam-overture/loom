import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAPS } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * A band whose children travel past, forever — the logo wall that drifts, the
 * ticker of quotes, the strip of shots under a hero.
 *
 * Ported from Hermes' `marquee`, and the port map calls it **atomic**. That
 * verdict is half right and the half it gets wrong is the interesting one.
 * What cannot decompose here is the *motion*: a continuous loop is one
 * behaviour over a whole row, and there is no node that is "the scrolling".
 * The **content** decomposes exactly as well as any other band's — a logo in a
 * marquee is a logo, and it means the same thing standing still. So this is
 * 0054's shape rather than 0052's exception: a container named for the
 * arrangement it puts its children in, sitting beside `loom.stack`,
 * `loom.grid` and `loom.mosaic`, and the port map's row is corrected to a pair
 * with no new child type — because every child type it wants already exists.
 *
 * ## Why there is no `speed` prop
 *
 * `docs/primitive-granularity.md` lists `animationSpeed` as a real prop, and it
 * is right about granularity: a speed changes no node, so it is not a delta in
 * disguise. It is refused here on the *other* axis, which
 * [0055](../../decisions/0055-motion-is-a-static-stylesheet-the-primitive-emits.md)
 * settled — a tree may say which *variant* of a motion it wants and may not
 * say its duration, because a duration is a number a model writes and the Gate
 * weighs as one small reversible edit, and "the logos now cross the band in one
 * second" is not that.
 *
 * Refusing it leaves a real problem rather than solving one, and the fix is the
 * awkward-looking block of rules in `stylesheet.ts`. A CSS loop translates the
 * track by its own width over a fixed duration, so **six logos drift and twenty
 * sprint** — the same declaration, three times the linear speed. The pace has
 * to come from the count, and a primitive cannot measure its children or
 * interpolate an index into a static sheet (0055 again). What CSS *can* do is
 * ask: `:has(> * > :nth-child(12))` is true of a run of twelve or more, so the
 * duration is enumerated once per count and the last matching rule wins. The
 * result is a band that moves at one speed whatever is in it, with nothing in
 * the tree naming a millisecond. A browser without `:has()` gets the one-item
 * duration and a slow band, which is the right way to fail.
 *
 * ## Why it holds still while the page is being edited
 *
 * `loom.logo-cloud` declines to scroll, and the paragraph saying why is the
 * reason this primitive is shaped the way it is: a seamless loop needs the row
 * rendered **twice**, and two copies of a node in the DOM means two elements
 * carrying one `data-loom-node` — the failure 0051 rejected, where a portal
 * resolves an id to a copy and points a reviewer at a node that is not the one
 * they clicked.
 *
 * The answer is not a compromise, and it is worth stating as the rule rather
 * than as the workaround: **you cannot click a logo that is sliding past.** A
 * moving target is hostile to the one activity edit mode exists for. So the
 * band holds still exactly when a person is editing it — one run, no echo, no
 * animation, wrapped — and scrolls when the page is published. `loom.editable`
 * is present only in edit mode, which makes that the whole test.
 *
 * What falls out is a property rather than a hope: **the echo exists only where
 * identity attributes do not**, so no rendered page ever carries a duplicate
 * `data-loom-node`, and a test asserts it. The cost is that the portal's
 * preview does not show the motion, which is visible to whoever is looking at
 * it rather than silent.
 *
 * Reduced motion takes the same still rendering, by the same rules, for the
 * same reason a reader who asked for calm should not be given a second copy of
 * every logo to read past.
 */

const props = z
  .object({
    /**
     * Which edge the content travels toward. Two of these, running opposite
     * ways, is the stacked-ticker look — and it is two nodes rather than a
     * `rows` prop, for the reason 0052 gives about counts.
     */
    direction: z.enum(["start", "end"]).optional(),
    /** How far apart the items sit, and therefore how dense the band reads. */
    density: z.enum(["tight", "snug", "loose", "roomy"]).optional(),
    /**
     * Whether the band dissolves at its two edges or stops at them.
     *
     * The fade is a **mask**, not a gradient to the page's colour, and that is
     * the whole reason it can exist here at all: `loom.table` wanted the same
     * effect on 24 August and could not have it, because a gradient needs a
     * ground colour and a primitive cannot know what it is sitting on. A mask
     * fades opacity, so a band inside a card fades to the card and a band on
     * the canvas fades to the canvas, with nothing in the primitive naming
     * either.
     */
    edges: z.enum(["faded", "hard"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomMarquee = definePrimitive({
  type: "loom.marquee",
  description:
    "A band whose children scroll past continuously — a logo wall, a ticker, a strip of quotes. Holds still while the page is being edited.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const still = loom.editable !== undefined
    const gap = GAPS[given.density ?? "roomy"]

    /**
     * The run's own gap sits *between* its items and its trailing padding sits
     * after the last one, which together make the two runs tile exactly. A gap
     * on the track instead would put half a gap either side of the seam, and
     * the loop would jump by that much once a cycle — the kind of defect that
     * is invisible in a screenshot and unmistakable on a page.
     */
    const runStyle = still ? { gap } : { gap, paddingInlineEnd: gap }

    const run = createElement(
      "div",
      { key: "run", className: LIBRARY_CLASS.marqueeRun, style: runStyle },
      children
    )

    /**
     * `inert` as well as `aria-hidden`: the copy may contain links, and a
     * second unreachable tab stop for every one of them is what an
     * `aria-hidden` subtree still leaves behind.
     */
    const echo = still
      ? null
      : createElement("div", {
          key: "echo",
          className: `${LIBRARY_CLASS.marqueeRun} ${LIBRARY_CLASS.marqueeEcho}`,
          style: runStyle,
          "aria-hidden": true,
          inert: true,
          children,
        })

    return createElement(
      "div",
      {
        ...loom.editable,
        className: [
          LIBRARY_CLASS.marquee,
          still ? LIBRARY_CLASS.marqueeStill : undefined,
          given.edges === "hard" ? undefined : LIBRARY_CLASS.marqueeFaded,
        ]
          .filter((name) => name !== undefined)
          .join(" "),
        style: { overflow: "hidden", width: "100%" },
      },
      libraryStylesheet(),
      createElement(
        "div",
        {
          /**
           * Nothing about this element is set inline. The duration, the width
           * and the direction all have to be reachable from a rule — by the
           * item count, by the reduced-motion query, and by the still variant —
           * and an inline style beats every one of them.
           */
          className: [
            LIBRARY_CLASS.marqueeTrack,
            given.direction === "end" ? LIBRARY_CLASS.marqueeReverse : undefined,
          ]
            .filter((name) => name !== undefined)
            .join(" "),
        },
        run,
        echo
      )
    )
  },
})
