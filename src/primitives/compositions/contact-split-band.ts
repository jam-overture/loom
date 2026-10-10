import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The form and the other ways in, on the page at the same time.
 *
 * ## What two designs could not say
 *
 * `contact` is a `loom.form`: five questions, a submit and a reply promise. It
 * assumes the reader is willing to fill a form in. `contact-details` is three
 * cards — email, phone, support — and assumes the reader would rather not.
 *
 * A contact band has to serve both readers at once, because which one a visitor
 * is is not knowable from the page and is not a thing a host can pick per
 * deployment. Someone evaluating a product writes a paragraph; someone whose
 * build is broken wants the address. Sending the second reader through a
 * five-field form is the band failing at the one job it has, and sending the
 * first to an inbox throws away everything the form was going to ask them.
 *
 * So this is the pair, side by side: the form on the wide side, the direct ways
 * in on the narrow one. It is the third design because it is the first one that
 * does not make the host choose on the reader's behalf.
 *
 * ## Why this is not `contact` and `contact-details` concatenated
 *
 * It would have been, and the version that was is why this note exists. Two
 * full bands stacked is two headings, two reply promises and two eyebrows —
 * the page saying *contact us* twice with different furniture, which is the
 * two-figure failure the portal lane has now recorded twice in its own
 * surfaces. What is here instead is **one** heading region, **one** reply
 * promise, and the details reduced to what a reader scanning for an address
 * actually needs: a `loom.link-list` of three links, which is three nodes
 * rather than three cards holding nine.
 *
 * `loom.link-list` is the right container for exactly the reason 0054 names it
 * for — it is the child's type plus the arrangement — and it is a different
 * container from the `loom.grid` of `loom.card` that `contact-details` builds,
 * so the structural difference the catalogue asserts is real rather than
 * arranged for.
 *
 * ## The form keeps four questions and loses one, deliberately
 *
 * `contact` asks name, email, company, team size and the message. In a 62%
 * column the `paired` layout puts two fields per row, and the select for team
 * size is the question a reader beside an email address will not answer — it is
 * the field that exists for the seller rather than for the sender. Dropping it
 * is why this band has no `loom.option` in it, and that is a node difference
 * rather than a prop one: a page that wants it back inserts a field and its
 * options, which is the operation this library exists to make reachable.
 *
 * ## `align: "start"` on the split, and the reason it is not `stretch`
 *
 * `stretch` would make the link column as tall as the form and strand three
 * links against the top of a column of air. `start` lets the aside be its own
 * height beside a form that is four rows taller, which is what the two things
 * are. The split stacks them at narrow widths in source order, so a phone gets
 * the form first and the addresses under it — the right order, because a reader
 * who wanted the address has it one scroll away and a reader who wanted the
 * form does not have to scroll past three links to reach it.
 *
 * ## The placeholder addresses are the ones the catalogue reserves
 *
 * `hello@overture.example` and `+441134960000`, matching `contact-details`,
 * because `compositions.test.ts` refuses a `mailto:` at a real domain and a
 * `tel:` at a real number outright. A band that shipped a live-looking address
 * would be a catalogue entry that mails somebody the first time it is drawn.
 *
 * ## The anchor and the eyebrow belong to the part
 *
 * `#contact` and `Talk to us`, matching both other designs.
 *
 * ## The list carries no label, and that is a photograph's correction
 *
 * It had one — `Direct ways in` — and `loom.link-list` draws a label as small
 * uppercase above its links. Under a `loom.heading` reading *Or reach us
 * directly* that is the same region named twice in two registers, three lines
 * apart, which is the thing this band exists to avoid doing with the reply
 * promise and was doing with its own heading. The heading stays because it is
 * the better words and the stronger mark; the label goes.
 *
 * It costs the landmark its accessible name, which is a real loss and is the
 * reason this is written down rather than quietly done. `footer`'s own legal
 * row has made the same trade since it was written: a list immediately under a
 * heading is named by that heading for a reader going through the document,
 * and the alternative here is a visible duplicate for everybody.
 */
const FIELDS = [
  { name: "name", label: "Your name", required: true, autocomplete: "name" },
  { name: "email", label: "Email", type: "email", required: true, autocomplete: "email" },
  { name: "organisation", label: "Company", autocomplete: "organization" },
  { name: "role", label: "What you do there" },
] as const

const WAYS = [
  { text: "hello@overture.example", href: "mailto:hello@overture.example" },
  { text: "+44 113 496 0000", href: "tel:+441134960000" },
  { text: "Support and status", href: "/support" },
] as const

export const contactSplitBand: Composition = {
  id: "contact-split",
  part: "contact",
  label: "Contact, form and the direct ways in",
  promise: "A four-question form down the wide side, with an email address, a phone number and support beside it.",
  rationale:
    "A contact band serving both kinds of reader is a loom.split holding the loom.form in its start region and a loom.link-list of direct ways in beside it. Each way in is a loom.link node rather than a field on the form, so one can be dropped for a deployment with no phone and the form is untouched.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.split",
    "loom.form",
    "loom.field",
    "loom.button",
    "loom.perk",
    "loom.link-list",
    "loom.link",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Talk to us", anchor: "contact" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Write to us, or just take the address")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted" },
          children: [
            buildText(
              ids,
              "A paragraph is plenty, and the form is not the only way through. One of the four of us reads whichever you pick."
            ),
          ],
        }),
        buildElement(ids, {
          type: "loom.split",
          props: { ratio: "start-wide", align: "start" },
          children: [
            buildSlot(ids, "start", [
              buildElement(ids, {
                type: "loom.form",
                props: { layout: "paired", width: "full" },
                children: [
                  ...FIELDS.map((field) =>
                    buildElement(ids, {
                      type: "loom.field",
                      props: { ...field },
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
            ]),
            buildSlot(ids, "end", [
              buildElement(ids, {
                type: "loom.heading",
                props: { level: 3 },
                children: [buildText(ids, "Or reach us directly")],
              }),
              buildElement(ids, {
                type: "loom.link-list",
                props: { direction: "column" },
                children: WAYS.map((way) =>
                  buildElement(ids, {
                    type: "loom.link",
                    props: { href: way.href, tone: "default", scale: "medium" },
                    children: [buildText(ids, way.text)],
                  })
                ),
              }),
              buildElement(ids, {
                type: "loom.prose",
                props: { size: "small", tone: "muted" },
                children: [
                  buildText(ids, "Weekdays, Leeds time. The status page is honest about the nights it was not."),
                ],
              }),
            ]),
          ],
        }),
      ],
    }),
}
