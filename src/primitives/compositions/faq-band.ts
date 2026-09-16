import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Five questions, the first one open.
 *
 * `loom.faq` is a `<details>` and `loom.faq-list` is the column it sits in, so
 * the band works with scripting off and needs no behaviour. What the
 * composition adds is the arrangement nobody wants to re-derive: a reading
 * measure rather than the page's full width, and exactly one question open.
 *
 * ## Why the first one is open, and why only the first
 *
 * `open` is a prop on `loom.faq` and it is a real prop by 0052's test — it
 * changes what a reader can see without changing any node. A band that ships
 * with everything shut is a wall of identical grey bars that reads as a
 * navigation element rather than as answers; a band that ships with everything
 * open is a page of prose with rules through it. One open question shows a
 * reader what the shut ones contain, which is the only thing the state has to
 * do here.
 *
 * That it is a prop matters for what happens next: an author who disagrees
 * changes one `configure` per question rather than rebuilding the band, and the
 * reader's own opening and shutting never touches the tree at all, because
 * `<details>` holds it in the document and a render is a pure function of the
 * tree (0008).
 *
 * ## Why the questions are about the product and not about the band
 *
 * Every other composition here ships copy a page would keep and edit. This one
 * ships the five questions a software product is actually asked — price,
 * migration, data, cancellation, support — because the *set* is the useful
 * part. Somebody assembling a page from this catalogue is far more likely to
 * have forgotten one of those five than to want different words for them.
 */
type Question = { readonly question: string; readonly answer: string; readonly open?: boolean }

const QUESTIONS: readonly Question[] = [
  {
    question: "How long does it take to set up?",
    answer:
      "Connect a repository and the first board builds itself from what is already there. Most teams have something worth looking at in under ten minutes, and nothing has to be migrated first.",
    open: true,
  },
  {
    question: "Can we bring our existing data?",
    answer:
      "Yes. Import from a CSV or from the tools you already use, and everything keeps the dates and the authors it arrived with rather than being stamped with the day you imported it.",
  },
  {
    question: "Who can see what?",
    answer:
      "Permissions follow the repository. Someone who cannot read the code cannot read the board attached to it, and there is no setting that quietly widens that.",
  },
  {
    question: "What happens if we cancel?",
    answer:
      "You can export everything at any time, including while cancelled, and the export is a format something else can read rather than a backup only we can restore.",
  },
  {
    question: "Is there support on the free plan?",
    answer:
      "Yes — the same queue as everyone else, answered by the people who build it. Paid plans get a response time in writing, not a different door.",
  },
]

export const faqBand: Composition = {
  id: "faq",
  part: "faq",
  label: "FAQ",
  promise: "Five questions at a reading width, with the first one already open.",
  rationale:
    "Questions and answers are one loom.faq node each inside a loom.faq-list, so a question can be added or reordered on its own. Whether a question starts open is a prop, because it changes what is visible without changing any node.",
  uses: ["loom.section", "loom.heading", "loom.faq-list", "loom.faq"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", anchor: "faq" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Questions people ask before they start")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.faq-list",
          props: { columns: "one", width: "readable" },
          children: QUESTIONS.map((entry) =>
            buildElement(ids, {
              type: "loom.faq",
              props: {
                question: entry.question,
                answer: entry.answer,
                ...(entry.open === true ? { open: true } : {}),
              },
            })
          ),
        }),
      ],
    }),
}
