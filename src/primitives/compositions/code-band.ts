import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The band that shows the code — missing from a library whose own product is a
 * package a developer installs.
 *
 * ## How a hole this size stayed open for ninety-six primitives
 *
 * `loom.code`, `loom.code-span` and `loom.kbd` have been registered, tested and
 * documented for weeks, and **no band in the catalogue used any of them.** The
 * measurement that found it is in this run's report: forty-four of ninety-six
 * registered primitives are unreachable from the phrasebook, and the three
 * above are the cluster that matters most, because the page this library is
 * first going to have to draw is Loom's own.
 *
 * Nothing was wrong. Every run before this one ported *content models* —
 * a pricing table, a testimonial wall, a team grid — and a content model is a
 * shape a page holds. A code panel is not a shape a page holds; it is a shape a
 * *developer product's* page holds, and no Hermes block was one, because
 * Hermes' users are creators rather than developers. The gap is in the
 * provenance of the queue rather than in anybody's judgement, and that is worth
 * saying because the same blind spot covers the rest of the forty-four.
 *
 * ## Why `code` is a part and not a second design of `steps`
 *
 * [0171](../../../decisions/0171-a-page-part-is-earned-by-the-region-it-occupies.md)
 * asks what region a candidate occupies. `steps` occupies *how the thing works*
 * and answers it in prose; this occupies *what it looks like in your
 * repository* and answers it in the only notation that can — a reader who
 * wants to know whether the integration is four lines or four hundred is not
 * served by a sentence claiming it is four.
 *
 * The sharper evidence is that the two cannot substitute. Swap `steps` for this
 * and the page loses its explanation of the workflow; swap this for `steps` and
 * the page loses its only claim a developer can check. A part that another part
 * can stand in for is a design of that part, and these fail that test in both
 * directions.
 *
 * ## The three spans in the lede, which are the small half of the argument
 *
 * The paragraph under the heading holds `loom.code-span` nodes inside a
 * `loom.prose`, which is the first time in the catalogue a sentence contains
 * anything but text. That is worth noticing rather than passing over: a prose
 * node's children have always been able to be elements, and every band so far
 * has put a whole string in one text node, so the *capability* to say
 * `createStarterPrimitiveRegistry` in the middle of a sentence and have it read
 * as a name rather than as prose has been there and unexercised. A page that
 * cannot name an identifier inside a sentence writes worse sentences.
 *
 * `loom.kbd` is in the list rather than in the lede, and the distinction is
 * real: a code span is *a name in the system* and a kbd is *a key on the
 * reader's keyboard*, and running the two together is the most common thing a
 * documentation stylesheet gets wrong.
 *
 * ## The two panels, and why one is a terminal
 *
 * `tone: "terminal"` draws the window bar with its three dots, which says *this
 * is a thing you run* before a reader has read a character of it, and
 * `tone: "source"` puts the filename where a filename goes. Nothing in the copy
 * has to say which is which. That is one `configure` apart and stays a prop for
 * the granularity doc's own reason — changing it changes no node — but the pair
 * being *present* is a design decision this band makes, because an install line
 * on its own is a claim about setup and a source listing on its own is a claim
 * about the API, and the objection this band answers needs both.
 *
 * `density: "compact"` on the terminal, because a one-line command in a panel
 * sized for a listing reads as a listing with most of it missing.
 *
 * ## What the split does at 390px, and the ratio the screenshot overturned
 *
 * `loom.split` wraps rather than shrinking, so on a phone the prose column and
 * the panel column become two stacked blocks in tree order — the explanation,
 * then the code. That is the order that survives the collapse, and it is why
 * the panels are the `end` region rather than the `start`: the reverse stacks a
 * reader into a code listing before they have been told what it is for.
 *
 * **This band shipped at `start-wide` and the first photograph was the
 * argument against it.** The reasoning had been that the left column is
 * sentences and deserves the room. It is wrong, and wrong in a way only a
 * picture shows: prose reflows and a code listing does not. Given the narrow
 * half, the source panel's first line was cut mid-identifier at
 * `createStarterPrimitiveRegistr`, which reads as a broken page rather than as
 * a line that continues. The column that cannot reflow is the column that
 * needs the width, so it is `end-wide`.
 *
 * ## `wrap: true` on the source panel, which is a real trade and not a tidy-up
 *
 * `loom.code` defaults to `wrap: false` and its header is right about why: a
 * shell line broken across two rows reads as two commands. The same objection
 * applies with less force to source — a wrapped statement can be misread as
 * two statements — so the default is not simply wrong here.
 *
 * It loses anyway, at one viewport. At 390 the panel is 348 wide and **no
 * ratio helps**, because the split has collapsed and there is no wider column
 * to give. Unwrapped, every line of the listing ends behind a horizontal
 * gesture inside a band whose whole claim is *this is the whole of the
 * integration*. So the trade is a statement that might wrap on a phone against
 * a listing that is definitely truncated on one, and the second is worse.
 *
 * The cost is paid down rather than accepted: every line of `SOURCE` is under
 * 63 characters, so at 1280 in the wide column nothing wraps at all and the
 * prop does nothing. It is there for the phone.
 */
