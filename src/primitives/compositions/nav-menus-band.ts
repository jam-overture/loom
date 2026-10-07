import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The header of a product that has more than one page: two drop-downs on the
 * bar, each with its own name, and the account one at the end.
 *
 * ## This band is a retraction, and that is the shortest way to introduce it
 *
 * `navCentredBand`'s doc comment has carried a section called *"Why there is no
 * drop-down in it, which is the honest version"* since 2 October. It said a bar
 * with a `loom.menu` in it **cannot be built**, because `loom.nav` declares
 * `disclose` and names its own control *Menu*, `loom.menu`'s control is also
 * named *Menu*, and a control's word is the primitive's and resolved per type —
 * so a bar holding both has two buttons reading *Menu* at 390px, one inside the
 * other. It filed the measurement rather than shipping the defect, which was
 * the right call.
 *
 * [0234](../../../decisions/0234-a-primitive-may-name-a-control-from-the-tree-and-its-declared-string-is-the-floor.md)
 * removed the reason on 5 October. A primitive may name one of its own props as
 * where a control takes its name from, `loom.menu` names `label`, and the two
 * buttons now read *Product* and *Account*. So the band that could not be built
 * is this one, and the paragraph asserting it was impossible has been rewritten
 * where it sits rather than left for the next author to believe.
 *
 * ## What is different, which is a kind of node rather than a count
 *
 * 0162 wants a different *set of nodes* for a second design, and the two bars
 * already in the catalogue differ from each other by a fifth link and a quiet
 * sign-in. This one differs from both by holding **a node that opens**: four of
 * its destinations are not on the bar at all until a reader presses something.
 *
 * That is the arrangement every documentation site and every product with two
 * audiences actually has, and it is the first bar in this catalogue that can
 * hold more destinations than fit across a phone without folding *all* of them
 * away. `navBand`'s own comment stops at four links because four is what fits
 * beside a wordmark at 390px; a bar whose middle is one button is not bounded
 * by that at all.
 *
 * ## Why two menus and not one, which is the part that is the test
 *
 * One drop-down would have been a smaller and less honest band. 0234's
 * `Consequences` name *"the header with two menus"* specifically, because two is
 * where the old seam failed: one menu called *Menu* is a correct page and was
 * always buildable, and two were two buttons a screen reader announced
 * identically. So the band ships the case that was broken, and
 * `compositions.test.ts` asserts the two names are different strings — which is
 * the regression that would catch the `names` declaration being dropped from
 * `loom.menu` by a future edit.
 *
 * ## What it still cannot do, and it is the nav's half rather than the menu's
 *
 * At 390px `loom.nav` folds its own children behind its `disclose` control,
 * which still reads *Menu* — correctly, because that one **is** an affordance
 * and is the primitive's word (0063). So a phone shows one button marked *Menu*
 * holding two marked *Product* and *Account*, which is three buttons in a
 * nesting a reader can follow and was two indistinguishable ones before. The
 * drop-downs do not become accordions at that width; a panel positioned against
 * its trigger inside a folded bar is a panel laid over the bar it came out of,
 * and `presentation.ts` is explicit that this library will not measure the
 * window to decide otherwise. Filed.
 */
const PRODUCT = [
  { text: "What it does", href: "#what-it-does" },
  { text: "How it works", href: "#how-it-works" },
  { text: "The record", href: "#changelog" },
  { text: "Compare", href: "#comparison" },
] as const

const ACCOUNT = [
  { text: "Your deployments", href: "/deployments" },
  { text: "Billing", href: "/billing" },
] as const

/**
 * The same two offset bars the other two bars ship, repeated rather than
 * shared for `navBand`'s stated reason: the day a host replaces one band's
 * mark it replaces exactly one band's mark, and a constant imported into three
 * would make that edit reach bands the host did not choose.
 */
const PLACEHOLDER_MARK = "M6 7h20v6H6z M6 19h14v6H6z"

export const navMenusBand: Composition = {
  id: "nav-menus",
  part: "nav",
  label: "Navigation bar with drop-downs",
  promise:
    "A bar with the wordmark at the start, a Product drop-down and an Account drop-down, and the action at the end.",
  rationale:
    "A header for a product with more than one page is a loom.nav holding loom.menu nodes, each naming its own button through the label prop. The rows inside a menu are loom.link children, so a destination is added or dropped by insert and remove rather than by a prop nobody predicted, and renaming a button is one configure.",
  uses: ["loom.nav", "loom.brand", "loom.menu", "loom.link", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.nav",
      props: { position: "sticky", tone: "surface" },
      children: [
        buildSlot(ids, "brand", [
          buildElement(ids, {
            type: "loom.brand",
            props: { name: "Overture", mark: PLACEHOLDER_MARK, href: "#top" },
          }),
        ]),
        /**
         * `align: "start"` on this one and `end` on the account menu, which is
         * the one prop pairing here worth a note. A panel aligned to an edge
         * grows *away* from it, so the menu near the left of the bar hangs its
         * panel rightwards and the one at the right hangs leftwards — neither
         * off the side of a phone. `loom.menu` caps the panel against the
         * window as well, but the cap bounds that failure rather than
         * abolishing it, and these two props are what mean it is never reached.
         */
        buildElement(ids, {
          type: "loom.menu",
          props: { label: "Product", align: "start" },
          children: PRODUCT.map((item) =>
            buildElement(ids, {
              type: "loom.link",
              props: { href: item.href },
              children: [buildText(ids, item.text)],
            })
          ),
        }),
        buildElement(ids, {
          type: "loom.link",
          props: { href: "#pricing" },
          children: [buildText(ids, "Pricing")],
        }),
        buildSlot(ids, "actions", [
          buildElement(ids, {
            type: "loom.menu",
            props: { label: "Account", align: "end" },
            children: ACCOUNT.map((item) =>
              buildElement(ids, {
                type: "loom.link",
                props: { href: item.href },
                children: [buildText(ids, item.text)],
              })
            ),
          }),
          buildElement(ids, {
            type: "loom.action",
            props: { href: "/start", variant: "primary", scale: "small" },
            children: [buildText(ids, "Start free")],
          }),
        ]),
      ],
    }),
}
