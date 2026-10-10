import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { DocumentComposition } from "./document.js"

/**
 * The text itself — one continuous document, with the way around it beside it.
 *
 * ## The region, and the two parts that look like they could stand in for it
 *
 * This is the body of a reference page, and 0171's swap test is what admits it
 * rather than a feeling that documentation is different:
 *
 * - **`features` is the landing page's body region and it is a grid of claims
 *   that is scanned.** A reference page whose body is three columns of
 *   feature cards contains no reference. A landing page whose body is nine
 *   hundred words of prose has no features. Neither direction survives.
 * - **`articles` is a selection of what the site publishes** — a run of teasers,
 *   each a link to somewhere else. This is **one** document, read start to
 *   finish, and the reader is already in it.
 *
 * ## The contents rail is a region of this band and not a band
 *
 * An *On this page* rail is a real region of a reference page and it cannot be
 * a sibling of the text: `loom.page` stacks its children in one column, so a
 * region **beside** the prose is not a band at all. It is the `end` region of a
 * `loom.split` here, which is also what makes it fold under the text on a phone
 * for free — nothing in a render reads a viewport (0008), and the split is the
 * primitive that already knows how to stop being two columns.
 *
 * ## Every subsection is a `loom.section`, because a contents rail needs
 * somewhere to point
 *
 * This is the one structural decision in the band that was forced rather than
 * chosen, and it is worth naming because the obvious shape is wrong. The
 * obvious shape is a `loom.stack` of `loom.heading` nodes — and only
 * `loom.section`, `loom.hero` and `loom.callout` accept an `anchor`, so a rail
 * built over headings would hold four links pointing at **nothing**: no error,
 * no diagnostic, and four presses that do not move the page. That is 0165's
 * defect class exactly, and the fix is that a subsection a rail can name is a
 * region with a name, which is a section.
 *
 * So the anchors are real and the rail's four `href`s are the four sections'
 * own. `documents.test.ts` holds that pairing in both directions, which is the
 * assertion 0183's second consequence asked for on the landing page and nothing
 * had yet asked for here.
 *
 * ## What the prose actually says
 *
 * It documents `planComposition`, and the parameter table is its real signature
 * rather than a lorem table with four rows in it. A reference page in a
 * catalogue is read by whoever is deciding whether this library can draw their
 * documentation, and a page whose code sample would not compile answers that
 * question in the wrong direction.
 */

/** The four subsections, each addressable, in the order the rail lists them. */
const SECTIONS = ["what-a-band-is", "dropping-one-in", "the-arguments", "what-lands"] as const

/** The rail, which is these four and is asserted against them rather than retyped. */
const CONTENTS: readonly { readonly anchor: (typeof SECTIONS)[number]; readonly label: string }[] = [
  { anchor: "what-a-band-is", label: "What a band is" },
  { anchor: "dropping-one-in", label: "Dropping one in" },
  { anchor: "the-arguments", label: "The arguments" },
  { anchor: "what-lands", label: "What lands on the page" },
]

const SAMPLE = `const band = compositionById("pricing")
if (band === undefined) return

const plan = planComposition(band, tree, ids)

if (plan.outcome === "planned") {
  await commitIntent(intent, compositionInterpreter(band, ids, clock))
}`

/** `planComposition`'s real parameters, in the order it takes them. */
const ARGUMENTS: readonly (readonly [string, string, string])[] = [
  ["composition", "Band", "The band to plan. Only its build is read, so a band of any page sequence is accepted."],
  ["tree", "LoomTree", "Resolved against the tree as it stands, never against the tree the button was drawn from."],
  ["ids", "IdFactory", "Fresh ids are minted on every call, so planning the same band twice gives two subtrees."],
  ["target", "CompositionTarget", "Optional. The parent and the index; the index is clamped and a missing parent refuses."],
]

