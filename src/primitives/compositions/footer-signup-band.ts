import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The end of the page with one thing left to do in it: a wordmark, an address
 * field beside it, two columns of links and the legal line.
 *
 * ## Why the footer needed a second design, and it is not that the first is long
 *
 * `footerBand` is a four-column sitemap and it is the right footer for a site —
 * twenty-one links across Product, Developers, Company and Resources, every one
 * of them a route a real deployment has. It is the wrong footer for a **page**.
 * A single landing page with a four-column sitemap under it is a page claiming
 * fifteen routes it does not have, and the host who drops that band in either
 * builds fifteen pages or ships fifteen dead links.
 *
 * That is the second design this part was missing, and the shape of it is the
 * thing every one-page site arrives at independently: fewer destinations, and
 * the last chance to leave an address where the sitemap used to be.
 *
 * ## The capture is in the brand region, which is where `loom.footer` puts it
 *
 * `loom.footer` places three things — a `brand` region, however many groups it
 * is handed, and a `note` underneath. The form goes in the brand region rather
 * than becoming a fifth group, and the reason is what the groups region is: a
 * grid whose columns are sized by `auto-fit` against a minimum meant for a
 * column of links. A `loom.form` dropped in there is sized by a number chosen
 * for `Documentation` and `Changelog`, and it is sized by it at every width
 * including the one where there is room.
 *
 * **The field and its button are on two lines, and the layout is still
 * `inline`.** The brand region is *"a column of its own that is wider than a
 * group's"* and it does not grow, so it is wider than a link column and
 * narrower than one line of label, input and button. `inline` is `flex-wrap`,
 * so what it does there is the thing it was written to do on a phone: the
 * button wraps under the field. Said here because the prop's name reads like a
 * promise about the rendering, and in this one region it is a promise about the
 * *order* — the submit is the end of the row rather than the next field, which
 * is true on both lines.
 *
 * The primitive needed no change for any of this, and that is worth noting
 * rather than assuming: a region described for a wordmark and a sentence turns
 * out to hold a wordmark, a sentence and a two-element form, because 0051 made
 * it a region the primitive *places* rather than a region the primitive
 * *fills*.
 *
 * ## `columns: "two"`, and it is a floor rather than a count
 *
 * Two groups and `columns: "two"`, which looks like the prop that decides how
 * many there are and is not. `COLUMN_MINIMUMS` feeds `auto-fit`, so the name is
 * a minimum width — *"columns no narrower than this, which is two of them at a
 * common page width and one of them on a phone"*. Nothing truncates: a third
 * group inserted here appears, at the same minimum, and the prop keeps
 * describing the rhythm rather than the list. It is `docs/primitive-granularity.md`'s
 * worked distinction, and this band is where it reads most like a count, which
 * is why it is said out loud here.
 *
 * ## There is no endpoint on the form, and that is correct rather than pending
 *
 * `ctaSignupBand` ships the same way. A submission target is a deployment's
 * (0065) — a starting composition that named one would either point at a route
 * the host does not serve or post a stranger's address somewhere the host did not
 * choose. The field, the label, the autocomplete and the button are the part a
 * catalogue can know.
 */
const GROUPS = [
  {
    label: "Product",
    links: [
      { text: "What it does", href: "#what-it-does" },
      { text: "How it works", href: "#how-it-works" },
      { text: "Pricing", href: "#pricing" },
      { text: "Questions", href: "#faq" },
    ],
  },
  {
    label: "Company",
    links: [
      { text: "Documentation", href: "/docs" },
      { text: "Changelog", href: "/changelog" },
      { text: "Contact", href: "/contact" },
    ],
  },
] as const

/**
 * Seven destinations where the sitemap footer has twenty-one, and four of the
 * seven are fragments of the page this band closes.
 *
 * That split is the design. A one-page site's footer links are mostly *back up
 * the page*, which is a thing the canonical footer cannot say at all — every one
 * of its twenty-one is a route — and it is the reason this band is a second
 * design rather than the first one with rows deleted.
 */
const LEGAL = [
  { text: "Privacy", href: "/privacy" },
  { text: "Terms", href: "/terms" },
] as const

export const footerSignupBand: Composition = {
  id: "footer-signup",
  part: "footer",
  label: "Footer, with one last thing to do",
  promise:
    "A wordmark with an email field beside it, two short columns of links, and the legal line under a rule.",
  rationale:
    "A closing footer is a loom.footer whose brand region holds the wordmark, a sentence and a loom.form with one loom.field and a loom.button, with one loom.link-list per column beside it. The form is in the brand region rather than a fifth column because that region is sized for a sentence rather than for links, and every link is a node so a column can be shortened or a destination moved without touching the band.",
  uses: [
    "loom.footer",
    "loom.heading",
    "loom.prose",
    "loom.form",
    "loom.field",
    "loom.button",
    "loom.link-list",
    "loom.link",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.footer",
      props: { tone: "surface", columns: "two" },
      children: [
        buildSlot(ids, "brand", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2 },
            children: [buildText(ids, "Overture")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "small", tone: "muted" },
            children: [buildText(ids, "One note a month about what changed, and nothing else.")],
          }),
          buildElement(ids, {
            type: "loom.form",
            props: { layout: "inline", width: "full" },
            children: [
              buildElement(ids, {
                type: "loom.field",
                props: {
                  name: "email",
                  label: "Email",
                  type: "email",
                  required: true,
                  placeholder: "you@company.com",
                  autocomplete: "email",
                },
              }),
              buildSlot(ids, "submit", [
                buildElement(ids, {
                  type: "loom.button",
                  props: { variant: "secondary", scale: "small" },
                  children: [buildText(ids, "Subscribe")],
                }),
              ]),
            ],
          }),
        ]),
        ...GROUPS.map((group) =>
          buildElement(ids, {
            type: "loom.link-list",
            props: { label: group.label, direction: "column" },
            children: group.links.map((link) =>
              buildElement(ids, {
                type: "loom.link",
                props: { href: link.href, tone: "muted", scale: "small" },
                children: [buildText(ids, link.text)],
              })
            ),
          })
        ),
        buildSlot(ids, "note", [
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "small", tone: "muted" },
            children: [buildText(ids, "© Overture. All rights reserved.")],
          }),
          buildElement(ids, {
            type: "loom.link-list",
            props: { direction: "row" },
            children: LEGAL.map((link) =>
              buildElement(ids, {
                type: "loom.link",
                props: { href: link.href, tone: "muted", scale: "small" },
                children: [buildText(ids, link.text)],
              })
            ),
          }),
        ]),
      ],
    }),
}
