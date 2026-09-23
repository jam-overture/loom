import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * What is actually for sale, six at a time.
 *
 * ## A design of `features`, and the swap that decides it
 *
 * The `features` part is the body of a landing page: the band after the proof
 * where a reader finds out **what the thing is**. `featuresBand` answers that
 * with capabilities and `featuresAlternatingBand` answers it with capabilities
 * one at a time. For a business that sells objects, the honest answer to the
 * same question is the shelf — so this band occupies the same region and puts
 * goods in it.
 *
 * 0171's swap, both ways: drop this where the feature grid goes and the page
 * still tells a reader what it is and what it costs to have one. Nothing the
 * page needed is lost. That makes it a *design* of `features`, and
 * `COMPOSITION_PARTS` does not move — which is the whole finding this run is
 * built on. A page for a shop is not a second page sequence. It is the same
 * sequence with different words and different nodes in four of its bands.
 *
 * **The alternative reading, stated because it is defensible.** A grid of
 * priced things could be argued into the `pricing` region instead. It fails
 * the swap in one direction: put this where the tier table goes and a reader
 * looking for *what does it cost to work with you* gets a shelf and has to
 * infer the answer from six of them. A catalogue tells you what there is; a
 * price band tells you what the commitment is. They are different regions and
 * this band is in the first.
 *
 * ## No photographs, and the band is not waiting for any
 *
 * `loom.product`'s `image` is optional and the card is drawn without it: name,
 * price, the line about it, its qualifiers and the way to buy. That is a
 * catalogue somebody could ship — a shop whose photography is not ready yet is
 * an ordinary state, not a broken one.
 *
 * It would be better with cover shots, and the standing question about where a
 * starting composition may get an image from is real and is not this run's to
 * answer. What this band settles is the narrower thing: `loom.product` and
 * `loom.product-grid` were never behind that question. They were behind a band
 * nobody had written.
 *
 * ## Qualifiers are nodes, and the reason is the same one three times
 *
 * *Filter*, *250g*, *Decaf*, *Every two weeks* — a product has several or none
 * and never exactly one, so they are `loom.badge` nodes in the `meta` region.
 * `loom.offering` makes this call about nine Hermes fields and `loom.product`
 * makes it about `format` and `itemCount`; a schema with `weight` and `grind`
 * as props would need a third the first time somebody sold a gift box.
 */
type Good = {
  readonly name: string
  readonly price: string
  readonly description: string
  readonly qualifiers: readonly string[]
  readonly lead?: boolean
}

const SHELF: readonly Good[] = [
  {
    name: "Ethiopia Guji",
    price: "£14",
    description: "Peach, jasmine and black tea. Washed, and the bag we send anyone who says filter coffee is thin.",
    qualifiers: ["Filter", "250g"],
  },
  {
    name: "Colombia Huila",
    price: "£13",
    description: "Red apple and brown sugar. Forgiving in any brewer, which is why it is the one we never run out of.",
    qualifiers: ["Filter", "250g"],
  },
  {
    name: "Brazil Fazenda Rio",
    price: "£12",
    description: "Hazelnut and cocoa, and the only one on this shelf that holds its own against a lot of milk.",
    qualifiers: ["Espresso", "250g"],
  },
  {
    name: "Sugarcane decaf",
    price: "£13",
    description: "Decaffeinated with cane sugar rather than solvent. Tastes like the coffee it was, which is rare.",
    qualifiers: ["Filter", "Decaf", "250g"],
  },
  {
    name: "The standing order",
    price: "From £11 a bag",
    description: "Whatever is best that week, ground how you ask, arriving the day you choose. Stop it any time.",
    qualifiers: ["Every two weeks", "Free delivery"],
    lead: true,
  },
  {
    name: "Everything you need",
    price: "£48",
    description: "A brewer, a hundred filters, a hand grinder small enough to travel, and two bags to learn on.",
    qualifiers: ["Gift boxed", "Two bags"],
  },
]

/**
 * One item. The button is pinned to the foot by the grid's stretched cells, so
 * six descriptions of different lengths still line their actions up.
 */
const productNode = (ids: IdFactory, good: Good): ElementNode =>
  buildElement(ids, {
    type: "loom.product",
    props: {
      name: good.name,
      price: good.price,
      description: good.description,
      href: "/shop",
    },
    children: [
      buildSlot(
        ids,
        "meta",
        good.qualifiers.map((qualifier) =>
          buildElement(ids, {
            type: "loom.badge",
            props: { tone: "neutral" },
            children: [buildText(ids, qualifier)],
          })
        )
      ),
      buildSlot(ids, "action", [
        buildElement(ids, {
          type: "loom.action",
          props: { href: "/shop", variant: good.lead === true ? "primary" : "secondary", scale: "small" },
          children: [buildText(ids, good.lead === true ? "Set it up" : "Add to basket")],
        }),
      ]),
    ],
  })

export const catalogueBand: Composition = {
  id: "features-catalogue",
  part: "features",
  label: "What it is, as a shelf of things to buy",
  promise:
    "Six items in a grid, each with its price, the line about it, what sort of thing it is and a button that puts it in a basket.",
  rationale:
    "A catalogue is a loom.product-grid holding one loom.product per item, each with its qualifiers as loom.badge nodes in the meta region and its buy control as a loom.action in the action region. It is a design of the features part rather than a new part: it occupies the body of the page, where a reader finds out what the thing is, and differs from the feature grid in the set of nodes it builds.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.product-grid", "loom.product", "loom.badge", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "The shelf", anchor: "features" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Roasted on a Tuesday, with you by Thursday")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "Six things at a time, so none of them sits long enough to go stale. What is here is what is good this month."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.product-grid",
          props: { columns: "three", gap: "normal" },
          children: SHELF.map((good) => productNode(ids, good)),
        }),
      ],
    }),
}
