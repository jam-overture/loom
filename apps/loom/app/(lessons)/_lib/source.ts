import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

/**
 * Where the course is written.
 *
 * `lessons/` stays the source: a lesson is authored as markdown and its text
 * lives there, not here. This surface reads that directory and never writes to
 * it, which is what keeps the two things honest — the reader on the web and the
 * reader with a checkout are looking at the same words, and a set of questions
 * cannot drift into being a thing the repository does not contain.
 *
 * Found by walking up rather than by counting `..` segments, because the two
 * callers stand in different places: `next build` runs from `apps/loom` and a
 * vitest project can be invoked from either the application or the repository
 * root. A marker file is a cheap way to be right in both without either of them
 * having to know how deep it is.
 */

const MARKER = join("lessons", "review-schedule.md")

const findCourseRoot = (start: string): string => {
  let at = resolve(start)

  for (;;) {
    if (existsSync(join(at, MARKER))) return at

    const up = dirname(at)
    if (up === at) {
      throw new Error(`loom: no ${MARKER} above ${start} — the lessons surface cannot find the course`)
    }

    at = up
  }
}

/** The repository's `lessons/` directory, resolved once. */
export const COURSE_DIR = join(findCourseRoot(process.cwd()), "lessons")

export const readCourseFile = (name: string): string => readFileSync(join(COURSE_DIR, name), "utf8")
