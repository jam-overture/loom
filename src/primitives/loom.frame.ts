import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, monospace, radius, size, space } from "./tokens.js"

/**
 * The chrome a product screenshot sits in: a browser window, an app window, or
 * a phone.
 *
 * It is the largest gap this library had that Hermes could not have had. Hermes
 * sold a *person* — a photograph is a photograph, and a `loom.media` is the
 * whole of what it needs. A page selling **software** has to show the software,
 * and a bare screenshot dropped into a section reads as a stray image every
 * time: the thing that makes it read as a product is the frame around it, which
 * says *this is a running interface* before a single word is read. Every
 * reference landing page for a tool has one and no primitive here could draw
 * it.
 *
 * ## What is a node and what is a prop here
 *
 * **The screen content is a slot.** It is the one region this primitive treats
 * differently from everything else it is handed — clipped to the chrome's inner
 * radius, given the surface ground, and laid *under* the marks — which is
 * exactly what earns a region a name rather than a position in `children`
 * (0051). "The first child is the screenshot" is a rule no schema states and
 * every `move` breaks.
 *
 * **The marks over it are children**, because a page adds, removes and moves
 * them one at a time and each is a `loom.pin` that means the same thing on its
 * own (0052). This is the shape `loom.orbit` already has — a repeated thing in
 * `children`, the singular thing it is arranged around in a slot — and it is
 * the shape the alternative fails: a `hotspots: Hotspot[]` prop is `insert` and
 * `remove` smuggled into a prop bag, and moving one pin would rewrite the whole
 * array as a single `configure` no reviewer could read.
 *
 * `chrome` is a prop and not three primitives, for 0052's display-mode reason:
 * three genuinely different renderings of the same content, selected from a
 * closed set the schema names, so swapping a browser for a phone is one
 * `configure` rather than a `remove` and an `insert` that drops the screenshot
 * and every mark on it.
 *
 * ## The word `frame`
 *
 * `loom.embed` declares `frames: ["src"]`, and that is a different sense of the
 * word: there it names the props whose value reaches an `iframe`, so the
 * runtime knows which string to check against the deployment's origin
 * allowlist. Nothing here loads a document, this primitive declares no framable
 * prop, and what it puts on screen is whatever the tree already put in the
 * slot.
 */

