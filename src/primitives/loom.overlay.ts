import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAPS, GAP_NAMES } from "./layout.js"
import { colour, radius } from "./tokens.js"

/**
 * A ground with content set over it: a headline across a photograph, a label on
 * a gallery tile, a caption over a product shot.
 *
 * ## What was missing, and it is more basic than it sounds
 *
 * Across eighty-nine primitives **nothing could put a word on top of a
 * picture.** `loom.card` puts its media region *above* the copy;
 * `loom.split` puts it *beside*; `loom.media` carries a caption *under*.
 * `loom.frame` and `loom.orbit` superimpose, but each only over a thing it owns
 * — a screenshot, a mark at the centre. There was no general "this, over that",
 * and it is the arrangement a marketing page reaches for most after a row and a
 * grid.
 *
 * It has no row in `docs/hermes-port-map.md` for the usual reason: Hermes' hero
 * variants baked their own image background into a registered block, so the
 * *arrangement* never had to exist separately and the ledger never counted it.
 *
 * ## The ground is a slot, and that is the whole design
 *
 * "The first child is the background and the rest go on top" is a rule no
 * schema states and every edit can break — `loom.section` makes the same
 * argument about its heading, and it is sharper here, because getting it wrong
 * does not misplace a title, it puts the photograph over the words. A slot says
 * it out loud and the catalogue tells a model the region exists
 * ([0051](../../decisions/0051-a-slot-is-a-region-the-primitive-places.md)).
 *
 * The two are laid in **one grid cell** rather than by absolute positioning, so
 * the box is as tall as whichever is taller. Absolute content over a sized
 * ground is the obvious way and it silently clips: a headline that grows on a
 * phone runs out of the bottom of the picture with nothing to push.
 *
 * ## The scrim, and the palette slot it is honestly allowed to use
 *
 * Text on a photograph needs something between it and the photograph, and the
 * first instinct — a dark wash with light text — **cannot be expressed in this
 * theme model**, because no palette slot means "dark whatever the palette is".
 * `bg-overlay` is a *surface*: `#ffffff` under the light palettes and `#1a1a1a`
 * under the dark ones. Reading it as a dark wash would give white-on-white
 * under nine of the starter palettes.
 *
 * So the scrim is `bg-overlay` used as what it is — the page's own overlay
 * surface, laid over the ground at less than full opacity — and the content
 * takes `fg-default`, which is the foreground that slot is guaranteed to pair
 * with. Under a light palette that is a bright veil with dark type; under a
 * dark one a dark veil with light type. Both re-theme correctly, which a
 * hard-coded black wash would not (0049), and the editorial look it produces is
 * a real one rather than a consolation.
 *
 * **What this costs is a genuinely dark cinematic scrim under a light palette**,
 * and that wants a slot the palette does not have. Filed rather than faked with
 * a literal.
 *
 * ## Which way the gradient runs is derived, not declared
 *
 * `scrim: "gradient"` fades from behind the content towards the far side, so
 * the picture stays a picture where nothing is written on it. Nobody has to say
 * which edge: it follows `justify`, because the answer is already in the tree.
 * A `scrimFrom` prop would be a second way to say a thing already said, and the
 * two would drift apart the first time somebody moved the content.
 *
 * It fades by **mask rather than to `transparent`** — the trap `backdrop.ts`
 * documents at length. A gradient ending at `transparent` interpolates towards
 * transparent black, so a white veil greys on its way out and the edge shows.
 */

const PLACEMENTS = ["start", "center", "end"] as const
type Placement = (typeof PLACEMENTS)[number]

const FLEX: Readonly<Record<Placement, string>> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
}

/**
 * The copy follows its own edge. A block pushed to the right of a picture and
 * then set ragged-right against the far side is the arrangement reading as one
 * thing and the type as another.
 */
const TEXT_ALIGN: Readonly<Record<Placement, "start" | "center" | "end">> = {
  start: "start",
  center: "center",
  end: "end",
}

