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

/**
 * Every door this repository resolves, read off the manifest rather than
 * listed here.
 *
 * It used to be a hand-kept list of eleven files, and five of the sixteen doors
 * were not on it — `./anthropic`, `./primitives`, `./signals/postgres`,
 * `./telemetry/postgres`, and the library's compositions door the day it was
 * added. Nothing could say so, because the list was its own authority: the
 * check named *loads every entry point* was loading the ones somebody had
 * remembered. That is the defect class this repository has now recorded four
 * times — a check derived from the list it checks cannot see the list grow —
 * and the fix is the one the class asks for, which is to derive the set from
 * the thing that decides it.
 */
const manifestExports = (): Readonly<Record<string, { readonly default: string }>> =>
  (
    JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      readonly exports: Record<string, { readonly default: string }>
    }
  ).exports

const doors = (): readonly string[] => Object.keys(manifestExports())

/** The file a door opens, which is the only condition `exports` here ever carries. */
const targetOf = (door: string): string => {
  const condition = manifestExports()[door]
  if (condition === undefined) throw new Error(`no such door: ${door}`)

  return join(ROOT, condition.default)
}

/**
 * One export per door, chosen because a broken re-export chain leaves the
 * module loadable but empty.
 *
 * Not a list of doors — a lookup *for* them. A door with no entry here fails
 * the first test below rather than going unchecked, which is the whole
 * difference between this and what it replaced.
 */
const NAMED_EXPORT: Readonly<Record<string, string>> = {
  ".": "createTree",
  "./anthropic": "anthropicModelClient",
  "./react": "renderRequest",
  "./primitives": "STARTER_PRIMITIVES",
  "./primitives/compositions": "heroBand",
  "./sdk": "definePrimitive",
  "./cli": "runCli",
  "./store": "memoryTreeStore",
  "./write": "commitIntent",
  "./postgres": "postgresTreeStore",
  "./signals": "parseReaderSignalBatch",
  "./signals/broadcast": "broadcastReaderSignals",
  "./signals/postgres": "postgresReaderSignalJournal",
  "./telemetry": "episodesOf",
  "./telemetry/postgres": "postgresTelemetryJournal",
  "./testing": "sampleTree",
}

/**
 * The one door that cannot be imported the way the others are, with the reason
 * written beside it.
 *
 * An exemption is a sentence somebody has to write, so that a door is never
 * skipped because adding it was inconvenient. `./testing/contracts` has the
 * module-graph walk further down instead, which is what the imports are really
 * buying.
 */
const NOT_IMPORTABLE: Readonly<Record<string, string>> = {
  "./testing/contracts": "vitest throws on import outside a test run, by design",
}

describe("the compiled package", () => {
  it("has been built before the suite runs", () => {
    expect(existsSync(DIST)).toBe(true)
  })

  it("accounts for every door the manifest offers, and offers no door the manifest does not", () => {
    const accounted = [...Object.keys(NAMED_EXPORT), ...Object.keys(NOT_IMPORTABLE)].sort()

    expect(accounted).toEqual([...doors()].sort())
  })

  it("loads every entry point under plain Node, with its exports intact", () => {
    const script = doors()
      .filter((door) => !(door in NOT_IMPORTABLE))
      .map((door, index) => {
        const named = NAMED_EXPORT[door]
        if (named === undefined) throw new Error(`${door} has no export named in NAMED_EXPORT`)

        const file = targetOf(door)

        return (
          `import * as entry${index} from ${JSON.stringify(file)};` +
          `if (entry${index}[${JSON.stringify(named)}] === undefined) ` +
          `throw new Error(${JSON.stringify(`${door} is missing ${named}`)});`
        )
      })
      .join("\n")

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
