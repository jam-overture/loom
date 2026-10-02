import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The signed-out header: a pill floating over the page, the destinations in the
 * middle of it, and two ways in at the end — one quiet, one not.
 *
 * ## Why the bar needed a second design before anything else did
 *
 * Nine parts of the canonical page had exactly one design on 1 October, and
 * `nav` is the one where that costs the most. A page may skip its changelog
 * band and most pages do; **no page skips its header**, so a catalogue with one
 * nav is a catalogue that has decided, on behalf of every deployment, what the
 * top of their page looks like. The other eight single-design parts are a
 * narrower choice; this one is the choice a reader sees first and sees on every
 * screen.
 *
 * ## What is actually different, which is two nodes and not a tone
 *
 * 0162's bar for a second design is a **different set of nodes**, and it is
 * worth naming which two, because `tone: "floating"` is the thing a reader
 * notices and is not the thing that earns the entry:
 *
 * - **A fifth destination.** The canonical band's own comment explains why it
 *   stops at four — *"what fits beside a wordmark and an action at 390px
 *   without the bar wrapping"* — and that reasoning is about a bar whose menu
 *   sits beside its mark. Centred, the menu is on its own line on a phone
 *   before the fifth link is added, so the constraint that made four right
 *   there does not hold here and the fifth is free.
 * - **A quiet way in beside the loud one.** `Sign in` is a `loom.link` in the
 *   `actions` region, next to the `loom.action`. That pair is the whole subject
 *   of this design: a product with accounts has two audiences at the top of its
 *   page and the canonical band can only address one of them. It is a
 *   `loom.link` rather than a second `loom.action` deliberately — two controls
 *   in one corner is the two-primary-buttons defect `heroBand` warns about, one
 *   region to the right.
 *
 * `tone: "floating"` and `align: "center"` are props and would not be a second
 * design on their own. They are here because a centred menu inside a bar with
 * an edge needs the edge to be a shape rather than a rule: `surface` draws a
 * hairline across the full width and centring inside it reads as a mistake,
 * where the pill reads as a decision. The band that is configured into the
 * other three combinations still renders, and that is the point of their being
 * props.
 *
 * ## Why there is no drop-down in it, which is the honest version
 *
 * `loom.menu` shipped on 1 October — *"a run of links behind one button"* — and
 * is the obvious thing to reach for here: a bar whose destinations fold away is
 * the second nav design anybody would name first. **It cannot be built today**
 * and the reason is not this band's to fix. `loom.nav` already declares
 * `disclose` and names its own control `Menu`, and `loom.menu`'s control is
 * also named `Menu`, because a control's word is the primitive's and is
 * resolved per type (0055, 0063). A bar holding both has two buttons reading
 * *Menu* at 390px, one inside the other. Filed, with the measurement, rather
 * than shipped with a defect a photograph would have caught anyway.
 */
const MENU = [
  { text: "What it does", href: "#what-it-does" },
  { text: "How it works", href: "#how-it-works" },
  { text: "Pricing", href: "#pricing" },
  { text: "Compare", href: "#comparison" },
  { text: "FAQ", href: "#faq" },
] as const

/**
 * The same two offset bars `navBand` ships, and the same reasoning: a starting
 * composition must not hand a host somebody else's identity as a default
 * nobody notices. It is repeated rather than shared because the day a host
 * replaces one of these it replaces exactly one band's mark, and a constant
 * imported into both would make that edit reach a band the host did not choose.
 */
const PLACEHOLDER_MARK = "M6 7h20v6H6z M6 19h14v6H6z"

export const navCentredBand: Composition = {
  id: "nav-centred",
  part: "nav",
  label: "Navigation bar, centred in a pill",
  promise:
    "A floating bar with the wordmark at the start, five destinations centred in it, and a quiet sign-in beside the action.",
  rationale:
    "A signed-out header is a loom.nav on the floating tone with a loom.brand in its brand region, loom.link children as the menu, and two nodes in its actions region — a quiet loom.link to sign in and a loom.action to start. The pair is structure rather than a prop, so a deployment with no accounts removes the link with one operation and a deployment with two products inserts a second destination without touching the bar.",
  uses: ["loom.nav", "loom.brand", "loom.link", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.nav",
      props: { position: "sticky", tone: "floating", align: "center" },
      children: [
        buildSlot(ids, "brand", [
          buildElement(ids, {
            type: "loom.brand",
            props: { name: "Overture", mark: PLACEHOLDER_MARK, href: "#top" },
          }),
        ]),
        ...MENU.map((item) =>
          buildElement(ids, {
            type: "loom.link",
            props: { href: item.href },
            children: [buildText(ids, item.text)],
          })
        ),
        buildSlot(ids, "actions", [
          buildElement(ids, {
            type: "loom.link",
            props: { href: "/sign-in", tone: "muted", scale: "small" },
            children: [buildText(ids, "Sign in")],
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
