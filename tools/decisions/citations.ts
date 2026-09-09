import { RECORD_FILE } from "./record.js"

/**
 * A citation is a claim, and `src/` is the half nothing read.
 *
 * Records already check each other. #217 renumbered a record that had just
 * collided and left two records citing it as `[0096](0099-…)` — the right file
 * under a number that by then belonged to something else — so the repository
 * gained a check that a link's label and the file it opens agree. That check
 * looks only inside `decisions/`.
 *
 * The same failure is one directory over and eight times larger. Every doc
 * comment in the framing seam cites `(0094)` and means
 * [0095](../../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md):
 * `src/frame/index.ts`, `src/frame/origin.ts`, `src/render/request.ts`,
 * `src/render/render.ts`, `src/render/primitive.ts`, `src/sdk/registry.ts`,
 * `src/sdk/audit.ts`, `src/sdk/definition.ts`. 0094 is a real Accepted record
 * about a card's prose, so a reader is misled rather than stopped, and three
 * citations of 0094 in the primitive library next door are correct — a
 * find-and-replace would have broken those. `Loom lessons` found it writing a
 * lesson that teaches the seam, one day after the same failure was filed
 * against 0087.
 *
 * ## What this catches, and what it cannot
 *
 * A bare `(NNNN)` carries one fact, so the only thing that can be held against
 * it is whether a record of that number exists. That catches a citation of a
 * number nobody has written — the failure mode of a hole in the sequence, and of
 * a record deleted rather than superseded — and it would **not** have caught the
 * eight above, because 0094 exists.
 *
 * A link carries the number twice: once as the label a reader sees, once as the
 * file a click opens. Two copies of one fact can disagree, and disagreement is
 * checkable — which is why a link is the only citation this can hold to its own
 * meaning, and why rewriting the eight as links was the first plan.
 *
 * They are renumbered instead. The API reference is generated from these
 * comments and a record number may not survive into a published sentence; the
 * generator lifts a bare parenthetical and nothing else, so a link in a doc
 * comment reaches a stranger who has no idea what it is. 0118 has the whole of
 * that argument, including what it costs: a bare number is one fact, one fact
 * cannot disagree with itself, and nothing here would catch a ninth `(0094)`.
 */

/**
 * A record number as it is written in prose: zero-padded, four digits, and not
 * part of a longer number.
 *
 * The lookarounds are not decoration. `0.2126 * r + 0.7152 * g + 0.0722 * b` is
 * the luminance transfer in `src/theme/separation.ts`, and a word boundary sits
 * happily either side of the `0722` inside it — the first draft of this check
 * reported two CIE constants as citations of records nobody has written.
 */
const RECORD_NUMBER = /(?<![\d.])(0\d{3})(?![\d.])/g

/**
 * A parenthetical worth reading for citations.
 *
 * `(0094)`, `(0064, 0065)` and `(see 0018)` are how this repository cites a
 * record from code, 310 times between them. Nested parentheses end the match
 * rather than being counted, which is what keeps this from reading a whole
 * expression as one citation.
 */
const PARENTHETICAL = /\(([^()\n]{0,80})\)/g

/**
 * `[0009](../../decisions/0009-primitives-receive-props-in-a-bag.md)`, wherever
 * it is written.
 */
