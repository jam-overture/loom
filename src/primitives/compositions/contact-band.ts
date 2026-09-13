import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Five questions and a button — the band a page needs when the answer is not
 * "sign up".
 *
 * `ctaBand` sends a reader somewhere. This one **takes something from them**,
 * which is the whole of the difference and the reason it is a separate band: a
 * page selling anything considered — an agency, an enterprise plan, a service —
 * ends in a conversation rather than a signup, and the catalogue had no way to
 * ask for one.
 *
 * ## It ships without a destination, and that is the correct default
 *
 * A form's target is a **registered endpoint the deployment names**, carried on
 * the reserved submit key. A starting composition cannot name one: the id would
 * have to exist in the host's registry, and a band that shipped a guess would
 * either fail to resolve or — worse — resolve to something else's address.
 *
 * So this band arrives untargeted, which the seam already has a word for. A
 * primitive reading `loom.submit` sees three states, and *absent* is the one
 * that means **nobody has said where this posts** — an authoring gap rather
 * than a failure. Dropping the band in and then naming the endpoint is one
 * `configure` on the form, against a node that already exists.
 *
 * **And the band says so on the page.** `loom.form` renders an untargeted form
 * with a notice above it — *"This form is not connected yet, so it cannot be
 * sent"* — rather than drawing a button that silently swallows what a visitor
 * typed. That was verified in the screenshot rather than assumed from the
 * schema, and it is the difference between a band that is unfinished and a band
 * that is broken: a reader is told, an author is reminded, and the fix is one
 * `configure`.
 *
 * ## Why `paired` and one field spanning the row
 *
 * Two columns for the short answers, full width for the one that is a
 * paragraph. `span: "row"` on the message is the only per-field layout here,
 * because it is the only field whose *content* has a shape — the rest are a
 * line each and pair off without anybody deciding which goes with which.
 *
 * ## The note under the button is a promise, and it is a node
 *
 * "We reply within two working days" sits in the `note` region as a
 * `loom.perk`, not as a sentence in the button's label. It is the single
 * highest-converting line on a contact form and it is the one most likely to
 * need changing, so it is its own node with its own author.
 */
const FIELDS = [
  { name: "name", label: "Your name", required: true, autocomplete: "name" },
  { name: "email", label: "Email", type: "email", required: true, autocomplete: "email" },
  { name: "organisation", label: "Company", autocomplete: "organization" },
  { name: "size", label: "How many people will use it?", type: "select", placeholder: "Choose one" },
] as const

const SIZES = ["Just me", "2–10", "11–50", "More than 50"] as const

export const contactBand: Composition = {
  id: "contact",
  label: "Contact",
  promise: "A five-question form in two columns, with a submit button and a reply promise beneath it.",
  rationale:
    "A contact band is a loom.form holding a loom.field per question, a loom.button in its submit region and a loom.perk in its note region. Each question is a node, so one can be added or dropped without touching the form, and the endpoint is one configure away.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.form", "loom.field", "loom.option", "loom.button", "loom.perk"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Talk to us", anchor: "contact" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Tell us what you are building")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted" },
          children: [buildText(ids, "A paragraph is plenty. One of the four of us reads every one of these.")],
        }),
        buildElement(ids, {
          type: "loom.form",
          props: { layout: "paired", width: "wide" },
          children: [
            ...FIELDS.map((field) =>
              buildElement(ids, {
                type: "loom.field",
                props: { ...field },
                children:
                  field.name === "size"
                    ? SIZES.map((size) =>
                        buildElement(ids, {
                          type: "loom.option",
                          props: {},
                          children: [buildText(ids, size)],
                        })
                      )
                    : [],
              })
            ),
            buildElement(ids, {
              type: "loom.field",
              props: {
                name: "message",
                label: "What are you building?",
                type: "textarea",
                required: true,
                span: "row",
                hint: "What it is, who it is for, and what is in the way.",
              },
            }),
            buildSlot(ids, "submit", [
              buildElement(ids, {
                type: "loom.button",
                props: { variant: "primary", scale: "large", width: "full" },
                children: [buildText(ids, "Send it")],
              }),
            ]),
            buildSlot(ids, "note", [
              buildElement(ids, {
                type: "loom.perk",
                props: { label: "We reply within two working days", state: "included" },
              }),
            ]),
          ],
        }),
      ],
    }),
}
