import type { IdFactory } from "../../ids.js"
import { buildElement, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The strip whose sentence *is* the link, and the answer to the one row the
 * designs-per-part instrument had left.
 *
 * ## The question this is settling, which was asked rather than assumed
 *
 * `docs/primitive-gap-inventory.md` drove designs-per-part from nine to one and
 * then stopped, deliberately, with the last row open and an instruction on it:
 *
 * > So the designs-per-part instrument now has **one row left and the honest
 * > answer to it may be that a part with a single design is sometimes
 * > correct.** A part whose whole content is one sentence has less room for a
 * > second design than a part that is a wall of cards […] The next run reading
 * > this list should decide that question rather than assume the number should
 * > reach zero — and if it does build one, the bar is a *region* of the strip
 * > the canonical does not have, not a swapped leaf.
 *
 * **The bar as written cannot be cleared by anything, and that is a fact about
 * `loom.banner` rather than about this band.** The strip declares exactly one
 * region, `action`, and the canonical fills it. There is no second region for
 * an alternate to find, so a bar phrased as *a region the canonical does not
 * have* says that `banner` may never have a second design — which is a stronger
 * claim than the inventory meant to make and not one 0162 supports.
 *
 * So the question is answered the other way, and the answer is narrow: **a part
 * whose content is one sentence earns a second design when the sentence can be
 * built a way the canonical closed off.** Until 5 October it could not be. The
 * canonical is the only shape a library with no inline link can draw — news,
 * then a button beside it — and `loom.inline-link` is what makes the other
 * shape exist at all. A second design that needed a primitive to be written is
 * not a swapped leaf by any reading.
 *
 * ## What is actually different, and it is the reader's job rather than the paint
 *
 * The canonical says a thing and then offers a control: a reader scans the
 * strip, finds the button at the far end, and presses it. This says one
 * sentence in which the destination is a phrase — a reader *reads* it, and the
 * words they would press are the words that tell them why. That difference is
 * in the tree and not in a prop. The canonical is a `loom.banner` with a filled
 * `action` region holding a `loom.link`; this is a `loom.banner` with no region
 * filled at all, and three children where the middle one is the link.
 * `compositions.test.ts` holds the bar 0162 actually sets — a different set of
 * nodes — and these two clear it by the widest margin in the catalogue, since
 * one of them places a region and the other has none.
 *
 * It is also the shape a strip wants when there is no room for both: at 390px
 * the canonical wraps its button onto a second line under the message, which is
 * the correct rendering of a sentence and a button and is still two lines of
 * chrome above the navigation. This is one line of prose that happens to be
 * pressable.
 *
 * ## Why the destination is the pricing band and not the changelog
 *
 * [0168](../../../decisions/0168-a-band-links-into-the-page-it-is-assembled-into.md),
 * and then one more step: both designs of a part must point somewhere the
 * assembled page actually has, so neither can link out to a site the catalogue
 * does not ship. The canonical takes `#changelog`. Pointing at the same anchor
 * from here would make the two bands differ in their nodes and agree in every
 * word a reader could act on, which reads as one band photographed twice. A
 * price change is the other thing a strip above the navigation is for, and
 * `#pricing` is on the page by the same assertion over `PAGE_SEQUENCE` that
 * keeps `#changelog` honest.
 */
export const bannerInlineBand: Composition = {
  id: "banner-inline",
  part: "banner",
  label: "Announcement sentence",
  promise: "A quiet strip above the navigation: one sentence, with the page it points at underlined inside it.",
  rationale:
    "This design puts the destination inside the sentence rather than in a region beside it, so the words a reader presses are the words that say why. The strip is a loom.banner holding text, one loom.inline-link and text, with its action region left empty — three children a configure can re-word and a move can reorder, where the canonical's button is a node in a region that the flow of children does not reach.",
  uses: ["loom.banner", "loom.inline-link"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.banner",
      /**
       * `surface` rather than the canonical's `accent`, and the reason is the
       * sentence rather than the variety: a tinted strip is a claim on
       * attention, which is right for *0.4 is out* beside a button and wrong
       * for a line of prose a reader is meant to read to the end of. The quiet
       * shelf separates the strip from the page without competing with the
       * navigation under it.
       */
      props: { tone: "surface", align: "center", label: "Announcement" },
      children: [
        buildText(ids, "Seat pricing changes on 1 November, and every plan on the "),
        buildElement(ids, {
          type: "loom.inline-link",
          props: { href: "#pricing" },
          children: [buildText(ids, "current price list")],
        }),
        buildText(ids, " is held for a year from the day you start."),
      ],
    }),
}
