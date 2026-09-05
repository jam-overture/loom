import type { Metadata } from "next"

import { Corrections, type CorrectionQuestion } from "../../../_components/corrections"
import { reviewPointers } from "../../../_lib/links"
import { heading, prose, renderFragment } from "../../../_lib/loom"
import { REVIEW_SETS } from "../../../_lib/schedule"
import * as style from "../../../_components/style"

/**
 * The corrections sitting.
 *
 * Every question in the course is rendered here and almost none of them is
 * shown. That is not an oversight and it is the one place this surface pays a
 * real cost for keeping the reader's record in their browser: *which* questions
 * come back is derived from a study history that exists only on their machine,
 * so the server cannot know which five to send and has to send all of them.
 *
 * The review index makes the opposite trade for the opposite reason — it lists
 * twenty sets and ships twenty headings, because a set's questions are not
 * needed until the reader opens it. Here there is no set to open; the sitting is
 * assembled out of five sets at once, which is what makes it interleaved by
 * construction rather than by an author's care.
 */

export const metadata: Metadata = {
  title: "Corrections",
  description: "The questions you missed, asked again after a gap — and again, and again.",
}

const QUESTIONS: readonly CorrectionQuestion[] = REVIEW_SETS.flatMap((set) =>
  set.questions.map((question) => ({
    set: set.slug,
    letter: set.letter,
    number: question.number,
    checkIn: reviewPointers(set.anchor, question),
    body: renderFragment(
      (ids) => [prose(ids, question.text)],
      `${set.slug}-c${question.number}`
    ),
  }))
)

const intro = renderFragment(
  (ids) => [
    heading(ids, 1, "Corrections"),
    prose(
      ids,
      "The schedule has always said what to do about a miss: look up the specific point, do not reread the lesson, and re-answer the question from memory a day later. This is that, kept for you.",
      { size: "lead" }
    ),
    prose(
      ids,
      "A question you missed comes back the next day, a week after you get it, and a month after that. Three clean retrievals retire it. Missing it once sends it back to the beginning, which is the part that makes the other three mean something.",
      { tone: "muted" }
    ),
  ],
  "corrections-intro"
)

const CorrectionsPage = () => (
  <main style={style.column(5)}>
    {intro}
    <Corrections questions={QUESTIONS} />
  </main>
)

export default CorrectionsPage
