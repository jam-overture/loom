/**
 * What survives the trip from markdown to a text node, and what does not.
 *
 * A Loom text node is a string (0001) and nothing in the starter library takes
 * a span inside a paragraph, so `**this**`, `*this*` and `` `this` `` have no
 * rendering here — they are stripped to the words they wrap rather than left on
 * the page as punctuation the reader has to ignore. What that costs is real and
 * is filed as a finding: a question that names `ChangeInterpreter` renders it in
 * the same face as the sentence around it.
 *
 * The reference markers are pulled out before the stripping, because
 * `*(04)*` is not emphasis — it is the schedule saying which lesson a question
 * reaches into, and the queue needs it as data.
 */

/** `*(04)*`, `*(04, 11, 12)*`, and `*(07 for why measurement and judgment are kept apart)*`. */
const REFERENCE = /\*\((\d{2}[^)]*)\)\*/g

/**
 * The numbers a marker opens with, all of them.
 *
 * A marker is a comma-separated list of lessons optionally followed by a reason
 * — `*(12, 09 for the rule)*` — so the numbers are the leading run and the
 * reason is whatever follows. Taking only the first was this module's original
 * behavior and it was quietly wrong: seven questions in the schedule reach into
 * two or three lessons each, and the reader was being offered the first one to
 * check against. An interleaved question whose pointer names one lesson is an
 * interleaved question that reads as an ordinary one.
 */
const LEADING_NUMBERS = /^\d{2}(?:\s*,\s*\d{2})*/

export const referencedLessons = (markdown: string): readonly number[] => {
  const found = new Set<number>()

  for (const match of markdown.matchAll(REFERENCE)) {
    const listed = LEADING_NUMBERS.exec(match[1] ?? "")?.[0]

    for (const lesson of listed?.split(",") ?? []) found.add(Number(lesson.trim()))
  }

  return [...found].sort((a, b) => a - b)
}

/**
 * A decision record cited in running prose: `the contract in 0033`.
 *
 * Four digits opening with a zero, which is what a record number is and what
 * nothing else in this course is — lesson numbers are two digits, section numbers
 * are `§6`, and a year is not zero-padded. A citation written as a link survives
 * this too, because `plainText` leaves `[decisions/0033](…)` as its label.
 */
const RECORD = /\b0\d{3}\b/g

export const referencedRecords = (markdown: string): readonly number[] => {
  const found = new Set<number>()

  for (const match of markdown.matchAll(RECORD)) found.add(Number(match[0]))

  return [...found].sort((a, b) => a - b)
}

export const plainText = (markdown: string): string =>
  markdown
    .replace(REFERENCE, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    /** A removed reference leaves its space behind, in front of the comma it preceded. */
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim()

/**
 * `lesson 08`, `lessons 18 and 19`, `Lesson 05's` — a lesson named in a sentence
 * rather than in a marker.
 *
 * This is deliberately a second function and not a widening of
 * `referencedLessons`, because the two are not the same fact written two ways.
 * A `*(04)*` marker is **data**: the schedule writes it so the queue can offer a
 * pointer, it appears nowhere a reader reads, and it is exact by construction.
 * A prose mention is the **author addressing the reader** — *derive it from
 * lesson 08*, *lesson 03 told you operations are ordered* — and it is a guess
 * about intent read off a sentence.
 *
 * Folding them together would let the guess into the queue's pointers, where
 * being wrong means grading somebody against the wrong lesson. Keeping them
 * apart means the guess is only ever used for the one thing it is good enough
 * for: offering the reader something they themselves wrote about a lesson this
 * prompt says it builds on. A false positive there costs a paragraph of their
 * own words they did not ask for; a missed one costs nothing they had.
 *
 * Two digits, always, which is what every lesson in this course is and what
 * makes the pattern safe next to a decision record (four digits opening with a
 * zero) and a section number (`§6`). The run after the first number is taken
 * whole so that *lessons 18 and 19* and *lessons 01, 14 and 22* yield both and
 * all three, rather than the first — the same mistake `LEADING_NUMBERS` above
 * was written to stop this file making twice.
 */
const NAMED_LESSONS = /\blessons?\s+(\d{2}(?:\s*(?:,|and)\s*\d{2})*)/gi

export const lessonsNamedInProse = (markdown: string): readonly number[] => {
  const found = new Set<number>()

  for (const match of markdown.matchAll(NAMED_LESSONS)) {
    for (const number of match[1]?.match(/\d{2}/g) ?? []) found.add(Number(number))
  }

  return [...found].sort((a, b) => a - b)
}
