import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The same facts as `specsBand`, grouped by the part of the system they are
 * about — a sheet somebody uses to *find* a number, where the table is the one
 * they use to *check* one.
 *
 * ## Why a second design of this part, and why this one
 *
 * `specsBand` is seven rows and three columns, and its own doc comment makes the
 * case for the table over a card per limit: a card loses the column-wise scan
 * that made the figures worth tabulating. That argument is sound and this band
 * does not contradict it, because **it is not a card per limit.** It is a card
 * per *area*, holding four limits that are about the same thing, and the scan it
 * offers is the one the table cannot: *where in this system is the number I came
 * for.*
 *
 * The two answer different questions and the question is what picks the design.
 * A reader who already knows they want the retention figure wants a heading
 * reading **The record** with four lines under it. A reader checking whether any
 * of the limits bite wants seven rows and a sentence per row. A flat table is
 * the wrong shape for the first the moment it is long enough to need grouping,
 * and this one is four lines from being that long.
 *
 * **And it survives a phone, which the table does not without help.** Three
 * columns one of which holds sentences is the hard case at 390px — `specsBand`
 * carries `prose: true` for exactly that reason and says in its own comment that
 * one row is 43% of a phone screen without it. Three cards in an `auto-fit` grid
 * become one column of three cards with no rule to write, because a card is
 * already a column.
 *
 * ## What is a node here, and what is a prop
 *
 * **The group is a node and the sheet has no `groups` prop.** That is 0052's
 * plainest reading of a shape that looks like configuration: three cards holding
 * the same arrangement is repeated content, so *add a fourth area* is one
 * `insert` of a card and *move storage above serving* is one `move`. A
 * `groups: SpecGroup[]` prop would have made both unreachable, which is the wall
 * `docs/primitive-granularity.md` describes as invisible until a visitor hits
 * it.
 *
 * Every limit inside a group is a node too, so a figure can be dropped from one
 * area without touching the other two. That is the difference from the table
 * next to it worth stating: there, dropping a row is one `remove` and dropping a
 * *column* is an `insert` into every row (0084). Here there are no columns to
 * add, and the price of that is that a second fact about one limit has nowhere
 * to go — which is the trade, said out loud, rather than a claim that grouping
 * is free.
 *
 * `columns` on the grid, `marker` and `density` on the list, `padding` and
 * `tone` on the card are props, and each passes the sharper question: changing
 * any of them changes how however-many groups are painted and changes the set of
 * nodes not at all.
 *
 * ## The one thing a reader of `loom.spec` will not expect
 *
 * **These specs have no middots, and nothing turned them off.** The separator is
 * `.loom-spec + .loom-spec::before` — a position selector, because no render of
 * one node can know it has a sibling (0008) — so it draws between two specs that
 * are *adjacent*. Here each spec is the only child of its own
 * `loom.list-item`, so the adjacency never matches and every line begins with
 * its figure.
 *
 * That is the behaviour this band wants and it is worth a test rather than a
 * comment, because it is a fact about the markup two primitives produce together
 * and neither of them states it. The alternative — four specs as siblings in a
 * column — is the arrangement `specsBand`'s comment warns about, and what it
 * produces is a floating middot at the head of every line but the first.
 */
const GROUPS = [
  {
    area: "Interpretation",
    limits: [
      { value: "600", label: "proposals a minute" },
      { value: "2,000", label: "nodes a page" },
      { value: "32", label: "operations a delta" },
      { value: "4", label: "tries at a reply" },
    ],
    note: "Per project key. Bursts to 2,000 for sixty seconds, then shaped rather than refused.",
  },
  {
    area: "The record",
    limits: [
      { value: "90 days", label: "of history kept" },
      { value: "No window", label: "for an undo" },
      { value: "17", label: "fields in a policy" },
      { value: "14", label: "rules a verdict weighs" },
    ],
    note: "Exportable while it is kept. The inverse of a change is computed from the change, so anything on record reverts.",
  },
  {
    area: "Serving",
    limits: [
      { value: "12", label: "regions" },
      { value: "50", label: "projects a workspace" },
      { value: "No ceiling", label: "on seats" },
      { value: "0", label: "model calls to render" },
    ],
    note: "Read replicas in all twelve. Writes go to the region the project was created in.",
  },
] as const

export const specsSheetBand: Composition = {
  id: "specs-sheet",
  part: "specs",
  label: "Specification sheet",
  promise:
    "Three cards, one per part of the system, each with four limits on their own lines and the sentence that qualifies the group.",
  rationale:
    "A specification sheet is a loom.grid holding a loom.card per area of the system, each with its own heading, a loom.list of one loom.spec per limit, and the qualifying line in the card's footer region. The area is a node rather than a field, so a fourth one is an insert and reordering them is a move.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.grid",
    "loom.card",
    "loom.list",
    "loom.list-item",
    "loom.spec",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Nothing rounded", anchor: "specs" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Every limit, under the part of the system it belongs to")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "lead", tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "The same figures the table below the price carries, sorted by where they bite rather than run together as one list."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.grid",
          /**
           * `three` is a floor fed to `auto-fit` and not a count, so a fourth
           * area dropped in wraps at the same minimum rather than being
           * squeezed into a row of four. Three cards is what this band ships,
           * and it is not what the prop says.
           */
          props: { columns: "three", gap: "normal", align: "stretch" },
          children: GROUPS.map((group) =>
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "surface", padding: "loose" },
              children: [
                buildElement(ids, {
                  type: "loom.heading",
                  props: { level: 3 },
                  children: [buildText(ids, group.area)],
                }),
                buildElement(ids, {
                  type: "loom.list",
                  /**
                   * `none`, because the marker a sheet of figures wants is the
                   * figure. A bullet in front of `90 days` is a second mark
                   * competing with the one the reader came for, and the rows
                   * are already a list to the document outline whether or not
                   * anything is drawn in the gutter.
                   */
                  props: { marker: "none", density: "tight", size: "small" },
                  children: group.limits.map((limit) =>
                    buildElement(ids, {
                      type: "loom.list-item",
                      props: {},
                      children: [
                        buildElement(ids, {
                          type: "loom.spec",
                          props: { value: limit.value, label: limit.label },
                        }),
                      ],
                    })
                  ),
                }),
                /**
                 * The qualifier goes in the card's own footer region rather
                 * than as a fourth child, because that is what the region is:
                 * `loom.card` drops its footer to the floor of the card, so
                 * three cards whose lists are different lengths still align
                 * their sentences. As a plain child it would sit directly under
                 * a list of four in one card and a list of two in the next, and
                 * the row of three would read as ragged.
                 */
                buildSlot(ids, "footer", [
                  buildElement(ids, {
                    type: "loom.prose",
                    props: { size: "small", tone: "muted" },
                    children: [buildText(ids, group.note)],
                  }),
                ]),
              ],
            })
          ),
        }),
      ],
    }),
}
