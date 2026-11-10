import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { everySource, relative, sweepBudget } from "./files.js"
import { semicolonTerminated } from "./semicolons.js"

const lines = (source: string): readonly string[] =>
  semicolonTerminated(source).map((found) => `${found.line}: ${found.text}`)

describe("a statement that ends in a semicolon", () => {
  it("is reported, with the line and the text", () => {
    expect(lines("const a = 1\nconst b = 2;\n")).toEqual([`2: const b = 2;`])
  })

  it("is reported once per line rather than once per file", () => {
    expect(lines(`const a = 1;\nconst b = 2;\n`)).toHaveLength(2)
  })
})

describe("what is not a statement", () => {
  it("ignores a semicolon in prose, which is where most of them are", () => {
    const source = `/**\n * The journal is what is written;\n * the rest is derived.\n */\n`

    expect(lines(source)).toEqual([])
  })

  it("ignores CSS inside a template literal", () => {
    const source = "const css = `\n  --loom-ink: #fff;\n  display: grid;\n`\n"

    expect(lines(source)).toEqual([])
  })

  it("ignores SQL inside a template literal", () => {
    expect(lines("await sql`alter table pages add column audience text;`\n")).toEqual([])
  })

  /** `&hellip;`, four times, in the lessons components. */
  it("ignores an HTML entity at the end of JSX text", () => {
    expect(lines("<p>Reading what you have done so far&hellip;</p>\n")).toEqual([])
    expect(lines("<p>Loading&#8230;</p>\n")).toEqual([])
  })
})

describe("a for header", () => {
  /** `ancestryOf` in `src/signals/broadcast.ts`, which is the only one. */
  it("may put each clause on its own line", () => {
    const source = [
      "for (",
      "  let above = element.parentElement;",
      "  above !== null && root.contains(above);",
      "  above = above.parentElement",
      ") {",
      "}",
    ].join("\n")

    expect(lines(source)).toEqual([])
  })

  it("is exempt for its own extent and not for the lines after it", () => {
    const source = ["for (", "  let i = 0;", "  i < 3;", "  i += 1", ") {", "  go();", "}"].join(
      "\n"
    )

    expect(lines(source)).toEqual([`6: go();`])
  })

  it("does not exempt a word that merely ends in for", () => {
    expect(lines("const asked = waitFor(thing);\n")).toEqual([`1: const asked = waitFor(thing);`])
  })
})

/**
 * The thing this check exists for, as it would actually arrive.
 *
 * Not a semicolon somebody typed — a file a formatter rewrote. One run's worth
 * of `npx prettier --write` turns a reviewable diff into a whole-file one, and
 * every line it adds a terminator to is a line this reports.
 */
describe("a file a formatter has rewritten", () => {
  it("is reported line by line rather than as one complaint", () => {
    const reformatted = [
      `import { join } from "node:path";`,
      ``,
      `export const pathTo = (name) => {`,
      `  const here = join("a", name);`,
      `  return here;`,
      `};`,
    ].join("\n")

    expect(semicolonTerminated(reformatted).map((found) => found.line)).toEqual([1, 4, 5, 6])
  })
})

/**
 * The sweep, and the only check here that would have caught the instance this
 * module was written for.
 *
 * It reads every source in the repository, including this directory's own: the
 * fixtures above are inside string and template literals, which `codeOnly`
 * blanks, so a file of examples of the hazard is invisible to the check that
 * finds it. That is asserted here rather than arranged with an exemption.
 */
describe("every source in this repository", () => {
  const sources = everySource()

  it("is found at all, so an empty sweep cannot pass silently", () => {
    expect(sources.length).toBeGreaterThanOrEqual(1800)
  })

  it("ends no statement in a semicolon", { timeout: sweepBudget(sources) }, () => {
    const found = sources.flatMap((path) =>
      semicolonTerminated(readFileSync(path, "utf8")).map(
        (line) => `${relative(path)}:${line.line}: ${line.text}`
      )
    )

    expect(found).toEqual([])
  })
})
