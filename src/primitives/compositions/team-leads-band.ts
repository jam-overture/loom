import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * The two people a reader is actually deciding about, at length — and the rest
 * of the company as faces, which is what the rest of the company is to a
 * stranger.
 *
 * ## Why a second design, and what `teamBand` cannot do
 *
 * `teamBand` is four people in an even grid, each with one line. It is the right
 * band for a team of four and it is the *only* band for a team of forty, which
 * is the problem: a company of forty either ships forty cards, which is a
 * directory nobody reads on a marketing page, or picks four and silently claims
 * to be four.
 *
 * This band is the shape that scales, and it scales by admitting that a stranger
 * is not weighing forty people equally. **Two registers, on purpose:** the
 * people who will answer a hard question get a card and three lines each, and
 * everybody else is a face in a row with a sentence saying how many there are
 * and where. That is not a smaller version of the grid — it is the band saying
 * which half of its content is load-bearing, which a grid of equals cannot say
 * at any size.
 *
 * ## The near-miss this band had, run out loud
 *
 * The obvious container for two foregrounded people is `loom.split`, and the
 * first draft used it. **It is wrong, and the reason is the granularity rule
 * rather than taste.** A split has exactly two regions, because
 * [0051](../../../decisions/0051-a-slot-is-a-region-the-primitive-places.md)
 * makes a slot a region the primitive *places* — so a third lead is not an
 * `insert` that lands somewhere imperfect, it is an `insert` with nowhere to go
 * at all. A company that promotes somebody cannot say so without a developer.
 *
 * `loom.grid` at a two-column floor draws the identical pair at every width this
 * band is photographed at, and a third card wraps. The two readings were not
 * equally defensible once the question was asked properly — *does this choice
 * change what the set of nodes can become* — and
 * `docs/primitive-granularity.md` says decompose when they are. The cost of
 * being wrong here is the cost it names: tedium is recoverable, a wall is not.
 *
 * [0217](../../../decisions/0217-choosing-a-two-region-primitive-is-itself-an-insert-decision.md)
 * is that near-miss written down as a rule, because the doc's own test is framed
 * about props and a run with no suspicious prop reads it, agrees with it, and
 * picks the split anyway. This band is the case it was written from.
 *
 * The `loom.split` in `credentialsPostureBand` is the same primitive used
 * correctly, and the difference is worth holding beside this: there the two
 * regions are *different kinds of thing* — an argument and a list of seals — and
 * nobody ever wants a third. Two regions is a claim about the content, and it is
 * true there and false here.
 *
 * ## What is a node and what is a prop
 *
 * | | | |
 * | --- | --- | --- |
 * | a lead | **node**, a `loom.person` in a `loom.card` | a third is one `insert`; a lead who leaves is one `remove` whose inverse restores that person rather than the pair |
 * | the way to reach a lead | **node**, a `loom.link` in the card's footer region | a `contactHref` prop would be `insert`/`remove` wearing a label — a deployment whose founders do not take cold mail removes a node instead, and one that adds a second route inserts one |
 * | each face in the row | **node**, a `loom.avatar` | the plainest case there is. The row is the company and the company changes |
 * | the sentence about the rest | **`text` children of a `loom.prose`** | prose is children by 0052, and it has to be: *and seven more, in three cities* is a sentence somebody will want half of in a different weight |
 * | `columns`, `spacing`, `tone`, `align` | **props** | each changes how however-many children are drawn and changes the set of nodes not at all. `spacing: "overlap"` is the one that looks structural and is not — it is a negative margin, so the row holds the same seven avatars either way |
 *
 * ## No photographs, and the row is the reason it is fine
 *
 * `loom.avatar` draws initials when it has no image, which is the one place in
 * the library where the absent asset produces something a page can ship rather
 * than a hole — a row of seven monograms is a legitimate design and not a
 * placeholder. The two leads' portraits are the same monogram at a larger box,
 * for the reason `teamBand` and `heroBand` both give: a composition cannot ship
 * an asset, and a `src` in one would be a broken path in a host's `public/` or a
 * live request to a third party from a page nobody has read yet.
 */
const LEADS = [
  {
    name: "Ada Okonkwo",
    role: "Founder",
    bio: "Built the first version of this while waiting on a review that never came. Still reads every held change on the Friday queue, which is how most of the rough edges get found.",
    reach: "Mail Ada directly",
    href: "mailto:ada@loom.example",
  },
  {
    name: "Tomas Lind",
    role: "Engineering",
    bio: "Spent six years on build systems and has opinions about all of them. Owns the runtime, the Gate, and the argument about whether a verdict may ever be guessed.",
    reach: "Mail Tomas directly",
    href: "mailto:tomas@loom.example",
  },
] as const

