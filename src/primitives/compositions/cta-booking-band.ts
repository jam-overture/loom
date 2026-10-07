import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The closing band of a product that is sold rather than signed up for: one
 * button that starts a trial, and one that opens a form without leaving the
 * page.
 *
 * ## Why the second button is a dialog and not a link to `/contact`
 *
 * Both already exist in this catalogue. `ctaBand` closes with two
 * `loom.action` nodes and `contactBand` is the five-question form a page sends
 * you to. This band is the arrangement in between, and it is the one every
 * enterprise page actually ships: a reader who has read to the bottom is the
 * most likely they will ever be to fill a form in, and a navigation is where
 * that intent goes to die.
 *
 * It is also the demonstration the new primitive needed. A dialog's body is
 * **children**, so what opens here is a real `loom.form` with its own fields,
 * its own submit region and its own reply promise — four kinds of node, none of
 * which a `body: string` prop could have carried and none of which
 * `loom.dialog` had to predict. 0051 is the record: a single-region primitive
 * takes children, and this is the band that spends them.
 *
 * ## The word on the trigger is this band's, which is the whole of 0234
 *
 * *Book a call* is written in the tree, on the node, as the `label` prop —
 * which is why this band could not exist on 1 October. The seam resolved a
 * control's name per **type**, so every dialog in a deployment would have said
 * the same word, and the gap inventory's line was that *"a dialog here would be
 * a modal opened by a chip reading Open"*.
 *
 * The thing to notice is that the word is page copy sitting beside the headline
 * it belongs with, rather than a string in a dictionary beside *Copy* and
 * *Close*. A deployment that sells to two markets changes it with a
 * `configure`; a translator never sees it; and
 * [0234](../../../decisions/0234-a-primitive-may-name-a-control-from-the-tree-and-its-declared-string-is-the-floor.md)'s
 * floor — *More* — is still what a reader is announced if a tree ever ships
 * this node with the prop empty.
 *
 * ## Why the form is short, which is a different question from the long one
 *
 * `contactBand` asks five questions because a reader who navigated to a contact
 * page has decided to spend a minute. This asks **two**. A dialog opened from a
 * closing band interrupts something, and the number of fields is the price of
 * the interruption — so it is a name and an email, with the actual conversation
 * left to the call.
 *
 * That it is three nodes shorter rather than a `fields: "short"` prop is 0052
 * working: the fields are nodes, so a deployment that wants the company name
 * back `insert`s it, and nobody had to predict which two questions were the
 * right two.
 */
const FIELDS = [
  { name: "name", label: "Your name", required: true, autocomplete: "name" },
  { name: "email", label: "Work email", type: "email", required: true, autocomplete: "email" },
] as const

export const ctaBookingBand: Composition = {
  id: "cta-booking",
  part: "cta",
  label: "Closing call to action, with a booking dialog",
  promise:
    "A closing band on the accent ground: a headline, a sentence, a button that starts a trial and one that opens a two-question form over the page.",
  rationale:
    "A closing band for a product that is sold is a loom.section holding a heading, a paragraph and a row of two controls — a loom.action that starts a trial and a loom.dialog whose body is a loom.form. The dialog's trigger carries the band's own words through its label prop (0234) and its body is children rather than a prop, so the questions are nodes a deployment adds to or drops without touching the band.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.stack",
    "loom.action",
    "loom.dialog",
    "loom.form",
    "loom.field",
    "loom.button",
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
            children: [buildText(ids, "See it running on your own interface")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "lead", align: "center", tone: "muted", measured: true },
          children: [
            buildText(
              ids,
              "Twenty minutes with one of the four of us, against a page you already have rather than a sandbox."
            ),
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
            /**
             * `measure: "panel"` rather than `prose` or `media`: the body is a
             * two-field form, and a form in a 44rem plate is two lines of input
             * floating in a field of nothing. The ceiling is the one that fits
             * the content, which is the only thing this prop is for.
             */
            buildElement(ids, {
              type: "loom.dialog",
              props: { label: "Book a call", title: "Twenty minutes", measure: "panel" },
              children: [
                buildElement(ids, {
                  type: "loom.form",
                  props: { layout: "stacked", width: "readable" },
                  children: [
                    ...FIELDS.map((field) =>
                      buildElement(ids, {
                        type: "loom.field",
                        props: { ...field },
                      })
                    ),
                    buildSlot(ids, "submit", [
                      buildElement(ids, {
                        type: "loom.button",
                        props: { variant: "primary", scale: "large", width: "full" },
                        children: [buildText(ids, "Find a time")],
                      }),
                    ]),
                    buildSlot(ids, "note", [
                      buildElement(ids, {
                        type: "loom.perk",
                        props: { label: "No deck, no discovery call", state: "included" },
                      }),
                    ]),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
}
