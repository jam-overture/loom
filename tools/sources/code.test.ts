import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { codeOnly, scan, unterminated } from "./code.js"
import { everySource, relative, sweepBudget } from "./files.js"

describe("what is blanked", () => {
  it("blanks a comment's body and keeps the lines around it", () => {
    expect(codeOnly("const a = 1\n/* said; here */\nconst b = 2")).toBe(
      "const a = 1\n                \nconst b = 2"
    )
  })

  it("blanks a line comment and keeps its newline", () => {
    expect(codeOnly("const a = 1 // said; here\nconst b = 2")).toBe(
      "const a = 1              \nconst b = 2"
    )
  })

  it("blanks a string's content and keeps its quotes", () => {
    expect(codeOnly(`const a = "said; here"`)).toBe(`const a = "          "`)
  })

  it("blanks a template literal's text and keeps the code in its holes", () => {
    expect(codeOnly("const a = `one; ${two} three;`")).toBe("const a = `     ${two}       `")
  })

  it("follows a template inside a hole of a template", () => {
    expect(codeOnly("const a = `x; ${`y; ${z}`} w;`")).toBe("const a = `   ${`   ${z}`}   `")
  })

  it("blanks a regular expression's body", () => {
    expect(codeOnly("const a = /said;/.test(b)")).toBe("const a = /     /.test(b)")
  })

  /** A `/` with something to its left divides, and division blanks nothing. */
  it("reads a division as code", () => {
    expect(codeOnly("const a = total / count")).toBe("const a = total / count")
  })

  it("does not let a quote inside a comment open a string", () => {
    expect(codeOnly("/* don't */\nconst a = 1")).toBe("           \nconst a = 1")
  })

  /**
   * There is no JSX mode, so an apostrophe in prose does open a string. The
   * newline closes it, which is what keeps that mistake to one line instead of
   * blanking the rest of the file — and blanking a line can only hide a
   * construct from a check, never invent one.
   */
  it("ends a string at a newline rather than running on", () => {
    expect(codeOnly("<p>don't</p>\nconst a = 1;")).toBe("<p>don'     \nconst a = 1;")
  })

  /**
   * The longest keyword that can precede a regular expression, at the one
   * position where what decides it is the furthest from the slash.
   */
  it("reads a regex after the longest keyword that can precede one", () => {
    expect(codeOnly("a instanceof /said;/")).toBe("a instanceof /     /")
  })

  it("does not read a regex after a word that merely ends in a keyword", () => {
    expect(codeOnly("const a = xinstanceof / 2")).toBe("const a = xinstanceof / 2")
  })

  /** Whatever a comment blanked is whitespace, and the keyword is behind it. */
  it("looks past what a comment blanked to find the keyword", () => {
    expect(codeOnly("return /* x */ /said;/")).toBe("return         /     /")
  })

  /**
   * What decides a slash is the code just before it, so a file's length cannot
   * change the answer — and reading only that much is what keeps the scan
   * linear in the file rather than in its length times its number of slashes.
   */
  it("decides a slash from the code before it, however long the file is", () => {
    const padded = `${"// filler\n".repeat(500)}return /said;/.test(b)`

    expect(codeOnly(padded).endsWith("return /     /.test(b)")).toBe(true)
  })

  it("keeps every position, so a line number is the file's line number", () => {
    const source = readFileSync(new URL("./code.ts", import.meta.url), "utf8")

    expect(codeOnly(source)).toHaveLength(source.length)
    expect(codeOnly(source).split("\n")).toHaveLength(source.split("\n").length)
  })
})

describe("losing its place", () => {
  it("says so when a block comment is never closed", () => {
    expect(unterminated("const a = 1\n/* and then nothing")).toBe(true)
  })

  it("says so when a template literal is never closed", () => {
    expect(unterminated("const a = `and then nothing")).toBe(true)
  })

  it("does not say so for a file that balances", () => {
    expect(unterminated("const a = `x` /* y */ // z\n")).toBe(false)
  })

  /**
   * An unbalanced `}` must not pop the outermost frame, or everything after it
   * would be read as the inside of a template literal.
   */
  it("survives a brace that closes nothing", () => {
    expect(scan("}\nconst a = 1;").mode.kind).toBe("code")
  })
})

/**
 * The precondition the two sweeps in this directory rest on.
 *
 * Both of them trust that what they are reading is this repository's code. A
 * scanner that has lost its place is reading something else, and the cheapest
 * evidence that it has not is that every source here ends where code ends.
 */
describe("every source in this repository", () => {
  const sources = everySource()

  it("is found at all, so an empty sweep cannot pass silently", () => {
    expect(sources.length).toBeGreaterThanOrEqual(1800)
  })

  it("lexes to the end", { timeout: sweepBudget(sources) }, () => {
    const lost = sources
      .filter((path) => unterminated(readFileSync(path, "utf8")))
      .map((path) => relative(path))

    expect(lost).toEqual([])
  })
})
