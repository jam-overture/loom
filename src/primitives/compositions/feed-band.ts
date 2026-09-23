import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The writing band as a page that has a blog draws it: one node that asks where
 * the posts are, and the region it shows until something answers.
 *
 * `articlesBand` is the same part with four posts somebody typed, and its own
 * comment names this band before it existed:
 *
 * > **So this band is a starting point that expects to be replaced.** Four
 * > authored articles are what a page looks like before it has a blog; the
 * > same four `loom.article` nodes are what a binding would produce once it
 * > has one.
 *
 * That turned out to be half right, and the half it got wrong is the reason
 * this is a second design rather than a prop on the first. A binding does
 * **not** produce `loom.article` nodes. Rows that came from a database are
 * never nodes — no `move` addresses the third post, no `configure` re-words it,
 * nobody is attributed for it, and its inverse is not a change to this page —
 * so the bound band builds a different set of nodes from the authored one,
 * which is exactly the bar a design has to clear to earn a place in the
 * catalogue. Two designs of `articles`: one you write, one you connect.
 *
 * ## It arrives unbound, and that is the band rather than a shortcoming
 *
 * The `loom.feed` this drops in declares no `loom:data`. A composition that
 * declared one would name a source id, and a source id is a thing a *host*
 * registers — so every deployment that had not registered that exact id would
 * get a page reporting a binding it never agreed to make, and every surface in
 * this repository that renders the catalogue without resolving data would
 * report it too.
 *
 * So what drops in is the band before anybody connected it, which is a real
 * state of a real page and is drawn deliberately: a designed empty region,
 * saying what would be here and offering the one action that would fill it.
 * Connecting it afterwards is a `configure` that adds the binding, weighed like
 * any other change
 * ([0163](../../../decisions/0163-a-binding-is-weighed-like-a-destination.md)) —
 * which is the whole argument for starting compositions being structure rather
 * than configuration, reaching the data seam.
 *
 * ## `compact`, on a region that is the whole band
 *
 * `loom.empty-state`'s `standard` stature is a band of the page, and that is
 * the right default for a region standing in for content somewhere inside one.
 * Here the empty state *is* the band, inside a section that has already paid
 * for the vertical space around it, and at `standard` the dashed box comes out
 * taller than the four cards the authored design of this same part draws. A
 * page with nothing to show should not take more room than the same page full.
 *
 * ## Why `meta: "above"` and a rule between entries
 *
 * A date over a headline is the editorial arrangement, and it is the one that
 * survives a row with no date: the meta line is drawn only when a row carries
 * one, and an absent date above a headline leaves a headline where a headline
 * goes. Run inline, the same absence leaves a title with a gap after it that
 * reads as a missing word.
 *
 * The hairline is what makes a list of three entries read as a run rather than
 * as three paragraphs, and it is the band's rather than the entry's for the
 * reason `loom.milestone`'s rail is the list's: the first entry must not have
 * one, and nothing an entry knows about itself can tell it that it is first.
 */
export const feedBand: Composition = {
  id: "articles-feed",
  part: "articles",
  label: "Writing, from a source",
  promise: "The latest posts read from a connected source, with the region it shows until one answers.",
  rationale:
    "A loom.feed asks a registered source for its entries and draws them; rows from a database are never nodes, so this builds a different set of nodes from the authored writing band rather than the same one filled differently. It drops in unbound, showing the loom.empty-state in its empty region, and connecting it is one configure that adds the binding.",
  uses: ["loom.section", "loom.heading", "loom.feed", "loom.empty-state", "loom.icon", "loom.action"],
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
          type: "loom.feed",
          props: { density: "loose", separators: "rule", meta: "above" },
          children: [
            buildSlot(ids, "empty", [
              buildElement(ids, {
                type: "loom.empty-state",
                props: { outline: "dashed", align: "center", cause: "empty", stature: "compact" },
                children: [
                  buildSlot(ids, "media", [
                    buildElement(ids, {
                      type: "loom.icon",
                      props: { shape: "bare", tone: "neutral", size: "medium" },
                      children: [buildText(ids, "✎")],
                    }),
                  ]),
                  buildSlot(ids, "heading", [
                    buildElement(ids, {
                      type: "loom.heading",
                      props: { level: 3 },
                      children: [buildText(ids, "Nothing published yet")],
                    }),
                  ]),
                  buildText(
                    ids,
                    "Point this band at the place your posts already live, and the latest of them appear here — title, date and summary — without anybody copying them across."
                  ),
                  buildSlot(ids, "actions", [
                    buildElement(ids, {
                      type: "loom.action",
                      props: { href: "/writing", variant: "primary" },
                      children: [buildText(ids, "Connect a source")],
                    }),
                  ]),
                ],
              }),
            ]),
          ],
        }),
      ],
    }),
}
