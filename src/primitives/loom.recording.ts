import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ASPECT_NAMES, ASPECT_RATIOS, type AspectName } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema, mediaUrlSchema } from "./url.js"

/**
 * One thing a reader can press play on: artwork with a play mark over it, how
 * long it runs, who made it, what it is called, and what it is about.
 *
 * **Four Hermes blocks collapse here** — `video`, `video-playlist`, `playlist`
 * and `podcast-episodes`. Stacked on top of each other their four shapes are one
 * record: `thumbnail` / `thumbnail` / `cover` / `image` is artwork; `url` /
 * `link` / `link` / `audioUrl` is somewhere to play it; `duration` is on three of
 * the four; `description` on two; and `artist` is a byline under a different
 * name. The one field that is genuinely not shared is `PodcastEpisode`'s
 * `episodeNumber` and `date`, and those are the reason this card has a `meta`
 * region — see below.
 *
 * ## Why it is not `loom.article` with a duration
 *
 * The two cards have the same silhouette and it is worth saying plainly what
 * separates them, because `loom.offering` had to answer the same question
 * against `loom.tier`. An article's cover is a **picture of the thing**; a
 * recording's artwork is **the surface you press**. Two consequences follow into
 * the markup rather than into the field list:
 *
 * - **The play mark.** It is the loudest thing on the card and it is the whole
 *   signal: it tells a reader this is forty minutes of their attention rather
 *   than four, before they have read a word. A `loom.article` cannot grow one
 *   without becoming this primitive.
 * - **The duration sits on the artwork**, at its end corner, which is where
 *   every product that has ever listed a video puts it. Hermes held `duration`
 *   as loose text beside the title and that is the one place it reads as a
 *   detail rather than as the price of watching. This is the port taking the
 *   content model and writing better markup for it.
 *
 * ## What became nodes, and what stayed props
 *
 * - **`episodeNumber`, `date`, and the qualifiers a page adds beside them**
 *   ("Season 2", "Interview", "Video") are `loom.badge` nodes in the `meta`
 *   region. 0052's repeated-content clause, and the call `loom.offering` made
 *   about its nine qualifier fields. **`loom.article` made the opposite call**
 *   and collapsed its date, publication and client into one `kicker` prop, on
 *   the ground that *each block had exactly one*. That argument does not carry
 *   here and the difference is the whole reason to look: a podcast episode has
 *   an episode number **and** a date, on the same record, at the same time. Two
 *   fixed fields that co-occur are not one label, and a prop that made them one
 *   would force an author to concatenate them and could never carry a third.
 * - **`artist` stayed a prop**, as `byline`. It is exactly one per record and it
 *   is *attribution* — the who, which belongs against the title — where the meta
 *   strip is the when and the what. Rendering "Nina Simone" as a chip beside
 *   "EP 42" flattens a byline into a tag, and a page cannot get it back.
 * - **`description` stayed a prop**, as `note`, which is
 *   [0094](../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md)
 *   applied rather than a preference: this card turns no field of the record
 *   into a children flow, so there is nothing for a sentence to be moved below,
 *   and 0059's multi-string leaf applies unchanged. `loom.credential` is the
 *   card this one sits beside on that question; `loom.offering` is the card it
 *   does not.
 * - **`duration` stayed a prop**, and free text, for the reason Hermes' own
 *   field gives — *"free-text duration (e.g. `12:34`)"* — and `loom.milestone`'s
 *   `marker` gives again: "42 min", "1h 12m" and "12:34" are all things people
 *   write, and a parsed number of seconds refuses two of the three and forces a
 *   formatting decision onto a primitive with no business making one.
 *
 * ## The reader aims at the whole card
 *
 * 0066 settles it: a recording is **read** — played, watched, listened to —
 * rather than bought, so the card is the target. The title is the anchor and its
 * `::after` stretches over the whole surface (`stylesheet.ts`), which is
 * `loom.article`'s mechanic and gives the same result: the accessible name is
 * the title alone rather than the card's every word, and the click target is
 * everything including the artwork the reader will actually aim at.
 *
 * ## One card that reads as a queue row when it is given the width
 *
 * The four blocks want two bands. A video reel is a wall of 16:9 cards; a
 * podcast feed and a playlist are a column of rows with small artwork at the
 * start and the runtime at the end. That is `loom.offering`'s question again —
 * **how much room was this card given** — and it gets `loom.offering`'s answer:
 * `container-type: inline-size` on the article, one `@container` rule flipping
 * the frame from a column into a row past 34rem, and nothing in the tree saying
 * which. A `loom.recording-grid` with `columns: "three"` is a reel; the same
 * children with `columns: "one"` are a feed.
 *
 * The mechanic that catches this every time: a container queries its
 * **ancestor**, never itself, so the flipping element has to be a child of the
 * element declaring the containment. That is what the frame `<div>` is for, and
 * it is markup rather than a node.
 *
 * ## What is deliberately not here
 *
 * **A `medium: "video" | "audio"` prop.** It was written and taken out. It would
 * have passed 0052 — it changes no node, and a prop selecting among a closed set
 * of renderings is a real prop — but it earned nothing: the play mark is the
 * same triangle for both, the accessible name comes from the title, and the one
 * place the distinction shows is a word a page can already put in the `meta`
 * strip as a node someone placed. A prop that changes nothing a reader can see
 * is grammar budget (0014) spent on a field the model has to decide about
 * seventy times.
 *
 * **Playback itself.** Hermes' `podcast-episodes` promised "inline audio
 * playback" and this primitive does not: an `<audio>` element that plays is
 * state, a render here is a pure function of the tree (0008), and the seam that
 * would hold a playhead does not exist. The card links out, which is what three
 * of the four Hermes blocks did anyway. Filed rather than faked.
 */

