import { readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { gzipSync } from "node:zlib"

import { buildSync } from "esbuild"
import { describe, expect, it } from "vitest"

/**
 * The broadcaster runs in a visitor's browser, on every page that asks for
 * signals, so what it imports is what every such page downloads.
 *
 * It was 66 KB minified when it first shipped, and 59 KB of that was the schema
 * library, reached through one innocent import of an id schema to test two
 * attribute values. It was 4.8 KB when that was fixed (0136). Nothing about the
 * mistake is visible in a diff — it is one import line, and every test stays
 * green — so this walks the modules `broadcast.ts` actually loads and fails if
 * any of them reaches `zod`.
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

/**
 * The second half of rule 4, which until now was held by hand.
 *
 * *Performance is not traded for measurement* has had two halves. The import
 * graph is walked above and has been enforced since 0136. **The size was a
 * sentence in `docs/signals.md` and a figure in each report**, re-measured by
 * whoever remembered to — and on 2 November that figure was found to be a third
 * out of date, which is the same failure 0218 recorded about an exported name:
 * a browser cost that moves is invisible in a diff.
 *
 * So the bundle is built and weighed here. The ceiling has headroom and is not
 * the figure of the day: what it is for is to make a step up in what every
 * reader downloads **a line somebody had to write**, with the number in it, in
 * the diff that spends it. A unit that needs more than this says so out loud
 * and raises it on purpose.
 */
describe("what the broadcaster weighs", () => {
  const bundled = (): Uint8Array => {
    const built = buildSync({ entryPoints: [ENTRY], bundle: true, minify: true, format: "esm", write: false })
    const [output] = built.outputFiles

    if (output === undefined) throw new Error(`nothing was bundled from ${ENTRY}`)

    return output.contents
  }

  /**
   * 8,000 bytes minified and 3,600 over the wire. It was 4.8 KB minified when
   * 0136 split this entry point out, 6,513 for most of October, and 7,543 once
   * a broadcast could follow a page across a client-side navigation.
   *
   * **Both, because they do not move together.** The minified figure is what a
   * reader's browser parses and the gzipped one is what the network carries, and
   * the gap between them is how repetitive the code is — a change that adds a
   * paragraph of the same shape as its neighbours costs almost nothing over the
   * wire and still has to be parsed.
   */
  const CEILINGS = { minified: 8_000, gzipped: 3_600 } as const

  it("stays inside the ceilings every page that asks for signals pays", () => {
    const built = bundled()
    const weight = { minified: built.byteLength, gzipped: gzipSync(built, { level: 9 }).byteLength }

    expect(weight.minified, `minified: ${weight.minified} bytes`).toBeLessThanOrEqual(CEILINGS.minified)
    expect(weight.gzipped, `gzipped: ${weight.gzipped} bytes`).toBeLessThanOrEqual(CEILINGS.gzipped)
  })
})
