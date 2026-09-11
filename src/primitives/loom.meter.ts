import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"

/**
 * How much of a thing there is, drawn rather than typeset.
 *
 * `loom.stat` is the primitive beside this one and it is not this one. A stat
 * is a figure a reader takes on trust — *4 delta operations*, *100% reversible*
 * — and its job is typography. A meter is a **proportion against a whole**, and
 * the whole is what makes it worth drawing: *nineteen of twenty proposals
 * landed unchanged* says something in a bar that the same sentence in a heading
 * does not, because the bar shows the twentieth. The port map's collapse rule
 * is the test — two blocks that want different *markup* rather than different
 * words are two primitives — and a track with a fill in it is markup no
 * arrangement of stats produces.
 *
 * Hermes has no ancestor for it, and the gap is the same shape as `loom.kbd`'s:
 * a creator profile states its numbers, and a page selling a tool has to show
 * its numbers against a ceiling.
 *
 * ## What is a prop here, and the one that nearly was not
 *
 * Every field is a fixed field of one record — one value, one label, one
 * readout — so 0052's second half applies unchanged and none of them is a delta
 * in disguise. `shape` is the one worth arguing: it decides whether the
 * proportion is drawn as a bar or as a ring, which is two renderings of exactly
 * the same content, and 0052 keeps a prop that selects among a closed set of
 * renderings. Changing it changes no node, which is the sharper question the
 * granularity doc asks.
 *
 * ## Why the number is drawn from `value` and read from `readout`
 *
 * `value` is a number because a bar cannot be drawn from *"most of them"*.
 * `readout` is free text because `loom.tier` learned over a year of real pages
 * that formatting a figure is the author's decision — *94%*, *19 of 20*, *3.4
 * of 5* are all the same bar and none of them is a rendering this library should
 * be inventing on an author's behalf. Absent, it is the value as a percentage,
 * which is the only formatting that is always true of the number given.
 */

