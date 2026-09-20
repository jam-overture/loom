import {
  buildElement,
  buildSlot,
  buildText,
  type IdFactory,
  type LoomNode,
} from "@loom/runtime"

import { prose, section } from "../nodes"

/**
 * The band where the front door stops claiming it is built in Loom and shows it.
 *
 * The site has said so since 19 August, in a sentence at the very bottom: *"The
 * menu, the questions, this sentence — every one of them is a piece the AI could
 * be asked to move. None of it was written by hand."* The first half is true and
 * checkable. **The second half was neither.** Read plainly by somebody who has
 * never heard of this, *none of it was written by hand* says a machine wrote the
 * words — and every word on this site was written by a person. Worse, it was
 * false in a way the reader could catch: the button immediately beside it says
 * *Read the source*, and the source is a file with those exact words typed into
 * it.
 *
 * What the sentence was reaching for is true and is worth a band rather than a
 * clause: **no band of this site is written out as a web page.** There is no
 * markup in any page builder in this lane — a heading is an element with a text
 * child, and the menu and the foot of the page are too — which is the property
 * every other claim on the site rests on. A page that is data can be addressed,
 * moved, measured, refused and put back. A page that is markup can only be
 * edited.
 *
 * So the band shows one piece twice: **the same node, rendered and printed.**
 * Not two copies — one object, placed in the split's first region and serialised
 * into the panel in its second. Nothing here can drift from the page, because
 * there is nothing here to drift *from*: `asDataBand` builds the specimen once
 * and both halves are that.
 *
 * That is also why the specimen is a box of its own rather than a band that was
 * already on the page. A band the visitor can ask to move would make the panel
 * stale the moment they did — the panel holds the page as it was published, and
 * a request that reconfigured what it prints would leave the site's most
 * checkable claim quietly wrong. `as-data.test.ts` holds every choice the front
 * door offers against the specimen for exactly that reason.
 */

/**
 * The one piece the band prints, and it says what the band is about.
 *
 * A `loom.callout` rather than a sentence because the interesting half of the
 * panel is the *shape*: a piece with settings, holding another piece that holds
 * the words. Two levels is the whole idea and one level would not show it.
 *
 * **Its words are short because a JSON string does not wrap.** `loom.code` sets
 * `white-space: pre` and scrolls, which is right for code and wrong for a band
 * a visitor is meant to read at a glance: the first draft of this box carried
 * the band's whole argument, and the line holding it ran off the edge of the
 * panel with only a scrollbar to say so. The argument moved into the prose
 * below, where nothing constrains its length, and the box kept the job it is
 * actually here for — being small enough to read whole, twice.
 */
const specimen = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.callout",
    props: { tone: "accent", title: "This box is one of those pieces" },
    children: [buildText(ids, "So is the menu. So is every band above.")],
  })

/** A piece of the page, printed the way the page holds it. */
export const asJson = (node: LoomNode): string => JSON.stringify(node, null, 2)

/**
 * The panel, and a caption that names no side.
 *
 * `loom.split` wraps to one column when there is no room, so the two regions are
 * beside each other on a laptop and stacked on a phone. Any word placing one of
 * them — *left*, *right*, *above*, *opposite* — is a sentence that is correct on
 * one of the two devices this page is read on. The band's copy therefore names
 * the thing rather than its position, which costs nothing and is right in both.
 */
const panel = (ids: IdFactory, node: LoomNode): LoomNode =>
  buildElement(ids, {
    type: "loom.code",
    props: {
      language: "json",
      caption: "The box in this band, exactly as this page keeps it — the same one, not a copy of it.",
    },
    children: [buildText(ids, asJson(node))],
  })

/**
 * The eyebrow, spelled here rather than in `bands.ts`.
 *
 * `bands.ts` is *what each band of the front door is called*, and this band is
 * not on the front door any more — the maintainer read it on 20 September and
 * said the page was too busy, and three separate demonstrations stacked down
 * one landing page is most of what made it so. It sits on the mechanism page
 * now, which is where a reader who wants the proof has already gone looking for
 * it, and where the page around it is about the machinery rather than about the
 * pitch. Nothing about the band changed.
 */
export const AS_DATA_EYEBROW = "How this page is put together"

export const asDataBand = (ids: IdFactory): LoomNode => {
  const shown = specimen(ids)

  return section(
    ids,
    { tone: "canvas", width: "wide", eyebrow: AS_DATA_EYEBROW },
    "The same thing, twice",
    [
      prose(
        ids,
        "Every band you have read is a piece this page holds, rather than a page somebody wrote out by hand. Here is one of them both ways: as you read it, and as the page keeps it.",
        { tone: "muted", measured: true }
      ),
      /**
       * The panel takes the wide side, and the sentence about the box stands
       * with the box rather than under the whole band.
       *
       * Both are consequences of the same measurement: the box is three lines
       * and the listing is fifteen. An even split clipped the listing's longest
       * line, and a split holding the box alone left two thirds of its own
       * region empty however the two were aligned. Giving the region the
       * paragraph fills it with the one sentence a reader wants while looking
       * at the box, and on a phone — where the regions stack — it arrives in
       * exactly the same order.
       */
      buildElement(ids, {
        type: "loom.split",
        props: { ratio: "end-wide", align: "start" },
        children: [
          buildSlot(ids, "start", [
            shown,
            prose(
              ids,
              "Not one band of this page was written out as a web page, which is what lets a request move a single piece and lets the record afterwards say exactly which one moved. A change here is a short list written against pieces like that one — move this, take that away, change one of those settings — and never code for somebody to read.",
              { tone: "muted", measured: true }
            ),
          ]),
          buildSlot(ids, "end", [panel(ids, shown)]),
        ],
      }),
    ]
  )
}
