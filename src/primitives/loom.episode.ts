import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ASPECT_NAMES, ASPECT_RATIOS, type AspectName } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema, mediaUrlSchema } from "./url.js"

/**
 * One thing a reader presses play on: artwork, what it is called, how long it
 * runs, the qualifiers that place it, and a sentence about it.
 *
 * **Four Hermes blocks collapse here** — `video`, `video-playlist`, `playlist`
 * and `podcast-episodes`. Four shapes with four vocabularies, and stacked on
 * top of each other they are one record: *a picture, a title, one or more short
 * qualifiers, a running time, a line of prose, and somewhere that plays it.*
 * `thumbnail` / `image` / `cover` is one field; `link` / `url` / `audioUrl` is
 * one field; `episodeNumber`, `date` and `artist` are the same short qualifier
 * wearing three words.
 *
 * **Why it is not `loom.article` with different words.** The two content models
 * really are close — both are a picture, a name, a sentence and a link — and the
 * port map's own limit on collapsing is the thing that separates them: *when two
 * blocks want different markup rather than different words, they are two
 * primitives.* Three differences, and each one is markup:
 *
 * 1. **An article is a card in a grid; an episode is a row in a list.** A blog
 *    index of twelve pieces reads as a wall of covers. A playlist of twenty-four
 *    tracks does not — nobody has ever wanted their podcast back-catalogue as a
 *    three-column grid of magazine cards, and the reason is that you are
 *    *scanning for one of them*, which wants a column of titles at a single left
 *    edge.
 * 2. **The picture is the control.** An article's cover is decoration you may
 *    omit. An episode's artwork carries the play affordance, which is where a
 *    reader aims and the one piece of the card that has to say *this is
 *    playable* before anything is read.
 * 3. **A running time has a fixed home.** Every player ever built puts it in the
 *    trailing corner of the artwork, and nothing else on the card can go there.
 *
 * ## What became nodes
 *
 * **`episodeNumber`, `date`, `artist`, and whatever the fifth one turns out to
 * be** — `loom.badge` nodes in the `meta` region, which is 0052's opening clause
 * and the call `loom.offering` made about its nine qualifier fields. The test is
 * not *is there exactly one of this field* — there is exactly one artist and
 * exactly one date — it is whether the **set of qualifiers is open**. It is: a
 * podcast episode carries a number *and* a date, a track carries an artist, a
 * conference talk carries a season and a track name, and a fifth block would
 * arrive with a sixth word. Four props to say what four badges say is 0052's
 * mistake, and it could never carry the fifth.
 *
 * The `meta` strip leads rather than trails, which is where it differs from
 * `loom.article`'s. An article's meta is a footer because you have already
 * decided to read it; an episode's is how you find the one you want out of
 * thirty, so it goes above the title where a scanning eye reaches it first.
 *
 * ## What stayed props, and the one that is worth arguing about
 *
 * `title`, `artwork`, `aspect` and `href` are one-per-record and uncontested.
 * **`duration` is the interesting one**, because by the paragraph above it
 * should be a badge like the rest of them — it is a short qualifier beside a
 * name, and it is nobody's idea of prose.
 *
 * It is a prop because **it has a home in the markup that no node could
 * occupy**. The corner of the artwork is a position this primitive places, not
 * a position in a flow, and a badge in the `meta` region cannot be put there by
 * any delta. That is 0051's argument arriving from the other end: a region
 * exists when the primitive places content *it did not author*, and a prop is
 * right when the primitive places a value *it alone knows where to put*. The
 * observable difference is the one that matters here — as a badge the running
 * time joins a strip of chips and the artwork has an empty corner; as a prop
 * the card reads as a player.
 *
 * A card with no artwork has no corner, so the duration falls back into the
 * leading strip beside the badges. One value, two placements, both chosen by
 * the primitive — which is exactly the licence a prop carries and a node does
 * not.
 *
 * ## The sentence is a prop, by 0094
 *
 * An episode's content model has **no repeated part** — there is no includes
 * list, no chapter run, nothing a sentence could be reordered against. So there
 * is no children flow for it to be a node *among*, making it a node buys no
 * reachability, and 0059's multi-string leaf applies unchanged. Same test,
 * opposite answer to `loom.offering`, and the same answer as `loom.credential`.
 *
 * ## The reader aims at the card
 *
 * 0066 decided this in advance and named playable media as one of the seven
 * pairs it was deciding for: an episode is **consumed by reading** — playing is
 * reading with your ears — so the whole card is the target, by way of a
 * stretched title anchor rather than an anchor wrapped round the card. The
 * accessible name is the title; the click target is the row.
 *
 * ## It reads its own width without a container query
 *
 * This is the fourth primitive in the library to want a measurement of its
 * container rather than of the viewport, after `loom.marquee`, `loom.mosaic`
 * and `loom.offering` — and the first that did not need `@container` to get it.
 * The artwork's flex basis is a `clamp()` whose middle term is a **percentage**,
 * which resolves against the flex container. So the picture is 72px beside a
 * title on a phone and 224px in a full-width row, and every width in between,
 * continuously — where a query would have jumped between two of them at a
 * threshold somebody had to pick.
 *
 * Worth knowing before the fifth primitive reaches for a query it may not need:
 * a container query is for changes CSS cannot interpolate — a column becoming a
 * row, as in `loom.offering`. A size that varies with available width is a
 * function, and a function can be written inline with no extra element and no
 * rule in the stylesheet.
 */