const props = z
  .object({
    /** The proportion, out of a hundred. What is drawn, never what is read. */
    value: z.number().min(0).max(100),
    label: z.string().min(1).max(80),
    /** The figure beside the label. Defaults to the value as a percentage. */
    readout: z.string().min(1).max(24).optional(),
    caption: z.string().min(1).max(160).optional(),
    /** A bar in a column of measures, or a ring where one measure stands alone. */
    shape: z.enum(["bar", "ring"]).optional(),
    /** `neutral` for a measure that is reporting rather than boasting. */
    tone: z.enum(["accent", "neutral"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * **Never `given.value.toFixed()`.** The conformance probe renders every
 * primitive under `{}` before it renders it under anything else (0075), so a
 * component reaches for a method on a prop that is not there and throws where a
 * render is supposed to be total (0008). The schema says this is a number and
 * the probe is the one caller for which that is not yet true, which is exactly
 * the case a type cannot catch.
 */
const proportion = (value: number): number =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0

const CENTRE = "50%"

/**
 * The hole is cut with a mask rather than covered with a smaller disc, for the
 * reason `loom.hero`'s aurora gives: a disc on top has to be painted the colour
 * of whatever is behind the band, and a primitive cannot know it — the same
 * ring sits on the canvas, inside a card, and on a tinted section. A mask
 * removes the middle instead, so the page shows through it under every palette
 * and every parent.
 */
const RING_HOLE = "radial-gradient(closest-side, transparent 64%, black 65%)"

export const loomMeter = definePrimitive({
  type: "loom.meter",
  description:
    "A proportion drawn as a bar or a ring — how much of a whole, with its label and its figure.",
  props,
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const percent = proportion(given.value)
    const readout = given.readout ?? `${Math.round(percent)}%`
    const fill = colour(given.tone === "neutral" ? "fg-muted" : "accent")
    const ring = given.shape === "ring"

    /**
     * `role="meter"` rather than `progressbar`: this is a measurement that is
     * true now, not a task getting closer to done. The name is the label's own
     * string rather than a reference to the element carrying it — a node's id
     * belongs to the editor (0051) and is absent from a published page, so
     * `aria-labelledby` would name nothing exactly where it matters.
     */
    const gauge = (
      className: string | undefined,
      style: Record<string, string>,
      children: ReactNode = null
    ): ReactNode =>
      createElement(
        "div",
        {
          role: "meter",
          "aria-valuenow": percent,
          "aria-valuemin": 0,
          "aria-valuemax": 100,
          "aria-valuetext": readout,
          "aria-label": given.label,
          ...(className === undefined ? {} : { className }),
          style,
        },
        children
      )

    /**
     * The one value that is per-node, written once and read by both shapes: the
     * bar's width and the ring's conic stop are the same number, so they are the
     * same declaration and they fill in step. Everything else about the fill —
     * that it grows on entry, how long it takes, and that it does not move at
     * all for a reader who asked for calm — is in the stylesheet, which is where
     * 0055 requires it and the only place a reduced-motion rule can reach.
     */
    const sweep = { "--loom-meter-sweep": `${percent}%` }

    const track = gauge(
      undefined,
      {
        height: space(2),
        width: "100%",
        borderRadius: radius("full"),
        background: colour("bg-surface-muted"),
        overflow: "hidden",
      },
      createElement("div", {
        className: LIBRARY_CLASS.meterFill,
        style: {
          ...sweep,
          height: "100%",
          background: fill,
          borderRadius: radius("full"),
        },
      })
    )

    /** A conic gradient with its middle cut out, per `RING_HOLE` above. */
    const dial = gauge(LIBRARY_CLASS.meterArc, {
      ...sweep,
      position: "absolute",
      inset: "0",
      borderRadius: CENTRE,
      background: `conic-gradient(${fill} var(--loom-meter-sweep), ${colour("bg-surface-muted")} 0)`,
      maskImage: RING_HOLE,
      WebkitMaskImage: RING_HOLE,
    })

    const figure = createElement(
      "span",
      {
        style: {
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: ring ? size(4) : size(3),
          lineHeight: 1,
          color: colour("fg-default"),
          /** A figure that changes width mid-fill jitters against its own label. */
          fontVariantNumeric: "tabular-nums",
          /**
           * `loom.tier`'s lesson about a price, and the phone screenshots found
           * it here the same way: *19 of 20* breaks after *of* the moment the
           * label beside it is long enough, and a figure split over two lines
           * stops reading as a figure. The label wraps instead, which is what a
           * sentence is for.
           */
          textWrap: "nowrap",
        },
      },
      readout
    )

    const words = createElement(
      "div",
      {
        key: "words",
        style: { display: "flex", flexDirection: "column", gap: space(1), minWidth: "0" },
      },
      createElement(
        "span",
        { style: { fontFamily: family("body"), fontSize: size(3), color: colour("fg-default") } },
        given.label
      ),
      given.caption === undefined
        ? null
        : createElement(
            "span",
            { style: { fontFamily: family("body"), fontSize: size(2), color: colour("fg-muted") } },
            given.caption
          )
    )

    if (ring) {
      return createElement(
        "div",
        {
          ...loom.editable,
          style: { display: "flex", alignItems: "center", gap: space(4) },
        },
        libraryStylesheet(),
        createElement(
          "div",
          {
            key: "dial",
            style: { position: "relative", flex: "0 0 auto", width: "5.5rem", aspectRatio: "1" },
          },
          dial,
          createElement(
            "div",
            {
              style: {
                position: "absolute",
                inset: "0",
                display: "grid",
                placeItems: "center",
                /** The readout sits over a hole, so nothing here may eat a pointer aimed past it. */
                pointerEvents: "none",
              },
            },
            figure
          )
        ),
        words
      )
    }

    return createElement(
      "div",
      {
        ...loom.editable,
        style: { display: "flex", flexDirection: "column", gap: space(2) },
      },
      libraryStylesheet(),
      createElement(
        "div",
        {
          key: "head",
          style: {
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: space(3),
          },
        },
        words,
        figure
      ),
      track
    )
  },
})
