import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The figures a page has to be able to print, and the sentence beside each one.
 *
 * ## Why this band did not exist, which is not that nobody wanted it
 *
 * `loom.table`, `loom.table-row` and `loom.table-cell` were built on 22 August
 * for a finding `Loom lessons` filed about documents. They have been registered,
 * tested and described in every interpretation request a deployment sends since,
 * and **no band in the catalogue has ever built one** — so the general table was
 * surface a host paid for on every request and could not reach by dropping in a
 * band. The 19 September inventory put the trio at the top of the list of what
 * the catalogue genuinely could not draw, and the 20 September run put it there
 * again after clearing the treatments. This is that band.
 *
 * ## The two registers, and why both are here
 *
 * A specification says the same thing twice on purpose, at two sizes.
 *
 * The **run of `loom.spec` nodes** is the version a reader takes away if they
 * read nothing else: four figures set at reading size, run together behind
 * middots, in the register `loom.spec` was written for — *a detail attached to
 * something else, never the loudest thing in its card*. It is deliberately not
 * `loom.stat`: a stat is a band's headline and the `metrics` band two places up
 * this page already spends four of them. Two bands of big numbers in a row is
 * the page saying one thing twice and looking louder each time.
 *
 * The **table** is the version somebody scrolls back to. Seven rows, three
 * columns, and the third column holds sentences — which is the whole reason the
 * band is a table rather than a second grid of cards. A card per limit loses the
 * column-wise scan that made the figures worth tabulating, which is the defect
 * `loom.table` was built to end.
 *
 * ## What is a node here, and what is a prop
 *
 * Every row is a `loom.table-row` and every cell is a `loom.table-cell`, so
 * *drop the regions row* is one `remove` and *add a column* is an `insert` into
 * every row — which is [0084](../../../decisions/0084-in-a-two-dimensional-band-rows-are-nodes-and-columns-are-positions.md)
 * paid for rather than argued about. The column headings go in a
 * `loom.table-row` **inside** the `columns` slot and not as bare cells in it:
 * the table places that slot in a `<thead>`, a `<thead>` holds rows, and the
 * band that got this wrong is in the repository already — `comparisonBand`'s own
 * comment records what a missing row looks like in a photograph, which is every
 * mark one column right of its heading.
 *
 * **Seventy nodes, which is the second-largest band in the catalogue**, and the
 * cost is worth stating where somebody reaching for a second table band will
 * read it: twenty-one cells and twenty-one text nodes for seven facts. The
 * bargain is the one the pricing band makes and it is 0084's — a column added is
 * an `insert` into every row, a row dropped is one `remove` — but it is a
 * bargain rather than a free win, and the grammar budget
 * ([0014](../../../decisions/0014-the-reply-schema-must-fit-a-grammar-budget.md))
 * is what it is weighed against.
 *
 * `role`, `align`, `numeric`, `rules`, `density` and `prose` are props, and each
 * of them passes the sharper question `docs/primitive-granularity.md` asks:
 * changing any one changes how however-many rows are painted and changes the set
 * of nodes not at all.
 *
 * **`numeric` with `align: "start"` is the one worth reading twice.** The limit
 * column holds `600 a minute` and `90 days` beside `No window` and `No
 * ceiling`, so it is a column of limits rather than a column of figures — and
 * two of the seven limits are that there is not one, which is a thing a
 * specification has to be able to say. `numeric` defaults that cell to the
 * trailing edge, which would set five numbers hard right and two phrases hard
 * right under a heading that is not — so the alignment is stated. What `numeric` still buys is the thing it is
 * actually for: tabular figures, so `600` and `2,000` line up digit under digit
 * rather than drifting with whichever glyphs are above them. The primitive's own
 * comment says a cell holding "3 seats" is as entitled to it as one holding
 * "1,204", and this column is that sentence's first real use.
 */
const SPECS = [
  { value: "600", label: "proposals a minute" },
  { value: "2,000", label: "nodes a page" },
  { value: "90 days", label: "of history kept" },
  { value: "12", label: "regions" },
] as const

const COLUMNS = ["What", "Limit", "How it applies"] as const

/**
 * Seven rows, and the shape of them is an editorial judgement a starting
 * composition is entitled to make.
 *
 * A specification whose every row is generous reads as a brochure, the same way
 * a comparison table whose first column is `yes` all the way down does — and
 * `comparisonBand` took the same decision for the same reason, by losing a row
 * on a real axis. Here it is three lines: traffic that is shaped after sixty
 * seconds rather than refused, writes that go to one region rather than to all
 * twelve, and a workspace that splits at fifty projects. All three are true of
 * every system built this way and none of them is something a page volunteers,
 * which is exactly why they belong in the band whose job is that nothing is
 * rounded.
 *
 * **Every row is a limit, including the two that are not numbers.** `No window`
 * and `No ceiling` are answers to the same question the other five answer, and
 * a table that had quietly turned into a capability list halfway down would
 * make the caption above it false. The first draft did exactly that — its last
 * two rows were *model access* and *self-hosting*, which are things you get
 * rather than edges you meet — and the photograph is what showed the column
 * heading no longer fitting its own column.
 */
