import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The posture argued, with the paperwork beside it as evidence — rather than
 * the paperwork alone, which is what `credentialsBand` is.
 *
 * ## Why a second design of the least glamorous band in the catalogue
 *
 * `credentialsBand` is four certifications in a grid and its own comment is
 * right about who it is for: the person who has to justify the purchase to
 * somebody else, who needs a third party's name on a claim with a date. What it
 * cannot do is **say anything**. A wall of seals answers *are you certified* and
 * is silent on *what do you actually do with my data*, which is the question the
 * same reader asks second and the one a security review is actually made of.
 *
 * So this design puts a column of prose next to the seals. The argument is the
 * subject and the certifications are its footnotes, which is the inverse of the
 * canonical and is why it is a second design rather than a re-tint of the first:
 * a reader skimming this band leaves knowing a claim, and a reader skimming the
 * other leaves knowing a list.
 *
 * ## `loom.split` here, and `loom.grid` in `teamLeadsBand`, and why that is not
 * an inconsistency
 *
 * `teamLeadsBand`'s doc comment runs the same decision the other way and the two
 * belong read together, because the primitive is the same and the answer is
 * opposite.
 *
 * **Two regions is a claim about the content**, which is
 * [0217](../../../decisions/0217-choosing-a-two-region-primitive-is-itself-an-insert-decision.md)
 * in one line. Here the claim is true: one
 * region is an argument and the other is a list of evidence for it, they are
 * different kinds of thing, and nobody has ever wanted a third kind. A `move`
 * that swapped them is `reverse: true` and is already a `configure`; an `insert`
 * of a third region is not an adaptation anybody would propose, because there is
 * no third thing a compliance band is made of.
 *
 * In the team band the claim is false: a third lead is an ordinary promotion, so
 * two regions there would be `insert` made unreachable. The test is not *which
 * primitive looks right* — it is *does this fix how many children there can be,
 * and is that fixed in the content.*
 *
 * **What is repeated inside the regions is still nodes.** The four credentials
 * are a `loom.stack`'s children, so a fifth is one `insert` and the split does
 * not fix the count of anything a deployment varies.
 *
 * ## The two regions `credentialsBand` left empty, and the reason they can be
 * filled now
 *
 * `loom.credential` has a `mark` region for the seal and a `meta` region for
 * chips at the floor of the card. **The canonical ships both empty and says why:**
 * the image would be a third party's trademark fetched from a third party's
 * domain, inside a tree a host might publish before re-reading it. That
 * reasoning is about *assets*, and it leaves a true gap — the two regions were
 * unreachable by dropping in a band, so nothing in the catalogue demonstrated
 * either.
 *
 * `loom.icon` is the answer the canonical's comment did not have: a glyph is
 * something the library draws for itself, with no fetch and nobody's trademark
 * in it. A shield beside SOC 2 is not a seal and is not pretending to be one —
 * it is the mark a page uses *until* it has the seal, which is the state every
 * deployment of this band starts in.
 *
 * Each icon's `label` is deliberately absent. The rule is the primitive's own: an
 * icon beside a word saying the same thing must be hidden from assistive
 * technology, or a screen reader says *shield* and then *SOC 2 Type II*. The
 * glyph is decoration here and the name is the content.
 *
 * ## What is a node and what is a prop
 *
 * | | | |
 * | --- | --- | --- |
 * | a certification | **node**, a `loom.credential` | 0052's plainest case, unchanged from the canonical: four fixed fields, one of each, so the fields are props and the credential is the node |
 * | its mark | **node**, a `loom.icon` in the `mark` region | a `glyph: string` prop on the credential would have made *replace the glyph with the real seal* a `configure` that cannot change what kind of thing is in the box. As a node it is one `insert` of a `loom.media` over a `remove` of an icon |
 * | its status chip | **node**, a `loom.badge` in `meta` | and the region is plural on purpose — a credential that is both *Current* and *Scope: runtime only* is two badges, which a `status: string` prop could not hold |
 * | the argument | **`text` children of three `loom.prose` nodes**, not one | three paragraphs rather than one node with line breaks in it, because a reader who wants the middle claim moved under the seals should be able to move it |
 * | `ratio: "end-wide"`, `tone`, `spacing` | **props** | each changes how the two regions are drawn and changes the set of nodes not at all |
 */
