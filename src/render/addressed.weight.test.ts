import { readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * What this door makes a browser download.
 *
 * It exists for hosts that run in a visitor's browser, which is the only reason
 * it exists at all: the names it publishes were already reachable through
 * `@jam-overture/loom/react`, and that door carries the render seam and every
 * primitive's registration. A door whose whole purpose is to be light has to be
 * held to being light by something other than the paragraph saying so, because
 * the way it stops being light is one import line that no diff makes look
 * wrong (0136).
 *
 * So this walks the modules the door actually loads and fails if any of them
 * reaches a package. The broadcaster's own entry point is held to the same rule
 * by the same walk in `src/signals/`; this is deliberately a second copy rather
 * than a shared helper — the two doors are in two lanes, and a check one lane
 * can break for another is worse than nine lines written twice.
 *
 * Type-only imports are skipped, because the compiler erases them and they cost
 * a browser nothing.
 */

const ENTRY = "src/render/addressed.ts"

const VALUE_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^;]*?\sfrom\s+)?["']([^"']+)["']/gm

const valueImportsOf = (source: string): readonly string[] =>
  Array.from(source.matchAll(VALUE_IMPORT), (match) => match[1] ?? "")

const loadedBy = (entry: string): { readonly files: readonly string[]; readonly packages: readonly string[] } => {
  const files = new Set<string>()
  const packages = new Set<string>()
  const pending = [entry]

  while (pending.length > 0) {
    const file = pending.pop() as string
    if (files.has(file)) continue
    files.add(file)

    for (const specifier of valueImportsOf(readFileSync(file, "utf8"))) {
      if (!specifier.startsWith(".")) {
        packages.add(specifier)
        continue
      }
      pending.push(relative(process.cwd(), join(dirname(file), specifier.replace(/\.js$/, ".ts"))))
    }
  }

  return { files: [...files].sort(), packages: [...packages].sort() }
}

describe("what the addressed door makes a browser download", () => {
  it("reaches no package at all — in particular, not React and not the schema library", () => {
    const { packages } = loadedBy(ENTRY)

    expect(packages).toEqual([])
  })

  it("loads the attribute names and nothing else", () => {
    expect(loadedBy(ENTRY).files).toEqual(["src/render/addressed.ts", "src/render/editable.ts"])
  })

  it("is walked correctly: the same reading finds React behind the render seam", () => {
    expect(loadedBy("src/render/index.ts").packages).toContain("react")
  })
})
