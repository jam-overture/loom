import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Works with, as a ribbon that keeps going — the band for a list too long to
 * draw.
 *
 * ## The region neither other design occupies
 *
 * `integrations` is a `loom.orbit`: eight tools arranged around the product's
 * own mark, which says *these are the things it touches* and says it about
 * exactly as many tools as will fit on a ring. `integrations-grid` is six cards
 * that each explain what the integration does, which says *here is what each
 * one is for* and costs a paragraph per tool.
 *
 * Both are closed lists drawn at their full extent, and that is the shape of
 * the claim they can make. Neither can say **the list is longer than this
 * band** — the thing a page with forty connectors actually needs to say, and
 * the reason a moving ribbon of marks is on nearly every product site that has
 * one. A ring with forty logos on it is unreadable and a grid of forty cards is
 * its own page.
 *
 * ## One row, not two, and the reason is not symmetry with the quote wall
 *
 * `testimonials-wall` runs two `loom.marquee` rows in opposite directions, and
 * copying that here was the obvious move and is the wrong one. A quote is a
 * card with four lines of text in it, so two rows of quotes read as two bands
 * of reading; a logo is a short uniform mark, so two rows of logos read as a
 * grid that happens to be moving — which is `integrations-grid` with the
 * explanations taken out and the stillness taken away.
 *
 * One row at `loose` density is a ribbon. It is the honest drawing of *this
 * continues*, and a second row is one `insert` away for a page that wants it,
 * which is the whole argument for building these out of nodes.
 *
 * ## `edges: "faded"` is doing load-bearing work here
 *
 * A marquee with hard edges tells a reader the band ends where the viewport
 * does, which is the opposite of the claim. The fade is what makes the row read
 * as a window onto a longer list rather than as a strip that happens to be
 * cropped. It is a prop and correctly so — no operation reorders glyphs and
 * none of this changes the set of nodes — but it is the prop the band's meaning
 * rests on, so it is set explicitly rather than left to a default that could
 * move underneath it.
 *
 * ## The way out is a node, and it is the half the ribbon cannot carry
 *
 * A reader who sees a moving list of marks has exactly one question — *is the
 * one I use in there?* — and a ribbon cannot answer it, because it is moving
 * and because it is a sample. So the band ends with a `loom.action` to the full
 * list. That is a node rather than a prop on the marquee for the ordinary 0052
 * reason, and the consequence is the one that matters: a deployment with no
 * integrations page removes one node, and a deployment with a directory points
 * it somewhere else with one `configure`. A `seeAllHref` prop on a marquee
 * would have made both of those a code change in this library.
 *
 * ## No logo carries an image, and that is the standing gap rather than a choice
 *
 * `loom.logo` renders its `name` as a wordmark when it has no `image`, which is
 * what every band in this catalogue does and what `compositions.test.ts`
 * enforces outright — the catalogue ships no image source at all, because
 * `mediaUrlSchema` excludes `data:` and a `/path` is a broken image on every
 * deployment that does not host it. So this band is a ribbon of wordmarks. It
 * reads well and it is not what a designer would hand you; the seven primitives
 * blocked on the same thing are on the gap inventory's unreached list, and this
 * band is the third design the part could have either way.
 *
 * ## The anchor and the eyebrow belong to the part
 *
 * `#integrations`, `Works with`, and `tone: "surface"`, matching both other
 * designs. The anchor is asserted for every design of every part; the eyebrow
 * and the tone are not, and they are matched anyway because a host swapping
 * designs is changing the drawing and not the band's place on the page.
 */
const TOOLS = [
  "GitHub",
  "Linear",
  "Figma",
  "Slack",
  "Notion",
  "Vercel",
  "Sentry",
  "Stripe",
  "Postgres",
  "Datadog",
  "Zapier",
  "Airtable",
] as const

export const integrationsMarqueeBand: Composition = {
  id: "integrations-marquee",
  part: "integrations",
  label: "Works with, as a moving ribbon",
  promise: "Twelve tools travelling across the page in one faded row, with a link to the rest beneath them.",
  rationale:
    "A ribbon of integrations is a loom.marquee holding a loom.logo per tool, with a loom.action to the full list beneath it. Each mark is a node, so one can be added or dropped without touching the row, and the link out is a node rather than a prop so a deployment without an integrations page simply removes it.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.marquee", "loom.logo", "loom.action", "loom.stack"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", tone: "surface", align: "center", eyebrow: "Works with", anchor: "integrations" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true, align: "center" },
            children: [buildText(ids, "It already speaks to the things on your desk")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted", align: "center" },
          children: [
            buildText(
              ids,
              "Read and write where the work already lives. Nothing is migrated, nothing is mirrored, and none of it is a new place to check."
            ),
          ],
        }),
        buildElement(ids, {
          type: "loom.marquee",
          props: { direction: "start", density: "loose", edges: "faded" },
          children: TOOLS.map((tool) =>
            buildElement(ids, {
              type: "loom.logo",
              props: { name: tool, surface: "card" },
            })
          ),
        }),
        buildElement(ids, {
          type: "loom.stack",
          props: { direction: "row", justify: "center", gap: "normal" },
          children: [
            buildElement(ids, {
              type: "loom.action",
              props: { href: "/integrations", variant: "quiet", scale: "medium" },
              children: [buildText(ids, "See every connector")],
            }),
          ],
        }),
      ],
    }),
}