const subsection = (
  ids: IdFactory,
  anchor: (typeof SECTIONS)[number],
  heading: string,
  children: readonly ElementNode[]
): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    /**
     * `full` because the measure is already set by the band around it and the
     * split column around that. A nested section that constrained its own width
     * again would indent each subsection further than the last.
     */
    props: { width: "full", anchor },
    children: [
      buildSlot(ids, "heading", [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 2 },
          children: [buildText(ids, heading)],
        }),
      ]),
      ...children,
    ],
  })

export const documentBand: DocumentComposition = {
  id: "document",
  part: "document",
  label: "Reference document",
  promise:
    "The page's title, its lede, and four addressable sections of prose, code and a parameter table, with an On this page rail beside them.",
  rationale:
    "A document is one continuous text, so the band is a loom.split whose start region holds the prose and whose end region holds the contents rail — a region beside the text cannot be a band, because loom.page stacks its children in one column. Each subsection is its own loom.section rather than a bare loom.heading, because only a section takes an anchor and a rail built over headings would point at nothing. The rail is a loom.link-list of loom.link nodes, so adding a section is an insert in two places a test holds together rather than a prop nobody predicted. The code is children of loom.code and the table is loom.table-row and loom.table-cell nodes, so a delta can reach one row or one cell.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.divider",
    "loom.split",
    "loom.stack",
    "loom.link-list",
    "loom.link",
    "loom.code",
    "loom.code-span",
    "loom.callout",
    "loom.list",
    "loom.list-item",
    "loom.table",
    "loom.table-row",
    "loom.table-cell",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Guide", anchor: "starting-from-a-band" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            /**
             * The document's title is the page's one level-one heading. A
             * landing page's is in its hero; this sequence has no hero, which
             * is the thing 0183 named as the trigger for a second sequence, and
             * `documents.test.ts` holds the count at one either way.
             */
            type: "loom.heading",
            props: { level: 1, balance: true },
            children: [buildText(ids, "Starting from a band")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "lead", measured: true },
          children: [
            buildText(
              ids,
              "A band is a whole region of a page that the catalogue drops in as one reviewable operation. This is what one is, how to plan one against a tree, and what you are left holding afterwards."
            ),
          ],
        }),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "small", tone: "muted" },
          children: [buildText(ids, "Updated 8 October 2026 · six minutes · applies from 0162")],
        }),
        buildElement(ids, { type: "loom.divider", props: { ornament: "rule", spacing: "normal" } }),
        buildElement(ids, {
          /**
           * `start-wide` puts the text first and the rail second, which is both
           * the reading order a screen reader gets and the order they stack in
           * when the split folds. A rail that came first would put four links
           * above the title on every phone.
           */
          type: "loom.split",
          props: { ratio: "start-wide", align: "start" },
          children: [
            buildSlot(ids, "start", [
              buildElement(ids, {
                type: "loom.stack",
                props: { direction: "column", gap: "loose" },
                children: [
                  subsection(ids, "what-a-band-is", "What a band is", [
                    buildElement(ids, {
                      type: "loom.prose",
                      props: { measured: true },
                      children: [
                        buildText(ids, "A band is a pure function from an "),
                        buildElement(ids, { type: "loom.code-span", children: [buildText(ids, "IdFactory")] }),
                        buildText(
                          ids,
                          " to a subtree. It registers nothing, renders nothing and adds no primitive — every node it builds is a type already in the registry."
                        ),
                      ],
                    }),
                    buildElement(ids, {
                      type: "loom.prose",
                      props: { measured: true },
                      children: [
                        buildText(
                          ids,
                          "What it is emphatically not is a component. Nothing records which band a region came from, and nothing can: what lands is ordinary nodes, indistinguishable from nodes a model wrote one at a time. That is the property that keeps a catalogue a convenience over the delta model rather than a second way to author one."
                        ),
                      ],
                    }),
                    buildElement(ids, {
                      type: "loom.list",
                      props: { marker: "bullet", density: "comfortable", measured: true },
                      children: [
                        buildElement(ids, {
                          type: "loom.list-item",
                          children: [buildText(ids, "One insert carries the whole subtree, so a band is one operation to review.")],
                        }),
                        buildElement(ids, {
                          type: "loom.list-item",
                          children: [buildText(ids, "Its inverse is a remove of one node, which is the cheapest undo in the system.")],
                        }),
                        buildElement(ids, {
                          type: "loom.list-item",
                          children: [buildText(ids, "Afterwards it has no further opinion, because it is not in the tree at all.")],
                        }),
                      ],
                    }),
                  ]),
                  subsection(ids, "dropping-one-in", "Dropping one in", [
                    buildElement(ids, {
                      type: "loom.prose",
                      props: { measured: true },
                      children: [
                        buildText(
                          ids,
                          "A band is handed to the ordinary seam rather than written to the store, so it is assessed, gated, held for a person when the policy says so, logged, and revertable."
                        ),
                      ],
                    }),
                    buildElement(ids, {
                      type: "loom.code",
                      props: {
                        language: "ts",
                        tone: "source",
                        caption: "Planning a band against the tree as it stands",
                        density: "comfortable",
                      },
                      children: [buildText(ids, SAMPLE)],
                    }),
                    buildElement(ids, {
                      type: "loom.callout",
                      props: { tone: "accent", title: "There is no second channel" },
                      children: [
                        buildElement(ids, {
                          type: "loom.prose",
                          children: [
                            buildText(
                              ids,
                              "A surface that built the subtree and wrote it to the store would put the only change on the page that nobody judged. A band that cannot pass the Gate does not land."
                            ),
                          ],
                        }),
                      ],
                    }),
                  ]),
                  subsection(ids, "the-arguments", "The arguments", [
                    buildElement(ids, {
                      type: "loom.prose",
                      props: { measured: true },
                      children: [
                        buildText(ids, "Everything "),
                        buildElement(ids, { type: "loom.code-span", children: [buildText(ids, "planComposition")] }),
                        buildText(ids, " reads, and what it does when one of them is stale."),
                      ],
                    }),
                    buildElement(ids, {
                      type: "loom.table",
                      props: { caption: "planComposition", tone: "panel", rules: "rows", prose: true, density: "comfortable" },
                      children: [
                        buildSlot(ids, "columns", [
                          buildElement(ids, {
                            type: "loom.table-row",
                            children: ["Argument", "Type", "What it does"].map((heading) =>
                              buildElement(ids, {
                                type: "loom.table-cell",
                                props: { role: "column" },
                                children: [buildText(ids, heading)],
                              })
                            ),
                          }),
                        ]),
                        ...ARGUMENTS.map(([name, type, detail]) =>
                          buildElement(ids, {
                            type: "loom.table-row",
                            children: [
                              buildElement(ids, {
                                type: "loom.table-cell",
                                props: { role: "row" },
                                children: [buildElement(ids, { type: "loom.code-span", children: [buildText(ids, name)] })],
                              }),
                              buildElement(ids, {
                                type: "loom.table-cell",
                                children: [buildElement(ids, { type: "loom.code-span", children: [buildText(ids, type)] })],
                              }),
                              buildElement(ids, {
                                type: "loom.table-cell",
                                children: [buildText(ids, detail)],
                              }),
                            ],
                          })
                        ),
                      ],
                    }),
                  ]),
                  subsection(ids, "what-lands", "What lands on the page", [
                    buildElement(ids, {
                      type: "loom.prose",
                      props: { measured: true },
                      children: [
                        buildText(
                          ids,
                          "Thirty addressable nodes, and then nothing with an opinion about them. Move the second plan's button above its perks, remove the third question, re-word one cell — each is an operation against a tree, and none of them is reachable against a prop bag somebody had to predict."
                        ),
                      ],
                    }),
                  ]),
                ],
              }),
            ]),
            buildSlot(ids, "end", [
              buildElement(ids, {
                type: "loom.link-list",
                props: { label: "On this page", direction: "column" },
                children: CONTENTS.map((entry) =>
                  buildElement(ids, {
                    type: "loom.link",
                    props: { href: `#${entry.anchor}`, tone: "muted", scale: "small" },
                    children: [buildText(ids, entry.label)],
                  })
                ),
              }),
            ]),
          ],
        }),
      ],
    }),
}
