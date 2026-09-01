import { Children, createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"

/**
 * Whatever it is given, circling something it is given — the *works with*
 * band: a product's mark in the middle and the logos of what it plugs into
 * going round it.
 *
 * This is the band the brief's fourth tier is for, and the one a marketing page
 * reaches for when a row of grey wordmarks has stopped saying anything. A
 * `loom.logo-cloud` says *these companies exist*; a `loom.marquee` says *there
 * are a lot of them*; this says **these things move around that thing**, which
 * is a claim about a product rather than a list of customers, and it is the
 * only one of the three that has a centre.
 *
 * ## What is a node and what is a prop here
 *
 * The things in orbit are children, because a page adds and removes them and
 * each is a `loom.logo`, a `loom.icon` or a `loom.avatar` that means the same
 * thing standing still (0052). The thing in the middle is a **slot** and not
 * the first child, because the primitive *places* it — dead centre, outside the
 * turning layer, at a position no reordering of children should be able to
 * reach (0051). "The first child is the middle one" is a rule no schema states
 * and every `move` breaks.
 *
 * Nothing here is a count. `rings` says whether the seats alternate between two
 * radii or sit on one, which changes where however-many children are drawn and
 * not how many there are — the granularity doc's sharper question, answered the
 * same way `loom.mosaic`'s `rhythm` answers it.
 *
 * ## The two mechanics, and why they are where they are
 *
 * **The angle is inline; the motion is not.** Each seat's place on the ring is
 * a function of its index and the number of siblings, which no static rule can
 * express — a stylesheet cannot say "the third of five". So the seat carries
 * its own `left` and `top`, computed here, exactly as `loom.hero` computes an
 * `animationDelay` per row of its content. What the seat does *not* carry is
 * the turning: that is one duration in `stylesheet.ts` (0055), so a tree can
 * ask for a direction and cannot ask for a speed.
 *
 * **The item turns back.** A ring that rotates rotates everything on it, so a
 * wordmark would go round upside down. The seat is inside the turning layer and
 * the item inside the seat runs the same animation in reverse at the same rate,
 * which holds every logo upright while the ring moves under it. The two
 * durations have to stay equal, which is why they are one rule apart in the
 * stylesheet and neither is expressible on an element.
 *
 * ## Why it holds still while the page is being edited
 *
 * `loom.marquee`'s rule, for its second reason. A moving target is hostile to
 * the one activity edit mode exists for, and a logo drifting away from the
 * pointer is worse here than in a marquee: it is going round a corner rather
 * than off the side. `loom.editable` is present only in edit mode, so that is
 * the whole test. Reduced motion takes the same still rendering, and the still
 * rendering is not a degraded one — the ring is a composition, not an
 * animation, and it reads as one stopped.
 */

const props = z
  .object({
    /**
     * One ring, or seats alternating between an outer and an inner radius.
     * `two` is what a dozen marks want, because a dozen on one circle either
     * touch or need a circle wider than the band.
     */
    rings: z.enum(["one", "two"]).optional(),
    /** Which way the ring turns. A variant of a motion, which is what a tree may say (0055). */
    direction: z.enum(["clockwise", "anticlockwise"]).optional(),
    /**
     * The dashed circles the seats sit on. They are the thing that makes the
     * arrangement read as an orbit rather than as scattered logos when it is
     * standing still, which is every screenshot and every reader who asked for
     * calm — so `none` is the exception rather than the default.
     */
    guides: z.enum(["dashed", "none"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * A square band is as tall as it is wide, so left alone in a full-width section
 * this would be a thousand pixels of mostly nothing. The cap is a layout
 * constant rather than a prop for the reason `loom.hero`'s text measure is one:
 * no palette or preset would vary it, and a parent that wants it smaller
 * already has `loom.split` and `loom.grid` to say so with.
 */
const DIAMETER = "min(100%, 34rem)"

/** Twelve o'clock, so a single child sits at the top rather than at three. */
const START_ANGLE = -90

/**
 * A seat carries **where on the circle** and never **how big the circle is**,
 * and the split is the whole reason the band survives a phone.
 *
 * The angle is a fact about one child among its siblings — the third of six —
 * which no static rule can express, so it is computed here as a pair of
 * unitless multipliers the stylesheet multiplies a radius by. The radius is a
 * fact about the *arrangement*, so it lives in `stylesheet.ts` where a
 * `@container` rule can change it: below 26rem the inner ring opens out to the
 * outer one and its guide is dropped, because two rings inside a 350px band
 * put half the marks on top of the thing they are meant to be circling. That
 * was the phone screenshot's finding and no assertion's.
 *
 * It is a *container* query rather than a media query for the reason
 * `loom.offering` gives: this band is as likely to be one half of a
 * `loom.split` on a laptop as the whole width of a phone, and the viewport
 * cannot tell those apart.
 */
const seatAngle = (index: number, count: number): Record<string, string> => {
  const angle = ((START_ANGLE + (360 * index) / count) * Math.PI) / 180

  return {
    "--loom-orbit-x": Math.cos(angle).toFixed(4),
    "--loom-orbit-y": Math.sin(angle).toFixed(4),
  }
}

const guide = (ring: "outer" | "inner"): ReactNode =>
  createElement("div", {
    key: `guide-${ring}`,
    className: ring === "inner" ? `${LIBRARY_CLASS.orbitGuide} ${LIBRARY_CLASS.orbitInner}` : LIBRARY_CLASS.orbitGuide,
    "aria-hidden": true,
  })

export const loomOrbit = definePrimitive({
  type: "loom.orbit",
  description:
    "Its children circling a mark it places in the middle — the “works with” band. Holds still while the page is being edited.",
  props,
  slots: ["mark"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const rings = given.rings ?? "one"
    const still = loom.editable !== undefined
    const seated = Children.toArray(children)
    const mark = loom.slots["mark"]

    const seats = seated.map((child, index) =>
      createElement(
        "div",
        {
          key: `seat-${index}`,
          className:
            rings === "two" && index % 2 === 1
              ? `${LIBRARY_CLASS.orbitSeat} ${LIBRARY_CLASS.orbitInner}`
              : LIBRARY_CLASS.orbitSeat,
          style: seatAngle(index, seated.length),
        },
        createElement("div", { className: LIBRARY_CLASS.orbitItem }, child)
      )
    )

    return createElement(
      "div",
      {
        ...loom.editable,
        className: [
          LIBRARY_CLASS.orbit,
          given.direction === "anticlockwise" ? LIBRARY_CLASS.orbitReverse : undefined,
          still ? LIBRARY_CLASS.orbitStill : undefined,
        ]
          .filter((name) => name !== undefined)
          .join(" "),
        style: {
          /**
           * The width, the ratio and the two animations are all in the
           * stylesheet or on classes. What is inline is the cap and the
           * centring, which nothing has to vary.
           */
          maxWidth: DIAMETER,
          marginInline: "auto",
        },
      },
      libraryStylesheet(),
      given.guides === "none" ? null : [guide("outer"), ...(rings === "two" ? [guide("inner")] : [])],
      createElement("div", { key: "spinner", className: LIBRARY_CLASS.orbitSpinner }, seats),
      mark === undefined
        ? null
        : createElement(
            "div",
            {
              key: "mark",
              style: {
                /**
                 * Outside the turning layer rather than inside it at radius
                 * zero: a mark at the centre of a rotation still rotates, and
                 * the one thing on this band that must never appear to move is
                 * the thing everything else is moving around.
                 *
                 * Placed by its own middle rather than stretched across the
                 * band, which is the difference between a mark that can be
                 * clicked and a transparent sheet lying over every logo on the
                 * ring — the failure a full-inset overlay makes invisibly.
                 */
                position: "absolute",
                insetInlineStart: "50%",
                insetBlockStart: "50%",
                transform: "translate(-50%, -50%)",
                display: "grid",
                placeItems: "center",
              },
            },
            mark
          )
    )
  },
})
