import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The other closing band: ask for the address rather than for the click.
 *
 * `cta` ends a page with two buttons, which is the right ending for a product a
 * reader can start using in the next thirty seconds. This is the ending for
 * everything else — a beta, a waitlist, a launch date, a newsletter — where the
 * honest ask is *tell us where to reach you* and a button labelled **Start
 * free** would be promising a door that is not open yet.
 *
 * ## Why it is a design and not a `configure` of `cta`
 *
 * 0162's bar is the set of nodes, and this clears it by the widest margin of
 * any pair in the catalogue. `cta` ends in a `loom.stack` holding two
 * `loom.action` nodes; this ends in a `loom.form` holding a `loom.field`, a
 * `loom.button` in its `submit` region and two `loom.perk` nodes in its `note`
 * region. Not one node in either corresponds to a node in the other, and the
 * difference is not cosmetic: **one of these posts and the other navigates.**
 * `loom.form` is the single primitive in this library that declares `submits`
 * (0087), so the two bands differ in what the deployment's audit sees.
 *
 * ## The two perks under the field, which are the whole band
 *
 * A capture form with nothing under it is the form every reader has regretted
 * filling in, and the objection is never *what is this* — it is *how often will
 * you write and can I get out*. Both are answered in the `note` region, beside
 * the field rather than in a privacy policy two clicks away, because the moment
 * to answer them is the moment the cursor is in the box.
 *
 * They are `loom.perk` nodes rather than a sentence of `loom.prose` for the
 * reason `loom.perk-list-item` exists at all: each is a discrete claim with a
 * marker announced by name from the text seam (0060), so a reader using a
 * screen reader gets *included: one email a week* rather than a dingbat and a
 * clause. And being two nodes rather than one string, a deployment that only
 * makes one of the two promises deletes a node.
 *
 * ## What the screenshot shows, and why it is correct
 *
 * `loom.form` disables its own fieldset and prints a notice when no submission
 * endpoint has been resolved for it, which is the state every specimen and
 * every test renders in — there is no deployment behind a photograph. So the
 * band is drawn dimmed with *no endpoint is registered for it*, exactly as
 * `contact` has been in every shot since it shipped. That is the primitive
 * being honest rather than the band being broken: a live submit button with
 * nowhere to post is the failure `loom.form`'s own header names by name.
 *
 * ## The tone is `accent`, for `cta`'s reason and not by copying it
 *
 * `cta-band.ts` argues that exactly one band on a page should take the accent
 * ground, since a page with three has no emphasis and a page with none has no
 * ending. That argument is about **the part**, not about the design, and these
 * two are designs of one part — a page takes one of them, never both. So the
 * accent moves with whichever is chosen, and the invariant holds without either
 * file knowing about the other.
 */
const PROMISES = [
  "One email a week, on the day something actually shipped",
  "Unsubscribe from the first line of any of them",
] as const

export const ctaSignupBand: Composition = {
  id: "cta-signup",
  part: "cta",
  label: "Closing call to action, with a signup field",
  promise:
    "A closing band on the accent ground: a headline, a sentence, and one email field with its button on the same line.",
  rationale:
    "A capture band is a loom.form holding one loom.field, a loom.button in its submit region and a loom.perk per promise in its note region. The field is a node rather than a prop on the section, so a second question can be added without touching the band, and the promises under it can be deleted one at a time.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.form",
    "loom.field",
    "loom.button",
    "loom.stack",
    "loom.perk",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "accent", width: "readable" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, align: "center", balance: true },
            children: [buildText(ids, "Hear about it the week it lands")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "lead", align: "center", tone: "muted", measured: true },
          children: [
            buildText(
              ids,
              "We are opening this a team at a time. Leave an address and we will tell you when yours comes up."
            ),
          ],
        }),
        buildElement(ids, {
          type: "loom.form",
          props: { layout: "inline", width: "wide" },
          children: [
            buildElement(ids, {
              type: "loom.field",
              props: {
                name: "email",
                label: "Work email",
                type: "email",
                required: true,
                placeholder: "you@company.com",
                autocomplete: "email",
              },
            }),
            buildSlot(ids, "submit", [
              buildElement(ids, {
                type: "loom.button",
                props: { variant: "primary", scale: "large" },
                children: [buildText(ids, "Join the list")],
              }),
            ]),
            buildSlot(ids, "note", [
              buildElement(ids, {
                type: "loom.stack",
                props: { direction: "column", gap: "tight" },
                children: PROMISES.map((label) =>
                  buildElement(ids, {
                    type: "loom.perk",
                    props: { label, state: "included" },
                  })
                ),
              }),
            ]),
          ],
        }),
      ],
    }),
}
