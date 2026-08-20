import { lesson } from "./syllabus"

/**
 * Where a lesson's text is, which is not here yet.
 *
 * The course is authored as markdown in `lessons/` and that stays true — this
 * surface is the machinery around it, and the machinery arrived first because
 * it is the half that paper cannot do at all. Until the prose is rendered here,
 * a pointer to a lesson is a pointer to the file, and saying so is better than
 * a link into a page that does not exist.
 */

const REPOSITORY = "https://github.com/jam-overture/loom/blob/main/lessons"

export type LessonPointer = {
  readonly number: number
  readonly title: string
  readonly href: string
}

export const lessonPointer = (number: number): LessonPointer | undefined => {
  const entry = lesson(number)

  if (entry?.file === undefined) return undefined

  return { number, title: entry.title, href: `${REPOSITORY}/${entry.file}` }
}

export const lessonPointers = (numbers: readonly number[]): readonly LessonPointer[] =>
  [...new Set(numbers)]
    .sort((a, b) => a - b)
    .map(lessonPointer)
    .filter((pointer): pointer is LessonPointer => pointer !== undefined)
