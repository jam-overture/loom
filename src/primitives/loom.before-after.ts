import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ASPECT_NAMES, ASPECT_RATIOS } from "./layout.js"
import { color, family, radius, size, space } from "./tokens.js"

/**
 * Two states of one thing, superimposed, with a hard edge between them — the
 * redesign over the old page, the room staged and unstaged, the photograph
 * before the retouch.
 *
 * Ported from Hermes' `before-after`, the last of the three blocks the port map
 * calls atomic. It is atomic for a reason none of the others share: the two
 * regions are not *arranged*, they occupy the same rectangle, and the thing
 * that distinguishes them is a clip. There is no arrangement to name and no
 * child type to repeat, so 0054 has nothing to say here and 0052's second
 * exception — a thing with no interesting interior — is the applicable one.
 *
 * **The two regions are slots, not `beforeUrl` and `afterUrl` props.** 0051 is
 * the whole argument: each side is a region this primitive *places*, so what
 * goes in it is the tree's business. That buys more than tidiness — the before
 * side can be a `loom.media` with its own alt text, and the after side can be a
 * `loom.card` or an `<img>` at a different crop, and neither had to be
 * predicted here. Two URL props would have made every one of those unsayable
 * for the sake of two fewer nodes.
 *
 * **The labels are props, and that is not the same call.** A label is pinned to
 * a corner of a layer that is clipped, so authoring it inside the slot would
 * put it under the wipe and cut it in half. There is exactly one per side, it
 * names the region rather than being its content, and changing it is exactly a
 * `configure` — 0052's fixed-field clause, in the one place on this primitive
 * where it applies.
 *
 * ## What it does not do, and why that is written down rather than faked
 *
 * **It does not drag.** The divider sits where `position` puts it and stays
 * there. A draggable wipe needs a pointer handler, and a handler is a function
 * — not something a tree's JSON props can carry, and not something this library
 * may implement for itself:
 * [0086](../../decisions/0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md)
 * settled that a behavior is a control the runtime builds and a primitive
 * places, and the vocabulary has one member. So this is filed as a second
 * member rather than built, and what ships is the still version, which is what
 * most pages that use this actually are.
 *
 * The two pure-CSS routes were both considered and are both worse than the gap.
 * `resize: horizontal` gives a real drag whose grab area is a sixteen-pixel
 * corner nobody finds, and whose grabber is a browser-drawn artefact no palette
 * can reach. An `<input type="range">` cannot drive a clip at all, because CSS
 * has no way to read an input's value. A handle that looks draggable and is not
 * is the same defect `loom.code` refused when it declined to fake a copy
 * button.
 *
 * **The after side is in the flow and the before side is over it.** The
 * alternative — both layers absolute inside a box with a declared ratio — needs
 * an `aspect` on every use and letterboxes whenever the images disagree with
 * it. This way the band takes its height from the after side, the before side
 * stretches to match, and two images of the same shot line up with nothing
 * declared. `aspect` stays as an override for the case where a fixed band is
 * what a layout wants.
 */

