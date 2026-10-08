import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { DocumentComposition } from "./document.js"

/**
 * Where this page sits in the run the reader is walking — back one, on one, and
 * the way up.
 *
 * ## The region, and why `articles` cannot stand in for it
 *
 * `articles` answers *where is everything*, and `articles-index` already carries
 * a `loom.link-pager` for exactly that. This answers a different question and it
 * is the one a reader at the bottom of a guide actually has: **what is the next
 * page of this guide.**
 *
 * The swap breaks both ways. An archive grid at the foot of chapter three is a
 * reader handed the whole site when they wanted one link; previous-and-next at
 * the foot of a blog index is previous-and-next of *what*. One is a selection of
 * the site's output, the other is this document's place in an ordered set, and
 * no deployment wants either in the other's region.
 *
 * ## Why the pager and not two links in a row
 *
 * `loom.link-pager` places `previous` and `next` at its two ends regardless of
 * what is between them, which is 0051: they are regions the primitive places,
 * so a reader gets back and forward in the same place on every page of the
 * guide. Two `loom.link` children in a `loom.stack` would put them wherever the
 * flow left them, and the first guide page — which has no previous — would pull
 * its *next* link to the left edge.
 *
 * **That empty region is this band's one deliberate choice and it is the
 * reader's rather than the paint's.** The first page of a run has nothing
 * before it, so a deployment on that page leaves `previous` unfilled rather
 * than filling it with a dead word. `articles-index` made the same call for the
 * same reason and this band is the second to honour it; here the region *is*
 * filled, because a guide's third chapter has a second.
 *
 * ## `wide`, for the reason the trail gives
 *
 * The same correction a wide shot forced on `trailBand`: this band's rule and
 * its two ends have to line up with the title and the prose above them, and
 * what decides that is the document band's measure. At `readable` the rule
 * started a hundred pixels inside the text it was drawn under, which is the
 * kind of thing no schema, diagnostic or overflow reading can see.
 *
 * ## The way up is a child rather than a third region
 *
 * The pager has two regions and a middle. On an archive the middle is the page
 * numbers; here it is one link back to the guide's own index — *All guides* —
 * which is the trail's second-to-last crumb reached from the other end of the
 * page. It is a child and not a region because nothing about it needs to be at
 * an end, and a third region on `loom.link-pager` would be a prop that changed
 * the set of nodes.
 */

export const onwardBand: DocumentComposition = {
  id: "onward",
  part: "onward",
  label: "Previous and next",
  promise: "A row at the foot of the page: the chapter before, the one after, and the way back up to the index.",
  rationale:
    "A loom.link-pager puts previous and next in its two placed regions, so back and forward are in the same place on every page of a run rather than wherever the flow of children left them. The way up is an ordinary child in the middle, because nothing about it needs to be at an end and a third region would be a prop that changed the set of nodes. Each of the three is a node, so re-ordering a guide is a configure of two hrefs. It sits at the document's band width so its rule and its two ends line up with the title and the text above them.",
  uses: ["loom.section", "loom.divider", "loom.link-pager", "loom.link"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", anchor: "onward" },
      children: [
        buildElement(ids, { type: "loom.divider", props: { ornament: "rule", spacing: "tight" } }),
        buildElement(ids, {
          type: "loom.link-pager",
          /**
           * `spread` for the reason `articles-index` gives: the ends at the
           * band's edges with the middle centred, rather than a tight cluster
           * floating in a section the reader has just finished reading across.
           */
          props: { align: "spread" },
          children: [
            buildSlot(ids, "previous", [
              buildElement(ids, {
                type: "loom.link",
                props: { href: "/docs/guides/building-with-loom/the-tree", scale: "small" },
                children: [buildText(ids, "The tree a page is")],
              }),
            ]),
            buildElement(ids, {
              type: "loom.link",
              props: { href: "/docs/guides", tone: "muted", scale: "small" },
              children: [buildText(ids, "All guides")],
            }),
            buildSlot(ids, "next", [
              buildElement(ids, {
                type: "loom.link",
                props: { href: "/docs/guides/building-with-loom/writing-a-band", scale: "small" },
                children: [buildText(ids, "Writing a band of your own")],
              }),
            ]),
          ],
        }),
      ],
    }),
}