const props = z
  .object({
    /**
     * Across the ground. The names and the axis are `loom.stack`'s, because the
     * content region *is* a column: `align` is the inline axis and `justify`
     * runs down. A fourth vocabulary for left and right is how two containers
     * that look identical in a mock end up two pixels apart.
     */
    align: z.enum(PLACEMENTS).optional(),
    /** Down the ground. Defaults to `end` — the caption sits at the foot of the picture. */
    justify: z.enum(PLACEMENTS).optional(),
    /**
     * What goes between the content and the ground. Three different renderings
     * rather than three strengths of one: nothing at all, an even veil over the
     * whole ground, and a wash behind the content that clears towards the far
     * side. An opacity number instead would be the "tune it a bit" prop that
     * turns a reviewable choice into a value nobody reads in a proposal.
     *
     * **`none` over a photograph is a foot-gun and nothing here can disarm it.**
     * The text colour is the page's and the picture is the author's, so a pale
     * photograph is illegible under a dark palette and a dark one is illegible
     * under a light palette — whichever image is chosen, one of the two starter
     * palettes is wrong. It stays because an overlay over a *palette-derived*
     * ground — a painted backdrop, a card, a flat surface — genuinely wants no
     * wash and is safe, both sides coming from the palette. Closing it properly
     * needs the ground's luminance, which a pure render cannot have: `src` is a
     * URL here and decoding it is a host's job. Filed.
     */
    scrim: z.enum(["none", "veil", "gradient"]).optional(),
    /** How far the content is held off the ground's edges. `loom.card`'s vocabulary. */
    padding: z.enum(GAP_NAMES).optional(),
    /**
     * Rounds the ground, the scrim and the clip together. It is here rather
     * than left to the media inside because the scrim is this primitive's
     * element: a rounded photograph under a square wash shows four bright
     * corners, and no parent can reach in to fix it.
     */
    corners: z.enum(["none", "sm", "md", "lg"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Both children occupy the same cell of a one-by-one grid. */
const CELL: CSSProperties = { gridArea: "1 / 1", minWidth: 0 }

/**
 * The fade runs from behind the content outwards, so `justify: "end"` — content
 * at the foot — clears towards the top. `center` has no far side to clear
 * towards, so it closes in from both edges instead of picking one arbitrarily.
 */
const SCRIM_MASK: Readonly<Record<Placement, string>> = {
  start: "linear-gradient(to bottom, black 0%, transparent 78%)",
  center: "radial-gradient(ellipse 90% 80% at 50% 50%, black 0%, transparent 100%)",
  end: "linear-gradient(to top, black 0%, transparent 78%)",
}

export const loomOverlay = definePrimitive({
  type: "loom.overlay",
  description:
    "Content set over a ground — a headline across a photograph, a label on a tile. The picture goes in the ground slot; its children are what sits on top.",
  props,
  slots: ["ground"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const ground = loom.slots["ground"]
    const justify: Placement = given.justify ?? "end"
    const scrim = given.scrim ?? "gradient"
    const corners =
      given.corners === undefined || given.corners === "none"
        ? {}
        : { borderRadius: radius(given.corners) }

    /**
     * No ground is not an error and does not get a notice: a scrim over nothing
     * is a tinted box, and the content is the part a reader came for. It
     * degrades to its own children on the page's ordinary ground, which is what
     * a half-built node should look like in a portal preview.
     */
    const veiled = ground !== undefined && scrim !== "none"

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "grid",
          isolation: "isolate",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          /**
           * Set here rather than inherited: the ground is usually a photograph,
           * which does not change the text colour, and an overlay inside an
           * `accent` section would otherwise take that band's `fg-on-accent`
           * and put it on this band's veil.
           */
          color: colour("fg-default"),
          ...corners,
        },
      },
      ground === undefined
        ? null
        : createElement(
            "div",
            {
              key: "ground",
              /**
               * The ground is stretched to the cell so a short picture beside
               * tall content fills the box rather than leaving a band of page
               * showing under it.
               */
              style: { ...CELL, zIndex: 0, display: "grid", alignItems: "stretch" },
            },
            ground
          ),
      !veiled
        ? null
        : createElement("div", {
            key: "scrim",
            "aria-hidden": true,
            style: {
              ...CELL,
              zIndex: 1,
              pointerEvents: "none",
              background: colour("bg-overlay"),
              opacity: scrim === "veil" ? 0.78 : 0.92,
              ...(scrim === "veil"
                ? {}
                : {
                    maskImage: SCRIM_MASK[justify],
                    WebkitMaskImage: SCRIM_MASK[justify],
                  }),
            },
          }),
      createElement(
        "div",
        {
          key: "content",
          style: {
            ...CELL,
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: FLEX[given.align ?? "start"],
            justifyContent: FLEX[justify],
            textAlign: TEXT_ALIGN[given.align ?? "start"],
            gap: GAPS.snug,
            boxSizing: "border-box",
            padding: GAPS[given.padding ?? "loose"],
          },
        },
        children
      )
    )
  },
})
