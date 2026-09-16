import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The last four things written, with the newest running across the top.
 *
 * Every product site that is any good has a place where the people building it
 * think out loud, and the catalogue could not put one on a page. This is the
 * band that turns a landing page into a site somebody comes back to.
 *
 * ## `lead`, and why it is a boolean here rather than a rhythm
 *
 * `loom.article-grid` takes `lead: true`, which runs its first child across the
 * full width and sets the rest beneath. That is the same emphasis
 * `bentoBand` gets from `loom.mosaic`'s `lead` rhythm, and the two primitives
 * spell it differently because they are answering different questions: a mosaic
 * is *a rhythm of unequal cells* and a grid with a lead is *an even grid with
 * one exception*. A newest post is an exception rather than a rhythm, so this
 * is the right one.
 *
 * ## Kickers are the taxonomy, and they are prose
 *
 * `kicker` carries "Engineering", "Changelog", "Field notes" — the word that
 * tells a reader whether this post is for them. It is a string on the article
 * rather than a registered category, and that is deliberate at this layer: a
 * taxonomy that has to stay consistent across posts is something a *source*
 * enforces, and anything list-shaped that would really come from a database now
 * has the binding seam
 * ([0058](../../../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md))
 * rather than a composition pretending.
 *
 * **So this band is a starting point that expects to be replaced.** Four
 * authored articles are what a page looks like before it has a blog; the same
 * four `loom.article` nodes are what a binding would produce once it has one.
 * That continuity is the reason the band is worth shipping authored.
 */
const POSTS = [
  {
    kicker: "Field notes",
    title: "What a year of AI-authored pages actually broke",
    excerpt: "Not the model. The seam between what it proposed and what anybody could check before it shipped.",
  },
  {
    kicker: "Engineering",
    title: "Why every change carries its own inverse",
    excerpt: "Undo computed at the moment of change is cheap. Undo reconstructed afterwards is a restore, and a restore loses everything since.",
  },
  {
    kicker: "Design",
    title: "The granularity problem nobody warns you about",
    excerpt: "Props enumerate the adaptations you predicted. Structure permits the ones you did not.",
  },
  {
    kicker: "Changelog",
    title: "Ninety-two primitives, and the four that mattered",
    excerpt: "Breadth is easy to measure and easy to fake. Here is what we counted and what we refused to.",
  },
] as const

export const articlesBand: Composition = {
  id: "articles",
  part: "articles",
  label: "Writing",
  promise: "Four recent posts in a grid, with the newest running across the top.",
  rationale:
    "A writing band is a loom.article-grid with lead set, holding a loom.article per post. Each post is a node, so one can be added or dropped without touching the rest — and the same nodes are what a bound source would produce.",
  uses: ["loom.section", "loom.heading", "loom.article-grid", "loom.article"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Writing", anchor: "writing" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "What we have been working out in public")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.article-grid",
          props: { columns: "three", lead: true },
          children: POSTS.map((post) =>
            buildElement(ids, {
              type: "loom.article",
              props: { kicker: post.kicker, title: post.title, excerpt: post.excerpt, href: "/writing" },
            })
          ),
        }),
      ],
    }),
}
