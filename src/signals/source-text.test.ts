import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Is this subsystem's source readable by the tools that read source?
 *
 * `rollup.ts` keyed its tallies with a template literal holding a **literal
 * `NUL` byte** as the separator — the byte itself, written into the file. The
 * value was right and the spelling was not: one control byte makes a whole file
 * binary to `grep`, `ripgrep` and everything built on them, which report
 * `binary file matches` and print no lines. Four of them sat in the busiest
 * module in this directory, and the search that found them was looking for
 * something else.
 *
 * It costs more than a quiet `grep`. Every routine working in this repository
 * audits it by searching it, and a file that cannot be searched is one whose
 * every claim has to be taken on trust — including the claim that nothing in it
 * double-counts. `"\u0000"` is the same byte to the runtime and leaves the file
 * text, so there is nothing to trade.
 *
 * **Scoped to `src/`, which is every lane's.** It was `src/signals/` when it was
 * written, because the one other occurrence in the repository —
 * `src/runtime/repointing.ts` — belonged to `Loom daily build` and was filed in
 * `FINDINGS.md` rather than changed from here. That entry is closed, so this is
 * the widening it named: the check now covers the directory the hazard is about
 * rather than the directory its first instance happened to be in.
 *
 * Kept here, in the lane that found it, rather than moved somewhere more
 * central. Where a sweep lives says who noticed, and nothing about it needs to
 * be `src/signals/`-specific to be run from here.
 */
const LANE = "src"

const sourceFiles = (directory: string): readonly string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)

    if (statSync(path).isDirectory()) return sourceFiles(path)

    return path.endsWith(".ts") ? [path] : []
  })

describe(`${LANE} source text`, () => {
  const files = sourceFiles(LANE)

  it("has files to check, so a passing run is not an empty one", () => {
    expect(files.length).toBeGreaterThan(400)
  })

  /**
   * Read as bytes rather than as text, because decoding is what hides the
   * problem: a `NUL` read into a string is a character `cat` prints as nothing
   * and a diff shows as nothing.
   */
  it("writes no control byte into a file, so every module stays searchable", () => {
    const offenders = files.flatMap((path) => {
      const nuls = readFileSync(path).reduce((count, byte) => (byte === 0 ? count + 1 : count), 0)

      return nuls === 0 ? [] : [`${path}: ${nuls}`]
    })

    expect(offenders).toEqual([])
  })
})
