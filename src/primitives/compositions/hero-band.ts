import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The first screen: an eyebrow, a claim, a sentence, and two ways in.
 *
 * `loom.hero` is a primitive and this is not a second one. What the primitive
 * knows is the *band* — the backdrop it paints, how tall it holds itself, where
 * its three regions sit. What it does not know, and by 0051 should not, is that
 * a landing hero almost always holds a level-one heading, a lead paragraph and
 * exactly two buttons whose second is quieter than the first. That is a
 * convention about content, and a convention about content is a starting point
 * rather than a rule the primitive should enforce on every page that mounts it.
 *
 * ## The two actions are the reason this band earns its place
 *
 * A hero with one button is a `loom.hero` and three children, and nobody needed
 * a catalogue for that. The pair is where it starts to cost: a primary and a
 * secondary, in the `actions` slot, in that order, so the second reads as the
 * alternative rather than as a rival. Get the second one's variant wrong and
 * the band has two primary buttons, which is the single most common defect in a
 * hand-built hero and is invisible to every check in this repository —
 * `variant: "primary"` twice is not malformed in any way a schema can see.
 *
 * ## Where the links point, and why it is a path
 *
 * `/start` and `/pricing`, not `https://example.com/...`. A same-origin path is
 * a destination on the site this band is dropped into (0100, 0102), so the band
 * arrives with no dependency on anything outside the deployment. The
 * alternative — a placeholder on someone else's domain — ships a live link to a
 * third party in a tree a page might publish before anyone re-reads it.
 *
 * ## Why there is no image
 *
 * `loom.hero` has a `media` slot and the band would look better with something
 * in it. Nothing can go there: `loom.media` requires a `src`, `mediaUrlSchema`
 * refuses `data:` deliberately, and a same-origin path names a file this
 * library cannot put in a host's `public/`. So the band ships with the backdrop
 * the primitive paints itself — `aurora`, which is drawn from the palette and
 * needs no asset — and the slot stays empty for whoever has a screenshot.
 */
export const heroBand: Composition = {
  id: "hero",
  part: "hero",
  label: "Hero",
  promise: "A full-height opening band: eyebrow, headline, a lead sentence and two buttons.",
  rationale:
    "A landing hero is a loom.hero with a level-one heading in its heading slot, a lead paragraph, and a primary and a quiet action in its actions slot. Every part is an ordinary node, so the headline can be rewritten and the buttons reordered without touching the band.",
  uses: ["loom.hero", "loom.heading", "loom.prose", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.hero",
      props: { backdrop: "aurora", stature: "tall", align: "center", eyebrow: "Now in public beta", anchor: "top" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 1, align: "center", balance: true },
            children: [buildText(ids, "Everything your team ships, in one place")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "lead", align: "center", tone: "muted", measured: true },
          children: [
            buildText(
              ids,
              "Plan the work, review the change, and see what shipped — without three tools disagreeing about what happened."
            ),
          ],
        }),
        buildSlot(ids, "actions", [
          buildElement(ids, {
            type: "loom.action",
            props: { href: "/start", variant: "primary", scale: "large" },
            children: [buildText(ids, "Start free")],
          }),
          buildElement(ids, {
            type: "loom.action",
            props: { href: "/pricing", variant: "secondary", scale: "large" },
            children: [buildText(ids, "See pricing")],
          }),
        ]),
      ],
    }),
}
