import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Five dates a reader can get into, with the date first and the way in on the
 * end of each row.
 *
 * ## The 0171 question this answers, which was left open on purpose
 *
 * The 23 September report filed `loom.event` and its grid as *a run **and one
 * judgement*** — "a what's-on band may be the twenty-third part rather than a
 * design, and that is a 0171 question somebody has to answer rather than
 * assume." This is the answer, and
 * [0186](../../../decisions/0186-a-whats-on-band-occupies-the-come-back-region.md)
 * is where it is argued at length. The short form is that the open question had
 * the wrong nearest part in it.
 *
 * Against **`changelog`** the swap plainly fails in both directions, and that is
 * the reading that makes this look like a part: a changelog is dated entries
 * pointing backwards and this is dated entries pointing forwards, and neither
 * substitutes for the other. But 0171 is explicit that **content is the wrong
 * axis** — *"the tuple is not a taxonomy of things a page can say; it is an
 * order, and an order is a statement about places"* — and a shared shape is
 * content. Two bands that look alike are not thereby in the same region.
 *
 * The region a what's-on band actually occupies is **the come-back band**: the
 * one near the end of a page that gives a reader a reason to return, which
 * `articles` holds and already holds three ways. Swap this for the writing band
 * and the page still says *we are doing things, here they are, come back*.
 * Nothing it needed is lost, which by 0171's own test makes this a **design of
 * `articles`** and leaves `COMPOSITION_PARTS` at twenty-two.
 *
 * ## What it does with the region that the other three do not
 *
 * `articlesBand` is four posts, `feedBand` is a bound list, `episodesBand` is a
 * back catalogue — all three are **things already made**. This is the same
 * region saying *be somewhere on a Tuesday*, which is the one version of come
 * back that has a control on it: an event you cannot book is a list of things
 * you have already missed. That difference is a different set of nodes, which is
 * what 0162 asks of a design, and it is why `loom.event` earns slots that
 * `loom.milestone` does not have.
 *
 * ## The date leads, and the grid is a column
 *
 * `columns` defaults to `one` on `loom.event-grid` and this band takes the
 * default, which is not laziness: past 40rem a `loom.event` flips from a card
 * into a row with its date set first, in the accent, with a rule between it and
 * everything else. **A reader scanning a what's-on band is scanning dates** —
 * they are choosing between days, not between titles — so the column a finger
 * runs down has to be the left one. At `three` the same five events are a
 * teaser for a home page and the date stops being a column at all.
 *
 * It changes no node, which is the granularity doc's sharper question answered:
 * every event that was in the band is still in it, in the same order.
 *
 * ## Qualifiers are nodes and there is never exactly one
 *
 * *Free*, *Workshop*, *In person*, *Waiting list*, *Two seats left* — `loom.badge`
 * nodes in the `meta` region, deliberately two on some rows and one on others.
 * 0052's repeated-content clause, and the reason `loom.event` declined a
 * `state: "upcoming" | "past"` prop: a page that wants to mark an event over
 * puts a badge on it, which is a node somebody placed and a reviewer can see.
 *
 * `emphasis: "featured"` is the one exception and it is a real prop under the
 * test: it is a rendering of one row, it changes no node, and a `move` could
 * not express it. Exactly one event carries it, because a band that emphasised
 * three would be emphasising none.
 */
type Occasion = {
  readonly date: string
  readonly name: string
  readonly location: string
  readonly note: string
  readonly badges: readonly { readonly word: string; readonly loud?: boolean }[]
  readonly way: string
  readonly featured?: boolean
}

const OCCASIONS: readonly Occasion[] = [
  {
    date: "Thu 8 Oct",
    name: "What a year of AI-authored pages actually broke",
    location: "Toynbee Studios, London — and streamed",
    note: "An hour on the seam between what a model proposed and what anybody could check before it shipped, with the incident reports open on the screen.",
    badges: [{ word: "Free", loud: true }, { word: "In person + online" }],
    way: "Reserve a seat",
    featured: true,
  },
  {
    date: "Wed 21 Oct",
    name: "Review clinic: reading a four-hundred-line diff",
    location: "Online, 16:00 BST",
    note: "Bring a change nobody wanted to approve. We work through six of them together and write down what made each one hard.",
    badges: [{ word: "Workshop" }, { word: "Two seats left" }],
    way: "Take a seat",
  },
  {
    date: "Sat 7 Nov",
    name: "Palettes that survive being wrong",
    location: "Baltic Centre, Gateshead",
    note: "A day with two brands, one component library and the contrast checks that caught what the screenshots did not.",
    badges: [{ word: "£40" }, { word: "Materials included" }],
    way: "Book a place",
  },
  {
    date: "Tue 24 Nov",
    name: "Office hours with the people who broke it",
    location: "Online, 09:00 GMT",
    note: "No talk. Forty minutes of whatever is in the room, answered by whoever was holding it at the time.",
    badges: [{ word: "Free" }],
    way: "Add to the list",
  },
  {
    date: "Spring 2026",
    name: "The annual, wherever we can fit everyone",
    location: "Venue to be confirmed",
    note: "Two days, one track, no sponsor stage. Tell us you want to come and we will size the room to the answer.",
    badges: [{ word: "Waiting list" }],
    way: "Register interest",
  },
]

/** One row: the badges are the `meta` region and the way in is the `action` one. */
const eventNode = (ids: IdFactory, occasion: Occasion): ElementNode =>
  buildElement(ids, {
    type: "loom.event",
    props: {
      name: occasion.name,
      date: occasion.date,
      location: occasion.location,
      note: occasion.note,
      href: "/events",
      ...(occasion.featured === true ? { emphasis: "featured" as const } : {}),
    },
    children: [
      buildSlot(
        ids,
        "meta",
        occasion.badges.map((badge) =>
          buildElement(ids, {
            type: "loom.badge",
            props: { tone: badge.loud === true ? "accent" : "neutral" },
            children: [buildText(ids, badge.word)],
          })
        )
      ),
      buildSlot(ids, "action", [
        buildElement(ids, {
          type: "loom.action",
          props: { href: "/events", variant: occasion.featured === true ? "primary" : "secondary", scale: "small" },
          children: [buildText(ids, occasion.way)],
        }),
      ]),
    ],
  })

export const whatsOnBand: Composition = {
  id: "articles-whats-on",
  part: "articles",
  label: "Come back, as somewhere to be",
  promise: "Five dates in a column, each with where it is, what it is, and the control that gets you in.",
  rationale:
    "A what's-on band is a loom.event-grid holding one loom.event per date, each carrying its qualifiers as loom.badge nodes in the meta region and the way in as a loom.action in the action region. Every date is a node, so one added is an insert and one past is a remove. It is a fourth design of the articles part rather than a twenty-third part: it occupies the come-back region the writing band occupies, and differs from it in the set of nodes it builds and in having something to press.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.event-grid", "loom.event", "loom.badge", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "What's on", anchor: "writing" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Five places to find us before the end of the year")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "Everything here is one problem and the person who had to solve it. Nothing is a keynote, and the online ones are free."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.event-grid",
          props: { gap: "snug" },
          children: OCCASIONS.map((occasion) => eventNode(ids, occasion)),
        }),
      ],
    }),
}
