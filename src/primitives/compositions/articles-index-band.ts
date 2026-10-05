import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The writing band as an archive rather than as a shop window — every piece in
 * two columns, and the way to the rest of them underneath.
 *
 * ## Why a fifth design of a part that already had four
 *
 * The other four answer *what have you written lately*, which is the question a
 * landing page asks: `articles` promotes the newest piece across the top,
 * `articles-feed` reads from a source, `articles-episodes` and
 * `articles-whats-on` are the same region filled by a publisher and a venue.
 * Every one of them shows a **selection** and none of them says there is more.
 *
 * This one answers *where is everything*, and the difference lands in the tree
 * as a node the other four do not have: a `loom.link-pager` under the grid. A
 * band that shows four of a hundred posts and offers no way to the other
 * ninety-six is the commonest shape in the catalogue and the one a reader on an
 * archive page is most obviously failed by.
 *
 * ## The reason it is worth a run rather than a shrug
 *
 * `loom.link-pager` was written on 21 September, is registered, is rendered by
 * `library.test.ts`, and **no band in the catalogue has ever put one on a
 * page.** It is one of twelve primitives the reach measurement counts as
 * unreached, and — unlike the six waiting on an image source and `loom.menu`,
 * which is waiting on a word — it was waiting on nothing but somebody writing
 * the band. Its own doc comment names the four surfaces that end at it: *"an
 * archive, a blog, a catalogue and a search result all end at the same missing
 * band."* This is the first of the four.
 *
 * So the measurement it moves is reach rather than designs-per-part, and that
 * is the honest claim: a primitive nobody could see is a primitive nobody has
 * reviewed, whatever the registry says about it.
 *
 * ## Previous and next are the pager's regions, and the first page leaves one empty
 *
 * `loom.link-pager` places them at its two ends regardless of how many numbers
 * there are, which is 0051 and the reason they are regions rather than the
 * first and last children. A reader on page one has nothing before them, so the
 * `previous` region is **left unfilled** rather than given a disabled word —
 * which is this band's one deliberate choice and it is the reader's rather than
 * the paint's. A dead control that looks like a control is a press that does
 * nothing; an absent one is a reader who can see where they are. The current
 * page is marked by `loom.link`'s `current`, which is the same fact the site
 * header asks at a different scale.
 *
 * The ellipsis between 3 and 12 is a `text` child and not a link, because an
 * ellipsis in a pager is a piece of prose saying *there are more* — the pager's
 * own comment makes that call and this band is the first thing to honour it.
 *
 * ## Where the links point
 *
 * `/writing`, the same path the canonical gives every one of its cells, and
 * `/writing/2` for the pages of it. [0168](../../../decisions/0168-a-band-links-into-the-page-it-is-assembled-into.md)
 * is about a band linking into the page it is assembled into, and an archive is
 * the case it does not cover: the second page of an index is not a region of
 * this page and no anchor could name it. A path is the honest spelling, it is
 * the one the canonical design already uses, and the anchor this band carries is
 * `writing`, which every design of the part shares.
 */

const POSTS: readonly { readonly kicker: string; readonly title: string; readonly excerpt: string }[] = [
  {
    kicker: "14 October",
    title: "What a held change is for",
    excerpt: "The queue is not a safety net bolted on afterwards. It is where a judgement gets to be somebody's.",
  },
  {
    kicker: "2 October",
    title: "Reading a page by what people read",
    excerpt: "A share of the readers who reached a paragraph is a better question than how long they stayed.",
  },
  {
    kicker: "19 September",
    title: "Why the tree is the product",
    excerpt: "Every adaptation this runtime can make is an operation against a tree, and that is the whole constraint.",
  },
  {
    kicker: "6 September",
    title: "The props we did not add",
    excerpt: "A prop enumerates the change you predicted. Structure permits the one you did not.",
  },
  {
    kicker: "28 August",
    title: "Measuring a palette instead of trusting it",
    excerpt: "Two colours that clear a contrast bar in one theme and fail in another are not a design decision.",
  },
  {
    kicker: "11 August",
    title: "An interface that can be reviewed",
    excerpt: "Generated code cannot be read before it ships. A delta against a tree can be read in a sentence.",
  },
]

/** The run a reader walks, with the page they are on marked and the gap spoken. */
const PAGES: readonly { readonly label: string; readonly current: boolean; readonly href: string }[] = [
  { label: "1", current: true, href: "/writing" },
  { label: "2", current: false, href: "/writing/2" },
  { label: "3", current: false, href: "/writing/3" },
]

export const articlesIndexBand: Composition = {
  id: "articles-index",
  part: "articles",
  label: "Writing archive",
  promise: "Every piece in two columns, with a page-through control under it and the page you are on marked.",
  rationale:
    "An archive is the writing band with the thing the other designs leave out: a loom.link-pager under the grid, holding a loom.link per page and a text child for the gap. Each page number is a node, so a run that grows is an insert rather than a prop nobody predicted, and the previous region is left empty on page one because an absent control is honest where a dead one is not.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.article-grid", "loom.article", "loom.link-pager", "loom.link"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Writing", anchor: "writing" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Everything we have written down")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { tone: "muted", measured: true },
          children: [buildText(ids, "Six years of working notes, newest first.")],
        }),
        buildElement(ids, {
          /**
           * Two columns and no lead, which is the pair of props that makes this
           * an index rather than a front page: `lead` promotes the first cell
           * across the top, and a promoted piece is a selection. An archive
           * gives every row the same weight and lets the date say which is
           * newest.
           */
          type: "loom.article-grid",
          props: { columns: "two" },
          children: POSTS.map((post) =>
            buildElement(ids, {
              type: "loom.article",
              props: { kicker: post.kicker, title: post.title, excerpt: post.excerpt, href: "/writing" },
            })
          ),
        }),
        buildElement(ids, {
          type: "loom.link-pager",
          /**
           * `spread` is the archive-footer shape the pager's own prop comment
           * names, and the one that reads at 1280px: the numbers centred with
           * the way onward at the band's far edge, rather than a tight cluster
           * floating in the middle of a wide section.
           */
          props: { align: "spread" },
          children: [
            ...PAGES.map((page) =>
              buildElement(ids, {
                type: "loom.link",
                props: { href: page.href, scale: "small", ...(page.current ? { current: true } : {}) },
                children: [buildText(ids, page.label)],
              })
            ),
            buildText(ids, "…"),
            buildElement(ids, {
              type: "loom.link",
              props: { href: "/writing/12", scale: "small" },
              children: [buildText(ids, "12")],
            }),
            buildSlot(ids, "next", [
              buildElement(ids, {
                type: "loom.link",
                props: { href: "/writing/2", scale: "small" },
                children: [buildText(ids, "Older")],
              }),
            ]),
          ],
        }),
      ],
    }),
}
