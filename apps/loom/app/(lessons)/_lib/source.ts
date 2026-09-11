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

/** The checkout this surface is being built from, resolved once. */
export const REPOSITORY_ROOT = findCourseRoot(process.cwd())

/** The repository's `lessons/` directory. */
export const COURSE_DIR = join(REPOSITORY_ROOT, "lessons")

/**
 * The runtime's source, which the exercises are written against.
 *
 * Reading `src/` from here is the same move `lessons/` already is, and it is
 * worth being explicit about why it is a read and only a read. An exercise says
 * `import { applyDelta } from "./tree/apply.js"` because the reader is told to
 * paste it into `src/scratch.test.ts`; those specifiers name files in this
 * checkout and resolve nowhere else. `@loom/runtime` cannot stand in for them —
 * the single most-used import in the course is `./testing/fixtures.js`, and
 * `src/testing/**` is excluded from the published build on purpose. So the
 * runner reads the files the reader would have imported, which is also the only
 * version of this that cannot drift.
 */
export const RUNTIME_SRC = join(REPOSITORY_ROOT, "src")

/**
 * The decision records, which the course cites and does not contain.
 *
 * A lesson cites a record the way a paper cites a paper — with its number and
 * its title, linked — because a lesson is written for somebody reading this
 * repository. A review question inherits that citation and is read by somebody
 * who may not be, which is what made a bare `0033` on `/lessons/review/set-k`
 * worth filing. The number is not the problem; the missing door is.
 */
export const DECISIONS_DIR = join(REPOSITORY_ROOT, "decisions")

/**
 * Where a file in this repository can be opened, for a reader who has not
 * cloned it. `loom.link` refuses a relative href (a link whose destination
 * depends on where the tree is mounted is not a link), and a checkout path is
 * not a route on this surface either way.
 */
export const REPOSITORY_BLOB = "https://github.com/jam-overture/loom/blob/main"

export const readCourseFile = (name: string): string => readFileSync(join(COURSE_DIR, name), "utf8")
