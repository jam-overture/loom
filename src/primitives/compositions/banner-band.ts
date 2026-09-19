import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The strip above everything — the first thing on the page and the first part
 * this catalogue has ever had that sits above the navigation.
 *
 * ## Why a twentieth part rather than a second design of something
 *
 * `COMPOSITION_PARTS` has been closed at nineteen since 16 September and three
 * runs in a row have named the closure as the thing stopping a band from
 * landing, without opening it. It was the right bar to hold while the question
 * was *is this band a new part or a `configure` of an old one*, which is 0162's
 * question one level up, and it is the wrong bar to hold forever: a vocabulary
 * that cannot grow is a vocabulary that decides in advance what a page is
 * allowed to be.
 *
 * [0171](../../../decisions/0171-a-page-part-is-earned-by-the-region-it-occupies.md)
 * settles it, and this band is the first thing admitted under the rule. The
 * rule's test is **the region**, not the content: a part earns a place when
 * there is somewhere on a page it goes that nothing already in the sequence
 * occupies. A banner clears it by the widest margin available, because the
 * region it occupies is *above the navigation* and nineteen parts begin at the
 * navigation.
 *
 * ## What it is not
 *
 * It is not `cta`, and the difference is not emphasis. A call to action asks
 * the reader to do the thing the page is selling, at the point they have read
 * enough to decide; a banner says something **true of the whole page for a
 * while** — a launch, a price change, a maintenance window — and is the one
 * band on a page whose natural lifetime is days. That difference shows up in
 * the tree rather than only in the copy: this band is a single
 * `loom.banner` with one link in its `action` region and no heading at all,
 * where every closing band in the catalogue opens with a `loom.heading` at
 * level 2. A strip that carried a heading would be a section, and a page that
 * opened with a level-2 heading above its level-1 is an outline defect no
 * palette makes visible.
 *
 * ## Why the root is not a `loom.section`
 *
 * Every band in the catalogue except `nav` and `footer` roots at a
 * `loom.section`, and those two are the precedent rather than the exception:
 * a section is a region of the document with a heading, and page furniture is
 * not that. `loom.banner` renders an `aside` when it is given a `label`, which
 * is what puts the strip in a screen reader's landmark menu under a name
 * rather than leaving it as the first anonymous `div` a reader meets.
 *
 * The label is set for that reason and it is worth being exact about what it
 * buys: a reader arriving with a landmark menu sees *Announcement* and can
 * skip it, and a reader arriving without one meets four words before the
 * navigation. Both are better than the unnamed strip, and only the first is
 * invisible in a screenshot.
 *
 * ## The link goes to the changelog band on this page
 *
 * `#changelog` rather than `/changelog`, which is
 * [0168](../../../decisions/0168-a-band-links-into-the-page-it-is-assembled-into.md)
 * applied to the one band that most wants to point outward. The catalogue
 * ships no site, so a path to a page that does not exist is the defect #329
 * found in the nav bar; the assembled page *does* carry a changelog band, and
 * the assertion over `PAGE_SEQUENCE` is what keeps that true when either band
 * moves.
 */
export const bannerBand: Composition = {
  id: "banner",
  part: "banner",
  label: "Announcement strip",
  promise: "A tinted strip above the navigation: one sentence of news and one link to the rest of it.",
  rationale:
    "An announcement is a loom.banner holding the sentence as text and a loom.link in its action region. The sentence is children rather than a prop so a word of it can be emphasised or replaced without touching the strip, and the one thing to do about it is a node, so a banner with nothing to click is that node removed.",
  uses: ["loom.banner", "loom.emphasis", "loom.link"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.banner",
      props: { tone: "accent", align: "center", label: "Announcement" },
      children: [
        buildElement(ids, {
          type: "loom.emphasis",
          props: { tone: "strong" },
          children: [buildText(ids, "0.4 is out")],
        }),
        buildText(ids, " — bindings, held changes, and a review queue that names the page it could not read."),
        buildSlot(ids, "action", [
          buildElement(ids, {
            type: "loom.link",
            props: { href: "#changelog", tone: "default", scale: "small" },
            children: [buildText(ids, "See what changed")],
          }),
        ]),
      ],
    }),
}
