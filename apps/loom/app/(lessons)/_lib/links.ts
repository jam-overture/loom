import type { ReviewAnchor } from "./schedule"
import { lesson } from "./syllabus"

/**
 * Where a lesson's text is: here, now.
 *
 * The course is authored as markdown in `lessons/` and that stays true — the
 * surface reads those files and never writes to them. What changed is where a
 * *pointer* goes. Until this route existed, every reference the course made to
 * a lesson left the course: a review question's "where to check" opened a raw
 * file on GitHub, which is the one place the reader can also see the printed
 * answers, in a tab that has none of the machinery this surface exists for.
 *
 * A lesson number is a route now, and `dynamicParams` is off on it, so a
 * pointer to a lesson that has not been written is not a 404 — it is `undefined`
 * here and never rendered as a link at all.
 */

export type LessonPointer = {
  readonly number: number
  readonly title: string
  readonly href: string
}

export const lessonPointer = (number: number): LessonPointer | undefined => {
  const entry = lesson(number)

  if (entry?.file === undefined) return undefined

  return { number, title: entry.title, href: `/lessons/${String(number).padStart(2, "0")}` }
}

export const lessonPointers = (numbers: readonly number[]): readonly LessonPointer[] =>
  [...new Set(numbers)]
    .sort((a, b) => a - b)
    .map(lessonPointer)
    .filter((pointer): pointer is LessonPointer => pointer !== undefined)

/**
 * Where to check a review question: the lesson its set follows, plus every
 * lesson the schedule marks that question as reaching back into. Interleaved
 * sets reach into four or five, which is the point of them.
 *
 * One definition, because a question asked in its set and the same question
 * asked again a week later must send the reader to the same places — and a
 * correction that pointed somewhere else would be a different question.
 */
export const reviewPointers = (
  anchor: ReviewAnchor,
  refs: readonly number[]
): readonly LessonPointer[] =>
  lessonPointers([...(anchor.kind === "lesson" ? [anchor.lesson] : []), ...refs])
