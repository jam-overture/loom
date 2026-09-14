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
 * ## `sticky`, and the one thing to check before changing it
 *
 * The bar is `position: "sticky"`, which is what a product site does. It is
 * also the prop most likely to be wrong in a page that opens with a
 * full-height `loom.hero`: a sticky bar over a tall hero is fine, and a sticky
 * bar over a `loom.banner` that scrolls away is a bar that covers the first
 * line of the page. Nothing here can know which, so the band ships the common
 * case and says so.
 */
const MENU = ["Product", "Pricing", "Docs", "Changelog"] as const

export const navBand: Composition = {
  id: "nav",
  label: "Navigation bar",
  promise: "A sticky bar across the top: a wordmark, four menu links, and one action.",
  rationale:
    "A header is a loom.nav with a loom.logo in its brand slot, loom.link children as the menu, and a loom.action in its actions slot. Each link is a node, so the menu can be reordered or extended without touching the bar.",
  uses: ["loom.nav", "loom.logo", "loom.link", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.nav",
      props: { position: "sticky", tone: "surface", align: "start" },
      children: [
        buildSlot(ids, "brand", [
          buildElement(ids, { type: "loom.logo", props: { name: "Overture", href: "/" } }),
        ]),
        ...MENU.map((item) =>
          buildElement(ids, {
            type: "loom.link",
            props: { href: `/${item.toLowerCase()}` },
            children: [buildText(ids, item)],
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
