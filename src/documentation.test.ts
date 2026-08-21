import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Do the package's own words survive the trip to a reader?
 *
 * The API reference on the documentation site is generated from the doc comments
 * in this directory, which is the property that makes it trustworthy: nobody
 * paraphrases the runtime, so the site cannot drift from it. The cost is that a
 * comment written for whoever is reading the code is also a comment published to
 * a stranger, and two habits that are harmless in a source file are not harmless
 * on a page.
 *
 * This asserts both, over `src/` rather than over `dist/`, because both facts
 * are visible only in the source.
 *
 * **`src/primitives/` is deliberately out of scope.** It is another routine's
 * lane and it currently fails both checks in one file and six comments; the
 * gaps are filed in `FINDINGS.md` for that lane, and deleting its entry below
 * is the one-line change that follows them being closed.
 */
const LANE = "src"

/**
 * What this check does not cover, and why each one is out.
 *
 * `src/primitives/` is another lane's, and its gaps are filed for its owner.
 *
 * `src/cli/scaffold-fixture/` is not source at all. It is the exact output of
 * `loom init`, committed so that a change to what a new project starts from
 * fails a test rather than passing silently — `scaffold-fixture.test.ts` asserts
 * it byte-for-byte against the template. A paragraph added here would either
 * break that test or become a sentence every scaffolded project carries about
 * Loom's own fixtures, and neither is what a blurb is for.
 */
const EXCLUDED = ["src/primitives", "src/cli/scaffold-fixture"]

const sourceFiles = (directory: string): readonly string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)

    if (statSync(path).isDirectory()) return sourceFiles(path)

    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : []
  })

const inScope = (path: string): boolean =>
  !EXCLUDED.some((excluded) => relative(excluded, path).startsWith("..") === false)

const FILES = sourceFiles(LANE)
  .map((path) => relative(process.cwd(), path))
  .filter(inScope)
  .sort()

/**
 * A comment ends, an empty line follows: the mark of a paragraph about the file.
 *
 * The generator draws exactly this distinction, and it has to draw it here
 * rather than in `dist/` because declaration emit drops the empty line — after
 * which a module's opening paragraph is indistinguishable from documentation
 * for whatever export happens to be first.
 */
const DETACHED = /^[ \t]*\r?\n[ \t]*\r?\n/

/** A decision record's number, as it is written everywhere in this repository. */
const DECISION_NUMBER = /\b0\d{3}\b/

/**
 * The one shape a record number may take in a doc comment: a parenthetical.
 *
 * `(0014)`, `(0053, 0055)`, `(see 0012)` — a footnote, and the sentence reads
 * the same with it lifted out, which is what the site does with it. Anything
 * else makes the number part of the grammar, and there is then nothing to lift:
 * *"0049's three theme ids"* cannot be rewritten by any rule into a sentence
 * addressed to somebody who has not read 0049, so the site withholds it and the
 * export renders with no summary at all.
 *
 * This is deliberately narrower than the pattern the generator strips, which
 * also accepts a trailing attribution clause. Narrower is the safe direction:
 * everything this permits, the generator lifts. Were it wider, a comment could
 * pass here and still vanish from the site, which is the failure the check
 * exists to prevent.
 */
const PARENTHETICAL = /\s*\((?:see\s+)?0\d{3}(?:\s*(?:,|and)\s*0\d{3})*\)/g

const DOC_COMMENT = /^([ \t]*)\/\*\*[\s\S]*?\*\//gm

const undecorate = (comment: string): string =>
  comment
    .replace(/^[ \t]*\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^[ \t]*\* ?/, ""))
    .join("\n")
    .trim()

const firstParagraph = (text: string): string =>
  (text.split(/\n\s*\n/)[0] ?? "").replace(/\s+/g, " ").trim()

/**
 * What a stranger actually reads out of one comment.
 *
 * The two channels differ, and so does how much of the comment reaches them. A
 * comment at the left margin documents a module or a top-level export, and only
 * its **first paragraph** is lifted as a summary. An indented comment sits
 * inside a declaration, and a declaration is published whole — so every
 * paragraph of it lands in a code block on the page.
 */
const published = (comment: string, indent: string): string => {
  const text = undecorate(comment)

  return indent === "" ? firstParagraph(text) : text
}

const citationsLifted = (text: string): string =>
  text.replace(PARENTHETICAL, "").replace(/\s+([.,;:])/g, "$1").trim()

type Offence = {
  readonly file: string
  readonly text: string
}

const grammaticalNumbers = (file: string, source: string): readonly Offence[] =>
  [...source.matchAll(DOC_COMMENT)].flatMap((match) => {
    const text = published(match[0], match[1] ?? "")

    if (!DECISION_NUMBER.test(text)) return []

    return DECISION_NUMBER.test(citationsLifted(text)) ? [{ file, text }] : []
  })

const opensWithAParagraph = (source: string): boolean => {
  const start = source.indexOf("/**")
  const end = source.indexOf("*/", start)

  if (start === -1 || end === -1) return false

  return DETACHED.test(source.slice(end + 2))
}

describe("the doc comments the reference is generated from", () => {
  it("covers the whole lane, so a new file cannot slip past by being new", () => {
    expect(FILES.length).toBeGreaterThan(100)
    expect(FILES.every((file) => file.startsWith(`${LANE}/`))).toBe(true)
    expect(FILES.some((file) => file.startsWith("src/primitives/"))).toBe(false)
  })

  /**
   * A module without one is not undocumented — the reference falls back to
   * nothing, and every export under that heading renders as a bare name and a
   * signature, however well each one is commented individually. One paragraph
   * is the cheapest documentation in the repository per export it reaches.
   */
  it("opens every module with a paragraph about the module", () => {
    const missing = FILES.filter((file) => !opensWithAParagraph(readFileSync(file, "utf8")))

    expect(missing).toEqual([])
  })

  /**
   * The maintainer's rule, on the API reference: *"I don't think docs should
   * reference internal decisions (like "(0007)"). The casual reader would not
   * know what those are."* The site enforces the half it can — a number never
   * reaches a page — and this enforces the half it cannot, which is that the
   * sentence still does.
   */
  it("never makes a decision-record number part of a published sentence", () => {
    const offences = FILES.flatMap((file) => grammaticalNumbers(file, readFileSync(file, "utf8")))

    expect(offences).toEqual([])
  })
})
