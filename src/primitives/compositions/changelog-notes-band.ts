import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Three releases with their notes open — the changelog as the page somebody
 * reads, where `changelogBand` is the changelog as the rail somebody scans.
 *
 * ## Why a second design, and the thing the rail structurally cannot hold
 *
 * `changelogBand` is a `loom.milestone-list` of five releases, set tight, newest
 * first. A `loom.milestone` carries `title` and `body`, and `body` is **one
 * string** — one of 0052's fixed fields, correctly, because a milestone on a
 * rail has exactly one line about it.
 *
 * A release does not have one line about it. It has three or four things that
 * changed, and they are a **list** — repeated content, which 0052 says is child
 * nodes. So the rail can say *"0.4 — bindings, held changes and a review
 * queue"* and cannot say the three of them as three things, because there is
 * nowhere in a milestone for a third item to go. Writing them into `body`
 * separated by semicolons is the shape the rule exists to refuse: a reader who
 * wants the second item moved, dropped, or set in a different weight is asking
 * for an operation against a string.
 *
 * That is the gap, and it is a gap in the *design* rather than in the library —
 * `loom.list` has been registered since the first port. This band is a release
 * per card and a `loom.list-item` per change, so every line of every release is
 * a node.
 *
 * **Both designs are right and the rail is not the lesser one.** A page whose
 * changelog band exists to prove the project is alive wants five dated lines and
 * a link; a page whose changelog band *is* the changelog wants the notes. The
 * canonical stays the canonical because the first is what a marketing page is
 * usually doing.
 *
 * ## What is a node and what is a prop
 *
 * | | | |
 * | --- | --- | --- |
 * | a release | **node**, a `loom.card` | a fourth is one `insert` at index 0, which is what shipping looks like. A `releases[]` prop would make the most routine edit this band will ever receive unreachable |
 * | a change within a release | **node**, a `loom.list-item` | the whole subject of the band, and the thing the rail could not hold |
 * | the version | **node**, a `loom.badge` | and this one is a judgement rather than a rule: it could have been a `version` prop on the card. It is a node because a release that is also *Breaking* or *Security* is two badges, and a string could hold one |
 * | the date | **`text` children of a `loom.prose`** | a sibling of the badge rather than a field of it, so a deployment that dates releases by week and not by day rewrites a text node |
 * | the release's own summary | **`text` children** | prose is children (0052) |
 * | `marker`, `density`, `justify`, `padding`, `tone` | **props** | each changes how however-many rows are drawn; none changes the set of nodes |
 *
 * ## The one prop that looks like a count and is not
 *
 * `density: "comfortable"` on the list is the near-miss
 * `docs/primitive-granularity.md` tells a band to run out loud. It reads like a
 * statement about how much there is, and it is a statement about the gap between
 * two rows — three items and thirty get the same leading, and nothing about the
 * set of nodes moves when it changes. Ask the sharper question and it is a real
 * prop.
 */
const RELEASES = [
  {
    version: "0.4",
    date: "2 October 2026",
    title: "A region may ask its own question",
    summary:
      "List-shaped content stops being authored. A region declares the question it needs answered and the answer is in hand before the walk begins, so a model is never asked to invent rows it could have read.",
    changes: [
      "Bindings: a node names a question, the host answers it, and the tree is walked once with the answer already in it.",
      "A change held for a person now carries the revision it was judged against, so a reviewer sees the page the Gate saw rather than the page as it is now.",
      "Ten of a policy's seventeen fields can be put to a change that is already on the record, and a field the record predates reads as a floor rather than an answer.",
    ],
  },
  {
    version: "0.3",
    date: "11 September 2026",
    title: "Verdicts you can argue with",
    summary:
      "Every refusal names the rules it broke, out of a closed vocabulary, so a deployment can act on a verdict without parsing a sentence.",
    changes: [
      "Fourteen stake rules, each naming itself in the verdict it contributes to.",
      "Calibration: a model's own confidence is scored against what its proposals turned out to be worth, and computed subtrees are segmented out rather than walking the record to a perfect score.",
      "The review queue tells you which page it could not read, instead of going quiet.",
    ],
  },
  {
    version: "0.2",
    date: "22 August 2026",
    title: "The first page nobody hand-wrote",
    summary:
      "A tree, a delta, and a renderer that is a total pure projection of one node — which is the whole of why a page can be changed safely by something that has never seen it.",
    changes: [
      "The delta model: insert, remove, move and configure, each with an inverse computed from the operation rather than stored beside it.",
      "A registry a deployment chooses a slice of, so a page pays for the vocabulary it uses.",
      "Starting compositions: a whole band arrives as one reviewable operation and is ordinary nodes the moment it lands.",
    ],
  },
] as const

export const changelogNotesBand: Composition = {
  id: "changelog-notes",
  part: "changelog",
  label: "Release notes",
  promise:
    "Three releases, each a card with its version, its date, a line about what it was for, and the changes it carried as a list.",
  rationale:
    "A release-notes band is a loom.stack of one loom.card per release, each holding a loom.badge and its date, a heading, a summary and a loom.list of one loom.list-item per change. Every change is a node, which is what the rail of milestones next to it cannot offer, because a milestone's body is one string.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.stack",
    "loom.card",
    "loom.badge",
    "loom.list",
    "loom.list-item",
    "loom.link",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "readable", eyebrow: "Changelog", anchor: "changelog" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "The last three releases, and what was actually in them")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.stack",
          props: { direction: "column", gap: "normal" },
          children: RELEASES.map((release) =>
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "surface", padding: "loose" },
              children: [
                buildElement(ids, {
                  type: "loom.stack",
                  /**
                   * `between` puts the version at the leading edge and the date
                   * at the trailing one, which is the arrangement that survives
                   * a release whose version is `0.4` beside one that is
                   * `0.4.1-rc.2`: both dates stay in the same column. `baseline`
                   * rather than `center`, because a badge sets its own smaller
                   * type on a tinted ground and a centred row would hang its
                   * text a pixel or two off the date beside it.
                   */
                  props: { direction: "row", justify: "between", align: "baseline", gap: "snug", wrap: true },
                  children: [
                    buildElement(ids, {
                      type: "loom.badge",
                      props: { tone: "accent" },
                      children: [buildText(ids, release.version)],
                    }),
                    buildElement(ids, {
                      type: "loom.prose",
                      props: { size: "small", tone: "muted" },
                      children: [buildText(ids, release.date)],
                    }),
                  ],
                }),
                buildElement(ids, {
                  type: "loom.heading",
                  props: { level: 3 },
                  children: [buildText(ids, release.title)],
                }),
                buildElement(ids, {
                  type: "loom.prose",
                  props: { tone: "muted" },
                  children: [buildText(ids, release.summary)],
                }),
                buildElement(ids, {
                  type: "loom.list",
                  props: { marker: "bullet", density: "comfortable", size: "small" },
                  children: release.changes.map((change) =>
                    buildElement(ids, {
                      type: "loom.list-item",
                      props: {},
                      children: [buildText(ids, change)],
                    })
                  ),
                }),
              ],
            })
          ),
        }),
        buildElement(ids, {
          type: "loom.link",
          props: { href: "/changelog" },
          children: [buildText(ids, "Everything, back to the first commit")],
        }),
      ],
    }),
}
