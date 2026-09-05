import { recordPointers } from "./records"
import type { ReviewAnchor, ReviewQuestion } from "./schedule"
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
 * Somewhere to go after you have written an answer — a lesson, or a record the
 * question cites.
 *
 * Both are a name, a title and a door, and the reader wants the same thing from
 * either: the specific point, not a reread. What differs is only where it lives,
 * which the name says.
 */
export type CheckPointer = {
  readonly kind: "lesson" | "record"
  /** `04`, or `decisions/0033`. */
  readonly name: string
  readonly title: string
  readonly href: string
}

const asCheck = (pointer: LessonPointer): CheckPointer => ({
  kind: "lesson",
  name: String(pointer.number).padStart(2, "0"),
  title: pointer.title,
  href: pointer.href,
})

/** Where to check a lesson's own question: the lessons it reaches back into. */
export const checkPointers = (numbers: readonly number[]): readonly CheckPointer[] =>
  lessonPointers(numbers).map(asCheck)

/**
 * Where to check a review question: the lesson its set follows, plus every
 * lesson the schedule marks that question as reaching back into, plus any
 * decision record the question cites by number. Interleaved sets reach into four
 * or five lessons, which is the point of them.
 *
 * The records are last and they are deliberately not first. A question that
 * cites `0033` is asking the reader to recall what that record settled, so the
 * record is where the answer is — which is exactly what makes it a place to go
 * *after* writing something down, alongside the lessons, rather than a reference
 * beside the question.
 *
 * One definition, because a question asked in its set and the same question
 * asked again a week later must send the reader to the same places — and a
 * correction that pointed somewhere else would be a different question.
 */
export const reviewPointers = (
  anchor: ReviewAnchor,
  question: ReviewQuestion
): readonly CheckPointer[] => [
  ...checkPointers([...(anchor.kind === "lesson" ? [anchor.lesson] : []), ...question.refs]),
  ...recordPointers(question.records).map(
    (record): CheckPointer => ({
      kind: "record",
      name: record.name,
      title: record.title,
      href: record.href,
    })
  ),
]
