import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, motion, radius, size, space } from "./tokens.js"

/**
 * The first thing on a page, and the primitive that decides whether this
 * library reads as a product or as a UI kit.
 *
 * It is the port's answer to Hermes' eleven hero *variants*, which were eleven
 * registered documents each with their own field list — a gradient hero
 * declared `from`, `to` and `via`, an image hero declared a URL, and the page
 * chose one by kind. Here the choice is a single `backdrop` enum on one
 * primitive, for the reason 0052 gives about display modes: a variant that
 * changes only what is painted behind the same content is a prop, not a
 * separate type, and a model swapping it emits one `configure` rather than
 * replacing the node and every child underneath it.
 *
 * What the enum notably does not carry is colour. Hermes' gradient variants
 * took raw hex from the page author; here `aurora` reads the palette's accent
 * and secondary, so re-theming a page re-themes its hero (0049). That is the
 * whole difference between a variant a model configures and a canvas it paints.
 *
 * The entrance animation is not reachable from the tree at all. It lives in the
 * stylesheet this primitive emits, and the tree says only what the copy is and
 * which backdrop to use — props are JSON, so behaviour stays in the registered
 * component where a reviewer approved it once, rather than arriving per-node in
 * a proposal.
 */

const props = z
  .object({
    /**
     * What is painted behind the content. Four genuinely different renderings,
     * not four shades of one: nothing, two drifting colour fields, a ruled
     * grid that fades at the edges, or a bordered surface panel.
     */
    backdrop: z.enum(["none", "aurora", "grid", "panel"]).optional(),
    align: z.enum(["start", "center"]).optional(),
    /** `tall` holds the fold — a landing hero — rather than sizing to its copy. */
    stature: z.enum(["standard", "tall"]).optional(),
    eyebrow: z.string().min(1).max(60).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * A hero's text column stops well short of the page's measure: a headline set
 * across 68 characters reads as a paragraph. This is layout, not theme — no
 * palette or preset would ever vary it — so it stays a constant here.
 */
const TEXT_MEASURE = "44rem"

/** Each row of content enters one `--loom-motion-fast` after the row above it. */
const stagger = (order: number): CSSProperties =>
  order === 0 ? {} : { animationDelay: `calc(${motion("fast")} * ${order})` }

const rise = (order: number, content: ReactNode, extra: CSSProperties = {}): ReactNode =>
  content === undefined || content === null
    ? null
    : createElement(
        "div",
        { className: LIBRARY_CLASS.rise, style: { ...stagger(order), ...extra } },
        content
      )

/**
 * Backdrop layers are `aria-hidden` and `pointer-events: none` decoration
 * behind the content, never a background on the section itself: `aurora` needs
 * two independently animated fields, and `grid` needs to fade out at the edges,
 * neither of which a single background property can express.
 */
const backdropLayers = (backdrop: NonNullable<Props["backdrop"]>): readonly ReactNode[] => {
  if (backdrop === "aurora") {
    /**
     * A solid colour behind a radial *mask*, rather than a radial gradient that
     * fades to `transparent`. Fading to `transparent` interpolates towards
     * transparent black, so an accent field greys out on its way to nothing and
     * the element's own square edge stays visible where the gradient has not
     * finished. A mask fades opacity alone, so the colour is the palette's to
     * the last pixel and the field is genuinely round.
     */
    const FADE = "radial-gradient(closest-side, black 0%, transparent 100%)"

    /**
     * Each field sits *inside* the band and its mask reaches zero at its own
     * edges, so the section's `overflow: hidden` never cuts through anything
     * still bright. A field hung off the corner on negative insets is the
     * obvious way to write this and it renders as a rectangle with two hard
     * sides — the clip crossing the middle of the glow.
     */
    const field = (slot: "accent" | "brand-secondary", position: CSSProperties): ReactNode =>
      createElement("div", {
        key: slot,
        className: LIBRARY_CLASS.aurora,
        "aria-hidden": true,
        style: {
          position: "absolute",
          width: "min(46rem, 78%)",
          height: "min(46rem, 100%)",
          background: colour(slot),
          maskImage: FADE,
          WebkitMaskImage: FADE,
          opacity: 0.32,
          pointerEvents: "none",
          ...position,
        },
      })

    return [
      field("accent", { insetInlineStart: "0", insetBlockStart: "0" }),
      /** Started part-way through the cycle so the two fields never move in step. */
      field("brand-secondary", {
        insetInlineEnd: "0",
        insetBlockEnd: "0",
        animationDelay: `calc(${motion("slow")} * -8)`,
      }),
    ]
  }

  if (backdrop === "grid") {
    const lines = `repeating-linear-gradient(to right, ${colour("border-subtle")} 0 1px, transparent 1px 5rem), repeating-linear-gradient(to bottom, ${colour("border-subtle")} 0 1px, transparent 1px 5rem)`
    const fade = "radial-gradient(ellipse at 50% 0%, black 0%, transparent 72%)"

    return [
      createElement("div", {
        key: "grid",
        "aria-hidden": true,
        style: {
          position: "absolute",
          inset: "0",
          background: lines,
          maskImage: fade,
          WebkitMaskImage: fade,
          pointerEvents: "none",
        },
      }),
    ]
  }

  return []
}

const PANEL: CSSProperties = {
  background: colour("bg-surface"),
  border: `1px solid ${colour("border-subtle")}`,
  borderRadius: radius("lg"),
}

export const loomHero = definePrimitive({
  type: "loom.hero",
  description:
    "The opening band of a page: heading, supporting copy, actions, and an optional media region, over a chosen backdrop.",
  props,
  slots: ["heading", "actions", "media"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const backdrop = given.backdrop ?? "none"
    const centred = given.align === "center"
    const media = loom.slots["media"]

    const text = createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: centred ? "center" : "flex-start",
          textAlign: centred ? "center" : "start",
          gap: space(4),
          flex: `1 1 ${media === undefined ? "100%" : "26rem"}`,
          maxWidth: media === undefined && centred ? TEXT_MEASURE : "100%",
        },
      },
      given.eyebrow === undefined
        ? null
        : rise(
            0,
            createElement(
              "span",
              {
                style: {
                  display: "inline-block",
                  paddingBlock: space(1),
                  paddingInline: space(3),
                  border: `1px solid ${colour("border-accent")}`,
                  borderRadius: radius("full"),
                  fontSize: size(1),
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: colour("accent"),
                },
              },
              given.eyebrow
            )
          ),
      rise(1, loom.slots["heading"], { maxWidth: TEXT_MEASURE }),
      rise(2, children, { maxWidth: TEXT_MEASURE, color: colour("fg-muted"), fontSize: size(4) }),
      rise(3, loom.slots["actions"], {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: centred ? "center" : "flex-start",
        gap: space(3),
        paddingBlockStart: space(2),
      })
    )

    return createElement(
      "section",
      {
        ...loom.editable,
        style: {
          position: "relative",
          isolation: "isolate",
          overflow: "hidden",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: centred && media === undefined ? "center" : "flex-start",
          gap: space(6),
          width: "100%",
          minHeight: given.stature === "tall" ? "78vh" : "auto",
          paddingBlock: space(8),
          paddingInline: backdrop === "none" ? "0" : space(6),
          ...(backdrop === "panel" ? PANEL : {}),
        },
      },
      libraryStylesheet(),
      ...backdropLayers(backdrop),
      text,
      media === undefined
        ? null
        : rise(3, media, { flex: "1 1 22rem", minWidth: "min(100%, 18rem)" })
    )
  },
})
