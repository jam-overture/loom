import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GROUND_NAMES, groundLayers } from "./ground.js"
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

const BACKDROP_NAMES = [...GROUND_NAMES, "panel"] as const

const props = z
  .object({
    /**
     * What is painted behind the content. Genuinely different renderings rather
     * than shades of one: nothing, two drifting colour fields, a ruled grid, a
     * dot matrix, a fan of beams, or a bordered surface panel.
     *
     * Four of the six are `ground.ts`'s, shared with `loom.backdrop` — which is
     * why `dots` and `rays` arrived here without anybody writing them for a
     * hero. `panel` stays local: it is a *surface* the band paints on itself
     * rather than a layer behind it, and it is the one member of this enum that
     * changes the band's own padding and border.
     */
    backdrop: z.enum(BACKDROP_NAMES).optional(),
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
 * The backdrop, as decoration behind the content rather than as a background on
 * the section itself: `aurora` needs two independently animated fields and the
 * ruled grounds need to fade out before their own edges, neither of which a
 * single background property can express.
 *
 * The layers themselves moved to `ground.ts` on 29 August, unchanged, so that
 * `loom.backdrop` could put any band on the same ground. What stayed here is
 * `panel`, which is not a layer at all — see the note on the enum.
 */
const backdropLayers = (backdrop: NonNullable<Props["backdrop"]>): readonly ReactNode[] =>
  backdrop === "panel" ? [] : groundLayers(backdrop)

const PANEL: CSSProperties = {
  background: colour("bg-surface"),
  border: `1px solid ${colour("border-subtle")}`,
  borderRadius: radius("lg"),
}

/**
 * **The content is positioned, and until 29 August it was not — which meant the
 * ground was painted over the headline rather than behind it.**
 *
 * CSS paints positioned descendants after the inline content of unpositioned
 * ones, whatever their document order. So an `aurora` field — absolutely
 * positioned, and given a stacking context of its own by its `opacity` — landed
 * *on top of* a text column that asked for no position at all, and the hero's
 * headline was reading through a 32% wash of `accent-strong`. Under `bold`,
 * whose `accent-strong` is a saturated gold, that is a visible tint across the
 * first thing on the page; a contrast measurement of the palette slots would
 * never find it, because nothing is wrong with the two colours.
 *
 * One declaration fixes it, and the fix is exactly what the word means: the
 * content is positioned too, so document order decides, and the content comes
 * last. Nothing about the layout moves — `position: relative` with no offsets
 * changes no box.
 */
const ABOVE_THE_GROUND: CSSProperties = { position: "relative" }

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
          ...ABOVE_THE_GROUND,
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
      ...backdropLayers(backdrop),
      text,
      media === undefined
        ? null
        : rise(3, media, {
            ...ABOVE_THE_GROUND,
            flex: "1 1 22rem",
            minWidth: "min(100%, 18rem)",
          })
    )
  },
})
