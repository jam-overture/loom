import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { anchorAttributes, anchorSchema, anchorStyle } from "./anchor.js"
import { ABOVE_BACKDROP, backdropLayers, PAINT_NAMES } from "./backdrop.js"
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
 * palette or preset would ever vary it — so these stay constants here.
 *
 * **There are two of them, and for eleven weeks there was one.** A single
 * `44rem` capped the heading slot and the lead paragraph together, on the
 * reasoning above, which is a reasoning about *reading*. A display line and a
 * reading line do not want the same measure and never did
 * ([0201](../../decisions/0201-a-display-line-and-a-reading-line-are-two-measures.md)):
 * 704px is 52 characters of a 20px lead and **nineteen** characters of a 72px
 * headline, so the one number that made the paragraph right made the headline
 * a column. The front door's forty-five-character headline set three lines at
 * 1280 and four at 390, and the two actions under it fell below the fold.
 *
 * The clearest evidence that the number was load-bearing in the wrong
 * direction is that another lane compensated for it. `minimal-sans` caps its
 * top step at 72px and says so in its own comment — *"`loom.hero` holds its
 * text to a 44rem measure, so an ambitious top step does not produce a bigger
 * headline, it produces the same headline on four lines"*. A font pack was
 * tuned around a constant in this file. Filed, so the pack's owner can retune
 * now that the constraint has moved.
 */

/**
 * The column, and the headline in it.
 *
 * **A backstop, not a setting**, and that is the whole difference from the
 * number it replaces. A `wide` page gives this band about 980px between its own
 * padding, so at `64rem` — 1024px — the band's edges arrive first and this
 * constant decides nothing there. It bites on a `width: "full"` page and on a
 * viewport wider than the wide page, which are the two places a display line
 * genuinely does run away: 1024px is around 28 characters of a 72px headline,
 * and 28 is a display measure where the 19 the old constant allowed was a
 * column.
 *
 * Every narrower value was tried against the render, because the point of a
 * number here is the line count it produces and that cannot be derived. `56rem`
 * fixes the two 72px packs and leaves `bold-sans`, whose top step is 88px, on
 * three lines — a cap that has stopped binding for two packs and still binds
 * for the third, which is the old defect with a better number in it. `60rem`
 * fixes all three and is still inside the band. `64rem` is the first value that
 * is not the constraint on a `wide` page at all, and it is the one that makes
 * this a measure rather than a layout decision taken on the font pack's behalf.
 *
 * It is still absolute, and the unit is the honest part of the compromise. The
 * right unit for a display measure is the headline's own characters, and this
 * element cannot count them: the cap sits on a wrapper around the `heading`
 * slot, the slot's content is any node at all, and its size is
 * `loom.heading`'s business rather than this primitive's. A `ch` here would be
 * the *body* font's character, which is a worse lie than a length.
 */
const DISPLAY_MEASURE = "64rem"

/**
 * The lead paragraph, and it is the old number kept deliberately.
 *
 * `44rem` is 52 to 56 characters of a lead across the three starter packs,
 * which is inside the range a reading measure wants — so the one constant was
 * accidentally correct for the one of its two jobs that nobody complained
 * about. Re-expressing it in `ch`, which is the unit this half genuinely could
 * use, would narrow the lead by 120px under `minimal-sans` and move pixels on
 * every page in the repository to fix nothing that is wrong. Left as a length,
 * and noted rather than changed.
 */
const READING_MEASURE = "44rem"

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
  copy: ["eyebrow"],
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
          maxWidth: media === undefined && centred ? DISPLAY_MEASURE : "100%",
          /** The paints are positioned, so nothing static sits above them. */
          ...ABOVE_BACKDROP,
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
      rise(1, loom.slots["heading"], { maxWidth: DISPLAY_MEASURE }),
      rise(2, children, { maxWidth: READING_MEASURE, color: colour("fg-muted"), fontSize: size(4) }),
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
        : rise(3, media, { flex: "1 1 22rem", minWidth: "min(100%, 18rem)", ...ABOVE_BACKDROP })
    )
  },
})
