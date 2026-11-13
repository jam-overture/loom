import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { codeOnly } from "./code.js"
import { everySource, relative, ROOT, sweepBudget } from "./files.js"
import { orderDependentMocks } from "./mocks.js"

const calls = (source: string): readonly string[] =>
  orderDependentMocks(source).map((found) => `${found.line}: ${found.call}`)

describe("a hoisted mock", () => {
  it("is reported wherever it appears", () => {
    expect(calls(`import { vi } from "vitest"\nvi.mock("./serving")\n`)).toEqual([`2: vi.mock`])
  })

  it("is reported with the reason, so the branch that wrote it is told the remedy", () => {
    expect(orderDependentMocks(`vi.mock("./x")`)[0]?.reason).toContain("vi.doMock")
  })

  it("is reported even where the file also resets modules, because hoisting beats both", () => {
    expect(calls(`vi.resetModules()\nvi.mock("./x")\n`)).toEqual([`2: vi.mock`])
  })
})

describe("a deferred mock", () => {
  /** `(portal)/_lib/write.test.ts`, which is the pattern and explains itself. */
  it("is allowed where the registry is reset above it", () => {
    const source = [`vi.resetModules()`, `vi.doMock("./database", () => ({}))`, `await import("./write")`].join("\n")

    expect(calls(source)).toEqual([])
  })

  it("is reported where nothing resets the registry", () => {
    expect(calls(`vi.doMock("./database", () => ({}))\n`)).toEqual([`1: vi.doMock`])
  })

  /**
   * Below is not above. A reset after the mock leaves whatever the worker had
   * already loaded in place for the import that matters.
   */
  it("is reported where the reset comes after it", () => {
    expect(calls(`vi.doMock("./database")\nvi.resetModules()\n`)).toEqual([`1: vi.doMock`])
  })
})

describe("what is not one of these at all", () => {
  it("ignores the two calls in serving.test.ts' docblock, which is the file that found this", () => {
    const source = [
      `/**`,
      ` * | \`vi.mock("next/headers", …)\`, as it was | 12 of 12 render cases fail |`,
      ` * | \`vi.mock("./serving", …)\` | 4 still fail |`,
      ` */`,
      `export const servedOrigin = () => "x"`,
    ].join("\n")

    expect(calls(source)).toEqual([])
  })

  it("ignores vi.mocked, which types a mock rather than installing one", () => {
    expect(calls(`const typed = vi.mocked(thing)\n`)).toEqual([])
  })

  it("ignores a method of something else that happens to be called mock", () => {
    expect(calls(`harness.vi.mock("./x")\n`)).toEqual([])
  })
})

/**
 * The premise under the exclusion, asserted rather than trusted.
 *
 * `*.test.tsx` is left out of the sweep because those files run isolated, and
 * nine of them install module mocks that are safe only for that reason. That
 * isolation is one word in each of two configuration files, and it is set there
 * for Testing Library's sake rather than for this rule&#39;s — so nothing would
 * connect a change to it with nine files quietly becoming order-dependent.
 */
describe("the isolation the .test.tsx exclusion rests on", () => {
  const configs = ["vitest.config.ts", "apps/loom/vitest.config.ts"] as const

  it.each(configs)("is still set in %s", (config) => {
    const source = readFileSync(join(ROOT, config), "utf8")

    expect(codeOnly(source)).toContain("threads: { isolate: true }")
  })
})

/**
 * The sweep.
 *
 * `*.test.ts` only, which is the half of each suite that runs in a shared
 * worker. `*.test.tsx` is excluded with a reason `mocks.ts` states: those run
 * isolated because Testing Library binds to a document, nine of them install
 * module mocks, and none can hit this.
 */
const sharedWorkerSuites = (): readonly string[] =>
  everySource().filter((path) => path.endsWith(".test.ts"))

const suites = sharedWorkerSuites()

/**
 * The budget is on the block rather than on the two sweeps inside it.
 *
 * This file was the one whole-repository sweep 0375 did not reach, and the
 * default 5,000 ms it was left on turned the merge gate red under load on a
 * branch that added one source to the 651 it reads — about half a millisecond
 * of work. On an idle container the two sweeps below are 388 ms and 310 ms.
 *
 * Naming it here rather than on each `it` is what stops the next sweep written
 * into this block from being the fourth instance: Vitest hands a block's
 * timeout to every test inside it, so a sweep added below inherits the budget
 * without having to ask for it. `tools/sources/budgets.ts` catches the other
 * half, a file that names no budget at all.
 */
describe("every test file that runs in a shared worker", { timeout: sweepBudget(suites) }, () => {
  it("is found at all, so an empty sweep cannot pass silently", () => {
    expect(suites.length).toBeGreaterThanOrEqual(500)
  })

  it("installs no mock whose effect depends on what ran before it", () => {
    const found = suites.flatMap((path) =>
      orderDependentMocks(readFileSync(path, "utf8")).map(
        (mock) => `${relative(path)}:${mock.line}: ${mock.call} — ${mock.reason}`
      )
    )

    expect(found).toEqual([])
  })

  /**
   * The allowance is exercised by the repository rather than only by the
   * fixtures above. If this ever reads zero, the rule has become a rule about
   * nothing and the sweep above would pass whatever it was given.
   */
  it("contains at least one file using the pattern the rule allows", () => {
    const deferring = suites.filter((path) => {
      const code = codeOnly(readFileSync(path, "utf8"))

      return code.includes("vi.doMock(") && code.includes("vi.resetModules()")
    })

    expect(deferring.map((path) => relative(path))).toEqual([
      "apps/loom/app/(portal)/_lib/write.test.ts",
    ])
  })
})
