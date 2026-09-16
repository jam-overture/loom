import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Three claims, each given a whole row and the space to be argued rather than
 * listed.
 *
 * The second design of the features band, and the difference from
 * `features-band` is not decoration: a grid of six tiles says *here are six
 * things* and a column of three rows says *here are three things, and here is
 * why each one matters.* A tile has a title and two lines; a row has a
 * paragraph, a list of specifics and a link onward. They answer different
 * questions and a page that has something to explain wants this one.
 *
 * ## Why this is a band and not `configure` on the other one
 *
 * `loom.feature-grid` with `columns: "auto"` would put the six tiles in one
 * column, which is the same six nodes in a narrower arrangement. That is a
 * `configure` and belongs nowhere near a catalogue. This band builds a
 * different set of nodes entirely — `loom.split` per claim, each holding prose
 * and a `loom.list` the grid's tiles have no room for — so it is a design
 * rather than a setting, which is the test the catalogue's index describes.
 *
 * ## The alternation is a prop, and that is the interesting part
 *
 * Rows two and four read right-to-left, and `loom.split`'s own schema says why
 * that is `reverse: true` rather than two children in the other order:
 *
 * > Reverses the visual order without moving a node, so it is reversible by
 * > `configure`.
 *
 * So the zig-zag is three `configure`s away from being a straight column, and
 * a model asked to *stop alternating these* has one operation per row against
 * a prop that exists, instead of three `move`s that each renumber the tree.
 * This is 0052's near-miss read the other way round: the prop does not decide
 * *how many* rows there are, only which way each one faces, so it is a real
 * prop and the alternation is free.
 *
 * ## What sits opposite the prose
 *
 * A `loom.card` holding a `loom.list` of specifics, not a picture. Same reason
 * as the split hero: this library cannot ship an asset, and a band whose right
 * half is an empty box on every page it lands on is worse than one whose right
 * half is the detail the paragraph had to leave out. A host with screenshots
 * replaces the card; a host without one still has a band that reads.
 */
type Claim = {
  readonly icon: string
  readonly eyebrow: string
  readonly title: string
  readonly body: string
  readonly specifics: readonly string[]
  readonly link: { readonly label: string; readonly href: string }
}

const CLAIMS: readonly Claim[] = [
  {
    icon: "◈",
    eyebrow: "Review",
    title: "Nothing lands that nobody read",
    body: "Every change arrives as a proposal with the reasoning that produced it. You read the argument and the diff together, and the page only moves when you say so.",
    specifics: [
      "The reasoning is stored with the change, not with the chat",
      "Policy decides what needs a person and what does not",
      "A held change is visible to the whole team, not queued in one inbox",
    ],
    link: { label: "How review works", href: "/review" },
  },
  {
    icon: "⟲",
    eyebrow: "Undo",
    title: "Putting it back is one operation",
    body: "Every change has an inverse computed at the time it was made. Reverting is not a restore from a snapshot and does not take the rest of the day's work with it.",
    specifics: [
      "The inverse is computed when the change is, not reconstructed later",
      "Reverting one band leaves every other band alone",
      "The revert is itself a change, so it is reviewable too",
    ],
    link: { label: "How undo works", href: "/undo" },
  },
  {
    icon: "◉",
    eyebrow: "Theme",
    title: "Re-theming is not a rewrite",
    body: "Colour, type and spacing live in the palette rather than in the page. Changing how the whole site looks is one change to one node, and every band on it follows.",
    specifics: [
      "No band names a colour of its own",
      "A palette swap is one operation against the page root",
      "The same tree renders under every palette you have",
    ],
    link: { label: "How themes work", href: "/themes" },
  },
]

const claimRow = (ids: IdFactory, claim: Claim, index: number): ElementNode =>
  buildElement(ids, {
    type: "loom.split",
    props: { ratio: "even", align: "center", reverse: index % 2 === 1 },
    children: [
      buildSlot(ids, "start", [
        buildElement(ids, {
          type: "loom.stack",
          props: { direction: "column", gap: "normal" },
          children: [
            buildElement(ids, {
              type: "loom.stack",
              props: { direction: "row", gap: "snug", align: "center", wrap: false },
              children: [
                buildElement(ids, {
                  type: "loom.icon",
                  props: { shape: "soft", tone: "accent", size: "medium" },
                  children: [buildText(ids, claim.icon)],
                }),
                buildElement(ids, {
                  type: "loom.badge",
                  props: { tone: "neutral" },
                  children: [buildText(ids, claim.eyebrow)],
                }),
              ],
            }),
            buildElement(ids, {
              type: "loom.heading",
              props: { level: 3, balance: true },
              children: [buildText(ids, claim.title)],
            }),
            buildElement(ids, {
              type: "loom.prose",
              props: { tone: "muted", measured: true },
              children: [buildText(ids, claim.body)],
            }),
            buildElement(ids, {
              type: "loom.link",
              props: { href: claim.link.href, tone: "accent" },
              children: [buildText(ids, claim.link.label)],
            }),
          ],
        }),
      ]),
      buildSlot(ids, "end", [
        buildElement(ids, {
          type: "loom.card",
          props: { tone: "outline", padding: "loose" },
          children: [
            /**
             * `loom.perk-list` rather than `loom.list`, and the reason is the
             * marker. A specific here is a thing the product *does*, so the tick
             * is carrying meaning rather than decorating a bullet — and
             * `loom.perk-list-item` is the one primitive in the library that
             * announces its marker by name from 0060's text seam, so a screen
             * reader gets the claim and not a dingbat.
             */
            buildElement(ids, {
              type: "loom.perk-list",
              props: { columns: "one", density: "loose" },
              children: claim.specifics.map((specific) =>
                buildElement(ids, {
                  type: "loom.perk-list-item",
                  props: { label: specific, state: "included" },
                })
              ),
            }),
          ],
        }),
      ]),
    ],
  })

export const featuresAlternatingBand: Composition = {
  id: "features-alternating",
  part: "features",
  label: "Features, alternating rows",
  promise: "Three claims, each a full row with its paragraph on one side and its specifics on the other, alternating sides.",
  rationale:
    "An alternating features band is one loom.split per claim, each with prose and a link in its start region and a loom.card of specifics in its end region. Rows two and four set reverse, so the zig-zag is a prop rather than reordered nodes and undoing it is one configure per row.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.stack",
    "loom.split",
    "loom.icon",
    "loom.badge",
    "loom.link",
    "loom.card",
    "loom.perk-list",
    "loom.perk-list-item",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { eyebrow: "What it actually does", width: "wide", anchor: "features" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Three things, each worth a paragraph")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "lead", tone: "muted", measured: true },
            children: [
              buildText(ids, "The short version is on the tiles elsewhere. This is the version with the detail in it."),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.stack",
          props: { direction: "column", gap: "roomy" },
          children: CLAIMS.map((claim, index) => claimRow(ids, claim, index)),
        }),
      ],
    }),
}
