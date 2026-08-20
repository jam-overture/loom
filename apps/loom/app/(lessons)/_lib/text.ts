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

/** `*(04)*` and `*(07 for why measurement and judgment are kept apart)*`. */
const REFERENCE = /\*\((\d{2})[^)]*\)\*/g

export const referencedLessons = (markdown: string): readonly number[] => {
  const found = new Set<number>()

  for (const match of markdown.matchAll(REFERENCE)) {
    const [, lesson] = match
    if (lesson !== undefined) found.add(Number(lesson))
  }

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
