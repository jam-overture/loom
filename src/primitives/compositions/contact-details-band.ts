import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Three ways to reach a person, and no form at all.
 *
 * `contactBand` asks a visitor to type. This one **tells them where to go**,
 * which is a different band for a different reader: the one who already knows
 * what they want to say, has said it once in a form somewhere and heard nothing
 * back, or is not going to hand a stranger their message before they have seen
 * a name.
 *
 * ## The reason this band exists is partly a property of the other one
 *
 * A `loom.form` ships without a destination, because a starting composition
 * cannot name an endpoint that exists in a host's registry — `contactBand`'s
 * header argues that at length and is right. The consequence is that the
 * canonical contact band **arrives dimmed, with a notice above it**, and stays
 * that way until a deployment names somewhere for it to post.
 *
 * That is correct behaviour and it is also a real cost, paid by every page that
 * wants a contact band before it has a backend: a demo, a preview, a screenshot,
 * a static site that has no endpoint and never will. A `mailto:` and a `tel:`
 * need no registry, work with scripting off, and are what a small company's
 * contact section actually is.
 *
 * So the pair is not *form versus not-form*. It is **the band that needs a
 * deployment behind it and the band that does not**, and a catalogue with only
 * the first has one part that cannot be finished without leaving the catalogue.
 *
 * ## The placeholder has to announce itself, and this is the honest version
 *
 * It would be easy to overclaim here, so: an address this catalogue ships is
 * **exactly as unfinished as the untargeted form**, and the form has the better
 * of it in one respect — `loom.form` prints a notice saying it cannot be sent,
 * and a live-looking `mailto:` prints nothing. An author who forgets to change
 * it leaves visitors writing to nobody, which is quieter than a disabled
 * fieldset and therefore worse.
 *
 * What closes that gap is the address itself. `overture.example` is a
 * **reserved** domain (RFC 2606) — it resolves nowhere, it cannot be
 * registered, and it is legible as a placeholder to a reader at a glance
 * without anything having to say so. This library already leans on exactly that
 * mechanism one layer down: `url.ts` probes same-origin against
 * `https://loom.invalid` and gives the same reason, *"a value that somehow
 * escaped into a real request would fail rather than reach a host someone
 * owns."* The band self-announces the way the form does, in the content rather
 * than in a notice.
 *
 * ## Two schemes the catalogue had never used
 *
 * `linkUrlSchema` has allowed `mailto:` and `tel:` from the start and calls them
 * *"ordinary CTAs"* in its own comment. **No composition had ever written
 * either** — the same shape as the bare fragment this run found, an allowance
 * carried by the schema with nothing in the catalogue demonstrating it.
 *
 * They are the only two hrefs here that leave the page, and what they leave it
 * to is the reader's own mail or dial client rather than an origin. That is the
 * distinction the catalogue's outbound-link rule is actually drawn on, and it is
 * why widening that test to name these two is not a hole cut in it: neither
 * scheme can fetch, redirect, refer or track, and the one thing an outbound link
 * risks is that somebody else's server learns about this page.
 *
 * ## Why the addresses are children and not one `loom.contact` primitive
 *
 * Three cards, each a `loom.card` holding a `loom.heading`, a `loom.link` and a
 * `loom.prose`. A `loom.contact` taking `email`, `phone` and `address` props
 * would render the same pixels and would be [0052](../../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
 * mistake in its purest form: three repeated things flattened into a fixed field
 * each, so *add a fourth way to reach us* — a support portal, a status page, a
 * Signal number — is unreachable, and it is the edit this band gets most.
 *
 * The link inside each card is a node rather than the card's own `href` for the
 * same reason one level down. `loom.card` takes an `href` and the whole card
 * becomes the link, which is right for a card that is a *destination* and wrong
 * here: the address is the content, a reader wants to select and copy it, and a
 * card-wide link makes the text unselectable in the way that matters.
 *
 * ## The hours line is a `loom.perk`, not a fourth card
 *
 * "Replies within one working day" is a promise about all three, not a fourth
 * way in, so it sits under the grid as a single `loom.perk` — the same choice
 * `contactBand` makes for the same sentence, for the same reason. It is the
 * highest-converting line in the band and it is one node with one author.
 */
type Route = {
  readonly title: string
  readonly href: string
  readonly address: string
  readonly detail: string
}

const ROUTES: readonly Route[] = [
  {
    title: "Email",
    href: "mailto:hello@overture.example",
    address: "hello@overture.example",
    detail: "Anything about the product, the pricing, or whether it fits. One of the four of us reads every one.",
  },
  {
    title: "Phone",
    href: "tel:+441134960000",
    address: "+44 113 496 0000",
    detail: "Weekdays, 9am to 5pm UK time. You will reach a person rather than a menu.",
  },
  {
    title: "Support",
    href: "/support",
    address: "The support queue",
    detail: "Something broken, or an account you cannot get into. The same queue on every plan.",
  },
]

export const contactDetailsBand: Composition = {
  id: "contact-details",
  part: "contact",
  label: "Contact details",
  promise: "Three ways to reach a person — email, phone and support — as cards, with a reply promise beneath.",
  rationale:
    "A contact-details band is a loom.grid of loom.card, each holding a loom.heading, a loom.link at the address itself and a loom.prose saying what it is for. Each route is its own nodes, so a fourth can be added, and nothing here needs a registered endpoint behind it.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.grid", "loom.card", "loom.link", "loom.perk"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Talk to us", anchor: "contact" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Reach a person, whichever way suits")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted" },
          children: [buildText(ids, "No form to fill in and no ticket number. Pick the one that fits what you want to say.")],
        }),
        buildElement(ids, {
          type: "loom.grid",
          props: { columns: "three", gap: "loose", align: "stretch" },
          children: ROUTES.map((route) =>
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "surface", padding: "loose" },
              children: [
                buildElement(ids, {
                  type: "loom.heading",
                  props: { level: 3 },
                  children: [buildText(ids, route.title)],
                }),
                buildElement(ids, {
                  type: "loom.link",
                  props: { href: route.href, tone: "accent" },
                  children: [buildText(ids, route.address)],
                }),
                buildElement(ids, {
                  type: "loom.prose",
                  props: { tone: "muted", size: "small" },
                  children: [buildText(ids, route.detail)],
                }),
              ],
            })
          ),
        }),
        buildElement(ids, {
          type: "loom.perk",
          props: { label: "We reply within one working day", state: "included" },
        }),
      ],
    }),
}
