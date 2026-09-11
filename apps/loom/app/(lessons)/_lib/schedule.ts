import { setSlug } from "./slugs"
import { readCourseFile } from "./source"
import { plainText, referencedLessons, referencedRecords } from "./text"

/**
 * `review-schedule.md`, read as a queue rather than as a document.
 *
 * The schedule is the highest-value part of the course and the easiest to skip,
 * and the reason it is skippable on paper is that it asks the reader to do the
 * arithmetic: it says *two days after lesson 09* and leaves them to work out
 * whether that is today. The file already carries everything needed to answer
 * that — an anchor and a delay in every heading, and a table at the bottom the
 * reader is asked to fill in by hand. This parser turns the heading into data so
 * the page can answer it, and the hand-kept table into something a machine keeps.
 *
 * Nothing here interprets a question. The text is the file's text; what this
 * adds is only which lesson a set waits on, how long it waits, and which earlier
 * lessons each question reaches into.
 */

export type ReviewAnchor =
  | { readonly kind: "lesson"; readonly lesson: number }
  | { readonly kind: "part"; readonly part: string }

export type ReviewQuestion = {
  readonly number: number
  readonly text: string
  /** The lessons the schedule marks this question as reaching into, ascending. */
  readonly refs: readonly number[]
  /**
   * The decision records the question cites in its own text, ascending. Two do,
   * and both inherited the citation from the lesson the question came out of —
   * where it was a link with a title, and here is four digits.
   */
  readonly records: readonly number[]
}

export type ReviewSet = {
  readonly letter: string
  readonly slug: string
  /** "two days after lesson 11", as written. */
  readonly timing: string
  readonly anchor: ReviewAnchor
  readonly delayDays: number
  /** Paragraphs before the questions: what this set is built around. */
  readonly notes: readonly string[]
  /** Paragraphs after them, which usually name the question that matters most. */
  readonly closing: readonly string[]
  readonly questions: readonly ReviewQuestion[]
}

/**
 * A set's name, which ran out of alphabet at lesson 21.
 *
 * Twenty-six sets is the whole of `A`–`Z`, and the twenty-seventh had nowhere
 * to go: this pattern read exactly one letter, so `## Set AA` was not a heading
 * at all — it was a line inside Set Z, and the questions under it would have
 * been silently appended to that set rather than rejected. A parser that reads
 * a course and drops part of it without saying so is the worst of the three
 * available failures, and it is the one that was on the shelf.
 *
 * Two letters rather than numbers, because the letter is also the slug
 * (`/lessons/review/set-z`) and a reader's record is keyed by that slug. Numbers
 * would have renamed twenty-six existing sets, and renaming a slug throws away
 * the study history filed under it — the reader's own record of when they did
 * the set and what they got wrong, which nothing else in this surface can
 * reconstruct. `AA` costs nobody anything: every existing set keeps its name.
 */
const SET_HEADING = /^## Set ([A-Z]{1,2}) — (.+)$/
const QUESTION = /^(\d+)\.\s+(.+)$/


const DELAYS: readonly (readonly [RegExp, number])[] = [
  [/two days/i, 2],
  [/one week/i, 7],
  [/one month/i, 30],
]

const delayFrom = (timing: string): number => {
  const found = DELAYS.find(([pattern]) => pattern.test(timing))

  if (found === undefined) throw new Error(`loom: unreadable review delay in "${timing}"`)

  return found[1]
}

const anchorFrom = (timing: string): ReviewAnchor => {
  const lesson = /lesson (\d+)/i.exec(timing)
  if (lesson?.[1] !== undefined) return { kind: "lesson", lesson: Number(lesson[1]) }

  const part = /Part ([IVX]+)/.exec(timing)
  if (part?.[1] !== undefined) return { kind: "part", part: part[1] }

  throw new Error(`loom: unreadable review anchor in "${timing}"`)
}

/** One set's lines, from its heading to the next `##` or the end of the file. */
const bodiesOf = (markdown: string): readonly (readonly [string, string, readonly string[]])[] => {
  const lines = markdown.split("\n")
  const sets: [string, string, string[]][] = []

  for (const line of lines) {
    const heading = SET_HEADING.exec(line)

    if (heading?.[1] !== undefined && heading[2] !== undefined) {
      sets.push([heading[1], heading[2], []])
      continue
    }

    const open = sets[sets.length - 1]
    if (open === undefined) continue
    if (line.startsWith("## ")) {
      /** A heading that is not a set closes the last one — the tracking table. */
      sets.push(["", "", []])
      continue
    }

    open[2].push(line)
  }

  return sets.filter(([letter]) => letter !== "")
}

type Block = { readonly number: number | undefined; readonly lines: string[] }

/**
 * Blocks, where a wrapped line continues whatever it is under.
 *
 * The source wraps at eighty columns, so neither a paragraph nor a question is
 * one line, and a blank line is the only thing that ends either. A numbered line
 * starts a new question even without a blank line before it, because the short
 * sets run their questions back to back.
 */
const blocksOf = (body: readonly string[]): readonly Block[] => {
  const blocks: Block[] = []
  let open: Block | undefined

  for (const line of body) {
    const trimmed = line.trim()

    if (trimmed === "" || trimmed === "---") {
      open = undefined
      continue
    }

    const question = QUESTION.exec(trimmed)

    if (question?.[1] !== undefined && question[2] !== undefined) {
      open = { number: Number(question[1]), lines: [question[2]] }
      blocks.push(open)
      continue
    }

    if (open === undefined) {
      open = { number: undefined, lines: [trimmed] }
      blocks.push(open)
      continue
    }

    open.lines.push(trimmed)
  }

  return blocks
}

const parseSet = (letter: string, timing: string, body: readonly string[]): ReviewSet => {
  const questions: ReviewQuestion[] = []
  const notes: string[] = []
  const closing: string[] = []

  for (const block of blocksOf(body)) {
    const raw = block.lines.join(" ")

    if (block.number === undefined) {
      /** Prose before the first question introduces the set; after it, it closes it. */
      ;(questions.length === 0 ? notes : closing).push(plainText(raw))
      continue
    }

    questions.push({
      number: block.number,
      text: plainText(raw),
      refs: referencedLessons(raw),
      records: referencedRecords(raw),
    })
  }

  return {
    letter,
    slug: setSlug(letter),
    timing,
    anchor: anchorFrom(timing),
    delayDays: delayFrom(timing),
    notes,
    closing,
    questions,
  }
}

export const parseReviewSchedule = (markdown: string): readonly ReviewSet[] =>
  bodiesOf(markdown).map(([letter, timing, body]) => parseSet(letter, timing, body))

/** The schedule as it stands in the repository, parsed once at build time. */
export const REVIEW_SETS: readonly ReviewSet[] = parseReviewSchedule(
  readCourseFile("review-schedule.md")
)

export const reviewSet = (slug: string): ReviewSet | undefined =>
  REVIEW_SETS.find((set) => set.slug === slug)
