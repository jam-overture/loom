import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAP_NAMES, GAPS } from "./layout.js"
import { linkMark, LINK_MARK_CLEARANCE } from "./link-mark.js"
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
 * **The card asserts no height of its own, and that is a repair.** It set
 * `height: 100%` until 23 August, which cost `Loom marketing` the bottom quarter
 * of a card: three cards as siblings in a `loom.section`, which lays its
 * children out as a flex column, all came out the height of the shortest, and
 * the tallest lost a heading, two rows of a list and the action under it —
 * clipped by the `overflow` this primitive needs for its media region, so with
 * no scrollbar and no diagnostic to find it by.
 *
 * The height was there for the case the card was built for, a row of cards whose
 * footers should land on one line, and it was never the thing producing that: a
 * grid stretches its items to the row and a flex row stretches them to the line,
 * both by default and neither needing to be asked. So the equal heights survive
 * the removal, and a **column** of cards now takes each card's own height, which
 * is what a page that lists things wanted. The general lesson is worth carrying
 * to the next primitive: a child that asserts its own height has overruled the
 * one decision its parent exists to make.
 *
 * The padding lives on an inner element rather than on the card itself, so the
 * media region needs no negative margin to escape it. Bleeding content back out
 * of a padded box is the usual way this is done and it is brittle exactly where
 * this is not: it depends on the two values staying equal.
 *
 * **A linked card says so at rest, which it did not until 27 August.** It used
 * to signal the link by defaulting to `elevation: raised`, and that reasoning
 * was sound as far as it went — the whole tile is the target, so the whole tile
 * responds. What `Loom marketing` measured is that the response is *hover-only*,
 * and hover is absent from every screenshot, every printed page and every
 * visitor on a touch device. Four linked cards on the front door were four
 * paragraphs in boxes to anybody holding a phone, on the one band that is the
 * site's whole onward path.
 *
 * So a linked card carries a corner mark it keeps when nothing is pointing at
 * it, and the hover treatment becomes the second half of a signal rather than
 * the whole of it. Two decisions inside that:
 *
 * - **It is a chip, not a bare glyph.** A card with a media region puts this
 *   over a photograph the primitive did not choose and cannot sample, which is
 *   exactly what beat `loom.before-after`'s divider under `bold` on 25 August. A
 *   solid fill inside a ring reads on a light photograph and on a dark one, and
 *   neither reading depends on knowing the ground.
 * - **The fill is the accent and not the surface**, which the first screenshot
 *   of this decided. Drawn in `bg-surface` inside `border-subtle` the chip is
 *   correct, contrasts with everything, and is nearly invisible on a card that
 *   is itself `bg-surface` — the fill disappears into the card and only a
 *   hairline is left. The accent is the palette's own word for *this responds
 *   to you*, it differs from every card tone by construction, and under `bold`
 *   it is the difference between a mark you find and a mark you notice.
 * - **The glyph inside it is the ink, not the accent**, which the *second*
 *   screenshot decided. An accent arrow on an accent tint is one hue at two
 *   lightnesses, and under `minimal` — whose accent is a pale mint — the arrow
 *   all but vanished inside its own chip. `tokens.ts` says this in general and
 *   it keeps being the thing that bites: where a mark's whole job is to stand
 *   out, reach for a value that contrasts with its ground rather than for a
 *   second token from the same family and a hope that the two differ.
 * - **It reserves its own room rather than floating over the words.** Where
 *   there is no media above it the body takes extra trailing padding, so a
 *   heading's first line stops short of the mark instead of running under it.
 *   Where there is media the mark sits on the picture and the body is untouched,
 *   because a picture has no line to collide with.
 *
 * The glyph points the way a Latin script reads. There is no logical-property
 * equivalent of an arrow, and this library has no right-to-left rendering to be
 * wrong in yet; a page in Arabic would want it mirrored and nothing here does
 * that.
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
          /** No height — see the note above about the column of cards. */
          /** The ground the corner mark is positioned against, and only when there is one. */
          ...(linked ? { position: "relative" } : {}),
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
              /**
               * Room for the corner mark, and only where the mark would
               * otherwise land on the words. A card with a media region draws
               * it over the picture instead, so the body keeps its own padding
               * and the four sides stay even.
               */
              ...(linked && media === undefined
                ? { paddingInlineEnd: LINK_MARK_CLEARANCE }
                : {}),
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
          ),
      /**
       * Last in the markup and first in the corner. It is absolutely
       * positioned, so where it sits among its siblings decides only what it
       * paints over — and painting over the media region is the case it has to
       * win.
       */
      linked ? linkMark() : null
    )
  },
})
