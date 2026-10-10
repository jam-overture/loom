import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * One row of links and a claim about right now.
 *
 * ## The region the other two footers leave empty
 *
 * `footer` is four columns of links beside a wordmark: the sitemap footer, and
 * the right one for a site with four sections worth naming. `footer-signup`
 * trades two of those columns for a capture form: the last-chance footer.
 *
 * Both are **archives** — they describe what the site contains. Neither can say
 * anything about *the state of the thing right now*, and that is the sentence a
 * footer on a product site is increasingly the only place for: a reader at the
 * bottom of a landing page who is about to depend on this wants to know whether
 * it is up, and wants it from the page rather than from a search.
 *
 * So the region here is a **live claim plus the link that backs it**. That is a
 * `loom.badge` and a `loom.link` inside a `loom.stack`, which is three node
 * types none of which appears in either other design — the structural
 * difference `compositions.test.ts` asserts is the difference the band is
 * about, rather than an arrangement made to satisfy it.
 *
 * ## Why the claim is a badge and the backing is a link beside it
 *
 * `loom.badge` has no `href` and should not get one. A badge is a label on
 * something, and a badge that navigated would be a control that looks like a
 * label — the class of defect 0234's filing is about, where the thing a reader
 * can press and the thing they can only read are drawn the same. So the badge
 * carries the state and the link carries the destination, as two nodes.
 *
 * The dividend is the one worth having: *the status badge is a node*. A
 * deployment in the middle of an incident changes `All systems normal` to
 * `Degraded — see status` with one `configure` on a text child, and a
 * deployment with no status page removes two nodes. Neither is a code change in
 * this library, and both would have been if this were a `statusLabel` prop on
 * `loom.footer`.
 *
 * ## One group, running across, and why that is not `footer` with a prop turned down
 *
 * `loom.footer`'s `columns` is a floor fed to `auto-fit` — a minimum width per
 * group, never a count — and the vocabulary is `auto`, `two`, `three`, `four`
 * with **no `one`**, which looked at first like the thing standing in the way
 * of a single full-width row.
 *
 * It is not, and the reason is a property of `auto-fit` rather than of this
 * library: **`auto-fit` collapses the repeated tracks nothing lands in**, where
 * `auto-fill` would hold them open. So one group under `columns: "auto"` is one
 * track at `1fr` — the full width of the groups region — and `direction: "row"`
 * lays its links across it. A `one` added to `COLUMN_NAMES` would have been a
 * fifth name for the behaviour `auto` already has with one child, on a shared
 * vocabulary four other primitives read.
 *
 * That is worth writing down because the first draft of this band did add it,
 * and `auto` is also the only name whose `promisedWidth` is `undefined` — it
 * promises no column count, which is the honest declaration for a band with one
 * group.
 *
 * It is worth being precise about why this is a third design and not a
 * `configure` of the first, because *fewer columns* on its own would be exactly
 * that. `footer` builds four `loom.link-list` nodes; this builds one. The number
 * of children is the set of nodes, so moving between them is three `remove`
 * operations and a rewrite of the survivor, not a prop change — and the
 * granularity doc's own test, *does changing this change the set of nodes?*,
 * answers yes. The badge and the status link settle it either way.
 *
 * ## The row carries no label, which is the same correction the split contact
 * band took from the same photograph
 *
 * `loom.link-list` draws its `label` as small uppercase above the links, and
 * the only honest label for the one row in a footer is the site's own name —
 * which is already set as a wordmark at heading size an inch to its left. Two
 * `Overture`s on one line of a footer is furniture, so the row is unlabelled,
 * exactly as `footer`'s legal row has always been.
 *
 * ## What it gives up, said plainly
 *
 * The group labels. `footer`'s four `loom.link-list` nodes each carry a `label`
 * which is also the landmark's accessible name, so a screen-reader user gets
 * *Product*, *Company*, *Resources*, *Legal* as four navigable regions. One row
 * is one region named *Overture*, and six links in it rather than fifteen.
 *
 * That is a real loss and it is the reason this is a third design rather than a
 * replacement: a site with fifteen destinations should take `footer`. This one
 * is for a site with six, where four columns of two links each is a sitemap
 * pretending to be bigger than it is.
 *
 * ## The site names itself twice, and a test insists
 *
 * `compositions.test.ts` holds that every design of the bar and the footer calls
 * the site the same name, and that a footer names it in **both** its brand
 * region and its legal line — the one in the wordmark and the one in the
 * copyright. `Overture`, matching `nav`, `footer` and `footer-signup`.
 */
const LINKS = [
  { text: "Product", href: "/product" },
  { text: "Pricing", href: "/pricing" },
  { text: "Docs", href: "/docs" },
  { text: "Changelog", href: "/changelog" },
  { text: "About", href: "/about" },
  { text: "Contact", href: "/contact" },
] as const

const LEGAL = [
  { text: "Privacy", href: "/privacy" },
  { text: "Terms", href: "/terms" },
] as const

export const footerStatusBand: Composition = {
  id: "footer-status",
  part: "footer",
  label: "Footer, one row and a status line",
  promise: "A wordmark with a live status badge beside it, one row of six links, and the legal line beneath.",
  rationale:
    "A compact footer is a loom.footer whose brand region holds the wordmark beside a loom.badge and the loom.link to the status page that backs it, over a single loom.link-list running across. The status claim is a node rather than a prop, so an incident is one configure on a text child and a deployment with no status page removes two nodes.",
  uses: ["loom.footer", "loom.heading", "loom.prose", "loom.stack", "loom.badge", "loom.link-list", "loom.link"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.footer",
      props: { tone: "plain", columns: "auto" },
      children: [
        buildSlot(ids, "brand", [
          buildElement(ids, {
            type: "loom.stack",
            props: { direction: "row", gap: "normal", align: "center", wrap: true },
            children: [
              buildElement(ids, {
                type: "loom.heading",
                props: { level: 2 },
                children: [buildText(ids, "Overture")],
              }),
              buildElement(ids, {
                type: "loom.badge",
                props: { tone: "accent" },
                children: [buildText(ids, "All systems normal")],
              }),
              buildElement(ids, {
                type: "loom.link",
                props: { href: "/status", tone: "muted", scale: "small" },
                children: [buildText(ids, "Status")],
              }),
            ],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "small", tone: "muted" },
            children: [buildText(ids, "One place for the work, the review and what shipped.")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.link-list",
          props: { direction: "row" },
          children: LINKS.map((link) =>
            buildElement(ids, {
              type: "loom.link",
              props: { href: link.href, tone: "muted", scale: "small" },
              children: [buildText(ids, link.text)],
            })
          ),
        }),
        buildSlot(ids, "note", [
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "small", tone: "muted" },
            children: [buildText(ids, "© Overture. All rights reserved.")],
          }),
          buildElement(ids, {
            type: "loom.link-list",
            props: { direction: "row" },
            children: LEGAL.map((link) =>
              buildElement(ids, {
                type: "loom.link",
                props: { href: link.href, tone: "muted", scale: "small" },
                children: [buildText(ids, link.text)],
              })
            ),
          }),
        ]),
      ],
    }),
}