const CREDENTIALS = [
  {
    name: "SOC 2 Type II",
    issuer: "Prescott Lowell",
    year: "2026",
    note: "Twelve-month window, no exceptions raised.",
    glyph: "🛡",
    status: "Current",
  },
  {
    name: "ISO 27001",
    issuer: "BSI",
    year: "2025",
    note: "Scope covers the runtime and the hosted portal.",
    glyph: "🔒",
    status: "Recertified yearly",
  },
  {
    name: "Penetration test",
    issuer: "Cure53",
    year: "2026",
    note: "Full report, including the two findings we fixed.",
    glyph: "🧪",
    status: "On request",
  },
  {
    name: "GDPR data processing",
    issuer: "Bird & Bird",
    year: "2025",
    note: "Standard contractual clauses, reviewed by counsel.",
    glyph: "⚖",
    status: "Signable online",
  },
] as const

/**
 * Three paragraphs, and the order is the argument.
 *
 * What a security reviewer wants to know about a system that lets a model change
 * a page is, in this order: what reaches the model, what the model may do
 * unsupervised, and what is written down afterwards. The seals answer none of
 * those and this column answers all three, which is the division of labour the
 * band is for.
 */
const POSTURE = [
  "Your reader's data never reaches a model. A page is interpreted from its tree and its registry — the shapes, not the contents — so a proposal is computed against a structure that has no visitor in it.",
  "Nothing lands unweighed. Every change is judged before it is written, and the deployment sets the ceiling above which a person has to answer. A model cannot raise its own ceiling and cannot apply a change it was refused.",
  "And all of it is on the record: what was asked, what was proposed, who allowed it, what it did to the page, and the inverse that undoes it.",
] as const

export const credentialsPostureBand: Composition = {
  id: "credentials-posture",
  part: "credentials",
  label: "Security posture",
  promise:
    "The security argument in a column of prose, with four dated certifications beside it, each carrying a mark and a status chip.",
  rationale:
    "A posture band is a loom.split whose start region argues the claim in loom.prose and whose end region stacks a loom.credential per certification, each with a loom.icon in its mark region and a loom.badge in its meta region. The two regions are different kinds of thing rather than a repeated one, which is the condition a split is for.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.split",
    "loom.link",
    "loom.stack",
    "loom.credential",
    "loom.icon",
    "loom.badge",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", tone: "surface", eyebrow: "Audited", anchor: "certifications" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "What a model may do here, and who signed off on the answer")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.split",
          /**
           * `end-wide`, because the evidence is four cards and the argument is
           * three paragraphs. Even, the paragraphs run past a comfortable
           * measure at 1280 and the cards have less room than their own notes
           * need; `start-wide` does both at once. Both regions become full-width
           * blocks at a phone, in source order, which is why the argument is the
           * start region — a reader on a phone should meet the claim before the
           * seals that footnote it.
           */
          props: { ratio: "end-wide", align: "start" },
          children: [
            buildSlot(ids, "start", [
              ...POSTURE.map((paragraph) =>
                buildElement(ids, {
                  type: "loom.prose",
                  props: { tone: "muted" },
                  children: [buildText(ids, paragraph)],
                })
              ),
              buildElement(ids, {
                type: "loom.link",
                props: { href: "/trust", tone: "accent" },
                children: [buildText(ids, "The whole of it, in one page")],
              }),
            ]),
            buildSlot(ids, "end", [
              buildElement(ids, {
                type: "loom.stack",
                props: { direction: "column", gap: "snug" },
                children: CREDENTIALS.map((credential) =>
                  buildElement(ids, {
                    type: "loom.credential",
                    props: {
                      name: credential.name,
                      issuer: credential.issuer,
                      year: credential.year,
                      note: credential.note,
                    },
                    children: [
                      buildSlot(ids, "mark", [
                        buildElement(ids, {
                          type: "loom.icon",
                          /**
                           * No `label`, and that is the primitive's own rule
                           * rather than an omission: the glyph sits beside a
                           * name saying the same thing, so labelled it would be
                           * read out before the name it decorates.
                           */
                          props: { shape: "soft", tone: "accent", size: "medium" },
                          children: [buildText(ids, credential.glyph)],
                        }),
                      ]),
                      buildSlot(ids, "meta", [
                        buildElement(ids, {
                          type: "loom.badge",
                          props: { tone: "outline" },
                          children: [buildText(ids, credential.status)],
                        }),
                      ]),
                    ],
                  })
                ),
              }),
            ]),
          ],
        }),
      ],
    }),
}