const props = z
  .object({
    /**
     * Where the edge sits, as a percentage across. A rendering of two fixed
     * regions rather than a count of anything: moving it adds no node and
     * removes none, which is the sharper question `docs/primitive-granularity.md`
     * says to ask. Bounded well inside the ends, because a wipe at 0 or 100 is
     * one picture and a `remove` says that better.
     */
    position: z.number().int().min(5).max(95).optional(),
    /** A corner chip naming each state. Omit both for an unlabelled comparison. */
    beforeLabel: z.string().min(1).max(40).optional(),
    afterLabel: z.string().min(1).max(40).optional(),
    /** Forces a band shape. Omitted, the two regions decide their own. */
    aspect: z.enum(ASPECT_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const DEFAULT_POSITION = 50

/**
 * **Everything drawn over the two regions is two-tone**, and the reason is a
 * defect this primitive shipped with for about an hour on 25 August: the
 * divider was a single line in `bg-surface`, on the argument that a palette's
 * paper always contrasts with its ink. It does — with its *ink*, and not with
 * a photograph. Under `bold`, whose surface is near-black, the line laid over a
 * dark screenshot and disappeared, and the two states butted together with no
 * seam between them at all.
 *
 * No palette slot can fix that, because the thing being contrasted against is
 * content this primitive did not choose and cannot sample. What works on any
 * ground is an **edge**: a fill in the palette's surface with a one-pixel ring
 * of its ink around it. On a light photograph under a dark palette the ring's
 * ink is what reads; on a dark photograph it is the surface. One of the two is
 * always visible, whatever is underneath, and the pair costs one `box-shadow`.
 */
const OUTLINED: CSSProperties = {
  background: color("bg-surface"),
  boxShadow: `0 0 0 1px ${color("fg-default")}`,
}

const chip = (label: string, edge: "start" | "end"): ReactNode =>
  createElement(
    "span",
    {
      key: `label-${edge}`,
      style: {
        position: "absolute",
        insetBlockEnd: space(3),
        [edge === "start" ? "insetInlineStart" : "insetInlineEnd"]: space(3),
        paddingBlock: space(1),
        paddingInline: space(3),
        borderRadius: radius("full"),
        ...OUTLINED,
        color: color("fg-default"),
        fontFamily: family("body"),
        fontSize: size(1),
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        pointerEvents: "none",
      },
    },
    label
  )

/** One half of the handle's double chevron, built from two borders and a turn. */
const chevron = (towards: "start" | "end"): ReactNode =>
  createElement("span", {
    key: `chevron-${towards}`,
    "aria-hidden": true,
    style: {
      width: "0.42em",
      height: "0.42em",
      borderInlineStart: `2px solid ${color("fg-default")}`,
      borderBlockStart: `2px solid ${color("fg-default")}`,
      transform: `rotate(${towards === "start" ? "-45deg" : "135deg"})`,
    },
  })

const LAYER: CSSProperties = {
  position: "absolute",
  insetBlock: "0",
  insetInline: "0",
  display: "flex",
}

export const loomBeforeAfter = definePrimitive({
  type: "loom.before-after",
  description:
    "Two states of one thing superimposed, wiped at a fixed position — a before region and an after region, each with an optional corner label.",
  props,
  slots: ["before", "after"],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const position = given.position ?? DEFAULT_POSITION
    const aspect = given.aspect

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          position: "relative",
          isolation: "isolate",
          overflow: "hidden",
          width: "100%",
          borderRadius: radius("md"),
          background: color("bg-surface-muted"),
          ...(aspect === undefined ? {} : { aspectRatio: ASPECT_RATIOS[aspect] }),
        },
      },
      /**
       * In the flow, so it is what gives the band its height — and first, so
       * the before side stacks over it without either needing a z-index.
       */
      createElement(
        "div",
        {
          key: "after",
          style:
            aspect === undefined
              ? { display: "flex", width: "100%" }
              : { ...LAYER, position: "absolute" },
        },
        loom.slots["after"]
      ),
      createElement(
        "div",
        {
          key: "before",
          style: {
            ...LAYER,
            /**
             * A clip rather than a width: the layer keeps its full size, so the
             * picture inside it is the same picture at the same scale as the
             * one underneath. Narrowing the box instead would squeeze or crop
             * the before side and the two would no longer be comparable, which
             * is the entire point of putting them on top of each other.
             */
            clipPath: `inset(0 ${100 - position}% 0 0)`,
          },
        },
        loom.slots["before"]
      ),
      createElement(
        "div",
        {
          key: "divider",
          "aria-hidden": true,
          style: {
            position: "absolute",
            insetBlock: "0",
            insetInlineStart: `${position}%`,
            width: "2px",
            marginInlineStart: "-1px",
            ...OUTLINED,
            pointerEvents: "none",
          },
        },
        createElement(
          "span",
          {
            style: {
              position: "absolute",
              insetBlockStart: "50%",
              insetInlineStart: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.3em",
              width: "2.6em",
              height: "2.6em",
              borderRadius: radius("full"),
              ...OUTLINED,
              fontSize: size(3),
            },
          },
          chevron("start"),
          chevron("end")
        )
      ),
      given.beforeLabel === undefined ? null : chip(given.beforeLabel, "start"),
      given.afterLabel === undefined ? null : chip(given.afterLabel, "end")
    )
  },
})
