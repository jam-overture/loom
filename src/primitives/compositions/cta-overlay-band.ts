import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The closing ask as a panel the words sit inside, rather than a band they sit
 * on.
 *
 * ## The region, and why the other three designs do not occupy it
 *
 * `cta` is a headline and two buttons on the accent ground. `cta-signup` puts a
 * form in the band. `cta-booking` opens a form over the page. All three are
 * **the page's own ground, full bleed, with content stacked on it** — the band
 * ends where the section's padding ends and there is nothing to look at but the
 * words.
 *
 * This one is a **bounded painted plate** with the page showing around it: the
 * closing band as an object on the page rather than a region of it. That is the
 * arrangement a marketing page reaches for when the last thing before the
 * footer has to feel like a destination, and it is the one thing no `configure`
 * of the other three produces — `loom.overlay` and `loom.backdrop` appear in no
 * other design of this part, and a `tone` prop cannot round a corner or paint a
 * gradient.
 *
 * ## The first band to reach `loom.overlay`, and it needed no photograph
 *
 * `loom.overlay` has been registered and unreached since it was written,
 * carried in four consecutive reports under *needs an image source*. Its ground
 * is a **slot** (0051) and it has no URL prop of its own, and its own props
 * document says in as many words which grounds are safe without a wash:
 *
 * > an overlay over a *palette-derived* ground — a painted backdrop, a card, a
 * > flat surface — genuinely wants no wash and is safe, both sides coming from
 * > the palette.
 *
 * So the ground here is a `loom.backdrop`, and `scrim: "none"` is the correct
 * reading of that sentence rather than a shortcut past it. The foot-gun the
 * same comment names — `none` over a *photograph*, where one of the two starter
 * palettes is always wrong — is the case this band is not: the paint and the
 * text both come from the palette, so both re-theme together.
 *
 * ## Which paint, and the finding it answers
 *
 * `spotlight`. Two of the five paints are ruled at a stride measured in `rem`
 * and need a band a few hundred pixels tall to read as a ground; the other
 * three are written in the box's own units and hold at any aspect (0196). A
 * closing panel is a heading, a sentence and two buttons — three or four
 * hundred pixels at most — so `grid` and `dots` were never candidates.
 *
 * This is also the standing *a paint needs area* finding answered from the
 * other side. An overlay is **as tall as whatever is on it**, so pairing the
 * two gives a paint a box that is never shorter than its content and never
 * taller than it needs to be. The pair is the affordance, which is why this
 * band is the second path to `loom.backdrop` as well as the first to
 * `loom.overlay`.
 *
 * ## Why the section carries no tone
 *
 * `loom.overlay` sets `color: fg-default` on itself, and it has to: the ground
 * is usually a photograph, which does not change the text colour. Put this
 * inside a `tone: "accent"` section and the band's `fg-on-accent` would be
 * overridden back to `fg-default` over an accent ground — which is the exact
 * failure the overlay's own comment warns about, one level up. So the section
 * stays on the canvas and the panel is the only painted thing in the band.
 *
 * ## Why the heading is inside the panel and not in the section's region
 *
 * `loom.section` renders its `heading` slot above its children, outside
 * anything a child paints. A heading there would put the title on the page and
 * the ask on the plate, which is two bands wearing one eyebrow. Twelve bands in
 * the catalogue already leave that slot empty where the design puts its own
 * title elsewhere.
 *
 * ## What is a node and what stayed a prop
 *
 * The heading, the sentence and both controls are nodes, so the ask can be
 * rewritten or a button moved above the sentence without anybody having
 * predicted it (0052). The ground is a node too, which is the part a `paint`
 * prop on `loom.overlay` would have cost: a host that wants the panel on a flat
 * surface instead swaps one child, and one that wants no panel at all removes
 * it and keeps the words. `scrim`, `align`, `justify`, `padding` and `corners`
 * are props — none of them changes the set of nodes, which is the granularity
 * document's sharper question, and no operation reorders glyphs.
 */
export const ctaOverlayBand: Composition = {
  id: "cta-overlay",
  part: "cta",
  label: "Closing call to action, on a painted panel",
  promise:
    "The last ask before the footer, set on a lit panel with the page showing around it: a headline, a sentence and two buttons.",
  rationale:
    "A panelled call to action is a loom.overlay whose ground slot holds a loom.backdrop and whose children are the heading, the sentence and the controls. The ground is a node rather than a paint prop, so the panel can be re-painted, flattened to a surface or removed without touching the words on it.",
  uses: [
    "loom.section",
    "loom.card",
    "loom.overlay",
    "loom.backdrop",
    "loom.heading",
    "loom.prose",
    "loom.stack",
    "loom.action",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide" },
      children: [
        buildElement(ids, {
          type: "loom.card",
          props: { tone: "surface", padding: "none" },
          children: [
            buildElement(ids, {
              type: "loom.overlay",
              props: {
                scrim: "none",
                align: "center",
                justify: "center",
                padding: "roomy",
                corners: "lg",
              },
              children: [
                buildSlot(ids, "ground", [
                  buildElement(ids, {
                    type: "loom.backdrop",
                    props: { paint: "spotlight", corners: "lg" },
                  }),
                ]),
                buildElement(ids, {
                  type: "loom.heading",
                  props: { level: 2, align: "center", balance: true },
                  children: [buildText(ids, "Put it on one page and see what it proposes")],
                }),
                buildElement(ids, {
                  type: "loom.prose",
                  props: { size: "lead", align: "center", measured: true },
                  children: [
                    buildText(
                      ids,
                      "Nothing is written until somebody approves it, so the worst case is an afternoon and a list of changes you decided against."
                    ),
                  ],
                }),
                buildElement(ids, {
                  type: "loom.stack",
                  props: { direction: "row", gap: "snug", justify: "center", align: "center" },
                  children: [
                    buildElement(ids, {
                      type: "loom.action",
                      props: { href: "/start", variant: "primary", scale: "large" },
                      children: [buildText(ids, "Start free")],
                    }),
                    buildElement(ids, {
                      type: "loom.action",
                      props: { href: "/demo", variant: "secondary", scale: "large" },
                      children: [buildText(ids, "Watch it change a page")],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
}