const ROWS = [
  {
    heading: "Proposals",
    value: "600 a minute",
    note: "Per project key. Bursts to 2,000 for sixty seconds, then shaped rather than refused.",
  },
  {
    heading: "Page size",
    value: "2,000 nodes",
    note: "A larger page is accepted and interpreted one region at a time.",
  },
  {
    heading: "History",
    value: "90 days",
    note: "Every change, the reasoning attached to it, and who answered it. Exportable while it is kept.",
  },
  {
    heading: "Undo",
    value: "No window",
    note: "The inverse of a change is computed from the change, so anything on record reverts.",
  },
  {
    heading: "Regions",
    value: "12",
    note: "Read replicas in all of them. Writes go to the one the project was created in.",
  },
  {
    heading: "Projects",
    value: "50 a workspace",
    note: "Past fifty the workspace splits. Nothing is deleted and no page changes address.",
  },
  {
    heading: "Seats",
    value: "No ceiling",
    note: "A seat that answered nothing in a given month is not billed for that month.",
  },
] as const

export const specsBand: Composition = {
  id: "specs",
  part: "specs",
  label: "Specifications",
  promise:
    "Four headline figures over a seven-row table of limits, each with the figure and the sentence that qualifies it.",
  rationale:
    "A specification band is a loom.section holding a run of loom.spec figures, a rule, and a loom.table whose columns region names the three headings and whose children are a loom.table-row per limit. Every row is a node and every cell is a node, so a limit can be dropped or a column added without rewriting the band.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.stack",
    "loom.spec",
    "loom.divider",
    "loom.table",
    "loom.table-row",
    "loom.table-cell",
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
            children: [buildText(ids, "The limits, and exactly where they bite")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { size: "lead", tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "Every plan runs the same engine. What changes is how much of it you get, and all of it is written down here rather than in a sales call."
              ),
            ],
          }),
        ]),
        /**
         * A row rather than the section's own column, because the middot
         * between two specs is `.loom-spec:not(:last-child)::after` — a
         * position selector, which is the only way a render that is a total
         * pure projection of one node (0008) can punctuate siblings. Stacked in
         * a column each spec would be a last child of nothing and the run would
         * lose its punctuation; laid in a row they are the siblings the rule
         * is written about. `baseline` because the figure and its unit are set
         * in two faces at two weights and a centred row would stagger them.
         */
        buildElement(ids, {
          type: "loom.stack",
          props: { direction: "row", wrap: true, align: "baseline", gap: "snug" },
          children: SPECS.map((spec) =>
            buildElement(ids, { type: "loom.spec", props: { value: spec.value, label: spec.label } })
          ),
        }),
        buildElement(ids, {
          type: "loom.divider",
          props: { ornament: "rule", spacing: "tight" },
        }),
        buildElement(ids, {
          type: "loom.table",
          props: {
            caption: "Every figure below is a limit of the system, not of a plan.",
            tone: "panel",
            rules: "rows",
            density: "comfortable",
            /**
             * The third column holds sentences, which is the one fact about a
             * table's content that no rule in `stylesheet.ts` can see and the
             * whole of what this prop is for. Left off, one row of this table
             * is 43% of a phone screen.
             */
            prose: true,
          },
          children: [
            buildSlot(ids, "columns", [
              buildElement(ids, {
                type: "loom.table-row",
                props: {},
                children: COLUMNS.map((column) =>
                  buildElement(ids, {
                    type: "loom.table-cell",
                    props: { role: "column", align: "start" },
                    children: [buildText(ids, column)],
                  })
                ),
              }),
            ]),
            ...ROWS.map((row) =>
              buildElement(ids, {
                type: "loom.table-row",
                props: {},
                children: [
                  buildElement(ids, {
                    type: "loom.table-cell",
                    props: { role: "row" },
                    children: [buildText(ids, row.heading)],
                  }),
                  buildElement(ids, {
                    type: "loom.table-cell",
                    props: { numeric: true, align: "start" },
                    children: [buildText(ids, row.value)],
                  }),
                  buildElement(ids, {
                    type: "loom.table-cell",
                    props: {},
                    children: [buildText(ids, row.note)],
                  }),
                ],
              })
            ),
          ],
        }),
      ],
    }),
}