const props = z
  .object({
    title: z.string().min(1).max(200),
    /**
     * The sentence under the title — show notes, a synopsis, a description.
     * A prop rather than a `loom.prose` child by 0094: this card has no
     * repeated part, so it has no flow for a sentence to be moved within.
     */
    summary: z.string().min(1).max(400).optional(),
    artwork: mediaUrlSchema.optional(),
    /**
     * The artwork's shape. `square` is album and show art, `wide` is a video
     * thumbnail. It selects among a closed set of renderings and moves no node,
     * which is what keeps it a prop.
     */
    aspect: z.enum(ASPECT_NAMES).optional(),
    /**
     * Free text, never parsed — Hermes' own field says so across all four
     * blocks, and it is right: "42 min", "1h 12m" and "12:34" are one field and
     * no duration type accepts all three.
     */
    duration: z.string().min(1).max(16).optional(),
    /** Where it plays. Links the title, and the title covers the whole row. */
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * The artwork's width, as a function of the row's.
 *
 * Three bases rather than one, because equal *width* is not equal visual
 * weight: a 16:9 thumbnail set to the width of a square cover is barely half
 * its area and reads as an afterthought beside it. The lower bound is what
 * still reads as a picture on a 390px screen; the upper is where the artwork
 * would start competing with the title for the row.
 */
const ARTWORK_BASIS: Readonly<Record<AspectName, string>> = {
  square: "clamp(5.5rem, 24%, 8rem)",
  wide: "clamp(9rem, 34%, 14rem)",
  portrait: "clamp(5rem, 20%, 7rem)",
}

/**
 * The glyph scales with the frame too, and the floors above are set by where
 * it stops fitting rather than by taste — which the phone screenshot decided
 * and no assertion could have.
 *
 * A centred disc and a corner chip are two overlays in a box whose height is
 * the frame's width times its ratio, so on a 16:9 still they collide long
 * before the frame stops being legible: at the first floor this shipped with,
 * `41:07` sat across the play button on a 390px screen. The floors are now the
 * widths at which the two clear each other, and the glyph's own `clamp` keeps
 * it from filling a small square.
 */
const PLAY_SIZE = "clamp(1.25rem, 24%, 2.75rem)"

export const loomEpisode = definePrimitive({
  type: "loom.episode",
  description:
    "One thing a reader presses play on — artwork, title, running time, qualifiers, and a sentence. An episode, a video, or a track; a row of a loom.episode-list.",
  props,
  /**
   * 0068's declaration, for `loom.article`'s reason: the root is an `<article>`
   * and nothing here nests two anchors, but the title's `::after` covers the
   * whole row, so a control placed under it would be unreachable in a way no
   * reader can see and no markup check would name.
   */
  interactive: { whenProps: ["href"] },
  slots: ["meta"],
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props>) => {
    const meta = loom.slots["meta"]
    const aspect: AspectName = given.aspect ?? "square"

    /**
     * The frame is drawn whenever there is *either* a picture or a
     * destination, which is the repair the screenshots forced and the
     * assertions did not. A row with no artwork among rows that have some
     * started its title at the page's left edge while its neighbours started
     * theirs a hundred and forty pixels in, and a list with two leading edges
     * reads as a mistake before anybody works out which row is the odd one.
     *
     * So a playable episode with no cover gets the frame anyway — tinted, with
     * the glyph in it and nothing behind — which is what every podcast client
     * does with a missing cover, keeps the column, and keeps the affordance.
     * The frame disappears only when there is neither a picture nor anywhere to
     * go, because then there is genuinely nothing to draw.
     */
    const framed = given.artwork !== undefined || given.href !== undefined

    const durationChip = (positioned: boolean): ReactNode =>
      given.duration === undefined
        ? null
        : createElement(
            "span",
            {
              key: "duration",
              style: positioned
                ? {
                    /**
                     * `bg-canvas` against `fg-default` rather than a scrim,
                     * because this chip sits on a photograph whose colours no
                     * palette knows. Those two are a pair every palette
                     * guarantees reads — which is the promise a token does
                     * *not* make about two slots picked for looking right
                     * beside each other, and the trap `tokens.ts` has warned
                     * about since 23 August.
                     */
                    position: "absolute",
                    insetBlockEnd: space(2),
                    insetInlineEnd: space(2),
                    padding: `${space(1)} ${space(2)}`,
                    borderRadius: radius("sm"),
                    background: colour("bg-canvas"),
                    color: colour("fg-default"),
                    fontFamily: family("body"),
                    fontSize: size(1),
                    lineHeight: 1.4,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }
                : {
                    /**
                     * Off the picture the chip is wrong twice over, and the
                     * second one is the trap again: a `bg-canvas` chip on a
                     * `bg-canvas` page is an invisible chip, and it shipped
                     * that way until somebody looked at it. In the strip it is
                     * a quiet label rather than a chip — no ground of its own,
                     * so nothing can vanish into anything.
                     */
                    fontFamily: family("body"),
                    fontSize: size(1),
                    lineHeight: 1.4,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    color: colour("fg-muted"),
                  },
            },
            given.duration
          )

    const artwork: ReactNode = !framed
      ? null
      : createElement(
          "div",
          {
            key: "artwork",
            style: {
              position: "relative",
              display: "grid",
              placeItems: "center",
              flex: `0 0 ${ARTWORK_BASIS[aspect]}`,
              aspectRatio: ASPECT_RATIOS[aspect],
              overflow: "hidden",
              borderRadius: radius("md"),
              background: colour("bg-surface-muted"),
            },
          },
          given.artwork === undefined
            ? null
            : createElement("img", {
                key: "image",
                src: given.artwork,
                /**
                 * Empty, for `loom.article`'s reason: the title is in the same
                 * node, and alt text that paraphrases it makes a screen reader
                 * announce the episode twice.
                 */
                alt: "",
                loading: "lazy",
                decoding: "async",
                style: {
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                },
              }),
          given.href === undefined
            ? null
            : createElement(
                "span",
                {
                  key: "play",
                  className: LIBRARY_CLASS.episodePlay,
                  /**
                   * Decorative: the title anchor is the accessible name and the
                   * target, so a second announced control here would be a
                   * second thing to tab to that goes to the same place.
                   */
                  "aria-hidden": true,
                  style: {
                    /**
                     * Positioned with no offsets, purely so it paints above the
                     * absolutely positioned image beneath it — the grid does
                     * the centring, which is what lets the hover rule scale it
                     * without having to restate a translate.
                     */
                    position: "relative",
                    display: "grid",
                    placeItems: "center",
                    inlineSize: PLAY_SIZE,
                    /** Square, and `aspect-ratio` rather than a second clamp so the two cannot drift. */
                    aspectRatio: "1 / 1",
                    borderRadius: radius("full"),
                    background: colour("accent"),
                    color: colour("fg-on-accent"),
                  },
                },
                createElement(
                  "svg",
                  {
                    key: "glyph",
                    viewBox: "0 0 24 24",
                    width: "44%",
                    height: "44%",
                    fill: "currentColor",
                    focusable: "false",
                  },
                  createElement("path", { key: "triangle", d: "M9 5.5v13l10.5-6.5z" })
                )
              ),
          durationChip(true)
        )

    const strip: ReactNode =
      meta === undefined && (framed || given.duration === undefined)
        ? null
        : createElement(
            "div",
            {
              key: "meta",
              style: {
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: space(2),
              },
            },
            framed ? null : durationChip(false),
            meta
          )

    const title = createElement(
      "h3",
      {
        key: "title",
        style: {
          margin: "0",
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: size(4),
          lineHeight: 1.25,
          color: colour("fg-default"),
        },
      },
      given.href === undefined
        ? given.title
        : createElement(
            "a",
            {
              href: given.href,
              className: `${LIBRARY_CLASS.coverLink} ${LIBRARY_CLASS.underline}`,
              style: { color: "inherit", textDecoration: "none" },
            },
            given.title
          )
    )

    return createElement(
      "article",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.episode,
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: space(4),
          color: colour("fg-default"),
        },
      },
      libraryStylesheet(),
      artwork,
      createElement(
        "div",
        {
          key: "body",
          style: {
            display: "flex",
            flexDirection: "column",
            gap: space(2),
            /**
             * `min-inline-size: 0` is what lets a long unbroken title shrink
             * inside the row instead of forcing the artwork narrower than its
             * own floor — a flex item's automatic minimum size is its content,
             * and the default is the reason rows like this overflow.
             */
            flex: "1 1 12rem",
            minInlineSize: 0,
          },
        },
        strip,
        title,
        given.summary === undefined
          ? null
          : createElement(
              "p",
              {
                key: "summary",
                style: {
                  margin: "0",
                  fontFamily: family("body"),
                  fontSize: size(3),
                  lineHeight: 1.6,
                  color: colour("fg-muted"),
                },
              },
              given.summary
            )
      )
    )
  },
})
