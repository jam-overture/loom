import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode, LoomNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The exchange itself, shown rather than described.
 *
 * `loom.message` shipped on 14 September naming the band it was written for,
 * and the band did not exist:
 *
 * > a page that sells a **tool that answers you** has a band it never needed —
 * > the exchange itself, shown rather than described. It is the band every
 * > assistant's marketing page opens with, and until now this library could
 * > only fake it with a column of `loom.card`s that carry no side, no voice and
 * > no attribution.
 *
 * This is that band. It is the design of the `code` part for a product whose
 * interface is words: `codeBand` shows an API, `codeSessionBand` shows a
 * terminal, and this shows the thing being *asked*. 0171's swap holds in both
 * directions — all three sit between *how it works* and *what it integrates
 * with*, and all three answer **show me it working**. What changes is the
 * surface the product presents, which is copy and node types rather than a
 * region, so it is a design.
 *
 * ## Why the transcript is inside a `loom.frame`
 *
 * A column of speech bubbles floating on a marketing page reads as a
 * *drawing of* a conversation. The same column inside a window chrome reads as
 * a screenshot of one, and a reader believes the second. The frame is the
 * library's `window` chrome with the product's own name in the title bar — it
 * is decoration and is hidden from assistive technology by the primitive, so
 * nothing here is claiming to a screen reader that a picture is an
 * application.
 *
 * **No `loom.pin` marks over it**, although the frame takes them and this would
 * otherwise be the first band that could place one. A pin is positioned as a
 * percentage of the surface's *height*, and a transcript's height is whatever
 * the words wrap to — so a mark aimed at the third turn at 1280px is aimed
 * between two turns on a phone. That is drift a test cannot see and a
 * photograph can. Filed rather than shipped.
 *
 * ## The last turn is still being written
 *
 * `pending` is the one piece of motion in the band and it is a *variant*
 * rather than a duration, which is the only thing
 * [0055](../../../decisions/0055-motion-is-a-static-stylesheet-the-primitive-emits.md)
 * lets a tree say about motion at all. It earns its place for a reason beyond
 * liveliness: a transcript that has finished is a record, and a transcript
 * caught mid-answer is a **demonstration**. The first clause has arrived and
 * the dots are under it, which is also the state that proves the prop is not
 * simply "an empty bubble".
 *
 * ## What is a node here, and what is not
 *
 * Every turn is a `loom.message` node, so *drop the third exchange* is one
 * `remove` — and the body of a turn is its **children**, by
 * [0094](../../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md),
 * so the assistant's second paragraph is a node of its own and "put the caveat
 * first" is one `move`. The speaker, the name and the time on it stay props:
 * one of each per turn, and none of them is a set.
 */
type Turn = {
  readonly speaker: "person" | "assistant" | "system"
  readonly name: string
  readonly stamp?: string
  readonly pending?: boolean
  readonly said: readonly string[]
}

const TRANSCRIPT: readonly Turn[] = [
  {
    speaker: "system",
    name: "Session",
    said: ["Connected to the marketing site. Every change is proposed, never applied."],
  },
  {
    speaker: "person",
    name: "Ana",
    stamp: "09:41",
    said: ["Our pricing page still says $19. It went up to $24 at the start of the month."],
  },
  {
    speaker: "assistant",
    name: "Loom",
    stamp: "09:41",
    said: [
      "That is one change: the Team plan's price, $19 to $24. Nothing else on the page moves — the perks, the badge and the two other plans are untouched.",
      "A priced plan is behind a review rule, so this will wait for somebody rather than go live. You will get it back with the before and after side by side.",
    ],
  },
  {
    speaker: "person",
    name: "Ana",
    stamp: "09:42",
    said: ["Do it, and put the annual price under it as well."],
  },
  {
    speaker: "assistant",
    name: "Loom",
    stamp: "09:42",
    pending: true,
    said: ["Two changes then — the price, and a line beneath it"],
  },
]

const turnNode = (ids: IdFactory, turn: Turn): ElementNode =>
  buildElement(ids, {
    type: "loom.message",
    props: {
      speaker: turn.speaker,
      name: turn.name,
      ...(turn.stamp === undefined ? {} : { stamp: turn.stamp }),
      ...(turn.pending === true ? { pending: true } : {}),
    },
    children: turn.said.map((said) =>
      buildElement(ids, {
        type: "loom.prose",
        props: { size: "body" },
        children: [buildText(ids, said)],
      })
    ),
  })

/**
 * The window, and the transcript in its surface region.
 *
 * `children` is deliberately empty: the frame's children are its `loom.pin`
 * marks, and this band places none for the reason given above. An empty
 * children list on a frame is the ordinary case and not a hole.
 */
const framed = (ids: IdFactory, transcript: readonly LoomNode[]): ElementNode =>
  buildElement(ids, {
    type: "loom.frame",
    props: { chrome: "window", label: "Loom — marketing site" },
    children: [buildSlot(ids, "surface", transcript)],
  })

export const conversationBand: Composition = {
  id: "code-conversation",
  part: "code",
  label: "In your codebase, as a conversation",
  promise:
    "A window on the page holding a real exchange — an ask, what the change would be, the rule that holds it, and an answer still arriving.",
  rationale:
    "A conversation band is a loom.message-list of loom.message turns inside a loom.frame's surface region. Each turn is a node and each paragraph inside a turn is a node under it, so a turn can be dropped or a caveat moved above an explanation without rewriting the band. It is a third design of the code part rather than a new part: it answers show me it working, in the same region as the API panel and the terminal session, for a product whose interface is words.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.frame",
    "loom.message-list",
    "loom.message",
    "loom.callout",
    "loom.code-span",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "readable", eyebrow: "In your codebase", anchor: "code" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Ask for the change in the words you would have used anyway")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "lead", tone: "muted", measured: true },
          children: [
            buildText(
              ids,
              "No fields, no form, no place to learn. The part worth watching is what comes back: what it would change, and whether it is allowed to."
            ),
          ],
        }),
        framed(ids, [
          buildElement(ids, {
            type: "loom.message-list",
            props: { density: "loose" },
            children: TRANSCRIPT.map((turn) => turnNode(ids, turn)),
          }),
        ]),
        buildElement(ids, {
          type: "loom.callout",
          props: { tone: "accent", title: "What the second reply is actually doing" },
          children: [
            buildElement(ids, {
              type: "loom.prose",
              props: { size: "body" },
              children: [
                buildText(ids, "It names the change as a "),
                buildElement(ids, { type: "loom.code-span", children: [buildText(ids, "configure")] }),
                buildText(
                  ids,
                  " of one node and says what it leaves alone, because a plan a reader cannot check is a promise. Then it says the change will wait — before it is made, not after it is refused. A tool that asks permission afterwards has already done the thing."
                ),
              ],
            }),
          ],
        }),
      ],
    }),
}
