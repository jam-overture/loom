import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The same region, shown as a transcript: what one instruction actually does,
 * printed in the order it happens.
 *
 * ## Why this is a second design and not a `configure` of `code`
 *
 * 0162's bar is the set of nodes and this clears it comfortably — the canonical
 * is a `loom.split` over a numbered `loom.list` and two panels; this is one
 * full-width panel and a `loom.callout`, with no split, no list and no `kbd`.
 * But the bar being cleared is not the interesting part. The interesting part
 * is that the two designs answer **two different objections**, and a page picks
 * the one its reader has:
 *
 * | | the reader it is for | what they ask |
 * | --- | --- | --- |
 * | `code` | evaluating the integration | *how much of my codebase does this touch* |
 * | `code-session` | evaluating the idea | *what does it actually do when I ask it something* |
 *
 * The first is answered by a listing and the second cannot be. A four-line
 * install snippet says nothing about whether the thing that comes back is
 * reviewable, and reviewability is the whole product.
 *
 * ## The transcript wraps, and that is the one prop worth arguing
 *
 * `loom.code` defaults to `wrap: false`, and its header is careful about why:
 * *"a shell line broken across two visual rows reads as two commands"*. That
 * reason is about **commands**, and this panel holds almost none — it holds
 * sentences a runtime printed, the longest of which is eighty characters and
 * none of which mean anything different for being broken. So `wrap: true` is
 * not a preference here, it is the same judgement the default makes, applied to
 * content the default was not written for: at 390px an unwrapped transcript
 * puts the end of every line behind a horizontal gesture, inside a band whose
 * argument is that you can see the whole of what happened.
 *
 * `Loom marketing` filed exactly this on 3 September and it is why the prop
 * exists. This is the first band in the catalogue to use it.
 *
 * ## The callout is the band's actual claim
 *
 * A transcript is evidence and evidence does not interpret itself. The three
 * lines worth noticing — that nothing was applied, that the inverse was
 * computed before the change was, that a person was asked — are the product,
 * and a reader who skims the panel will miss all three. `loom.callout` is the
 * library's aside and this is what it is for: the paragraph a page is allowed
 * to put *beside* its evidence without pretending it is more evidence.
 *
 * It takes `tone: "accent"` rather than `neutral`, which is the one place this
 * band spends emphasis. The section is otherwise unpainted — `loom.code` brings
 * its own tinted surface, and a band with a painted ground behind a painted
 * panel is two boxes deep before a word is read.
 *
 * ## No anchor of its own
 *
 * `loom.callout` carries an `anchor` prop and it is deliberately unset. An
 * anchor belongs to the part rather than to the design
 * ([0165](../../../decisions/0165-an-anchor-belongs-to-the-part-and-is-unique-over-the-assembled-page.md)),
 * so a design that carried a second name would make a page's fragments depend
 * on which design it happened to take — which is the asymmetry the assertion
 * over `PAGE_SEQUENCE` found in `testimonials` and refuses here by name.
 */
const TRANSCRIPT = `$ loom ask "the pricing band should lead with the team plan"

  read      page.tree.json — 214 nodes, revision 41
  proposed  1 change, authored by a model, confidence 0.82

  move  n_tier_team  ->  loom.tier-table  index 0
        "Team" now the first of three plans

  gate      stake: moderate — a priced plan changed position
            policy: ask-a-person  ->  held for review

  nothing has been applied. reply with one of:
    loom apply d_9f1c
    loom explain d_9f1c
    loom drop d_9f1c`

export const codeSessionBand: Composition = {
  id: "code-session",
  part: "code",
  label: "In your codebase, as a session transcript",
  promise:
    "One wide terminal panel printing what a single instruction does end to end, with an aside naming the three things to notice in it.",
  rationale:
    "A transcript band is one loom.code panel holding the session as a text child, with a loom.callout under it. The transcript is a node rather than a prop so a deployment can print its own, and the commentary is a separate node so it can be rewritten without touching the evidence.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.code", "loom.callout", "loom.code-span"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "readable", eyebrow: "In your codebase", anchor: "code" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "One sentence in, and nothing applied on the way out")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "lead", tone: "muted", measured: true },
          children: [
            buildText(
              ids,
              "This is the whole of an edit — the instruction, the change it became, and the verdict on whether a person has to see it first."
            ),
          ],
        }),
        buildElement(ids, {
          type: "loom.code",
          props: { language: "loom", tone: "terminal", wrap: true },
          children: [buildText(ids, TRANSCRIPT)],
        }),
        buildElement(ids, {
          type: "loom.callout",
          props: { tone: "accent", title: "Three things in that printout" },
          children: [
            buildElement(ids, {
              type: "loom.prose",
              props: { size: "body" },
              children: [
                buildText(ids, "The change is a "),
                buildElement(ids, { type: "loom.code-span", children: [buildText(ids, "move")] }),
                buildText(
                  ids,
                  " of a node that already existed, not a rewrite of the band — so undo is the inverse operation and not a restore. The Gate read the tree as it stands and decided a priced plan changing position is worth asking about. And the last line is three commands, because a held change is a question and a question has to be answerable."
                ),
              ],
            }),
          ],
        }),
      ],
    }),
}
