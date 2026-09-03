import type { Metadata } from "next"

import { Queue } from "../../_components/queue"
import { heading, prose, renderFragment } from "../../_lib/loom"
import { REVIEW_SETS } from "../../_lib/schedule"
import { PART_LESSONS } from "../../_lib/syllabus"
import * as style from "../../_components/style"

/**
 * The queue: twenty-three sets, and which of them is today's.
 *
 * The schedule in the repository is the source for every question here. What
 * this page adds is the part of it that a file cannot hold — a date per set,
 * derived from what the reader has actually done, and a record of where they
 * were confident and wrong.
 */

export const metadata: Metadata = {
  title: "Review queue",
  description: "The spaced, interleaved review sets — what is due, and what is not due yet.",
}

const SETS = REVIEW_SETS.map(({ letter, slug, timing, anchor, delayDays }) => ({
  letter,
  slug,
  timing,
  anchor,
  delayDays,
}))

const intro = renderFragment(
  (ids) => [
    heading(ids, 1, "Review queue"),
    prose(
      ids,
      "Rereading a lesson produces fluency without memory. Retrieving it after you have partly forgotten it produces memory. The gap is not wasted time — the gap is the mechanism.",
      { size: "lead" }
    ),
    prose(
      ids,
      "So a set that is not due is not offered, and a set that is due is one sitting: closed book, written answers, a confidence rating before each reveal, about ten minutes.",
      { tone: "muted" }
    ),
  ],
  "review-intro"
)

const ReviewQueuePage = () => (
  <main style={style.column(5)}>
    {intro}
    <Queue sets={SETS} parts={PART_LESSONS} />
  </main>
)

export default ReviewQueuePage
