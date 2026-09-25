import { readCourseFile } from "./source"
import { plainText } from "./text"

/**
 * The syllabus, read off `lessons/README.md`.
 *
 * The README's table is already the course's index — written lessons are links
 * and unwritten ones are a bare number — so a second list here would be a second
 * place to forget. What this page adds is only the part membership, which the
 * schedule needs and the reader cannot see: five of the thirty-three sets are
 * anchored to *a part* rather than to a lesson, and a part is finished when its
 * last lesson is.
 */

export type SyllabusLesson = {
  readonly number: number
  readonly title: string
  /** The file in `lessons/`, absent while the lesson is still unwritten. */
  readonly file: string | undefined
  readonly part: string
}

export type SyllabusPart = {
  readonly name: string
  readonly title: string
  readonly lessons: readonly SyllabusLesson[]
}

const PART_HEADING = /^### Part ([IVX]+) — (.+)$/
const LINKED_ROW = /^\|\s*\[(\d+)\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|/
const PLAIN_ROW = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/

export const parseSyllabus = (markdown: string): readonly SyllabusPart[] => {
  const parts: { name: string; title: string; lessons: SyllabusLesson[] }[] = []

  for (const line of markdown.split("\n")) {
    const heading = PART_HEADING.exec(line)

    if (heading?.[1] !== undefined && heading[2] !== undefined) {
      parts.push({ name: heading[1], title: plainText(heading[2]), lessons: [] })
      continue
    }

    const open = parts[parts.length - 1]
    if (open === undefined) continue

    const linked = LINKED_ROW.exec(line)
    if (linked?.[1] !== undefined && linked[2] !== undefined && linked[3] !== undefined) {
      open.lessons.push({
        number: Number(linked[1]),
        title: plainText(linked[3]),
        file: linked[2],
        part: open.name,
      })
      continue
    }

    const plain = PLAIN_ROW.exec(line)
    if (plain?.[1] !== undefined && plain[2] !== undefined) {
      open.lessons.push({
        number: Number(plain[1]),
        title: plainText(plain[2]),
        file: undefined,
        part: open.name,
      })
    }
  }

  return parts
}

export const SYLLABUS: readonly SyllabusPart[] = parseSyllabus(readCourseFile("README.md"))

export const ALL_LESSONS: readonly SyllabusLesson[] = SYLLABUS.flatMap((part) => part.lessons)

export const lesson = (number: number): SyllabusLesson | undefined =>
  ALL_LESSONS.find((entry) => entry.number === number)

/** Written lessons only: the ones a reader can actually have worked through. */
export const WRITTEN_LESSONS: readonly SyllabusLesson[] = ALL_LESSONS.filter(
  (entry) => entry.file !== undefined
)

/** The lessons a part is made of, in order. */
export const lessonsInPart = (name: string): readonly SyllabusLesson[] =>
  SYLLABUS.find((part) => part.name === name)?.lessons ?? []

/**
 * The same, as the four numbers the queue needs — the value that crosses into
 * the browser, where the file this was read from does not exist.
 */
export const PART_LESSONS: Readonly<Record<string, readonly number[]>> = Object.fromEntries(
  SYLLABUS.map((part) => [part.name, part.lessons.map((entry) => entry.number)])
)
