import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Does the compiled package actually load under plain Node?
 *
 * Every other test in this suite runs against `src/` through Vitest, which
 * resolves relative specifiers itself. That is the right thing to test — but it
 * means nothing here would notice if the emitted output were unloadable, and
 * unloadable output is exactly the failure this package has had twice: Node's
 * type stripping on day 8, and a bundler on day 11, both from `.js` specifiers
 * pointing at `.ts` files.
 *
 * So this spawns a real `node` and imports every entry point the way a consumer
 * would. It is slow and it is the only check that would have caught either.
 *
 * `pnpm verify` builds before it tests, so `dist` is present by the time this
 * runs. If it is missing the test says so rather than skipping: a smoke test that
 * quietly opts out is the shape of test that is passing on the day it matters.
 */
const ROOT = process.cwd()
const DIST = join(ROOT, "dist")

/** One export per entry point, chosen because a broken re-export chain leaves the module loadable but empty. */
const ENTRY_POINTS: readonly (readonly [string, string])[] = [
  ["index.js", "createTree"],
  ["render/index.js", "renderRequest"],
  ["sdk/index.js", "definePrimitive"],
  ["cli/index.js", "runCli"],
  ["store/index.js", "memoryTreeStore"],
  ["write/index.js", "commitIntent"],
  ["store/postgres.js", "postgresTreeStore"],
  ["telemetry/index.js", "episodesOf"],
  ["testing/index.js", "sampleTree"],
]

describe("the compiled package", () => {
  it("has been built before the suite runs", () => {
    expect(existsSync(DIST)).toBe(true)
  })

  it("loads every entry point under plain Node, with its exports intact", () => {
    const script = ENTRY_POINTS.map(
      ([file, named], index) =>
        `import * as entry${index} from ${JSON.stringify(join(DIST, file))};` +
        `if (typeof entry${index}[${JSON.stringify(named)}] !== "function") ` +
        `throw new Error(${JSON.stringify(`${file} is missing ${named}`)});`
    ).join("\n")

    const run = (): string =>
      execFileSync(process.execPath, ["--input-type=module", "-e", `${script}\nconsole.log("ok")`], {
        encoding: "utf8",
      })

    expect(run().trim()).toBe("ok")
  })

  /**
   * The whole behaviour seam rests on this one line surviving compilation. A
   * `"use client"` that TypeScript moved below the imports, or dropped, is a
   * boundary a bundler never opens — after which a control is asked to run a
   * click handler in a server component, and the failure lands in somebody
   * else's application build rather than here.
   *
   * Read off the directory rather than named one by one, so that the run which
   * adds the third control cannot forget to add the assertion with it. The
   * emptiness check is what stops that generalisation from quietly asserting
   * nothing if the files are ever named differently.
   */
  it("keeps the client directive at the top of every control that needs one", () => {
    const controls = readdirSync(join(DIST, "render")).filter(
      (file) => file.startsWith("behaviour-") && file.endsWith(".js")
    )

    expect(controls).not.toHaveLength(0)

    for (const file of controls) {
      expect(readFileSync(join(DIST, "render", file), "utf8").split("\n")[0]).toBe('"use client";')
    }
  })

  /**
   * `testing/contracts.js` is the one entry point that cannot be imported the
   * way the others are, and the reason is the reason it is a separate entry
   * point: `vitest` throws on import outside a test run, by design. So the
   * check it can still have is the one the others are really buying — that
   * every relative specifier the emitted files name is a file that exists,
   * which is both failures this suite was written for (`.js` pointing at a
   * `.ts`, a re-export chain broken by a rename).
   */
  it("emits a resolvable module graph for the contracts entry point", () => {
    const relativeSpecifiersIn = (file: string): readonly string[] =>
      [...readFileSync(file, "utf8").matchAll(/from\s+"(\.[^"]+)"/g)].map(
        (match) => match[1] as string
      )

    const seen = new Set<string>()
    const pending = [join(DIST, "testing", "contracts.js")]
    const missing: string[] = []

    while (pending.length > 0) {
      const file = pending.pop() as string
      if (seen.has(file)) continue
      seen.add(file)

      if (!existsSync(file)) {
        missing.push(file)
        continue
      }

      for (const specifier of relativeSpecifiersIn(file)) {
        pending.push(join(dirname(file), specifier))
      }
    }

    expect(missing).toEqual([])
    expect(seen.size).toBeGreaterThan(1)
  })

  it("keeps a node shebang on the binary, so the bin is runnable without a loader", () => {
    const binary = join(DIST, "cli", "main.js")

    expect(existsSync(binary)).toBe(true)
    expect(
      execFileSync(process.execPath, ["-e", `process.stdout.write(require("fs").readFileSync(${JSON.stringify(binary)},"utf8").split("\\n")[0])`], { encoding: "utf8" })
    ).toBe("#!/usr/bin/env node")
  })
})
