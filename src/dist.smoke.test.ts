import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

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

  it("keeps a node shebang on the binary, so the bin is runnable without a loader", () => {
    const binary = join(DIST, "cli", "main.js")

    expect(existsSync(binary)).toBe(true)
    expect(
      execFileSync(process.execPath, ["-e", `process.stdout.write(require("fs").readFileSync(${JSON.stringify(binary)},"utf8").split("\\n")[0])`], { encoding: "utf8" })
    ).toBe("#!/usr/bin/env node")
  })
})
