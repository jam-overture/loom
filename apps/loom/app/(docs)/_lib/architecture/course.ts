import { plainText, readCourseFile, repositoryHref } from "./source"

/**
 * The course, read off its own syllabus.
 *
 * `lessons/README.md` carries the table of lessons: a written one is a link and
 * an unwritten one is a bare number, which is exactly the distinction this
 * section needs — a pointer to a lesson that has not been written yet must say
 * so rather than 404.
 *
 * The lessons surface parses the same table for its own purposes and takes the
 * part number, which it needs and this does not; this takes the third column,
 * which it needs and that does not. Two small parsers over one source file is
 * the right trade against one shared parser across a lane boundary — the source
 * of truth is the README, not either reader of it, and neither surface can
 * break the other by changing what it wants from the row.
 */

/** `| [01](01-why-a-runtime.md) | Title | What it covers |` */
const WRITTEN_ROW = /^\|\s*\[(\d+)\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/

/** `| 13 | Title | What it covers |` — a lesson that is planned and not yet written. */
const PLANNED_ROW = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/

export type CourseLesson = {
  readonly number: number
  readonly title: string
  /** One line on what the lesson covers, from the syllabus' own third column. */
  readonly about: string
  /** The file in `lessons/`, and where to read it. Absent while it is unwritten. */
  readonly file?: string
  readonly href?: string
}

export const parseSyllabus = (markdown: string): readonly CourseLesson[] => {
  const lessons: CourseLesson[] = []

  for (const line of markdown.split("\n")) {
    const written = WRITTEN_ROW.exec(line)

    if (
      written?.[1] !== undefined &&
      written[2] !== undefined &&
      written[3] !== undefined &&
      written[4] !== undefined
    ) {
      lessons.push({
        number: Number(written[1]),
        title: plainText(written[3]),
        about: plainText(written[4]),
        file: written[2],
        href: repositoryHref("lessons", written[2]),
      })
      continue
    }

    const planned = PLANNED_ROW.exec(line)

    if (planned?.[1] !== undefined && planned[2] !== undefined && planned[3] !== undefined) {
      lessons.push({
        number: Number(planned[1]),
        title: plainText(planned[2]),
        about: plainText(planned[3]),
      })
    }
  }

  return lessons
}

export const COURSE: readonly CourseLesson[] = parseSyllabus(readCourseFile("README.md"))

export const courseLesson = (number: number): CourseLesson | undefined =>
  COURSE.find((lesson) => lesson.number === number)

/** Where the course is actually done, which is a page in this application. */
export const COURSE_HREF = "/lessons"
