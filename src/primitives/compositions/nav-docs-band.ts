import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The bar above a document: the way home, the sections of the site, what you
 * are reading, and a way to search it.
 *
 * ## This band exists because a test refused the obvious shape
 *
 * [0245](../../../decisions/0245-a-second-page-sequence-is-earned-by-regions-in-a-different-order-and-the-sites-own-regions-are-shared.md)
 * was drafted saying the header and the footer both belong to the *site* and
 * are therefore shared between page kinds — the document sequence would name
 * the landing canonical and a deployment editing its header would edit it once.
 * That is right about the footer and **wrong about the header**, and the thing
 * that said so was `documents.test.ts` asserting that every in-page link points
 * at an anchor the page has:
 *
 * ```
 * #top is linked and no band declares it
 * ```
 *
 * `navBand`'s own doc comment is where the reason is already written down.
 * Its four menu links were changed, deliberately, from routes of a site that
 * does not exist to **fragments of the page the band is assembled into**
 * ([0168](../../../decisions/0168-a-band-links-into-the-page-it-is-assembled-into.md)),
 * and its wordmark points at `#top`, the hero's anchor. On a landing page that
 * is correct and is the better design. On a document page it is five links into
 * bands that are not there: no error, no diagnostic, and four presses that do
 * not move the page.
 *
 * **So 0168's rule has a scope nobody had had to state: a band that links into
 * the page it is assembled into cannot be shared across page kinds.** The
 * footer can be and is — every one of its nineteen links is a route. The header
 * cannot.
 *
 * ## Why this is a second design and not the same band configured
 *
 * The honest objection, and 0162's bar is the answer: a design earns its place
 * by building a **different set of nodes**, and a nav with different `href`s is
 * a `configure` of the canonical. `compositions.test.ts` enforces exactly that
 * — two designs of a part whose node types read the same in the same order fail
 * by name — so a routes-instead-of-fragments nav would have been refused, and
 * should have been.
 *
 * What makes this a different set of nodes is what a documentation header
 * actually has and a marketing header does not:
 *
 * - **a `loom.field`** — the search. A reference site is not read in order and
 *   the bar is where a reader goes to stop reading in order.
 * - **a `loom.badge`** — which version of the thing this page describes. A
 *   document is true of a release in a way a landing page is not of anything.
 *
 * Both are nodes, so *drop the version badge* is a `remove` and *search by
 * placeholder rather than label* is a `configure` of one node.
 *
 * ## The search is a child and not an action, and a phone shot decided that
 *
 * It sat in the `actions` region first, beside the call to action, which is
 * where a reader's eye expects it. At 390 pixels the bar measured **454**:
 * `loom.nav` lays its two regions out as flex items sized by their content, and
 * an `<input>` carries an intrinsic width — the field's own `width: 100%`
 * resolves against a parent that is itself as wide as the input wants to be, so
 * nothing in the chain can shrink. `loom.field` is not at fault and already
 * sets `min-width: 0` on itself for the neighbouring case; the region it was
 * put in has no such floor, because until now the only thing in one was a
 * button. **Filed**, because the next band to put a control in a nav region
 * will meet it again.
 *
 * As a child it is in the menu flow, which wraps, and the bar measures 390 on
 * both palettes. That is also the better reading of what it is: a way of
 * getting around the site belongs with the other ways of getting around the
 * site, and `actions` is the one thing to *do* rather than the several places
 * to go.
 *
 * ## Where it lives, which is the landing phrasebook
 *
 * `part: "nav"`, because it occupies the region `COMPOSITION_PARTS` already
 * names — 0171's test is about the region and this is the same strip at the top
 * of the page. So it is a fourth design of `nav` in `STARTER_COMPOSITIONS`,
 * reachable by anyone, and the document sequence selects it rather than owning
 * it. **No part was invented for it and no test was widened to admit it.**
 */

/** The same mark the canonical header uses: one site, one wordmark. */
const PLACEHOLDER_MARK = "M6 7h20v6H6z M6 19h14v6H6z"

/**
 * Routes, and every one of them is the point. These are sections of a
 * documentation site rather than bands of the page the bar sits on, which is
 * the whole difference 0168's scope turns on — a reader three levels into a
 * guide needs the way *out*, and nothing on this page is a destination the bar
 * should offer.
 *
 * **Three and not the canonical's four**, and the wide shot is why. A search
 * field is about as wide as two links, so a bar carrying one has a smaller
 * budget than `navBand`'s — at four the call to action wrapped to a second row
 * at 1280, which is the orphan a header is least able to afford. The canonical
 * band's note about four fitting at 390 is the same arithmetic from the other
 * end, and a fourth link here is one `insert` for a deployment with the room.
 */
const MENU: readonly { readonly text: string; readonly href: string }[] = [
  { text: "Guides", href: "/docs/guides" },
  { text: "Reference", href: "/docs/reference" },
  { text: "Changelog", href: "/changelog" },
]

export const navDocsBand: Composition = {
  id: "nav-docs",
  part: "nav",
  label: "Documentation bar",
  promise: "A bar across the top with three sections of the site, the version this page describes, and a search field.",
  rationale:
    "A documentation header is the nav region with two nodes a marketing header has no use for: a loom.field for search, because a reference site is not read in order, and a loom.badge naming the release the page is true of. The field is a child rather than an action, so it wraps with the menu on a phone instead of forcing the bar to 454 pixels. That is a different set of nodes rather than the canonical with different props, which is what 0162 asks of a second design. Its links are routes and its wordmark points home, because a bar above an interior document must offer the way out rather than fragments of a page the reader is not on — the canonical's fragments are correct on the page it was written for and point at nothing here.",
  uses: ["loom.nav", "loom.brand", "loom.badge", "loom.link", "loom.field", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.nav",
      props: { position: "sticky", tone: "surface", align: "start" },
      children: [
        buildSlot(ids, "brand", [
          buildElement(ids, {
            type: "loom.brand",
            /**
             * `/` and not `#top`. The wordmark on an interior page is the way
             * back to the site, and a fragment here would be a press that
             * scrolls to the top of a document the reader is already at the top
             * of.
             */
            props: { name: "Overture", mark: PLACEHOLDER_MARK, href: "/" },
          }),
        ]),
        buildElement(ids, {
          type: "loom.badge",
          props: { tone: "outline" },
          children: [buildText(ids, "v2.4")],
        }),
        ...MENU.map((item) =>
          buildElement(ids, {
            type: "loom.link",
            props: { href: item.href },
            children: [buildText(ids, item.text)],
          })
        ),
        buildElement(ids, {
          type: "loom.field",
          /**
           * **`text`, and it should be `search`.** `FIELD_TYPES` has no
           * `search` member, so the control cannot announce itself as one and
           * a browser cannot offer the clear affordance it already has for
           * them. Filed rather than widened: a closed vocabulary a model
           * authors against is not a thing to add to in passing, and the
           * entry sits beside the `checkbox` label note the field already
           * carries.
           *
           * The label is drawn rather than hidden either way: a magnifying
           * glass with no name is the icon-only control this library has an
           * open finding about, and a bar is not the place to ship the thing
           * that finding is about.
           */
          props: { name: "q", label: "Search the docs", type: "text", placeholder: "Search" },
        }),
        buildSlot(ids, "actions", [
          buildElement(ids, {
            type: "loom.action",
            props: { href: "/start", variant: "primary", scale: "small" },
            children: [buildText(ids, "Start free")],
          }),
        ]),
      ],
    }),
}
