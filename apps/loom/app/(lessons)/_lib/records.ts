import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { DECISIONS_DIR, REPOSITORY_BLOB } from "./source"

/**
 * A decision record, resolved from the number a question cites.
 *
 * The course cites records constantly and correctly: a lesson writes
 * `[decisions/0033](../decisions/0033-…md)` — a number, a title and a door — for
 * a reader who has this repository open. Two review questions inherited the
 * citation without the door, because a question is prose lifted out of
 * `review-schedule.md` and a Loom text node is a string (0001), so the link
 * around it does not survive the trip to the page. What reached the reader was
 * the four digits on their own.
 *
 * The fix is the door, not the number. A citation is worth keeping — it is where
 * the reasoning actually is — and stripping it would leave a question that
 * gestures at a document the reader is now not even told exists. So a cited
 * record is resolved here to the same three things a lesson gives it, out of the
 * record's own file rather than a table somebody maintains: a number, its real
 * title, and somewhere to open it.
 *
 * Where the door is put matters as much as having one. It goes in *where to
 * check*, which unlocks only after the reader has written an answer — the same
 * place a lesson pointer goes, for the same reason. A record beside the question
 * would be a reference to read first, and reading it first is what this surface
 * exists to prevent.
 */

export type RecordPointer = {
  readonly number: number
  /** `decisions/0033`, as the lessons write it. */
  readonly name: string
  readonly title: string
  readonly href: string
}

const FILE = /^(\d{4})-.+\.md$/

/**
 * `# 0033. The policy is resolved per change` and `# 0001 — The tree and the
 * delta are the unit of AI-authored change`. Both spellings are in `decisions/`,
 * the older records using the dash and the newer ones the period, and the title
 * is whatever follows either.
 */
const HEADING = /^#\s+\d{4}\s*(?:[—–-]|\.)\s*(.+?)\s*$/

const pad = (number: number): string => String(number).padStart(4, "0")

const titleOf = (markdown: string): string | undefined => {
  for (const line of markdown.split("\n", 8)) {
    const heading = HEADING.exec(line)

    if (heading?.[1] !== undefined) return heading[1]
  }

  return undefined
}

/**
 * Every record, read once at build time.
 *
 * A record whose first heading this cannot read is left out rather than shown
 * with its filename slugs for a title: the citation then renders as no door at
 * all, which is where this started but is at least not a link that lies about
 * what it opens.
 */
const readRecords = (): ReadonlyMap<number, RecordPointer> => {
  const found = new Map<number, RecordPointer>()

  for (const file of readdirSync(DECISIONS_DIR)) {
    const match = FILE.exec(file)
    if (match?.[1] === undefined) continue

    const number = Number(match[1])
    const title = titleOf(readFileSync(join(DECISIONS_DIR, file), "utf8"))
    if (title === undefined) continue

    found.set(number, {
      number,
      name: `decisions/${pad(number)}`,
      title,
      href: `${REPOSITORY_BLOB}/decisions/${file}`,
    })
  }

  return found
}

export const RECORDS: ReadonlyMap<number, RecordPointer> = readRecords()

export const recordPointer = (number: number): RecordPointer | undefined => RECORDS.get(number)

export const recordPointers = (numbers: readonly number[]): readonly RecordPointer[] =>
  [...new Set(numbers)]
    .sort((a, b) => a - b)
    .map(recordPointer)
    .filter((pointer): pointer is RecordPointer => pointer !== undefined)
