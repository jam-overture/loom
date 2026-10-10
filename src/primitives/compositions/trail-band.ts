import type { IdFactory } from "../../ids.js"
import { buildElement, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { DocumentComposition } from "./document.js"

/**
 * Where the reader is, under the header and above the text.
 *
 * ## The region, and why `banner` cannot stand in for it
 *
 * 0171's bar is the region and the test is that two candidates cannot be
 * swapped. `banner` is the only other strip-shaped part in the catalogue, and it
 * sits **above** the navigation carrying one sentence and one thing to do about
 * it. This sits **below** it and carries no message at all: it is a *position*,
 * and the only thing it says is how the reader got here and how they get back
 * out.
 *
 * Swap them and both pages break in opposite directions. A promotional strip
 * below the header is a strip nobody sees above the fold of the thing they came
 * to read; a breadcrumb above the header is a breadcrumb drawn before the site
 * has named itself.
 *
 * ## What this band closes
 *
 * `loom.link-trail` was written on 21 September, is registered, is rendered by
 * `library.test.ts`, and **no band in the catalogue has ever put one on a
 * page.** It was the last of the ten unreached primitives waiting on work in
 * this lane — the other nine are the framework's asset seam (seven), a state
 * this runtime is never in (`loom.waiting-state`) and the render root
 * (`loom.page`), and
 * [0245](../../../decisions/0245-a-second-page-sequence-is-earned-by-regions-in-a-different-order-and-the-sites-own-regions-are-shared.md)
 * tabulates all nine so a later run does not re-plan against the number.
 *
 * The gap inventory had it filed as *waiting on a second page sequence*, and
 * that was exactly right: a breadcrumb on a landing page points at nothing,
 * because the landing page is the root of the site. Reaching it by putting one
 * there would have moved the measurement by one and put a false piece of chrome
 * in the catalogue.
 *
 * ## Four crumbs, and the last one is not a link
 *
 * Each crumb is a `loom.link` node, so *drop the middle step* is a `remove` and
 * *this guide moved under Reference* is a `configure` of one node's `href` —
 * neither reachable against a `path: string[]` prop, which is what 0052 is
 * about. The depth is four because that is where a trail starts being worth
 * drawing; two crumbs is a back link.
 *
 * The last carries `current: true` rather than being left as text. It is the
 * page the reader is on, which `loom.link-trail` marks with
 * `aria-current="page"` — so the row announces where it ends instead of
 * announcing a fourth destination that happens to be here.
 *
 * ## Why `wide`, which the first draft got backwards
 *
 * A trail must start at the same x as the title under it, and the thing that
 * decides that is the **band's** measure rather than the paragraph's. This was
 * written as `readable` on the reasoning that a breadcrumb belongs to the text
 * — and the wide shot showed it indented about a hundred pixels from the title,
 * because `documentBand` is `wide` and the words inside it take their measure
 * from a `measured` prop further down rather than from the section.
 *
 * So the rule is the one the picture gives: **the chrome of a document matches
 * the document's band width, not its reading measure.** `onwardBand` is the
 * same correction at the other end of the page, and `documents.test.ts` holds
 * the three together so a later change to one is red rather than crooked.
 *
 * `loom.section` at its default `canvas` tone adds the smaller of its two
 * paddings, which is what keeps this a strip rather than a band of its own.
 */

/** The way back out, outermost first, ending on the page the reader is on. */
const CRUMBS: readonly { readonly label: string; readonly href: string; readonly current?: true }[] = [
  { label: "Docs", href: "/docs" },
  { label: "Guides", href: "/docs/guides" },
  { label: "Building with Loom", href: "/docs/guides/building-with-loom" },
  { label: "Starting from a band", href: "/docs/guides/building-with-loom/starting-from-a-band", current: true },
]

export const trailBand: DocumentComposition = {
  id: "trail",
  part: "trail",
  label: "Breadcrumb trail",
  promise: "A row under the header naming every step back out, ending on the page the reader is on.",
  rationale:
    "A trail is a loom.link-trail holding one loom.link per step, which is 0054's container-plus-child: the separators are drawn between the crumbs by the primitive's own stylesheet, so nothing announces a slash as part of a link's name. Each crumb is a node, so moving a page under a different parent is a configure of one href rather than a prop nobody predicted. The last crumb carries current, which marks it aria-current=page instead of offering the reader a link to where they already are. It sits at the band width of the document rather than at a reading measure, because a trail has to start at the same x as the title under it.",
  uses: ["loom.section", "loom.link-trail", "loom.link"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide" },
      children: [
        buildElement(ids, {
          type: "loom.link-trail",
          /**
           * `chevron` is the primitive's default and the one its own header
           * argues for: a rotated corner with `content: ""` has nothing for a
           * screen reader to announce, where a `/` is read aloud by some and
           * skipped by others. `slash` is kept for a serif documentation site
           * and is a rendering rather than a structure, so it is not this
           * band's to prefer.
           */
          props: { separator: "chevron", scale: "small" },
          children: CRUMBS.map((crumb) =>
            buildElement(ids, {
              type: "loom.link",
              props: {
                href: crumb.href,
                tone: "muted",
                scale: "small",
                ...(crumb.current === undefined ? {} : { current: true }),
              },
              children: [buildText(ids, crumb.label)],
            })
          ),
        }),
      ],
    }),
}
