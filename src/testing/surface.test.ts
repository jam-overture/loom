import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import * as contracts from "./contracts.js"
import * as testing from "./index.js"

/**
 * The two things a published entry point promises that a type cannot state.
 *
 * `@jam-overture/loom/testing` exists so the course can load `sampleTree()` in a
 * reader's browser and a host can register a primitive without writing its own
 * fixture (0104). Both of those break the moment a test framework appears
 * anywhere in the import graph — not loudly, but as a resolution failure in
 * somebody else's bundler, a long way from here. The split into two entry
 * points is what prevents it, and a split is only worth anything while
 * something checks that nothing has crossed it.
 *
 * Read off the import graph rather than off a list of modules, because the way
 * this fails is not somebody adding `import { it } from "vitest"` to
 * `fixtures.ts` — it is somebody adding a helper two modules down that does.
 */

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * Every specifier a module names, relative and bare alike.
 *
 * Three patterns rather than one that spans lines, because a single
 * `[\s\S]*?from "…"` will happily start at an `import` and end at a `from "…"`
 * inside a string literal three functions later — which it did, and reported
 * two sentences of a diagnostic's prose as dependencies of the fixtures. A
 * braced list is bounded by its own brace and a one-line import by its own
 * line, so neither can run away.
 */
const specifiersIn = (source: string): readonly string[] =>
  [
    /^\s*(?:import|export)\s*(?:type\s*)?\{[^}]*\}\s*from\s+"([^"]+)"/gm,
    /^\s*(?:import|export)\s+(?:type\s+)?[^{\n]*?\bfrom\s+"([^"]+)"/gm,
    /^\s*import\s+"([^"]+)"/gm,
  ].flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1] as string))

const moduleGraphFrom = (entry: string): ReadonlyMap<string, readonly string[]> => {
  const graph = new Map<string, readonly string[]>()
  const pending = [entry]

  while (pending.length > 0) {
    const file = pending.pop() as string
    if (graph.has(file)) continue

    const specifiers = specifiersIn(readFileSync(file, "utf8"))
    graph.set(file, specifiers)

    for (const specifier of specifiers) {
      if (!specifier.startsWith(".")) continue
      pending.push(resolve(dirname(file), specifier.replace(/\.js$/, ".ts")))
    }
  }

  return graph
}

const bareSpecifiersReachableFrom = (entry: string): ReadonlySet<string> => {
  const bare = new Set<string>()

  for (const specifiers of moduleGraphFrom(entry).values()) {
    for (const specifier of specifiers) {
      if (!specifier.startsWith(".")) bare.add(specifier)
    }
  }

  return bare
}

describe("the published testing surface", () => {
  it("reaches no test framework from the fixtures entry point", () => {
    const reachable = bareSpecifiersReachableFrom(join(HERE, "index.ts"))

    expect(reachable).not.toContain("vitest")
    expect([...reachable].filter((specifier) => specifier.includes("vitest"))).toEqual([])
  })

  /**
   * The counterpart, and it is here so the check above cannot pass by the graph
   * walker quietly finding nothing. If the walker broke, this would go green
   * against an empty set too — and then the assertion that matters would be
   * asserting the absence of a module it never looked for.
   */
  it("reaches vitest from the contracts entry point, where it belongs", () => {
    expect(bareSpecifiersReachableFrom(join(HERE, "contracts.ts"))).toContain("vitest")
  })

  it("declares every dependency the fixtures reach as one the package already has", () => {
    const manifest = JSON.parse(
      readFileSync(join(HERE, "..", "..", "package.json"), "utf8")
    ) as {
      dependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }

    const declared = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ])

    const undeclared = [...bareSpecifiersReachableFrom(join(HERE, "index.ts"))].filter(
      (specifier) => !specifier.startsWith("node:") && !declared.has(specifier)
    )

    expect(undeclared).toEqual([])
  })

  /**
   * A module in this directory is internal until a line in an entry point says
   * otherwise (0104), so a new one is not a failure. Exporting nothing from an
   * entry point is, because that is what a broken re-export chain looks like
   * from outside: the module loads and is empty.
   */
  it("publishes the fixture every lesson opens with, and the three contract suites", () => {
    expect(typeof testing.sampleTree).toBe("function")
    expect(typeof testing.formTree).toBe("function")
    expect(typeof testing.testRegistry).toBe("function")

    expect(typeof contracts.describeTreeStoreContract).toBe("function")
    expect(typeof contracts.describeHoldStoreContract).toBe("function")
    expect(typeof contracts.describeTelemetryJournalContract).toBe("function")
  })
})
