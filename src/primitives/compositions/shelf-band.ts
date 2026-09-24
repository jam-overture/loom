import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * What a press has published, as a list somebody would actually read down.
 *
 * ## A design of `features`, on `features-catalogue`'s argument
 *
 * The `features` part is the body of a landing page: the band after the proof
 * where a reader finds out **what the thing is**. `featuresBand` answers with
 * capabilities, `catalogueBand` answers with goods on a shelf, and for a
 * publisher the honest answer to the same question is the list of books.
 *
 * 0171's swap, both ways. Drop this where the feature grid goes and the page
 * still tells a reader what this business makes and what it would cost to have
 * one — nothing the page needed is lost. Drop the feature grid where this goes
 * and the same is true of a software page. That makes it a **design** of
 * `features` and `COMPOSITION_PARTS` does not move, which is
 * [0183](../../../decisions/0183-a-page-for-another-kind-of-business-is-the-same-sequence-with-different-nodes-in-it.md)
 * applied rather than re-argued.
 *
 * **The alternative reading, stated because it is real.** A shelf of books an
 * author *recommends* — Hermes' `book-list` in its other sense — would sit in
 * the come-back band beside the writing and the episodes, not here. That is a
 * different band with the same nodes, and it is the one this run did not build:
 * a page takes one or the other and the difference is entirely in the copy
 * above the grid, which by 0162 makes it a `configure` of this one rather than
 * a second design. The eyebrow and the heading here are what say which.
 *
 * ## `columns: "one"`, and the mistake the first photograph caught
 *
 * `loom.book` reads two ways and the cell's width picks: a 2:3 cover over the
 * text below 32rem, and a 7rem cover *beside* the text above it. With no cover
 * art the row is the honest one, so this band asks for the width that produces
 * it.
 *
 * **It was first written as `columns: "two"` on the reasoning that two columns
 * of a wide section are about 34rem each, and that reasoning is wrong in the
 * exact way `docs/primitive-granularity.md` warns about.** `columns` is a
 * **floor** fed to `auto-fit`, not a count — the granularity doc says so about
 * this very prop and `loom.book-grid`'s own comment repeats it. `two` is a 19rem
 * minimum, and 19rem fits *three* times across a wide section, so the band drew
 * three columns of 23rem, every card below the query, and six blank 2:3 covers
 * 350 pixels tall. The prop was read as the thing it is defended for **not**
 * being, by a run that had just finished writing that it is not that.
 *
 * Two things came out of the photograph rather than out of the argument. The
 * band asks for `one`, which is the only value that can promise a width. And
 * the panel itself changed: a frame with no picture in it no longer takes the
 * picture's proportions, which is
 * [0187](../../../decisions/0187-a-frame-with-no-picture-in-it-is-not-the-pictures-shape.md)
 * and is what keeps this band honest on a phone, where every card stacks back
 * into the tile rendering whatever the grid was asked for.
 *
 * A press that has its jackets sets `columns` to `three` and gets the wall of
 * covers, with no other change and no node moved. That is the prop doing what a
 * prop is for: it changes how however-many books are laid out and cannot change
 * which books there are.
 *
 * ## The marker is where two Hermes blocks meet
 *
 * `loom.book`'s `marker` collapses `BookItem.year` and `ReadingItem.status` —
 * "2019" and "Halfway through" are both *a short label above the title saying
 * where this book stands*. This band uses it for the year, and the same six
 * nodes with six different markers are a currently-reading list. Nothing else
 * changes, which is the collapse paying for itself.
 */
type Book = {
  readonly marker: string
  readonly title: string
  readonly author: string
  readonly note: string
}

const BOOKS: readonly Book[] = [
  {
    marker: "Out now",
    title: "The Shape of a Change",
    author: "Priya Raghunathan",
    note: "Ten years of interfaces that rewrote themselves, and the one question every team got to too late: who was supposed to be reading this?",
  },
  {
    marker: "Out now",
    title: "Nobody Reads the Diff",
    author: "Grace Okonjo",
    note: "Four hundred lines and an approve button is not review. A working argument for what a person can actually weigh, and how much.",
  },
  {
    marker: "March",
    title: "A Field Guide to Quiet Failure",
    author: "Tomas Leclerc",
    note: "The faults that produce no error, no log line and no red build — and the small number of instruments that find them anyway.",
  },
  {
    marker: "2025",
    title: "Two Palettes, One Library",
    author: "Ines Batista",
    note: "On designing for a brand you have not been told yet, and the contrast checks that caught what the screenshots did not.",
  },
  {
    marker: "2025",
    title: "The Undo You Did Not Compute",
    author: "Sam Whitfield",
    note: "Reconstructing a reversal after the fact is a restore, and a restore loses everything since. A short book about paying up front.",
  },
  {
    marker: "2024",
    title: "Writing for a Reader Who Cannot See the Page",
    author: "Amara Oyelaran",
    note: "Alt text, announced state and the small print a generated page gets wrong first — with the transcripts of what it sounded like.",
  },
]

export const shelfBand: Composition = {
  id: "features-shelf",
  part: "features",
  label: "What it is, as a list of books",
  promise: "Six titles with their authors, the year each stands in, and a line about what it is for.",
  rationale:
    "A list is a loom.book-grid holding one loom.book per title, each carrying its year as the marker that Hermes held as two separate fields. Every book is a node, so a new title is one insert and a withdrawn one is one remove, and the column floor changes how they are laid out without changing which there are. It is a design of the features part rather than a new part: a publisher's books occupy the body of the page, where a software page puts its capabilities, and differ from it in the set of nodes they build.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.book-grid", "loom.book"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "The list", anchor: "features" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Six books about the parts of the work nobody photographs")],
          }),
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", measured: true },
            children: [
              buildText(
                ids,
                "Short books by people who were holding the problem at the time. Printed properly, and sold at a price a team can expense without asking."
              ),
            ],
          }),
        ]),
        buildElement(ids, {
          type: "loom.book-grid",
          props: { columns: "one", gap: "roomy" },
          children: BOOKS.map((book) =>
            buildElement(ids, {
              type: "loom.book",
              props: { title: book.title, author: book.author, marker: book.marker, note: book.note, href: "/books" },
            })
          ),
        }),
      ],
    }),
}
