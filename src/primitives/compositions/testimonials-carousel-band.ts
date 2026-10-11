import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * More quotes than the band is wide, in a row the reader pushes.
 *
 * ## The region the other three designs cannot occupy
 *
 * `testimonials` is three quotes in a grid, `testimonials-wall` is a marquee
 * that travels on its own, and `testimonials-collected` is a `loom.voices` row.
 * The grid is a **closed list drawn at full extent** — a fourth quote makes the
 * columns narrower and a seventh makes them unreadable — and the marquee moves
 * whether or not anybody asked it to.
 *
 * What none of them offers is **a list longer than the band that the reader
 * controls**. That is not a prop on any of the three: a `loom.quote-grid` with
 * `columns: "three"` and six children is six quotes in two rows, which is a
 * taller band rather than a pushable one, and a marquee with six is the same
 * marquee. `loom.carousel`'s own doc comment names this exact case as the
 * reason it was built — *"the thing a phone actually wants of eight testimonial
 * cards, which is put them in a row I can push"* — and until this band nothing
 * in the catalogue asked it for that.
 *
 * ## Why it is not the marquee with a different prop
 *
 * The two look adjacent and are opposites in the two places that matter.
 *
 * **Under reduced motion they are not the same band.** `pnpm specimen` shoots
 * with `reducedMotion: "reduce"`, and the 10 October report had to write down
 * that `integrations-marquee`'s central claim — the fade that says *this
 * continues* — is the one thing in this repository no picture can prove, because
 * a marquee photographed with motion reduced is a wrapped block. A carousel is
 * static CSS at rest: `overflow-x: auto` and `scroll-snap-type` say *this
 * continues* by cutting the next card off at 82% of the band, on every screen,
 * under every motion preference, in every photograph. **It is the only one of
 * the four designs whose claim a screenshot can carry.**
 *
 * **On a phone a marquee cannot be stopped and a carousel cannot be missed.** A
 * reader who wants to finish reading the third quote has no way to hold a
 * marquee still; a scroller is where their thumb already is.
 *
 * ## Six rather than three, which is the point and not a longer list
 *
 * Three quotes would have made this a `configure` of the grid in everything but
 * the container, and the catalogue must not hold one of those (0162). Six is
 * the smallest number that is honestly more than a row.
 *
 * **`item` is `wide` because of a measurement, and `medium` is the trap.** A
 * carousel's whole affordance is that the next card is visibly cut off, and
 * `loom.carousel` guarantees that only at the narrow end — an item is never
 * wider than 82% of the band, which binds on a phone and never on a laptop.
 * Above that the peek is arithmetic between the item floor and the band, and
 * `medium` is 22rem: three of them plus two `snug` gaps is 1080 pixels against
 * a `wide` band's 1077, so the third card ended flush with the right margin and
 * the fourth began exactly off the edge. The row scrolled, every test passed,
 * and the band looked like a grid of three. At `wide` (30rem) two sit on screen
 * with the third plainly cut, at both sizes the harness photographs.
 *
 * ## Attribution, and the rule that is not this band's to bend
 *
 * Every quote is attributed to a **role** and declares `anonymous: true`. A
 * starting composition may not ship a fabricated endorsement attributed to a
 * person who does not exist, which is `loom.quote`'s own reasoning for the prop
 * and is asserted over the whole catalogue in `compositions.test.ts`. The
 * monogram is what the flag turns off: `monogramOf("Head of Platform")` is
 * `"HO"` and nothing in the string says it is not a person's initials.
 *
 * ## What is a node and what stayed a prop
 *
 * Each quote is a node, so a testimonial can be dropped with a `remove` whose
 * inverse restores that quote rather than the list (0052). `item`, `gap` and
 * `snap` are props: `item` is a **floor for each card's width fed to the
 * scroller, never a count** — changing it changes how much of the row is on
 * screen and changes no node, which is the near-miss the granularity document
 * says to test by asking whether the set of nodes moves. Nothing here
 * truncates the row.
 *
 * ## The anchor belongs to the part
 *
 * `#testimonials`, the same as all three other designs, because a nav link
 * written against the canonical has to keep working when a host swaps this one
 * in (0165).
 */
type Voice = { readonly quote: string; readonly author: string; readonly role: string }

const VOICES: readonly Voice[] = [
  {
    quote:
      "The part I did not expect was the diff. I thought I would be approving copy; I spend about a minute a day approving operations against a tree, and I can read every one of them.",
    author: "Head of Platform",
    role: "Logistics, 400 staff",
  },
  {
    quote:
      "We had four landing pages that nobody dared touch because the person who built them had left. Two of them are now edited by the people who asked for the changes.",
    author: "Marketing Lead",
    role: "B2B software",
  },
  {
    quote:
      "It is the first tool in this category that did not require us to move our content into it. The pages stayed where they were and the changes arrive as a pull request.",
    author: "Principal Engineer",
    role: "Payments",
  },
  {
    quote:
      "The undo is the thing I would pay for on its own. We reverted a change from three weeks earlier and the eleven changes after it stayed exactly where they were.",
    author: "Director of Growth",
    role: "Travel",
  },
  {
    quote:
      "I was ready for it to be a wrapper around a prompt box. The policy is the product — we decided which changes need me and which do not, and it has held to that since March.",
    author: "Founder",
    role: "Two-person studio",
  },
  {
    quote:
      "Our designers stopped filing tickets for spacing. That sounds small and it was about a third of the board.",
    author: "Engineering Manager",
    role: "Healthcare",
  },
]

export const testimonialsCarouselBand: Composition = {
  id: "testimonials-carousel",
  part: "testimonials",
  label: "Testimonials, in a row you push",
  promise:
    "Six quotes in a sideways row that snaps, with the next one always cut off at the edge so a reader can see there is more.",
  rationale:
    "A pushable wall of testimonials is a loom.carousel with one loom.quote per voice. The row is as long as its children, so a seventh quote is an insert rather than a narrower column, and the scroller is static CSS — it works with no scripting and reads the same under reduced motion.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.carousel", "loom.quote"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "What people say", anchor: "testimonials" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Six teams, further in than the first week")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "small", tone: "muted", measured: true },
          children: [buildText(ids, "Push the row sideways — there are more of these than fit on a screen.")],
        }),
        buildElement(ids, {
          type: "loom.carousel",
          props: { item: "wide", gap: "snug", snap: "start" },
          children: VOICES.map((voice) =>
            buildElement(ids, {
              type: "loom.quote",
              props: {
                quote: voice.quote,
                author: voice.author,
                role: voice.role,
                emphasis: "card",
                anonymous: true,
              },
            })
          ),
        }),
      ],
    }),
}
