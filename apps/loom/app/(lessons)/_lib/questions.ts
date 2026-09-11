import { keyOf } from "./corrections"
import { lessonQuestionPointers, reviewPointers, type CheckPointer } from "./links"
import { promptSet, readLesson, section } from "./lesson"
import type { Block } from "./markdown"
import { REVIEW_SETS } from "./schedule"
import { RECALL_PARTS, lessonSlug, type RecallPart } from "./slugs"
import { WRITTEN_LESSONS } from "./syllabus"

/**
 * Every question in the course that can be missed, addressed the way the
 * reader's record addresses it.
 *
 * There are two kinds and they were built in two places. The review sets came
 * out of `review-schedule.md` and were the only thing the corrections sitting
 * could render; a lesson's Warm-up and Self-check questions came out of the
 * lesson files, were graded, were recorded under a slug, entered the queue like
 * anything else — and then hit a sitting that had never heard of them and were
 * silently dropped.
 *
 * So this is one list, and it is data rather than rendered nodes on purpose:
 * the review index needs to know *which keys exist* to say honestly how many
 * questions are waiting, and it should not pay for a tree of primitives per
 * question to find out.
 */

export type CourseQuestion = {
  /** The slug the reader's record files this question under. */
  readonly set: string
  readonly number: number
  /**
   * What to call it once it has been answered — and only then. A correction
   * sitting draws from five places at once, and "Lesson 04 Self-check" is most
   * of the answer to a question about identity.
   */
  readonly label: string
  readonly text: string
  /**
   * The framing the question cannot be asked without, and nothing else.
   *
   * Lesson 04's first Predict question is "write down the address you would
   * store", and on its own that is not a question — the paragraph above it is
   * where a reviewer flags a node and you have to write down which one. Five of
   * the seventeen Predict sections pose a scenario like that, and taking the
   * question out of its section without it produces a prompt the reader cannot
   * answer for a reason that is nothing to do with what they know. Desirable
   * difficulty is a question you have to work at; this would be a question
   * missing a sentence.
   *
   * Every prompt set in the course opens with one paragraph of rubric — *in
   * writing, before reading on*, *closed book, five minutes, mixed across five
   * lessons*, *rate your confidence 1–5 then reveal* — and anything after it is
   * the scenario. So the rubric is dropped and the rest is kept, which is also
   * the only correct thing to do with it here: this sitting states its own terms
   * and they are not that section's. "Mixed across five lessons" is about the
   * Warm-up it was written for, and a question that arrived from one of five
   * different places has already left that behind.
   */
  readonly context: readonly Block[]
  readonly checkIn: readonly CheckPointer[]
}

/** Section titles, as they are written in the lessons. */
const HEADINGS: Readonly<Record<RecallPart, string>> = {
  "warm-up": "Warm-up",
  predict: "Predict",
  "self-check": "Self-check",
}

const pad = (number: number): string => String(number).padStart(2, "0")

const setQuestions: readonly CourseQuestion[] = REVIEW_SETS.flatMap((set) =>
  set.questions.map((question) => ({
    set: set.slug,
    number: question.number,
    label: `Set ${set.letter}`,
    text: question.text,
    /** A review set's questions are written to stand alone, and always have. */
    context: [],
    checkIn: reviewPointers(set.anchor, question),
  }))
)

const lessonQuestions: readonly CourseQuestion[] = WRITTEN_LESSONS.flatMap((entry) => {
  if (entry.file === undefined) return []

  const document = readLesson(entry.file)

  return RECALL_PARTS.flatMap((part) => {
    const set = promptSet(section(document, HEADINGS[part])?.blocks ?? [])

    if (set === undefined) return []

    /** The rubric paragraph off the front; whatever framed the questions stays. */
    const context = set.intro.slice(1)

    return set.prompts.map((prompt) => ({
      set: lessonSlug(document.number, part),
      number: prompt.number,
      label: `Lesson ${pad(document.number)} ${HEADINGS[part]}`,
      text: prompt.text,
      context,
      checkIn: lessonQuestionPointers(document.number, part, prompt.refs),
    }))
  })
})

/**
 * The review sets first, then the lessons, though nothing reads this in order —
 * which five questions a reader sees is decided by their own record and by the
 * gaps since they missed them.
 */
export const COURSE_QUESTIONS: readonly CourseQuestion[] = [...setQuestions, ...lessonQuestions]

/** The same list as a set of keys, for the two places that only need to count. */
export const QUESTION_KEYS: readonly string[] = COURSE_QUESTIONS.map((question) =>
  keyOf(question.set, question.number)
)
