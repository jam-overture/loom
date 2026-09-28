import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The bar across the top: a wordmark, four ways in, and the one thing to do.
 *
 * The catalogue shipped nine bands that assembled a landing page and **none of
 * them was the header**, which is the first thing on every page any of them
 * would ever be dropped into. `footerBand` existed from the start; its opposite
 * did not, and the reason is visible in the original nine — they were chosen as
 * the *argument* a landing page makes, and a nav bar is not an argument. It is
 * still the band a page cannot open without.
 *
 * ## Why the links are children and the regions are slots
 *
 * `loom.nav` names two regions — `brand` and `actions` — and takes its menu as
 * ordinary children. That split is [0051](../../../decisions/0051-a-slot-is-a-region-the-primitive-places.md)
 * doing exactly what it is for: the wordmark and the call to action are *placed*
 * by the primitive at opposite ends of the bar, so they are regions; the menu is
 * a run of links the primitive lays out in order, so they are children. The
 * practical consequence is the one that matters for a starting composition —
 * **a fifth menu item is an `insert`**, not a prop nobody predicted.
 *
 * ## Four items, and why not six
 *
 * Four is what fits beside a wordmark and an action at 390px without the bar
 * wrapping, which is the width this library photographs first. A starting
 * composition that arrives already too wide teaches the wrong thing about the
 * primitive it is demonstrating, and adding the fifth is one operation.
 *
 * ## Where the four go, which is the thing that was wrong
 *
 * They pointed at `/product`, `/pricing`, `/docs` and `/changelog`: four routes
 * of a site that does not exist. The catalogue assembles **one page**, every
 * band on it carries an `anchor`, and until now **not one link anywhere in the
 * catalogue pointed at any of them** — nineteen marked destinations and nothing
 * marking a way to them. `anchor.ts` says in its own header which primitives
 * carry one and why: *"the bands a page's own navigation points at, and nothing
 * else."* This is that navigation, and it was pointing off the page.
 *
 * The four named here are parts of `PAGE_SEQUENCE`, so on the assembled page
 * each one resolves by construction, and `compositions.test.ts` holds that
 * rather than leaving it to a reader to notice
 * ([0168](../../../decisions/0168-a-band-links-into-the-page-it-is-assembled-into.md)).
 *
 * **A multi-page site is four `configure`s**, one per link, which is the
 * cheapest edit the delta model has — and it is the direction that is cheap to
 * go. The reverse is not: an author who wanted same-page navigation from the
 * old band had to know that a bare fragment was legal at all, which it was not
 * until 14 September and which nothing here demonstrated afterwards.
 *
 * ## `sticky`, and the one thing to check before changing it
 *
 * The bar is `position: "sticky"`, which is what a product site does. It is
 * also the prop most likely to be wrong in a page that opens with a
 * full-height `loom.hero`: a sticky bar over a tall hero is fine, and a sticky
 * bar over a `loom.banner` that scrolls away is a bar that covers the first
 * line of the page. Nothing here can know which, so the band ships the common
 * case and says so.
 */
const MENU = [
  { text: "How it works", href: "#how-it-works" },
  { text: "Features", href: "#features" },
  { text: "Pricing", href: "#pricing" },
  { text: "FAQ", href: "#faq" },
] as const

/**
 * A neutral mark, and it is deliberately not a good one.
 *
 * A starting composition is content a host replaces, and the one thing it must
 * not do is ship somebody else's identity as a default nobody notices. Two
 * offset bars in a square read as a placeholder at a glance, which is what a
 * host should see before they swap in their own path.
 */
const PLACEHOLDER_MARK = "M6 7h20v6H6z M6 19h14v6H6z"

export const navBand: Composition = {
  id: "nav",
  part: "nav",
  label: "Navigation bar",
  promise: "A sticky bar across the top: a wordmark, four links into this page, and one action.",
  rationale:
    "A header is a loom.nav with a loom.brand in its brand slot, loom.link children as the menu, and a loom.action in its actions slot. The brand is loom.brand rather than loom.logo because this is the site naming itself rather than one mark in a wall of somebody else's: its mark is drawn from path data, so it takes the page's ink on every palette, and it is never dimmed. Each link is a node, so the menu can be reordered or extended without touching the bar, and each menu item names a band of this page rather than a route of a site that may not have one.",
  uses: ["loom.nav", "loom.brand", "loom.link", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.nav",
      props: { position: "sticky", tone: "surface", align: "start" },
      children: [
        buildSlot(ids, "brand", [
          buildElement(ids, {
            type: "loom.brand",
            props: { name: "Overture", mark: PLACEHOLDER_MARK, href: "#top" },
          }),
        ]),
        ...MENU.map((item) =>
          buildElement(ids, {
            type: "loom.link",
            props: { href: item.href },
            children: [buildText(ids, item.text)],
          })
        ),
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
