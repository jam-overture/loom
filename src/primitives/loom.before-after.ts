import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import { ADJUST_PROPERTY, ADJUST_RESTING_PROPERTY } from "../render/behaviour.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ASPECT_NAMES, ASPECT_RATIOS } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space } from "./tokens.js"

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
 * ## It drags, and the paragraph that said it could not was wrong for 29 days
 *
 * This file argued at length that a draggable wipe was impossible, and every
 * clause of the argument was true except the one it turned on:
 *
 * > *"a behaviour is a control the runtime builds and a primitive places, and
 * > the vocabulary has one member. So this is filed as a second member rather
 * > than built."*
 *
 * The vocabulary reached two members on 25 August and
 * [0096](../../decisions/0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md)
 * landed the third — `adjust` — on 1 September, **named for this primitive in
 * its own Context**, with a `clip-path` on an `.after` layer as its worked
 * example and a docstring saying the `var()` fallback *"should be the position
 * the primitive's own props declared"*. Nobody placed it. On 29 September
 * `Loom lessons` measured the vocabulary against the library and found three of
 * five members with no declaring primitive; this is the first of the three.
 *
 * Placing it is four lines and one of them is the interesting one:
 *
 * 1. The control goes in **the root**, because `adjust` publishes its number as
 *    a custom property and a property resolves by inheritance — downwards only.
 *    On its own element it would be readable by nothing.
 * 2. The clip reads `var(--loom-adjust, <position>)`, and **the fallback is the
 *    prop**. That is the whole of why this is additive: the property does not
 *    exist until the control has mounted and proved scripting runs, so a page
 *    served without it is the still comparison at the position the tree asked
 *    for — which is what most pages using this are, and what shipped before.
 * 3. The divider's offset reads the same value, so the seam and the handle
 *    travel together.
 * 4. The slider's own position is a rule, because a control paints itself inline
 *    and the class the runtime stamps on it is the only handle a primitive has
 *    (`control.ts`).
 *
 * The two pure-CSS routes this file rejected are still rejected and the reasons
 * are unchanged — `resize: horizontal` gives a grab area nobody finds, and CSS
 * alone cannot read an input's value. The second of those is exactly the gap a
 * behaviour fills: the value is read in a component and written where a
 * stylesheet can reach it.
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
  background: colour("bg-surface"),
  boxShadow: `0 0 0 1px ${colour("fg-default")}`,
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
        color: colour("fg-default"),
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
      borderInlineStart: `2px solid ${colour("fg-default")}`,
      borderBlockStart: `2px solid ${colour("fg-default")}`,
      transform: `rotate(${towards === "start" ? "-45deg" : "135deg"})`,
    },
  })

const LAYER: CSSProperties = {
  position: "absolute",
  insetBlock: "0",
  insetInline: "0",
  display: "flex",
}

/**
 * The slider's name, which is this primitive's rather than the tree's (0055),
 * and travels into every deployment where a dictionary may translate it (0063).
 * A range input with no accessible name is announced as a bare "slider", which
 * is why the seam drops a control whose key resolves to a blank rather than
 * rendering it nameless.
 */
const BEFORE_AFTER_TEXT = { adjust: "Wipe position" } as const

type BeforeAfterTextKey = keyof typeof BEFORE_AFTER_TEXT

export const loomBeforeAfter = definePrimitive({
  type: "loom.before-after",
  description:
    "Two states of one thing superimposed, wiped by a slider the reader drags — a before region and an after region, each with an optional corner label.",
  props,
  slots: ["before", "after"],
  copy: ["beforeLabel", "afterLabel"],
  text: BEFORE_AFTER_TEXT,
  behaviours: ["adjust"],
  /**
   * It renders a target the reader aims at, which it never did before. The
   * registry refuses a primitive that takes a control without saying so, and
   * that check is what keeps a draggable comparison out of a linked card —
   * where the drag and the link would fight over every pointer press.
   */
  interactive: "always",
  component: ({
    loom,
    props: given,
  }: LoomPrimitiveProps<Props, BeforeAfterTextKey, "adjust">) => {
    const position = given.position ?? DEFAULT_POSITION
    const aspect = given.aspect

    /**
     * The one expression both the clip and the divider read, written once so
     * they cannot drift. The fallback is the declared position rather than
     * `ADJUST_RESTING`: the property is absent until the reader has moved the
     * slider, and what a page nobody has touched must show — scripting or no
     * scripting — is the comparison the tree asked for.
     */
    const wipe = `var(${ADJUST_PROPERTY}, ${position})`

    return createElement(
      "div",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.beforeAfter,
        style: {
          position: "relative",
          isolation: "isolate",
          overflow: "hidden",
          width: "100%",
          borderRadius: radius("md"),
          background: colour("bg-surface-muted"),
          /**
           * The same number the clip falls back to, written where the slider can
           * read it, so the handle arrives at the declared position rather than
           * at the runtime's midpoint. Declared on the root because that is
           * where the control is placed; see `ADJUST_RESTING_PROPERTY` and 0226.
           */
          [ADJUST_RESTING_PROPERTY]: position,
          ...(aspect === undefined ? {} : { aspectRatio: ASPECT_RATIOS[aspect] }),
        },
      },
      libraryStylesheet(),
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
            clipPath: `inset(0 calc(100% - ${wipe} * 1%) 0 0)`,
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
            insetInlineStart: `calc(${wipe} * 1%)`,
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
      given.afterLabel === undefined ? null : chip(given.afterLabel, "end"),
      /**
       * Last in the markup and a **direct child of the root**, which is the one
       * placement that works: `adjust` writes its property on the element it
       * finds itself in, and the two things that read it — the before layer's
       * clip and the divider's offset — are the root's other children. A wrapper
       * around it, for a tidier corner, would publish the number somewhere
       * neither of them inherits from.
       *
       * Last rather than first because a reader tabbing through a band reaches
       * the comparison before the control that changes it, and because the
       * labels are `pointer-events: none` chips that must not sit over it.
       */
      loom.behaviours.adjust
    )
  },
})
