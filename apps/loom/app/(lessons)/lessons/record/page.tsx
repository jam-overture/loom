import type { Metadata } from "next"

import { StudyRecord } from "../../_components/record"
import { heading, prose, renderFragment } from "../../_lib/loom"
import * as style from "../../_components/style"

/**
 * Your record: what it is, where it is, and how to still have it.
 *
 * This surface derives everything from one value in the reader's browser — which
 * sets are due, which questions come back and when they retire, and how often
 * they were sure and wrong. That was a deliberate trade and it is the right one;
 * what it was missing is the sentence that makes it survivable. A study history
 * that cannot be copied is not private, it is precarious.
 */

export const metadata: Metadata = {
  title: "Your record",
  description:
    "The study history this course runs on: what it holds, how to keep a copy, and how to bring one in from another browser.",
}

const intro = renderFragment(
  (ids) => [
    heading(ids, 1, "Your record"),
    prose(
      ids,
      "Everything this course knows about you is one value in this browser, and nothing about it has ever been sent anywhere.",
      { size: "lead" }
    ),
    prose(
      ids,
      "That is worth keeping and it is the reason this page exists. A record with no copy is one cleared cache away from a course that thinks you have never started it — and the parts that would go are the parts you cannot redo: the day each lesson was worked through, which every review date is counted from, and how many times a question you missed has been retrieved since.",
      { tone: "muted" }
    ),
  ],
  "record-intro"
)

const RecordPage = () => (
  <main style={style.column(5)}>
    {intro}
    <StudyRecord />
  </main>
)

export default RecordPage
