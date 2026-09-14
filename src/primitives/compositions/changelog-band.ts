import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * What shipped, newest first, down a rail.
 *
 * The band that answers *is this still being built*, which is the question a
 * careful buyer asks about every tool they have been burned by. `metricsBand`
 * makes a claim about scale; this one makes a claim about **momentum**, and it
 * is the only kind of proof that cannot be manufactured after the fact.
 *
 * ## Same children as `stepsBand`, arranged down instead of across
 *
 * Both hold `loom.milestone` nodes. `loom.milestone-row` lays them across with a
 * rail between, for a process a reader will follow; `loom.milestone-list` runs
 * them down the page, for a history a reader scans. This is the pair
 * [0054](../../../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
 * names in its own text, and having both bands in the catalogue is what makes
 * the rule visible to somebody reading the list rather than the record.
 *
 * ## `tight`, because this is a list to scan and not a page to read
 *
 * `density: "tight"` is the difference between a changelog and a story. Six
 * entries at `loose` fill a screen and invite reading; at `tight` they are a
 * block a reader takes in at once and moves past, which is what a changelog
 * band on a landing page is for. The entries that deserve reading have their own
 * page, and the last one here links to it.
 *
 * ## The markers are dates, and nothing checks them
 *
 * `marker` takes a string, so these are "Sep 2026" rather than anything ordered.
 * Nothing sorts them and nothing can: a render is a total pure projection of one
 * node, so no entry knows it is the newest, and the ordering lives in the order
 * of the children — which is exactly where a reader's eye reads it from, and
 * exactly what a `move` rearranges.
 */
const ENTRIES = [
  {
    marker: "Sep 2026",
    title: "Charts, and a light for the one that matters",
    body: "Numbers can be plotted rather than only printed, and one card in a row can be lit.",
  },
  { marker: "Aug 2026", title: "Atmosphere behind any band", body: "Five paints, a wrapper, and a word over a picture." },
  { marker: "Jul 2026", title: "Forms that know where they post", body: "A registered endpoint, a CSRF token carried, and a refusal that says which fault it is." },
  { marker: "Jun 2026", title: "Undo became one operation", body: "The inverse is computed at the moment of change rather than reconstructed after it." },
  { marker: "May 2026", title: "The Gate", body: "Every proposal assessed, staked and held for a person where the policy says so." },
] as const

export const changelogBand: Composition = {
  id: "changelog",
  label: "Changelog",
  promise: "Five recent releases running down a rail, newest first, set tight to scan.",
  rationale:
    "A changelog is a loom.milestone-list holding a loom.milestone per release, set tight. It takes the same children as the how-it-works row and runs them down instead of across, which is the second-arrangement rule the naming decision describes.",
  uses: ["loom.section", "loom.heading", "loom.milestone-list", "loom.milestone", "loom.link"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "readable", eyebrow: "Changelog", anchor: "changelog" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Still being built, and here is the evidence")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.milestone-list",
          props: { density: "tight", rail: "line" },
          children: ENTRIES.map((entry) =>
            buildElement(ids, {
              type: "loom.milestone",
              props: { marker: entry.marker, title: entry.title, body: entry.body },
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
