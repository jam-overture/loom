import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAP_NAMES, GAPS } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, radius, space } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * A surface holding whatever is put on it, with a region above its content and
 * a region below.
 *
 * The library already had a card — twice — and both are welded to their
 * contents. `loom.feature` is a card whose interior is a glyph, a title and a
 * sentence; `loom.tier` is a card whose interior is a plan. Neither can hold a
 * heading and an image, because their interiors are props. This one's interior
 * is its children, which is the whole difference: a card is a *surface*, and
 * what goes on it is a composition question the tree answers rather than a
 * schema question this primitive answers.
 *
 * That makes it the piece the compose-and-arrange layer was missing. `stack`
 * and `grid` arrange; this is the thing worth arranging, and `loom.grid` over
 * `loom.card` is how every band nobody has ported yet gets built before anybody
 * ports it.
 *
 * **The two regions are regions, not children, because the card places them
 * differently** — which is 0051's test, and both pass it plainly:
 *
 * - **`media`** sits *outside* the padding, flush to the card's edges and
 *   clipped to its corners. That is the whole visual difference between a card
 *   with a picture in it and a card that looks like a product. It cannot be
 *   "the first child" — a rule that the first child gets no padding is a rule
 *   no schema states and every `move` breaks.
 * - **`footer`** is pushed to the bottom of the card and separated by a rule,
 *   so a row of cards of unequal length still has its actions on one line. That
 *   is `margin-top: auto`, which only means anything to a child the parent has
 *   singled out.
 *
 * The padding lives on an inner element rather than on the card itself, so the
 * media region needs no negative margin to escape it. Bleeding content back out
 * of a padded box is the usual way this is done and it is brittle exactly where
 * this is not: it depends on the two values staying equal.
 *
 * A linked card should not contain a link. The renderer is total (0008) and
 * will happily nest one, and the browser will render something no one can
 * click. This primitive still cannot prevent it — but it can now *say* it: the
 * `interactive` declaration below is what a deployment's Gate policy reads to
 * refuse the change that would produce it (0064). The declaration is the whole
 * of this module's part in that; nothing here is read at render time.
 */

const props = z
  .object({
    /**
     * Four treatments, and the same distinction `loom.badge` draws: `surface`
     * is the ordinary raised-off-the-page card, `outline` is a card that has
     * to sit on a surface without fighting it, `accent` is the one card in a
     * row that is not like the others, and `plain` is a card that is only a
     * card because of what it holds.
     */
    tone: z.enum(["surface", "outline", "accent", "plain"]).optional(),
    padding: z.enum(GAP_NAMES).optional(),
    /** The whole card is the link. See the note above about what it may then hold. */
    href: linkUrlSchema.optional(),
    /** `raised` responds to a pointer. Defaults to raised when the card is a link. */
    elevation: z.enum(["flat", "raised"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const TONES = {
  surface: { background: colour("bg-surface"), borderColor: colour("border-subtle") },
  outline: { background: "transparent", borderColor: colour("border-default") },
  accent: { background: colour("accent-subtle"), borderColor: colour("border-accent") },
  plain: { background: "transparent", borderColor: "transparent" },
} as const

/**
 * The body's own gap is fixed at one step rather than being a fifth prop. A
 * card whose heading, sentence and action need some other rhythm has a
 * `loom.stack` for that, and the card would only be passing the prop along —
 * a prop that exists to be forwarded is a prop that belongs to the thing it is
 * forwarded to.
 */
const BODY_GAP = space(3)

const region = (key: string, style: CSSProperties, children: ReactNode): ReactNode =>
  createElement("div", { key, style }, children)

export const loomCard = definePrimitive({
  type: "loom.card",
  description:
    "A surface holding whatever is put on it, with a full-bleed media region above and a footer pinned below.",
  props,
  /** The root becomes the anchor when the tree gives it a destination (0064). */
  interactive: { whenProps: ["href"] },
  slots: ["media", "footer"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const linked = given.href !== undefined
    const raised = given.elevation === undefined ? linked : given.elevation === "raised"
    const padding = GAPS[given.padding ?? "loose"]

    const media = loom.slots["media"]
    const footer = loom.slots["footer"]

    return createElement(
      linked ? "a" : "div",
      {
        ...loom.editable,
        ...(linked ? { href: given.href } : {}),
        className: raised ? LIBRARY_CLASS.lift : undefined,
        style: {
          ...TONES[given.tone ?? "surface"],
          display: "flex",
          flexDirection: "column",
          height: "100%",
          /** Clips the media region to the card's corners; the reason it can be flush. */
          overflow: "hidden",
          border: "1px solid",
          borderRadius: radius("lg"),
          color: colour("fg-default"),
          textDecoration: "none",
        },
      },
      libraryStylesheet(),
      media === undefined ? null : region("media", { display: "flex", flexDirection: "column" }, media),
      children === null
        ? null
        : region(
            "body",
            {
              display: "flex",
              flexDirection: "column",
              /**
               * Stretch, not `flex-start`. `loom.feature` starts its column
               * because it knows it holds a glyph, a title and a sentence; this
               * one holds whatever the tree put on it, and a nested grid, a
               * divider or an image that shrank to its own content width would
               * be a card that lays out differently depending on what is in it.
               * The things that must not stretch already say so themselves —
               * `loom.action` sets its own `align-self`.
               */
              alignItems: "stretch",
              gap: BODY_GAP,
              padding,
              /** Takes the slack, so a footer below it lands on the card's floor. */
              flex: "1 1 auto",
            },
            children
          ),
      footer === undefined
        ? null
        : region(
            "footer",
            {
              display: "flex",
              flexDirection: "column",
              gap: BODY_GAP,
              padding,
              marginTop: "auto",
              borderTop: `1px solid ${colour("border-subtle")}`,
            },
            footer
          )
    )
  },
})
