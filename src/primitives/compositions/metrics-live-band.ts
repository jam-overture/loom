import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The same four numbers, read rather than written.
 *
 * ## A design of `metrics`, on `articles-feed`'s argument exactly
 *
 * `metricsBand` is four figures somebody typed. This is four figures a source
 * answers, and the pair sits in the same relation as `articlesBand` and
 * `feedBand`: same region, same job on the page, different set of nodes —
 * `loom.tally` where the authored band builds `loom.stat`, because a read figure
 * is a second primitive rather than an optional value on the first — which
 * `loom.tally` argues in its own header, from
 * [0052](../../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
 * ground taken from the other direction: one primitive whose `value` was
 * sometimes a prop and sometimes an answer would have to make `value` optional,
 * and every authored stat in every stored tree would lose the one guarantee its
 * schema is there to make.
 *
 * The swap under 0171 loses nothing in either direction — both are the
 * full-width break that stops a page reading as a list of card bands — so it is
 * a design and `COMPOSITION_PARTS` does not move.
 *
 * ## Why this band exists at all, which is the sentence on `loom.tally`
 *
 * > *Trusted by 12,000 teams* is a sentence a landing page is only allowed to
 * > print if somebody goes back and edits it, which is why so many pages carry a
 * > figure that was true a year ago.
 *
 * `metricsBand` carries four of exactly those, and its own comment defends the
 * choice — *a starting composition should not ship a number that needs
 * defending*. That is the best a band can do when the number is a string in a
 * file. It is not the best a page can do, and this is the other one.
 *
 * ## It arrives unbound, and the unbound state is the thing that is designed
 *
 * `feedBand` settled this and the reasoning carries without a change of a word:
 * a composition that declared a binding would name **a source id, which is a
 * thing a host registers**, so every deployment that had not registered that
 * exact id would get a page reporting a binding it never agreed to make — and
 * every surface in this repository that renders the catalogue without resolving
 * data would report it too.
 *
 * So what drops in is the band *before anybody connected it*, and the whole of
 * this band's design work is making that state read as an invitation rather than
 * as a fault. Three things do it, and none is decoration:
 *
 * - **Every figure has a caption naming the source it is waiting on.** A column
 *   reading `Unavailable / Teams shipping weekly` is a break; the same column
 *   reading `Unavailable / Teams shipping weekly / from your workspace
 *   directory` is a labelled socket. `loom.tally` already draws `Unavailable`
 *   quietly and at the wrong size on purpose — muted, one step down the ramp,
 *   never in the accent — because *a figure that did not arrive must not be the
 *   loudest thing on the page*. The caption is what tells a reader why.
 * - **A heading and a line above the grid**, which `metricsBand` deliberately
 *   does without. Four bare numbers need no introduction; four sockets do, and
 *   that is a different set of nodes rather than a `configure` of the first.
 * - **One control under it.** `feedBand` offers *Connect a source* from inside
 *   its empty region. This band's empty state is the whole grid, so the control
 *   sits under it instead — and connecting it afterwards is one `configure`
 *   adding the binding, weighed like a destination
 *   ([0163](../../../decisions/0163-a-binding-is-weighed-like-a-destination.md)).
 *
 * ## The figures are strings and the grouping is not this band's
 *
 * Nothing here formats anything, and that is `loom.tally`'s constraint rather
 * than a gap: a source answering `1284` gets `1284`, because `Intl.NumberFormat`
 * with no locale reads the *server's* and two renders of one revision on two
 * machines would disagree — the property that makes rendering what it is
 * (0008). `prefix` and `suffix` are the part that genuinely belongs to the page:
 * the `%` and the `+` are how *this band* puts it, and an adapter that baked
 * them in would be unusable in two places.
 *
 * ## `binding`, and why four names rather than four sources
 *
 * Each tally names which of **its own node's** answers to read. Four nodes with
 * four names is what a host binds four ways; it is not four registrations.
 * A deployment that has one source answering all four points all four at it
 * under the names it returns, and a deployment with four points them at four.
 * Neither is a decision this band gets to make, which is why it makes neither.
 */
type Figure = {
  readonly binding: string
  readonly label: string
  readonly caption: string
  readonly prefix?: string
  readonly suffix?: string
}

const FIGURES: readonly Figure[] = [
  {
    binding: "activeTeams",
    label: "Teams shipping weekly",
    caption: "From your workspace directory",
    suffix: "+",
  },
  {
    binding: "uptime",
    label: "Uptime, rolling 90 days",
    caption: "From your status page",
    suffix: "%",
  },
  {
    binding: "timeToFirstBoard",
    label: "Median time to first board",
    caption: "From your onboarding events",
  },
  {
    binding: "connectors",
    label: "Tools it reads and writes",
    caption: "Counted from the registry itself",
  },
]

export const metricsLiveBand: Composition = {
  id: "metrics-live",
  part: "metrics",
  label: "Metrics, from a source",
  promise:
    "Four figures read from connected sources, with the labelled sockets they show until one answers and the control that connects them.",
  rationale:
    "A live figure is a loom.tally, which reads its number from a binding rather than carrying it as a prop, so this band builds a different set of nodes from the authored metrics band rather than the same ones filled differently. It drops in unbound — a source id is a thing a host registers, not a thing a catalogue may assume — so each figure shows its declared unavailable word under a caption naming what it is waiting on, and connecting it is one configure adding the binding.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.stat-grid", "loom.tally", "loom.action"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "surface", width: "wide", eyebrow: "Live" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Four numbers nobody has to remember to update")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "Point each of these at the row that already knows the answer. Until you do, they say so — which is the honest thing for a page to do about a number it has not been given."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.stat-grid",
          props: { columns: "four", align: "center" },
          children: FIGURES.map((figure) =>
            buildElement(ids, {
              type: "loom.tally",
              props: {
                binding: figure.binding,
                label: figure.label,
                caption: figure.caption,
                ...(figure.prefix === undefined ? {} : { prefix: figure.prefix }),
                ...(figure.suffix === undefined ? {} : { suffix: figure.suffix }),
              },
            })
          ),
        }),
        buildElement(ids, {
          type: "loom.action",
          props: { href: "/connect", variant: "secondary", scale: "small" },
          children: [buildText(ids, "Connect a source")],
        }),
      ],
    }),
}
