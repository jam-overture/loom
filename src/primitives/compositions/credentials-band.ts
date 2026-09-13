import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * What it has been certified, audited or awarded — the band that unblocks a
 * procurement conversation.
 *
 * `proofBand` shows logos and `testimonialsBand` shows opinions. Neither is
 * admissible to the reader this band is for: the person who has to justify the
 * purchase to somebody else needs **a third party's name on a claim**, with a
 * date. It is the least glamorous band in the catalogue and the one most likely
 * to be the reason a page converts.
 *
 * ## Four fields, and every one of them is a fixed field
 *
 * `name`, `issuer`, `year`, `note`. There is exactly one of each per
 * credential, so by [0052](../../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
 * they are props and the *credential* is the node — the clean case of the rule,
 * and worth one band in the catalogue demonstrating it plainly.
 *
 * ## The dates are the content, not decoration
 *
 * An audit with no year is an audit a reader assumes is old. `year` is optional
 * on the primitive and set on every one of these deliberately: a starting
 * composition that omitted it would be teaching the shape that makes this band
 * useless. The same reasoning `metricsBand` gives for not shipping a number that
 * needs defending, one field across.
 *
 * ## No marks
 *
 * `loom.credential` has a `mark` region for the badge or seal, and it is left
 * empty for the reason `heroBand` leaves its media slot empty and `teamBand`
 * ships without portraits: the image would be a third party's trademark fetched
 * from a third party's domain, inside a tree a host might publish before
 * re-reading it. The primitive is complete without one, and the slot is there
 * for whoever has the asset and the right to use it.
 */
const CREDENTIALS = [
  {
    name: "SOC 2 Type II",
    issuer: "Prescott Lowell",
    year: "2026",
    note: "Twelve-month observation window, no exceptions raised.",
  },
  {
    name: "ISO 27001",
    issuer: "BSI",
    year: "2025",
    note: "Recertified annually. Scope covers the runtime and the hosted portal.",
  },
  {
    name: "Penetration test",
    issuer: "Cure53",
    year: "2026",
    note: "Full report available under NDA, including the two findings we fixed.",
  },
  {
    name: "GDPR data processing",
    issuer: "Bird & Bird",
    year: "2025",
    note: "Standard contractual clauses, with a DPA anybody can sign online.",
  },
] as const

export const credentialsBand: Composition = {
  id: "credentials",
  label: "Certifications",
  promise: "Four certifications in a grid, each with its issuer, its year and a line about scope.",
  rationale:
    "A credentials band is a loom.credential-grid holding a loom.credential per certification. Each is a node with four fixed fields, which is the plain case of the rule that repeated content becomes nodes and fixed fields stay props.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.credential-grid", "loom.credential"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", tone: "surface", eyebrow: "Audited", anchor: "certifications" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "The paperwork your security team will ask for")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted" },
          children: [buildText(ids, "All of it current, all of it dated, and the reports available before you sign anything.")],
        }),
        buildElement(ids, {
          type: "loom.credential-grid",
          /**
           * Two, not four, and the screenshot decided it. A credential's note
           * is a sentence about scope rather than a label, so the cells ask for
           * more width than a grid of four gives them — at `four` the fourth
           * card wrapped alone onto a second row, which reads as a card nobody
           * finished. `loom.credential-grid`'s columns is a floor fed to
           * auto-fit rather than a count, so this is a request for room and not
           * an instruction about how many fit.
           */
          props: { columns: "two" },
          children: CREDENTIALS.map((credential) =>
            buildElement(ids, {
              type: "loom.credential",
              props: {
                name: credential.name,
                issuer: credential.issuer,
                year: credential.year,
                note: credential.note,
              },
            })
          ),
        }),
      ],
    }),
}
