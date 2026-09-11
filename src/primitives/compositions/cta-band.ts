import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The last band: ask again, at a reading width, on the accent ground.
 *
 * This is the block Hermes registered as `cta`, and
 * `docs/hermes-port-map.md` files it under *compositions — nothing to build*
 * with a sentence that is the whole reason this catalogue exists:
 *
 * > Building these as primitives would be the exact mistake the granularity doc
 * > names: a `loom.cta` with `title`, `desc`, `btnText` and `btnUrl` is four
 * > props impersonating four nodes, and "move the button above the description"
 * > would be unreachable forever.
 *
 * That verdict was right and it left the block genuinely unavailable. *Nothing
 * to build* is true of the registry and false of the page: a `cta` was still
 * eight operations to put anywhere, so the cheapest band in Hermes became one
 * of the more expensive ones in Loom. This file is the missing half — the same
 * eight nodes, arriving as one `insert`, and rearrangeable the moment they
 * land.
 *
 * ## The stack around the buttons is not decoration
 *
 * `loom.hero` has an `actions` slot and `loom.section` does not, so a pair of
 * buttons under a paragraph would otherwise be two children of a column and
 * would sit one above the other. The `loom.stack` in `row` with
 * `justify: "center"` is what makes them a pair, and it wraps by default —
 * which is what stops the row becoming an overflow on a phone without anything
 * measuring a viewport (0008).
 *
 * ## Why the tone is on the section
 *
 * `accent` rather than `surface`, and it is the one band in the catalogue that
 * takes it. A page whose closing ask is on the same ground as the four bands
 * above it has no ending; a page with three accent bands has no emphasis. One
 * is the whole point of having the tone at all.
 */
export const ctaBand: Composition = {
  id: "cta",
  label: "Closing call to action",
  promise: "A closing band on the accent ground: a headline, a sentence and two buttons side by side.",
  rationale:
    "A call to action is a loom.section holding a heading, a paragraph and a row of loom.action nodes — four nodes rather than four props, so the button can be moved above the sentence without anyone having predicted that.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.stack", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "accent", width: "readable" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, align: "center", balance: true },
            children: [buildText(ids, "Try it on one repository this week")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "lead", align: "center", tone: "muted", measured: true },
          children: [
            buildText(ids, "Free for up to three people, with no card and nothing to uninstall if you change your mind."),
          ],
        }),
        buildElement(ids, {
          type: "loom.stack",
          props: { direction: "row", gap: "snug", justify: "center", align: "center" },
          children: [
            buildElement(ids, {
              type: "loom.action",
              props: { href: "/start", variant: "primary", scale: "large" },
              children: [buildText(ids, "Start free")],
            }),
            buildElement(ids, {
              type: "loom.action",
              props: { href: "/contact", variant: "secondary", scale: "large" },
              children: [buildText(ids, "Talk to us")],
            }),
          ],
        }),
      ],
    }),
}
