import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The end of the page: four columns of links, a wordmark and a legal line.
 *
 * `loom.footer` places three things — a brand region, however many groups it is
 * handed, and a note under all of them — and knows nothing about what goes in
 * them, which is right. The knowledge this composition adds is the part that is
 * a convention rather than a capability: **which four columns**, and the fact
 * that the site's own top-level routes are what belongs in them.
 *
 * ## Twenty-one nodes, and the most tedious band on any page
 *
 * A footer is the band nobody enjoys building and everybody rebuilds: four
 * `loom.link-list` groups, five, four, four and three `loom.link` nodes inside
 * them, a wordmark, a line of copy. Twenty-one operations by hand, none of them
 * interesting, all of them the same four column headings every product site has
 * had for fifteen years. If a starting composition is worth anything at all it
 * is worth it here.
 *
 * ## Every destination is a path on this site
 *
 * `/pricing`, `/docs`, `/changelog`. That is not a placeholder convention, it
 * is the correct value: a footer links to the site it is in the footer of.
 * 0100 and 0102 are what make it expressible — a same-origin path is decided by
 * resolving it, so `/docs` is checked and permitted where a bare `docs` is
 * refused — and it means the band arrives with twenty-one live links and not
 * one dependency on anything outside the deployment.
 *
 * The links a real footer has that this one does not are the ones that would be
 * a lie: no social accounts, because a library cannot know which handles a
 * deployment owns and a wrong one is a link to a stranger.
 *
 * ## The legal line is a note and not a group
 *
 * `loom.footer`'s `note` region takes the copyright and the two policy links,
 * because it is placed under the rule rather than beside the columns. That is
 * 0051's test applied by the primitive already; the composition's job is only
 * to put the right thing in it — a `loom.link-list` in `row` direction, which
 * is the same primitive as the columns above with one prop different, and is
 * the clearest small illustration in the catalogue of *how many* being
 * structure and *which way* being a prop.
 */
const GROUPS = [
  { label: "Product", links: [
    { text: "Overview", href: "/" },
    { text: "Pricing", href: "/pricing" },
    { text: "Changelog", href: "/changelog" },
    { text: "Roadmap", href: "/roadmap" },
    { text: "Status", href: "/status" },
  ] },
  { label: "Developers", links: [
    { text: "Documentation", href: "/docs" },
    { text: "API reference", href: "/docs/api" },
    { text: "Integrations", href: "/integrations" },
    { text: "Self-hosting", href: "/docs/self-hosting" },
  ] },
  { label: "Company", links: [
    { text: "About", href: "/about" },
    { text: "Careers", href: "/careers" },
    { text: "Blog", href: "/blog" },
    { text: "Contact", href: "/contact" },
  ] },
  { label: "Resources", links: [
    { text: "Guides", href: "/guides" },
    { text: "Customer stories", href: "/customers" },
    { text: "Support", href: "/support" },
  ] },
] as const

const LEGAL = [
  { text: "Privacy", href: "/privacy" },
  { text: "Terms", href: "/terms" },
  { text: "Security", href: "/security" },
] as const

export const footerBand: Composition = {
  id: "footer",
  label: "Footer",
  promise: "Four columns of links with a wordmark beside them, over a legal line.",
  rationale:
    "A footer is a loom.footer holding one loom.link-list per column and one loom.link per destination. Which way a group runs is a prop; how many links it has is structure, so a link is a node and can be moved between columns.",
  uses: ["loom.footer", "loom.heading", "loom.prose", "loom.link-list", "loom.link"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.footer",
      props: { tone: "surface", columns: "four" },
      children: [
        buildSlot(ids, "brand", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2 },
            children: [buildText(ids, "Northwind")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "small", tone: "muted" },
            children: [buildText(ids, "One place for the work, the review and what shipped.")],
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
            children: [buildText(ids, "© Northwind. All rights reserved.")],
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
