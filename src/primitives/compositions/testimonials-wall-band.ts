import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Social proof by volume: two rows of quotes travelling in opposite directions.
 *
 * The grid of three testimonials makes one kind of claim — *here are three
 * customers, read what they said.* A wall makes a different one — *there are
 * more of these than you are going to read* — and the second is the claim a
 * page with fifty happy customers actually wants to make. The index's own doc
 * comment named this band by name as the legitimate thing the old single-list
 * catalogue had nowhere to put, so it is the obvious one to land first.
 *
 * ## Two marquees, not a `rows` prop
 *
 * `loom.marquee`'s schema had already ruled on this and the band just obeys it:
 *
 * > Two of these, running opposite ways, is the stacked-ticker look — and it is
 * > two nodes rather than a `rows` prop, for the reason 0052 gives about
 * > counts.
 *
 * So the second row is a node, a page that wants three rows inserts a third,
 * and a page that wants one removes one. A `rows: 2` prop would have been
 * `insert` in a prop bag, which is the near-miss the granularity doc warns
 * about — a prop that decides *how many children exist*. `direction` is the
 * real prop beside it, because it decides how however-many rows travel.
 *
 * ## What the wall costs a reader, and what is done about it
 *
 * A moving band is harder to read than a still one, and a quote is text. Three
 * things make that survivable and they are all deliberate:
 *
 * - **`loom.marquee` stops on hover and on focus**, and it respects
 *   `prefers-reduced-motion` from the stylesheet it emits (0055). A reader who
 *   has asked for less motion gets a static row of quotes, not a paused
 *   animation they have to catch.
 * - **`emphasis: "card"`** on every quote rather than `feature`. The pull quote
 *   treatment is explicitly one-per-page in `loom.quote`'s own schema, and a
 *   wall of eight of them is that primitive used against its documentation.
 * - **The band still has a heading and a lead**, so the argument is in still
 *   text above the moving part. A reader who does not chase a single quote has
 *   still read the claim.
 *
 * ## Eight quotes, two rows, and no photograph
 *
 * `loom.quote`'s `avatar` takes a `mediaUrlSchema`, which is the same wall
 * every other band in this catalogue meets: this library cannot ship an asset
 * and will not ship a link to somebody else's.
 *
 * What it does ship, from 25 September, is the **face**: these eight are
 * attributed to people by name, so each one draws its author's initials and the
 * wall reads as eight voices rather than eight paragraphs. Nothing here
 * declares `anonymous` — that is the canonical `testimonials` band's, whose
 * attributions are roles and which is the pair this one completes.
 */
type Voice = {
  readonly quote: string
  readonly author: string
  readonly role: string
}

/**
 * Split across the two rows rather than repeated in both, so every quote on the
 * band is a distinct one. A marquee that shows the same eight twice reads as a
 * loop the moment a reader watches it for six seconds, which is the tell that
 * turns social proof into decoration.
 */
const VOICES: readonly Voice[] = [
  {
    quote: "We stopped having the meeting where somebody explains what changed on the marketing site last week.",
    author: "Dana Okafor",
    role: "Head of Design, Meridian",
  },
  {
    quote: "The reasoning arrives with the diff. That sounds small and it has changed how our reviews go entirely.",
    author: "Sam Whitfield",
    role: "Engineering Manager, Fathom",
  },
  {
    quote: "Our first revert took about four seconds and did not take the rest of the afternoon's work with it.",
    author: "Priya Raghunathan",
    role: "Staff Engineer, Northbound",
  },
  {
    quote: "Re-theming for the rebrand was one change to one node. I had budgeted two weeks for it.",
    author: "Marcus Lindqvist",
    role: "Design Systems Lead, Aperture",
  },
  {
    quote: "The part I did not expect: non-engineers propose changes now, and nothing bad happens when they do.",
    author: "Yuki Tanaka",
    role: "Head of Content, Colfax",
  },
  {
    quote: "Every change on the page has a record of who allowed it. Our auditor asked once and never asked again.",
    author: "Rebecca Olayinka",
    role: "VP Operations, Tessellate",
  },
  {
    quote: "It proposes, we decide. I have used four tools that got that backwards and one that got it right.",
    author: "Tomás Herrera",
    role: "Founder, Quietly",
  },
  {
    quote: "Nothing ships that nobody read, and nobody spends their morning reading things that did not need them.",
    author: "Anneke de Vries",
    role: "Director of Product, Halvard",
  },
]

const quoteNode = (ids: IdFactory, voice: Voice): ElementNode =>
  buildElement(ids, {
    type: "loom.quote",
    props: { quote: voice.quote, author: voice.author, role: voice.role, emphasis: "card" },
  })

const row = (ids: IdFactory, voices: readonly Voice[], direction: "start" | "end"): ElementNode =>
  buildElement(ids, {
    type: "loom.marquee",
    props: { direction, density: "loose", edges: "faded" },
    children: voices.map((voice) => quoteNode(ids, voice)),
  })

export const testimonialsWallBand: Composition = {
  id: "testimonials-wall",
  part: "testimonials",
  label: "Testimonials, a moving wall",
  promise: "Eight quotes in two rows travelling opposite ways, with the argument standing still above them.",
  rationale:
    "A testimonial wall is two loom.marquee rows running in opposite directions, each holding loom.quote cards. The second row is a node rather than a rows prop, so a page can add or drop a row with one operation, and the marquee stops on hover, on focus, and for a reader who has asked for reduced motion.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.marquee", "loom.quote"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { eyebrow: "What people say", width: "full", anchor: "testimonials" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, align: "center", balance: true },
            children: [buildText(ids, "Eleven hundred teams, and these are the ones who wrote in")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { align: "center", tone: "muted", measured: true },
            children: [buildText(ids, "Hover any row to stop it, or read them all on the customers page.")],
          }),
        ]),
        row(ids, VOICES.slice(0, 4), "end"),
        row(ids, VOICES.slice(4), "start"),
      ],
    }),
}