const props = z
  .object({
    /**
     * Three different machines, not three shades of one. `browser` addresses a
     * page, `window` titles a document, `phone` is held in a hand — and a
     * reader takes a different claim from each before reading anything.
     */
    chrome: z.enum(["browser", "window", "phone"]).optional(),
    /**
     * What the chrome says it is showing: an address, a document title, or the
     * name in a phone's status row. It is decoration and is hidden from
     * assistive technology with the rest of the chrome — a fake address bar
     * read out as an address is a page lying to somebody who cannot see it.
     */
    label: z.string().min(1).max(120).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * A phone is the one chrome with a size of its own. A browser frame is as wide
 * as the column it is in; a handset that stretched to fill a 1120px band would
 * be a phone nobody has. It is a layout constant rather than a prop for the
 * reason `loom.hero`'s text measure is one — no palette or preset would vary
 * it, and a parent that wants it narrower has `loom.split` and `loom.grid` to
 * say so with.
 */
const HANDSET_WIDTH = "22rem"

/**
 * A handset's corners are far rounder than any surface in the type scale, and
 * `radius("full")` on a rectangle is a stadium rather than a phone. So this is
 * a length and not a token, which is the one thing `tokens.ts` allows a
 * primitive to write for itself: the rule it enforces is about **colour**, and
 * there is no palette on which a phone has different corners.
 */
const HANDSET_RADIUS = "2.25rem"

/** The bezel, which is ink rather than a border: dark on a light page, light on a dark one. */
const HANDSET_BEZEL = "0.55rem"

const dot = (index: number): ReactNode =>
  createElement("span", {
    key: `dot-${index}`,
    style: {
      width: "0.62rem",
      height: "0.62rem",
      borderRadius: radius("full"),
      background: colour("fg-subtle"),
      /**
       * Opacity rather than a fourth grey. Every palette declares three inks
       * and the third is held to a contrast bar (0074) because it is *text*;
       * a traffic light is not text, and asking the ramp for a step below its
       * floor is how a slot ends up unreadable somewhere it is a sentence.
       */
      opacity: 0.42,
      flex: "0 0 auto",
    },
  })

const TRAFFIC_LIGHTS: ReactNode = createElement(
  "span",
  { key: "lights", style: { display: "inline-flex", gap: space(2), flex: "0 0 auto" } },
  [0, 1, 2].map(dot)
)

/** Three rising bars: the one piece of a status row that says *phone* without words. */
const SIGNAL: ReactNode = createElement(
  "span",
  { key: "signal", style: { display: "inline-flex", alignItems: "flex-end", gap: "0.12rem", flex: "0 0 auto" } },
  [0.3, 0.55, 0.8].map((height, index) =>
    createElement("span", {
      key: `bar-${index}`,
      style: {
        width: "0.16rem",
        height: `${height}rem`,
        borderRadius: radius("sm"),
        background: colour("fg-muted"),
      },
    })
  )
)

const BAR_BASE = {
  display: "flex",
  alignItems: "center",
  gap: space(3),
  paddingBlock: space(2),
  paddingInline: space(3),
  background: colour("bg-surface-muted"),
  borderBlockEnd: `1px solid ${colour("border-subtle")}`,
} as const

const chromeBar = (chrome: NonNullable<Props["chrome"]>, label: string | undefined): ReactNode => {
  if (chrome === "phone") {
    return createElement(
      "div",
      {
        key: "bar",
        "aria-hidden": true,
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space(3),
          paddingBlock: space(2),
          paddingInline: space(4),
          fontFamily: family("body"),
          fontSize: size(1),
          color: colour("fg-muted"),
        },
      },
      createElement("span", { key: "name", style: { flex: "0 1 auto", minWidth: "0" } }, label),
      /**
       * The notch is a sibling of the status row rather than a child of it, so
       * it hangs over the row's middle without pushing the label off centre —
       * and the row keeps its own padding, which is what stops the label
       * running under it.
       */
      createElement("span", {
        key: "notch",
        style: {
          position: "absolute",
          insetBlockStart: "0.35rem",
          insetInlineStart: "50%",
          transform: "translateX(-50%)",
          width: "5.5rem",
          height: "1.05rem",
          borderRadius: radius("full"),
          background: colour("fg-default"),
        },
      }),
      SIGNAL
    )
  }

  if (chrome === "window") {
    return createElement(
      "div",
      { key: "bar", "aria-hidden": true, style: BAR_BASE },
      TRAFFIC_LIGHTS,
      createElement(
        "span",
        {
          key: "title",
          style: {
            flex: "1 1 auto",
            minWidth: "0",
            textAlign: "center",
            fontFamily: family("body"),
            fontSize: size(1),
            color: colour("fg-muted"),
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        label
      ),
      /** A spacer the width of the lights, so a centred title is centred on the bar. */
      createElement("span", { key: "balance", style: { width: "3.1rem", flex: "0 0 auto" } })
    )
  }

  return createElement(
    "div",
    { key: "bar", "aria-hidden": true, style: BAR_BASE },
    TRAFFIC_LIGHTS,
    label === undefined
      ? null
      : createElement(
          "span",
          {
            key: "address",
            style: {
              flex: "1 1 auto",
              minWidth: "0",
              maxWidth: "28rem",
              paddingBlock: space(1),
              paddingInline: space(3),
              background: colour("bg-canvas"),
              border: `1px solid ${colour("border-subtle")}`,
              borderRadius: radius("full"),
              /** An address in the body face reads as a caption; in mono it reads as an address. */
              fontFamily: monospace(),
              fontSize: size(1),
              color: colour("fg-muted"),
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          label
        )
  )
}

export const loomFrame = definePrimitive({
  type: "loom.frame",
  description:
    "A browser, app-window or phone chrome around a product surface. The screen goes in the surface slot; its children are the loom.pin marks placed over it.",
  props,
  slots: ["surface"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const chrome = given.chrome ?? "browser"
    const handset = chrome === "phone"

    return createElement(
      "div",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.frame,
        style: {
          position: "relative",
          overflow: "hidden",
          width: "100%",
          boxSizing: "border-box",
          background: colour("bg-surface"),
          border: handset ? `${HANDSET_BEZEL} solid ${colour("fg-default")}` : `1px solid ${colour("border-subtle")}`,
          borderRadius: handset ? HANDSET_RADIUS : radius("lg"),
          /**
           * A long, low shadow rather than a ring: the frame has to read as
           * lifted off the band it is on under a palette whose surface and
           * canvas are two greys apart, and a border alone cannot say that.
           *
           * There is no shadow slot, so this is `fg-default` at a heavy
           * negative spread — `.loom-lift`'s idiom — and it is worth knowing
           * that this makes it a **shade under a light palette and a halo under
           * a dark one**. That is the right answer for both and it is not the
           * same effect, which only the two screenshots side by side will say.
           */
          boxShadow: `0 32px 64px -44px ${colour("fg-default")}`,
          ...(handset ? { maxWidth: HANDSET_WIDTH, marginInline: "auto" } : {}),
        },
      },
      libraryStylesheet(),
      chromeBar(chrome, given.label),
      createElement(
        "div",
        {
          key: "screen",
          className: LIBRARY_CLASS.frameScreen,
          style: {
            /**
             * The positioned ancestor every pin measures its percentage
             * against. It is inline because nothing varies it — what the
             * stylesheet varies is the *pins layer*, which is an overlay on a
             * laptop and a legend under the screen on a phone.
             */
            position: "relative",
            background: colour("bg-surface-muted"),
            minHeight: space(7),
          },
        },
        loom.slots["surface"],
        createElement("div", { key: "pins", className: LIBRARY_CLASS.framePins }, children)
      )
    )
  },
})
