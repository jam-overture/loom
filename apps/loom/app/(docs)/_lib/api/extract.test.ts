import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { entryPoints } from "../entry-points"
import { docsSections } from "../nav"
import {
  extractReference,
  GENERATED_FILE,
  packageRoot,
  publishedEntries,
  serializeReference,
} from "./extract"
import { MODULE_TITLES, moduleTitle } from "./groups"
import { apiAnchorFor, apiNavLabelFor, apiSlugFor } from "./model"
import { apiEntries, apiEntryAt, parseReference } from "./reference"

/**
 * What keeps a generated reference true.
 *
 * The section's whole claim is that nobody maintains it — so the thing worth
 * testing is not that the pages render, it is that **the file they render has
 * not fallen behind the package**. Adding an export to the runtime and
 * forgetting to regenerate is the exact failure a hand-written reference has,
 * and the only difference here is that this test goes red instead of a reader
 * being misled six weeks later.
 *
 * It reads `dist/`, which is where the declarations the package publishes
 * actually are. `pnpm verify` builds the runtime before it runs anything, so
 * they are there; a bare `vitest` in this package with no build is the one way
 * to see the message below, and the message says what to do about it.
 */

const built = existsSync(join(packageRoot, "dist", "index.d.ts"))

const missingBuild =
  "loom: dist/ is not built, so there are no published declarations to read. Run `pnpm build` at the repository root — `pnpm verify` already does."

describe("the published entry points", () => {
  it("are read from the package's own exports map", () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      readonly exports: Readonly<Record<string, unknown>>
    }

    expect(publishedEntries().map((entry) => entry.specifier)).toEqual(
      Object.keys(manifest.exports).map((subpath) =>
        subpath === "." ? "@loom/runtime" : `@loom/runtime${subpath.slice(1)}`
      )
    )
  })

  /**
   * The same doors in two orders, deliberately. `package.json` lists them in
   * the order the package's conditions are written; the rail lists them in the
   * order a reader should meet them, which is the order `entryPoints` is in.
   * What must never differ is *which* doors, so both checks sort first.
   */
  it("each have a page in the rail, and the rail invents none", () => {
    const section = docsSections.find((candidate) => candidate.slug === "api-reference")

    expect(section?.source).toBe("generated")
    expect(section?.pages.map((page) => page.slug).sort()).toEqual(
      publishedEntries()
        .map((entry) => apiSlugFor(entry.specifier))
        .sort()
    )
  })

  it("say the same thing in the rail and in the generated file", () => {
    expect(apiEntries.map((entry) => entry.specifier).sort()).toEqual(
      entryPoints.map((entry) => entry.specifier).sort()
    )
  })
})

describe("the generated reference", () => {
  it("is what the generator produces right now", { timeout: 120_000 }, () => {
    if (!built) throw new Error(missingBuild)

    const committed = readFileSync(GENERATED_FILE, "utf8")

    expect(
      serializeReference(extractReference()),
      "the runtime's published surface has moved. Run `pnpm --filter @loom/app docs:api` and commit the result."
    ).toEqual(committed)
  })

  it("describes every door the package opens", () => {
    expect(apiEntries).toHaveLength(publishedEntries().length)

    for (const entry of apiEntries) {
      expect(entry.groups.length, entry.specifier).toBeGreaterThan(0)
    }
  })

  it("leaves no module without exports", () => {
    for (const entry of apiEntries) {
      for (const group of entry.groups) {
        expect(group.symbols.length, `${entry.specifier} ${group.module}`).toBeGreaterThan(0)
      }
    }
  })

  it("gives every export a name, a kind and a signature", () => {
    for (const entry of apiEntries) {
      for (const group of entry.groups) {
        for (const symbol of group.symbols) {
          expect(symbol.name, `${entry.specifier} ${group.module}`).not.toBe("")
          expect(symbol.signature, `${entry.specifier} ${symbol.name}`).toContain(symbol.name)
        }
      }
    }
  })

  it("strips the modifiers a declaration file carries and a reader does not need", () => {
    for (const entry of apiEntries) {
      for (const group of entry.groups) {
        for (const symbol of group.symbols) {
          expect(symbol.signature.startsWith("export "), symbol.name).toBe(false)
          expect(symbol.signature.startsWith("declare "), symbol.name).toBe(false)
        }
      }
    }
  })

  it("collapses a schema rather than printing its type", () => {
    const schemas = apiEntries
      .flatMap((entry) => entry.groups)
      .flatMap((group) => group.symbols)
      .filter((symbol) => symbol.kind === "schema")

    expect(schemas.length).toBeGreaterThan(0)

    for (const schema of schemas) {
      expect(schema.signature.length, schema.name).toBeLessThan(120)
    }
  })

  it("gives each export on a page an anchor of its own", () => {
    for (const entry of apiEntries) {
      const anchors = entry.groups.flatMap((group) =>
        group.symbols.map((symbol) => apiAnchorFor(symbol.name))
      )

      expect(new Set(anchors).size, entry.specifier).toBe(anchors.length)
    }
  })

  it("carries the paragraph most modules open with", () => {
    const groups = apiEntries.flatMap((entry) => entry.groups)
    const described = groups.filter((group) => group.summary !== "")

    expect(described.length / groups.length).toBeGreaterThan(0.75)
  })

  it("never credits an export with the paragraph its module wrote", () => {
    for (const entry of apiEntries) {
      for (const group of entry.groups) {
        for (const symbol of group.symbols) {
          expect(symbol.summary === group.summary && symbol.summary !== "", symbol.name).toBe(false)
        }
      }
    }
  })

  it("refuses a file that is not a reference", () => {
    expect(() => parseReference({ entries: [{ specifier: 1 }] })).toThrow(/not an entry point/)
    expect(() => parseReference({})).toThrow(/no entry points/)
  })
})

describe("the headings a module gets", () => {
  it("names only modules the package publishes", () => {
    const modules = new Set(apiEntries.flatMap((entry) => entry.groups).map((group) => group.module))

    for (const module of Object.keys(MODULE_TITLES)) {
      expect(modules.has(module), `${module} has a title and no module`).toBe(true)
    }
  })

  it("falls back to the file's own name", () => {
    expect(moduleTitle("render/diagnostics")).toBe("Diagnostics")
    expect(moduleTitle("telemetry/retention")).toBe("Retention")
  })

  it("leaves a primitive's name alone", () => {
    expect(moduleTitle("primitives/loom.card")).toBe("loom.card")
  })
})

describe("where an entry point lands", () => {
  it("puts the root at the plainest slug", () => {
    expect(apiSlugFor("@loom/runtime")).toBe("runtime")
    expect(apiNavLabelFor("@loom/runtime")).toBe("runtime")
  })

  it("flattens a subpath rather than nesting it", () => {
    expect(apiSlugFor("@loom/runtime/telemetry/postgres")).toBe("telemetry-postgres")
    expect(apiNavLabelFor("@loom/runtime/telemetry/postgres")).toBe("runtime/telemetry/postgres")
  })

  it("finds the entry a page slug documents", () => {
    expect(apiEntryAt("react")?.specifier).toBe("@loom/runtime/react")
    expect(apiEntryAt("nowhere")).toBeUndefined()
  })
})