const LINK = /\[(0\d{3})\]\(([^)\s#]*?([^)\s/#]+\.md))(?:#[^)\s]*)?\)/g

/** A block comment, which is where this repository does its explaining. */
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g

/** A line that is only a comment, so a `//` inside a URL is not one. */
const WHOLE_LINE_COMMENT = /^[ \t]*\/\/.*$/gm

/**
 * The prose of a file, which is the only place a citation can be made.
 *
 * A record is prose throughout. A TypeScript file is prose in its comments and
 * data everywhere else, and the difference matters: the tests in this directory
 * build fixtures out of string literals that link a made-up label to a made-up
 * filename, naming records that do not exist on purpose. Reading the whole file
 * would make this check fail on the tests that prove it works — the surest way
 * to have it deleted. Reading the comments alone costs nothing real, because a
 * citation is an explanation to a reader and this repository writes those in
 * comments.
 */
export const proseIn = (source: string, content: string): string => {
  if (source.endsWith(".md")) return content

  return [
    ...(content.match(BLOCK_COMMENT) ?? []),
    ...(content.match(WHOLE_LINE_COMMENT) ?? []),
  ].join("\n")
}

export type Citation =
  /** Four digits in prose, and nothing to hold them against but the set of records. */
  | { readonly kind: "bare"; readonly number: number }
  /** A label and a file, which can disagree. */
  | { readonly kind: "link"; readonly number: number; readonly opens: string }

export type CitationProblem =
  | { readonly code: "unknown-record"; readonly source: string; readonly number: number }
  | {
      readonly code: "link-number-mismatch"
      readonly source: string
      readonly number: number
      readonly opens: string
    }
  | {
      readonly code: "link-unknown-record"
      readonly source: string
      readonly number: number
      readonly opens: string
    }

const padded = (number: number): string => String(number).padStart(4, "0")

export const describeCitationProblem = (problem: CitationProblem): string => {
  switch (problem.code) {
    case "unknown-record":
      return `${problem.source} cites ${padded(problem.number)}, and there is no such record`
    case "link-number-mismatch":
      return `${problem.source} cites ${padded(problem.number)} with a link that opens ${problem.opens}`
    case "link-unknown-record":
      return `${problem.source} links ${padded(problem.number)} to ${problem.opens}, which is not a record here`
  }
}

/**
 * Every citation in a file, links first, then the bare ones.
 *
 * A link's own label is not read a second time as a bare citation, because the
 * two forms answer different questions and counting the label twice would
 * report one wrong link as two problems.
 */
export const citationsIn = (text: string): readonly Citation[] => {
  const links = [...text.matchAll(LINK)].flatMap((match): readonly Citation[] =>
    match[1] !== undefined && match[3] !== undefined
      ? [{ kind: "link", number: Number(match[1]), opens: match[3] }]
      : []
  )

  const withoutLinks = text.replace(LINK, " ")

  const bare = [...withoutLinks.matchAll(PARENTHETICAL)].flatMap((parenthetical): readonly Citation[] =>
    [...(parenthetical[1] ?? "").matchAll(RECORD_NUMBER)].flatMap((match): readonly Citation[] =>
      match[1] === undefined ? [] : [{ kind: "bare", number: Number(match[1]) }]
    )
  )

  return [...links, ...bare]
}

/**
 * What is wrong with one file's citations, given the records that exist.
 *
 * Pure, and told rather than asked: the caller hands over the record set it
 * read, so the same function answers for a directory on disk and for a fixture
 * in a test.
 */
export const checkCitations = (
  source: string,
  content: string,
  files: ReadonlySet<string>
): readonly CitationProblem[] => {
  const numbers = new Set(
    [...files].flatMap((file) => {
      const named = RECORD_FILE.exec(file)

      return named?.[1] === undefined ? [] : [Number(named[1])]
    })
  )

  return citationsIn(proseIn(source, content)).flatMap((citation): readonly CitationProblem[] => {
    if (citation.kind === "bare") {
      return numbers.has(citation.number)
        ? []
        : [{ code: "unknown-record", source, number: citation.number }]
    }

    const opened = RECORD_FILE.exec(citation.opens)

    if (opened?.[1] !== undefined && Number(opened[1]) !== citation.number) {
      return [
        {
          code: "link-number-mismatch",
          source,
          number: citation.number,
          opens: citation.opens,
        },
      ]
    }

    return files.has(citation.opens)
      ? []
      : [{ code: "link-unknown-record", source, number: citation.number, opens: citation.opens }]
  })
}
