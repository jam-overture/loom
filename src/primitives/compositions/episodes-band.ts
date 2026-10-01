import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Six episodes, each with somewhere to play it.
 *
 * ## A design of `articles`, on the same argument as `articles-feed`
 *
 * The `articles` part is *where a site puts what it publishes*. `articlesBand`
 * draws that as posts, `feedBand` draws it as a bound list, and this draws it
 * as a back catalogue of recordings. 0171's swap loses nothing in either
 * direction: a page with a shelf of episodes where the writing band goes is
 * still a page that says *we make things, here they are, come back*. The
 * region is identical and the node set is not, which is exactly what
 * [0162](../../../decisions/0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)
 * asks of a design.
 *
 * ## It works with no artwork, and that is the primitive's own doing
 *
 * `loom.recording` draws its frame when there is artwork **or** somewhere to
 * play — its comment says so and gives the reason: *the play mark is the
 * primitive's whole signal, and a track with no cover still has one.* So every
 * card here has a frame carrying a play mark, from an `href` alone.
 *
 * That matters beyond this band. The 21 September inventory filed
 * `recording`, `recording-grid`, `product`, `listing`, `message` and six others
 * behind an image source nobody had chosen. **Every image field on all of them
 * is optional**, and one of them draws its most important mark without one. Six
 * of the twelve were never waiting on that question; they were waiting on a
 * band, and a band is this lane's to write.
 *
 * A shelf with cover art would be better and the standing question is real.
 * This one is not *blocked* on it, which is the correction.
 *
 * ## Duration is free text, the episode number is a badge
 *
 * `duration` takes "38 min", "1h 12m" and "12:34" as one field, for the reason
 * `price` is a string three times over in this catalogue. The **number** of the
 * episode is a `loom.badge` in the `meta` region rather than a prop, because a
 * record has a season as well often as not, and a run that added `season`
 * beside `episode` would be adding the second of a set 0052 says is nodes.
 *
 * ## `columns: "one"`, and why that is the whole difference between a reel and a feed
 *
 * `loom.recording` carries a container query: *"a `loom.recording-grid` with
 * `columns: "three"` is a reel; the same children with `columns: "one"` are a
 * feed"* — past 34rem the frame flips from a column into a row, with small
 * artwork at the start and the runtime at the end. Nothing in the tree says
 * which; the cell's width does.
 *
 * The first photographs of this band were taken at `three` and settled it. Six
 * square frames at a third of 1280px are six 380-pixel boxes with a play mark
 * in the middle of each, and with no cover art in them they read exactly as the
 * *card with a hole in it* this sheet was taken to rule out. At `one` the same
 * six cards are rows, the frame is a mark rather than a void, and the words are
 * the loud thing — which is what a back catalogue is for. A page that has its
 * artwork sets `columns` back to `three` and gets the reel, with no other
 * change.
 *
 * That is also the honest second design: `articlesBand` is a grid of four and
 * this is a column of six, which is a different rhythm and not a recolor.
 *
 * `shape: "square"` throughout: cover art is square, and a row of six frames
 * that disagreed about their ratio would read as a mistake even where each one
 * was right.
 */
type Episode = {
  readonly title: string
  readonly byline: string
  readonly note: string
  readonly duration: string
  readonly marker: string
  readonly fresh?: boolean
}

const EPISODES: readonly Episode[] = [
  {
    title: "What a year of AI-authored pages actually broke",
    byline: "With Priya Raghunathan",
    note: "Not the model. The seam between what it proposed and what anybody could check before it shipped.",
    duration: "48 min",
    marker: "14",
    fresh: true,
  },
  {
    title: "The undo problem, and why restores are not it",
    byline: "With Tomas Leclerc",
    note: "Undo computed at the moment of change is cheap. Undo reconstructed afterwards loses everything since.",
    duration: "39 min",
    marker: "13",
  },
  {
    title: "Nobody reads the diff",
    byline: "With Grace Okonjo",
    note: "Four hundred lines and an approve button is not review. We talk about what a person can actually weigh.",
    duration: "52 min",
    marker: "12",
  },
  {
    title: "Writing for a reader who cannot see the page",
    byline: "With Sam Whitfield",
    note: "Alt text, announced state, and the small print a generated page gets wrong first.",
    duration: "41 min",
    marker: "11",
  },
  {
    title: "Palettes that survive being wrong",
    byline: "With Ines Batista",
    note: "Two brands, one library, and the contrast checks that caught what the screenshots did not.",
    duration: "35 min",
    marker: "10",
  },
  {
    title: "Shipping on a Friday, on purpose",
    byline: "With the build team",
    note: "What has to be true about a deployment before the day of the week stops mattering.",
    duration: "1h 04m",
    marker: "09",
  },
]

/**
 * One episode. The badges are the `meta` region and the play mark comes from
 * the `href`, which is also what makes the whole card the target (0066).
 */
const recordingNode = (ids: IdFactory, episode: Episode): ElementNode =>
  buildElement(ids, {
    type: "loom.recording",
    props: {
      title: episode.title,
      byline: episode.byline,
      note: episode.note,
      duration: episode.duration,
      shape: "square",
      href: "/listen",
    },
    children: [
      buildSlot(ids, "meta", [
        ...(episode.fresh === true
          ? [
              buildElement(ids, {
                type: "loom.badge",
                props: { tone: "accent" },
                children: [buildText(ids, "New")],
              }),
            ]
          : []),
        buildElement(ids, {
          type: "loom.badge",
          props: { tone: "neutral" },
          children: [buildText(ids, `Episode ${episode.marker}`)],
        }),
      ]),
    ],
  })

export const episodesBand: Composition = {
  id: "articles-episodes",
  part: "articles",
  label: "Writing, as a back catalogue of episodes",
  promise:
    "Six episodes in a grid, each with its cover frame, its guest, how long it runs and somewhere to play it — with the newest marked.",
  rationale:
    "A back catalogue is a loom.recording-grid holding one loom.recording per episode, each carrying its number as a loom.badge in the meta region. Every card is a node, so an episode is an insert and dropping one is a remove. It is a third design of the articles part rather than a new part: a shelf of episodes occupies the region a writing band occupies, and differs from it in the set of nodes it builds.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.recording-grid", "loom.recording", "loom.badge"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Listen", anchor: "writing" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "An hour a fortnight with the people who had to solve it")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "No pitch and no round-ups. One problem per episode, with whoever was holding it at the time."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.recording-grid",
          props: { columns: "one", gap: "snug" },
          children: EPISODES.map((episode) => recordingNode(ids, episode)),
        }),
      ],
    }),
}