/**
 * Seven, which is the number that makes the sentence beside them do work.
 *
 * At three the row reads as a team that could have been three more cards; at
 * fifteen it reads as a logo wall of people. Seven is where a reader stops
 * counting and takes the sentence's word for it, and the sentence is the point —
 * the faces are what make it credible rather than what it says.
 */
const EVERYBODY_ELSE = [
  "Priya Raman",
  "Joel Mbeki",
  "Nadia Hallström",
  "Omar Haddad",
  "Wen Li",
  "Sofia Marchetti",
  "Dele Adeyemi",
] as const

export const teamLeadsBand: Composition = {
  id: "team-leads",
  part: "team",
  label: "Founders and the rest",
  promise:
    "Two people in full, each with a card and a way to reach them, then the rest of the company as a row of faces with one line about them.",
  rationale:
    "A leads band is a loom.grid of two loom.card nodes, each holding a loom.person and a loom.link in its footer region, over a loom.avatar-row of everybody else. Every person is a node at both sizes, so promoting somebody is a move between two regions rather than a prop nobody predicted.",
  uses: [
    "loom.section",
    "loom.heading",
    "loom.prose",
    "loom.grid",
    "loom.card",
    "loom.person",
    "loom.link",
    "loom.divider",
    "loom.stack",
    "loom.avatar-row",
    "loom.avatar",
  ],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Who is behind it", anchor: "team" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Two people answer the hard questions, and nine of us build it")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted" },
          children: [
            buildText(
              ids,
              "No account managers and no queue. If the answer needs somebody who wrote the thing, you are already talking to them."
            ),
          ],
        }),
        buildElement(ids, {
          type: "loom.grid",
          /**
           * `two` is the floor rather than the pair: a third lead wraps onto a
           * second row at the same minimum width, which is the whole reason
           * this is a grid and not the `loom.split` the first draft reached
           * for. See the note above — it is the one decision in this band that
           * a reviewer should push on.
           */
          props: { columns: "two", gap: "normal", align: "stretch" },
          children: LEADS.map((lead) =>
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "surface", padding: "loose" },
              children: [
                buildElement(ids, {
                  type: "loom.person",
                  props: { name: lead.name, role: lead.role, bio: lead.bio, align: "start" },
                }),
                /**
                 * The footer region rather than a fourth child, for the reason
                 * `specsSheetBand` gives about its own: a card's footer sits on
                 * the floor, so two bios of different lengths still line their
                 * links up. As a plain child the right-hand link would float
                 * two lines above the left-hand one and the pair would read as
                 * unfinished.
                 */
                buildSlot(ids, "footer", [
                  buildElement(ids, {
                    type: "loom.link",
                    props: { href: lead.href, tone: "accent", scale: "small" },
                    children: [buildText(ids, lead.reach)],
                  }),
                ]),
              ],
            })
          ),
        }),
        buildElement(ids, {
          type: "loom.divider",
          props: { ornament: "rule", spacing: "normal" },
        }),
        buildElement(ids, {
          type: "loom.stack",
          /**
           * A row that wraps, `center` on the cross axis, because the faces are
           * a 40px band and the sentence beside them is two lines at 390px.
           * Wrapped, the sentence becomes a block under the row and the row
           * keeps its own alignment; aligned to `start` instead, the faces sit
           * level with the sentence's first line at every width and level with
           * nothing at the width where it wraps.
           */
          props: { direction: "row", wrap: true, align: "center", gap: "normal" },
          children: [
            buildElement(ids, {
              type: "loom.avatar-row",
              props: { spacing: "overlap" },
              children: EVERYBODY_ELSE.map((name) =>
                buildElement(ids, {
                  type: "loom.avatar",
                  props: { name, size: "medium", shape: "circle" },
                })
              ),
            }),
            buildElement(ids, {
              type: "loom.prose",
              props: { size: "small", tone: "muted" },
              children: [
                buildText(
                  ids,
                  "And seven more, in Lisbon, Bristol and Chicago. Everybody here takes a support shift one day a fortnight, founders included."
                ),
              ],
            }),
          ],
        }),
      ],
    }),
}