const STEPS = [
  { before: "Install it beside your app — it is a library, not a service, and it ships no runtime of its own: ", code: "@loom/runtime" },
  { before: "Register the primitives your pages are allowed to be made of, plus any of your own: ", code: "createStarterPrimitiveRegistry" },
  { before: "Hand an instruction and the current tree to the seam, and read back a proposal: ", code: "commitIntent" },
] as const

const INSTALL = "pnpm add @loom/runtime"

/**
 * Every line is under 63 characters, which is a constraint the screenshot
 * imposed rather than a preference. See the note on `wrap` below.
 */
const SOURCE = `import { createStarterPrimitiveRegistry } from "@loom/runtime"

const registry = createStarterPrimitiveRegistry()

const proposed = await commitIntent({
  intent: { origin: "user-instruction", utterance },
  tree,
  interpreter,
})

// Nothing is applied. What came back is a delta
// you can read, its inverse, and the Gate's verdict
// on whether a person has to see it first.`

export const codeBand: Composition = {
  id: "code",
  part: "code",
  label: "In your codebase",
  promise:
    "A band with the integration explained on one side and two panels on the other — the install line as a terminal, and the call as a source listing.",
  rationale:
    "A code band is a loom.split whose start region explains and whose end region shows. The explanation is a numbered loom.list so a step can be added or dropped as a node, and each panel is a loom.code whose snippet is a text child rather than a prop, so the code is editable by the same operations as any other text on the page.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.code-span",
    "loom.split",
    "loom.stack",
    "loom.list",
    "loom.list-item",
    "loom.kbd",
    "loom.code",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "In your codebase", anchor: "code" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Three lines you write, and nothing to wire up")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.split",
          props: { ratio: "end-wide", align: "start" },
          children: [
            buildSlot(ids, "start", [
              buildElement(ids, {
                type: "loom.stack",
                props: { direction: "column", gap: "normal" },
                children: [
                  buildElement(ids, {
                    type: "loom.prose",
                    props: { size: "lead", tone: "muted", measured: true },
                    children: [
                      buildText(ids, "There is no build step and no hosted runtime. "),
                      buildElement(ids, { type: "loom.code-span", children: [buildText(ids, "@loom/runtime")] }),
                      buildText(ids, " is an ordinary dependency, and the page it changes is the page you already have."),
                    ],
                  }),
                  buildElement(ids, {
                    type: "loom.list",
                    props: { marker: "number", density: "loose", size: "body" },
                    children: STEPS.map((step) =>
                      buildElement(ids, {
                        type: "loom.list-item",
                        children: [
                          buildText(ids, step.before),
                          buildElement(ids, { type: "loom.code-span", children: [buildText(ids, step.code)] }),
                        ],
                      })
                    ),
                  }),
                  buildElement(ids, {
                    type: "loom.prose",
                    props: { size: "small", tone: "muted" },
                    children: [
                      buildText(ids, "Reviewing a proposal is a keystroke: "),
                      buildElement(ids, { type: "loom.kbd", children: [buildText(ids, "A")] }),
                      buildText(ids, " applies it, "),
                      buildElement(ids, { type: "loom.kbd", children: [buildText(ids, "Esc")] }),
                      buildText(ids, " leaves the page as it was."),
                    ],
                  }),
                ],
              }),
            ]),
            buildSlot(ids, "end", [
              buildElement(ids, {
                type: "loom.stack",
                props: { direction: "column", gap: "normal" },
                children: [
                  buildElement(ids, {
                    type: "loom.code",
                    props: { language: "bash", tone: "terminal", density: "compact" },
                    children: [buildText(ids, INSTALL)],
                  }),
                  buildElement(ids, {
                    type: "loom.code",
                    props: {
                      language: "app/page.tsx",
                      tone: "source",
                      wrap: true,
                      caption: "The whole of the integration. Everything after this is an instruction in a sentence.",
                    },
                    children: [buildText(ids, SOURCE)],
                  }),
                ],
              }),
            ]),
          ],
        }),
      ],
    }),
}
