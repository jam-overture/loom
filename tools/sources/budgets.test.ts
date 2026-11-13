import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { sweepsEverySource, sweepsWithoutBudget } from "./budgets.js"
import { everySource, relative, sweepBudget } from "./files.js"

describe("a suite that reads every source", () => {
  it("is reported where it names no budget", () => {
    const source = [`import { everySource, relative } from "./files.js"`, `const sources = everySource()`].join("\n")

    expect(sweepsWithoutBudget(source)).toBe(true)
  })

  it("is allowed where it names one", () => {
    const source = [
      `import { everySource, sweepBudget } from "./files.js"`,
      `const sources = everySource()`,
      `it("sweeps", { timeout: sweepBudget(sources) }, () => {})`,
    ].join("\n")

    expect(sweepsWithoutBudget(source)).toBe(false)
  })

  it("is found wherever it sits in the clause", () => {
    expect(sweepsEverySource(`import { ROOT, relative, everySource } from "./files.js"`)).toBe(true)
  })

  it("is found in a clause broken over lines, which is how the long ones are written", () => {
    const source = [`import {`, `  everySource,`, `  relative,`, `} from "./files.js"`].join("\n")

    expect(sweepsEverySource(source)).toBe(true)
  })
})

describe("what is not one of these at all", () => {
  /**
   * `apps/loom/app/(portal)/every-screen.test.ts`, which is the file that makes
   * the distinction worth drawing: one route group, read while the suite is
   * collected rather than inside a test, and another lane's to budget.
   */
  it("ignores a lane's own everySource, which is declared rather than imported", () => {
    const source = [
      `const everySource = (directory: string): readonly string[] => readdirSync(directory)`,
      `const sources = everySource(GROUP)`,
    ].join("\n")

    expect(sweepsEverySource(source)).toBe(false)
  })

  it("ignores a docblock that quotes the import, because this directory's docblocks do", () => {
    const source = [`/**`, ` * import { everySource } from "./files.js"`, ` */`, `export const sweep = 1`].join("\n")

    expect(sweepsEverySource(source)).toBe(false)
  })

  it("ignores a name that merely begins the same way", () => {
    expect(sweepsEverySource(`import { everySourceUnder } from "./files.js"`)).toBe(false)
  })
})

/**
 * The sweep, which is one of the suites it sweeps.
 *
 * Its budget is on the `describe` rather than on each `it`, which is the half of
 * the remedy a check cannot enforce: Vitest hands a block's timeout to every
 * test inside it, so a sweep written into this block later inherits the budget
 * instead of having to remember it.
 */
const suites = everySource().filter((path) => path.endsWith(".test.ts"))

describe("every suite in this repository", { timeout: sweepBudget(suites) }, () => {
  it("is found at all, so an empty sweep cannot pass silently", () => {
    expect(suites.length).toBeGreaterThanOrEqual(500)
  })

  it("names a budget wherever it reads every source", () => {
    const found = suites
      .filter((path) => sweepsWithoutBudget(readFileSync(path, "utf8")))
      .map((path) => relative(path))

    expect(found).toEqual([])
  })

  /**
   * The rule's scope, named rather than counted. If this ever reads empty the
   * rule has become a rule about nothing and the sweep above would pass
   * whatever it was given; a new whole-repository sweep belongs on this list.
   */
  it("reads every source in five places and this one", () => {
    const sweeping = suites
      .filter((path) => sweepsEverySource(readFileSync(path, "utf8")))
      .map((path) => relative(path))

    expect([...sweeping].sort()).toEqual([
      "tools/sources/budgets.test.ts",
      "tools/sources/code.test.ts",
      "tools/sources/deployment.test.ts",
      "tools/sources/files.test.ts",
      "tools/sources/mocks.test.ts",
      "tools/sources/semicolons.test.ts",
    ])
  })
})
