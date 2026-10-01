import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Six integrations, each saying what it actually does.
 *
 * `integrationsBand` draws a ring: eight marks circling one, which says *these
 * connect to that* and is the one thing a row of logos cannot draw. It is the
 * better band by some distance when the reader's question is **does this fit
 * into my stack at all**, because the answer is a shape and they get it without
 * reading a word.
 *
 * It is the wrong band for the reader one question further on, and that reader
 * is the one who converts. *GitHub* in a ring tells them there is an
 * integration. It does not tell them whether it opens pull requests, reads
 * them, or only posts a link into a channel — and the gap between those three
 * is the whole of whether the product does their job. An orbit has nowhere to
 * put that sentence: a `loom.logo` is a wordmark and a mark has no room for
 * prose, which is exactly right for what it is and is why this is a second band
 * rather than a prop on the first.
 *
 * ## What changes, in 0162's terms
 *
 * The orbit is `loom.orbit` holding a `loom.logo` per tool, with one in a
 * `mark` slot. This is a `loom.grid` holding a `loom.card` per tool, each with
 * a `loom.logo` and a `loom.prose` inside it.
 * [0162](../../../decisions/0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)'s
 * test is *does this build a different set of nodes*, and the honest way to see
 * that it does is the centre: **the orbit has a node this band has no place
 * for.** The product's own mark is the middle of a ring and is nothing in a
 * grid, so turning one band into the other is a `remove` as well as an `insert`
 * — not a `configure`, in the same way and for the same reason as `metrics` and
 * `metrics-chart`.
 *
 * ## Six, and why fewer than the ring's eight
 *
 * A ring is decorative arithmetic and eight marks space evenly around one. A
 * grid is read, and each cell now costs a reader three lines instead of one
 * word, so eight is a wall. Six is two full rows of three at 1280px and three
 * of two at a tablet, and the six chosen are the ones whose *sentence* differs
 * most — there is no value in a second issue tracker saying what the first one
 * said.
 *
 * ## The name is the wordmark, and there is no heading under it
 *
 * A first draft of this band gave each card a `loom.heading` as well, and the
 * card then said *GitHub* twice — once as a mark and once as a title. The mark
 * is the name here, so the heading was not structure, it was a duplicate with a
 * bigger font.
 *
 * Dropping it costs the band its `<h3>`s, which is worth stating rather than
 * glossing: the section's own `<h2>` remains the only heading in the band, and
 * a screen-reader user navigating this page by heading gets *Works with* and
 * then the next band. That is the correct outline for what this is — six
 * siblings of equal weight, none of which is a subsection of the page — and the
 * alternative on offer was not a better outline but the same one with the names
 * read out twice.
 *
 * ## Wordmarks rather than images, which is the whole catalogue's rule
 *
 * `loom.logo` sets the name as a wordmark when it has no `image`, and this band
 * inherits that for the reason `integrationsBand` gives and a test enforces:
 * a composition cannot ship an asset, so a logo here would be either a broken
 * path in a host's `public/` or eight live requests to third parties from a page
 * nobody has read yet.
 *
 * There is a second reason that is specific to this band and worth saying,
 * because it is about honesty rather than about plumbing. These are placeholder
 * integrations in a starting composition. A real logo — the actual GitHub mark,
 * in GitHub's own colors — reads as a **partnership that has been agreed**,
 * and shipping one in a band a host may publish before re-reading it would have
 * this library making a claim on their behalf that nobody has earned. A
 * wordmark says the same true thing and claims nothing.
 */
type Integration = { readonly name: string; readonly what: string }

const INTEGRATIONS: readonly Integration[] = [
  {
    name: "GitHub",
    what: "Reads branches, pull requests and reviews. A board column moves when the pull request does, not when somebody remembers.",
  },
  {
    name: "Linear",
    what: "Two-way on issues and status. An issue closed in either place is closed in both, with one history rather than two.",
  },
  {
    name: "Slack",
    what: "Posts what changed into the channel that asked for it, and takes a reply there as a comment here.",
  },
  {
    name: "Figma",
    what: "Embeds a frame beside the work it belongs to, and updates it when the file does. No screenshots going stale.",
  },
  {
    name: "Sentry",
    what: "Turns an unhandled error into an item on the board, with the release that introduced it already attached.",
  },
  {
    name: "Vercel",
    what: "Marks each item with the deployment carrying it, so shipped means the preview a reviewer actually opened.",
  },
]

export const integrationsGridBand: Composition = {
  id: "integrations-grid",
  part: "integrations",
  label: "Works with, explained",
  promise: "Six integrations as cards, each naming the tool and saying what it does with it.",
  rationale:
    "An explained works-with band is a loom.grid of loom.card, each holding a loom.logo for the wordmark and a loom.prose for what it does. Each integration is its own nodes, so one can be added, dropped or rewritten without touching the others — and each has somewhere to say what it does, which a ring of marks has not.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.grid", "loom.card", "loom.logo"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", tone: "surface", eyebrow: "Works with", anchor: "integrations" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true, align: "center" },
            children: [buildText(ids, "It reads and writes the things you already keep")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted", align: "center" },
          children: [buildText(ids, "Nothing is migrated and nothing is mirrored. Each of these is two-way unless it says otherwise.")],
        }),
        buildElement(ids, {
          type: "loom.grid",
          props: { columns: "three", gap: "loose", align: "stretch" },
          children: INTEGRATIONS.map((integration) =>
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "outline", padding: "loose" },
              children: [
                buildElement(ids, { type: "loom.logo", props: { name: integration.name } }),
                buildElement(ids, {
                  type: "loom.prose",
                  props: { tone: "muted", size: "small" },
                  children: [buildText(ids, integration.what)],
                }),
              ],
            })
          ),
        }),
      ],
    }),
}
