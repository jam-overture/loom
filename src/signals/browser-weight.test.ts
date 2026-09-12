import { readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The broadcaster runs in a visitor's browser, on every page that asks for
 * signals, so what it imports is what every such page downloads.
 *
 * It was 66 KB minified when it first shipped, and 59 KB of that was the schema
 * library, reached through one innocent import of an id schema to test two
 * attribute values. It is 4.8 KB now (0136). Nothing about the mistake is
 * visible in a diff — it is one import line, and every test stays green — so
 * this walks the modules `broadcast.ts` actually loads and fails if any of them
 * reaches `zod`.
 *
 * Type-only imports are skipped, because the compiler erases them and they
 * cost a browser nothing.
 */

const ENTRY = "src/signals/broadcast.ts"

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

describe("what the broadcaster makes a browser download", () => {
  it("reaches no package at all — in particular, not the schema library", () => {
    const { files, packages } = loadedBy(ENTRY)

    expect(files.length).toBeGreaterThan(1)
    expect(packages).toEqual([])
  })

  it("is walked correctly: the same reading finds zod behind the schema module", () => {
    expect(loadedBy("src/signals/signal.ts").packages).toContain("zod")
  })
})
