import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { anchorAttributes, anchorSchema, anchorStyle } from "./anchor.js"
import { backdropLayers, PAINT_NAMES } from "./backdrop.js"
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
     * What is painted behind the content: nothing, one of the five paints in
     * `backdrop.ts`, or a bordered surface panel.
     *
     * The five came from here — for eighty-nine primitives this was the only
     * thing on a page that could paint anything behind its content — and they
     * now live in `backdrop.ts` so `loom.backdrop` can put the same atmosphere
     * behind any band. **This prop stays** rather than deferring to that
     * wrapper, and for a reason rather than for compatibility: a hero's paint
     * has to sit inside the hero's own padding and be clipped by its own edges,
     * and a wrapper is outside both.
     *
     * `none` and `panel` are this primitive's alone. `panel` is a surface with
     * a border rather than a painted layer, and `none` is the default a band
     * that leads with its words wants — neither is a paint, which is why the
     * enum is spelled out here instead of being `PAINT_NAMES` plus two.
     */
    backdrop: z.enum(["none", ...PAINT_NAMES, "panel"]).optional(),
    align: z.enum(["start", "center"]).optional(),
    /** `tall` holds the fold — a landing hero — rather than sizing to its copy. */
    stature: z.enum(["standard", "tall"]).optional(),
    eyebrow: z.string().min(1).max(60).optional(),
    /** The name this band answers to, so a link on the page can point at it — usually `top`. */
    anchor: anchorSchema.optional(),
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
 * The paints are `backdrop.ts`'s, shared with `loom.backdrop`. What stays here
 * is the mapping from this primitive's wider enum — which also carries `none`
 * and `panel`, neither of them a painted layer — onto that vocabulary.
 *
 * They are layers rather than a background on the section itself because
 * `aurora` needs two independently animated fields and every other paint needs
 * to fade out before it reaches the copy, neither of which a single background
 * property can express.
 */
const heroLayers = (backdrop: NonNullable<Props["backdrop"]>): readonly ReactNode[] =>
  backdrop === "none" || backdrop === "panel" ? [] : [...backdropLayers(backdrop)]

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
        ...anchorAttributes(given.anchor),
        style: {
          ...anchorStyle(given.anchor),
          position: "relative",
          isolation: "isolate",
          overflow: "hidden",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: centred && media === undefined ? "center" : "flex-start",
          gap: space(6),
          /** No stylesheet resets these, so padding would otherwise widen the band past its parent. */
          boxSizing: "border-box",
          width: "100%",
          minHeight: given.stature === "tall" ? "78vh" : "auto",
          paddingBlock: space(8),
          paddingInline: backdrop === "none" ? "0" : space(6),
          ...(backdrop === "panel" ? PANEL : {}),
        },
      },
      libraryStylesheet(),
      ...heroLayers(backdrop),
      text,
      media === undefined
        ? null
        : rise(3, media, { flex: "1 1 22rem", minWidth: "min(100%, 18rem)" })
    )
  },
})
