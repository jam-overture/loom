import type { Metadata } from "next"

import { Corrections, type CorrectionQuestion } from "../../../_components/corrections"
import { blockNodes } from "../../../_lib/blocks"
import { heading, prose, renderFragment } from "../../../_lib/loom"
import { COURSE_QUESTIONS } from "../../../_lib/questions"
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
 * "Every question in the course" now means what it says. It used to mean the
 * review sets, which is why a reader who had missed a lesson's own Self-check
 * question was told on the index that questions were waiting and then shown
 * none here. The lessons' Warm-up, Predict and Self-check questions were being
 * recorded, graded and queued all along; this page was the only thing that had
 * not heard of them.
 *
 * The review index makes the opposite trade for the opposite reason — it lists
 * twenty-two sets and ships twenty-two headings, because a set's questions are
 * not needed until the reader opens it. Here there is no set to open; the
 * sitting is assembled out of five places at once, which is what makes it
 * interleaved by construction rather than by an author's care, and adding the
 * lessons to it widened that from twenty-two sources to nearly seventy.
 */

export const metadata: Metadata = {
  title: "Corrections",
  description: "The questions you missed, asked again after a gap — and again, and again.",
}

const QUESTIONS: readonly CorrectionQuestion[] = COURSE_QUESTIONS.map((question) => ({
  set: question.set,
  number: question.number,
  label: question.label,
  checkIn: question.checkIn,
  /**
   * The scenario first where there is one, then the question. Nothing else
   * comes with it — not the section's rubric, which this page states its own
   * version of, and not the paragraph that closes the section, which on the
   * lesson page is held back until the set is finished and names the question
   * that matters most.
   */
  body: renderFragment(
    (ids) => [...blockNodes(ids, question.context), prose(ids, question.text)],
    `${question.set}-c${question.number}`
  ),
}))

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