const props = z
  .object({
    title: z.string().min(1).max(200),
    /** The artist, the host, the show, the channel. Exactly one per record. */
    byline: z.string().min(1).max(160).optional(),
    /**
     * What it is about. A prop rather than a `loom.prose` child, by 0094: this
     * card has no children flow for a sentence to be moved within.
     */
    note: z.string().min(1).max(400).optional(),
    /** Free text, never parsed: "42 min", "1h 12m", "12:34" are one field. */
    duration: z.string().min(1).max(16).optional(),
    artwork: mediaUrlSchema.optional(),
    /**
     * How the artwork is framed — a floor-free choice that changes no node. A
     * reel is `wide`, a podcast's cover art and a record sleeve are `square`.
     */
    shape: z.enum(ASPECT_NAMES).optional(),
    /** Where it plays. The whole card becomes the target when it is set (0066). */
    href: linkUrlSchema.optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * `loom.media` keeps an `auto` beside these three and this primitive must not:
 * a queue of rows whose artwork each took its own natural shape would line up
 * against nothing. The three named shapes come from `layout.ts` so that a card
 * saying `wide` here means the same ratio it means in a `loom.media` beside it.
 */
const SHAPES: Readonly<Record<AspectName, string>> = ASPECT_RATIOS

export const loomRecording = definePrimitive({
  type: "loom.recording",
  description:
    "One thing to press play on — artwork with a play mark, a runtime, a byline, a title and a line about it. A cell of a loom.recording-grid.",
  props,
  /**
   * The same declaration `loom.article` carries and for 0068's reason rather
   * than by habit: this root is an `<article>` and nests no anchors, but the
   * title's `::after` covers the artwork and everything beside it, so a control
   * placed under it would be unreachable in a way no reader can see and no
   * markup check would name. A covered card is a target.
   */
  interactive: { whenProps: ["href"] },
  slots: ["meta"],
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props>) => {
    const meta = loom.slots["meta"]
    const playable = given.href !== undefined

    /**
     * The frame is drawn whenever there is artwork *or* somewhere to play,
     * because the play mark is the primitive's whole signal and a track with no
     * cover still has one. With neither, there is nothing to draw and the card
     * is a title and a line — which is the honest rendering of a record that
     * says only that much.
     */
    const framed = given.artwork !== undefined || playable

    /**
     * **A ratio reserves the shape of a picture, so a frame with no picture in
     * it does not get one.**
     *
     * `shape` was applied unconditionally until 23 September, and the first
     * band to place a shelf of recordings without cover art is what found it.
     * In the row arrangement the mistake is invisible — the art column is
     * `11rem` wide and a square of that is a small mark. In the **stacked**
     * arrangement, which is every one of these cards on a phone, the art is the
     * card's full width, and `aspect-ratio: 1 / 1` turns a play mark into a
     * 350-pixel void with a button floating in the middle of it. Six of them
     * down a phone screen read as six cards that failed to load.
     *
     * Nothing was wrong in the source and no test could have caught it: the
     * ratio was exactly the one asked for, the mark was centred in it, and the
     * band renders with no diagnostic at either width. It is the second defect
     * in this file found by photographing a record with no artwork — the
     * `border-strong` note below is the first — which is worth saying plainly,
     * because *a card with no cover* is the ordinary case for a page whose
     * pictures are not ready, not an edge one.
     *
     * A fixed block size rather than a smaller ratio: with no picture there is
     * no proportion to keep, only a mark to place and a runtime to put beside
     * it, and both are the same height whatever the card is doing.
     */
    const marked = framed && given.artwork === undefined

    const art: ReactNode = !framed
      ? null
      : createElement(
          "div",
          {
            key: "art",
            className: LIBRARY_CLASS.recordingArt,
            style: {
              ...(marked ? { blockSize: "4.75rem" } : { aspectRatio: SHAPES[given.shape ?? "wide"] }),
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
                 * node, and alt text paraphrasing it makes a screen reader read
                 * the recording's name twice. `loom.media` requires alt because
                 * it has no such neighbour.
                 */
                alt: "",
                loading: "lazy",
                decoding: "async",
                style: { display: "block", width: "100%", height: "100%", objectFit: "cover" },
              }),
          !playable
            ? null
            : createElement(
                "span",
                {
                  key: "play",
                  className: LIBRARY_CLASS.recordingPlay,
                  "aria-hidden": true,
                  /**
                   * `border-strong` rather than the `border-subtle` every other
                   * edge in this file uses, and the screenshots are why. On a
                   * card with no artwork the mark sits on `bg-surface-muted`,
                   * and under a dark palette that ground and the mark's own
                   * `bg-surface` are within a few points of each other — a
                   * subtle border between them is a play button that vanishes.
                   * The strong edge is the only thing holding the shape there,
                   * and it costs nothing over a photograph.
                   */
                  style: {
                    background: colour("bg-surface"),
                    border: `1px solid ${colour("border-strong")}`,
                    color: colour("fg-default"),
                  },
                },
                /**
                 * A triangle drawn out of borders rather than a glyph, because
                 * "▶" is a different shape in every font pack this library can
                 * be themed with and one of them renders it as an emoji. The
                 * inline-start border is the point of it and flips under a
                 * right-to-left document, which for a play mark is correct.
                 */
                createElement("span", {
                  key: "cue",
                  style: {
                    display: "block",
                    inlineSize: "0",
                    blockSize: "0",
                    borderBlockStart: "0.4rem solid transparent",
                    borderBlockEnd: "0.4rem solid transparent",
                    borderInlineStart: `0.68rem solid ${colour("fg-default")}`,
                    /** Optical centring: a triangle's mass is not its bounding box. */
                    marginInlineStart: "0.16rem",
                  },
                })
              ),
          given.duration === undefined
            ? null
            : createElement(
                "p",
                {
                  key: "time",
                  className: LIBRARY_CLASS.recordingTime,
                  style: {
                    margin: "0",
                    background: colour("bg-surface"),
                    color: colour("fg-default"),
                    border: `1px solid ${colour("border-subtle")}`,
                    borderRadius: radius("sm"),
                    paddingInline: space(2),
                    paddingBlock: "0.15rem",
                    fontFamily: family("body"),
                    fontSize: size(1),
                    lineHeight: 1.4,
                    textWrap: "nowrap",
                  },
                },
                given.duration
              )
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
        className: `${LIBRARY_CLASS.recording} ${LIBRARY_CLASS.lift}`,
        style: {
          background: colour("bg-surface"),
          border: `1px solid ${colour("border-subtle")}`,
          borderRadius: radius("lg"),
          /** Keeps the artwork inside the corners in both arrangements. */
          overflow: "hidden",
          color: colour("fg-default"),
        },
      },
      libraryStylesheet(),
      createElement(
        "div",
        /**
         * The element the `@container` rule flips, and it has to be inside the
         * element that declares the containment rather than being it. Nothing
         * about its direction is set inline, because the rule has to reach it —
         * the trap `loom.article` fell into once and `loom.nav` again.
         */
        { key: "frame", className: LIBRARY_CLASS.recordingFrame },
        art,
        createElement(
          "div",
          { key: "body", className: LIBRARY_CLASS.recordingBody, style: { padding: space(4) } },
          given.byline === undefined
            ? null
            : createElement(
                "p",
                {
                  key: "byline",
                  style: {
                    margin: "0",
                    fontFamily: family("body"),
                    fontSize: size(1),
                    lineHeight: 1.4,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: colour("accent"),
                  },
                },
                given.byline
              ),
          title,
          given.note === undefined
            ? null
            : createElement(
                "p",
                {
                  key: "note",
                  style: {
                    margin: "0",
                    fontFamily: family("body"),
                    fontSize: size(3),
                    lineHeight: 1.6,
                    color: colour("fg-muted"),
                  },
                },
                given.note
              ),
          meta === undefined
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
                    /** The card's floor, so a row of cells lines its strips up. */
                    marginBlockStart: "auto",
                    paddingBlockStart: space(3),
                  },
                },
                meta
              ),
          /**
           * The runtime when there is no frame to carry it. A recording with
           * neither artwork nor a destination still has a length, and losing it
           * to a branch would be the field quietly disappearing.
           */
          framed || given.duration === undefined
            ? null
            : createElement(
                "p",
                {
                  key: "time-inline",
                  style: {
                    margin: "0",
                    fontFamily: family("body"),
                    fontSize: size(1),
                    lineHeight: 1.4,
                    color: colour("fg-muted"),
                  },
                },
                given.duration
              )
        )
      )
    )
  },
})
