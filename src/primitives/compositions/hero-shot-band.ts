import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The hero with the product shot in it, which this catalogue has never had.
 *
 * ## The comment this band exists to answer
 *
 * `heroBand` carries a section titled *Why there is no image*:
 *
 * > `loom.hero` has a `media` slot and the band would look better with
 * > something in it. **Nothing can go there**: `loom.media` requires a `src`,
 * > `mediaUrlSchema` refuses `data:` deliberately, and a same-origin path names
 * > a file this library cannot put in a host's `public/`. So the band ships with
 * > the backdrop the primitive paints itself and **the slot stays empty for
 * > whoever has a screenshot**.
 *
 * Every clause of that is still true of `loom.media`, and the conclusion no
 * longer follows. *Whoever has a screenshot* is a deployment, a deployment's
 * screenshot is in a media library that knows its address, and
 * [0058](../../../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
 * is how a page asks for it. `loom.plate` is the primitive, and this is the band
 * that puts one in a hero's `media` region — the first thing in this catalogue
 * to fill that slot with a picture rather than with furniture built out of the
 * library.
 *
 * ## A design of `hero`, and the swap works in both directions
 *
 * `heroBand` is the centred opening with no picture; `heroSplitBand` is the
 * split whose media region holds a panel of figures *because* it could not hold
 * a photograph, and says so. This is the third: the one whose media region holds
 * the thing a reader came to look at.
 *
 * The set of nodes is different rather than the same nodes configured —
 * `loom.plate` where one builds nothing and the other builds a `loom.frame`
 * over stats — which is [0162](../../../decisions/0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)'s
 * bar. And under 0171 the swap loses nothing either way: all three are the band
 * a page opens with, so `COMPOSITION_PARTS` does not move.
 *
 * ## It arrives unconnected, and the frame is what makes that honest
 *
 * `feedBand` settled the rule and `metricsLiveBand` restated it: a composition
 * that declared a binding would name **a source id, which is a thing a host
 * registers**, so every deployment that had not registered that exact id would
 * get a page reporting a binding it never agreed to make. So this names a
 * binding *key* and no source, and what drops in is the hero before anybody
 * connected their pictures.
 *
 * That state is drawn rather than broken, which is the whole of this band's
 * design work and is why `loom.plate` has a frame where `loom.media` has none:
 * the box is there at `wide` whether or not a picture is, so connecting a source
 * changes what is in the frame and never the shape of the band. Inside it, the
 * `empty` region carries a glyph and one line naming what goes there — a
 * labelled socket rather than a hole, which is `metricsLiveBand`'s finding about
 * captions applied to a picture.
 *
 * **It is deliberately `align: "start"` and not `tall`.** A centred full-height
 * hero puts its media region below the fold on a phone, which is the one place a
 * product shot earns nothing; the asymmetric shape is the arrangement that reads
 * with a picture beside it at 1280 and stacks in the order a reader wants at
 * 390 — words, then the thing the words are about.
 */
export const heroShotBand: Composition = {
  id: "hero-shot",
  part: "hero",
  label: "Hero, with the product shot",
  promise:
    "An opening band whose media region holds a picture read from a connected source, with the framed socket it shows until one answers.",
  rationale:
    "A hero with a picture in it is a loom.hero whose media region holds a loom.plate, which reads its image and that image's alt text from a binding rather than carrying a URL as a prop — so this builds a different set of nodes from either authored hero rather than the same ones filled differently. It drops in unconnected: a source id is a thing a host registers, not a thing a catalogue may assume, so the plate draws its framed empty region at the aspect the picture will take, and connecting it is one configure adding the binding.",
  uses: [
    "loom.hero",
    "loom.heading",
    "loom.prose",
    "loom.action",
    "loom.plate",
    "loom.icon",
    "loom.badge",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.hero",
      props: {
        backdrop: "panel",
        stature: "standard",
        align: "start",
        eyebrow: "See it working",
        anchor: "top",
      },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 1, balance: true },
            children: [buildText(ids, "The whole of it, on one screen")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { size: "lead", tone: "muted", measured: true },
          children: [
            buildText(
              ids,
              "Every change your team proposes, what it would do to the page, and the one button that puts it live — with a record of who asked and what was weighed."
            ),
          ],
        }),
        buildSlot(ids, "actions", [
          buildElement(ids, {
            type: "loom.action",
            props: { href: "/start", variant: "primary", scale: "large" },
            children: [buildText(ids, "Start free")],
          }),
          buildElement(ids, {
            type: "loom.action",
            props: { href: "/demo", variant: "quiet", scale: "large" },
            children: [buildText(ids, "Watch the demo")],
          }),
        ]),
        buildSlot(ids, "media", [
          buildElement(ids, {
            type: "loom.plate",
            /**
             * `wide` rather than `auto`, and it is the one prop here worth a
             * sentence: a hero's media region has to hold its shape before the
             * answer arrives, or the band reflows the moment a source connects.
             * `contain` because a product screenshot has edges that mean
             * something and `cover` would crop them.
             */
            props: { binding: "productShot", aspect: "wide", fit: "contain", corners: "lg" },
            children: [
              buildSlot(ids, "empty", [
                buildElement(ids, {
                  type: "loom.icon",
                  props: { shape: "bare", tone: "neutral", size: "large" },
                  children: [buildText(ids, "▣")],
                }),
                buildElement(ids, {
                  type: "loom.badge",
                  props: { tone: "neutral" },
                  children: [buildText(ids, "Your screenshot goes here")],
                }),
              ]),
            ],
          }),
        ]),
      ],
    }),
}
