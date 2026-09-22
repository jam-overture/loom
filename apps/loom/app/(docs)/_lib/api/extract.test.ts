import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { entryPoints } from "../entry-points"
import { docsSections } from "../nav"
import {
  DECISION_NUMBER,
  extractReference,
  GENERATED_FILE,
  packageRoot,
  publishedEntries,
  publishedPeers,
  readerFacing,
  readerFacingSignature,
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

  /**
   * The maintainer's rule, as a check rather than a habit.
   *
   * `(0007)` is a footnote to a document a reader of this site has never seen
   * and cannot open from here. There are none on the site today; what keeps it
   * that way is this test rather than anyone remembering, because the sentences
   * are lifted from `src/` and a comment written next week can carry one in.
   */
  it("never puts a decision-record number in front of a reader", () => {
    const carriers: string[] = []

    for (const entry of apiEntries) {
      for (const group of entry.groups) {
        if (DECISION_NUMBER.test(group.summary)) carriers.push(`${group.module} — ${group.summary}`)

        for (const symbol of group.symbols) {
          if (DECISION_NUMBER.test(symbol.summary)) carriers.push(`${symbol.name} — ${symbol.summary}`)

          /*
           * Signatures too. A union type carries doc comments against its own
           * members, so a code block is a second way for a citation to reach a
           * page and it was the way the first attempt at this missed.
           */
          if (DECISION_NUMBER.test(symbol.signature)) carriers.push(`${symbol.name}'s signature`)
        }
      }
    }

    expect(carriers, "a decision number reached the page").toEqual([])
  })

  it("refuses a file that is not a reference", () => {
    expect(() => parseReference({ entries: [{ specifier: 1 }] })).toThrow(/not an entry point/)
    expect(() => parseReference({})).toThrow(/no entry points/)
  })
})

describe("what the generated file says a door needs installed", () => {
  it("names only packages this one asks its host to bring", () => {
    if (!built) throw new Error(missingBuild)

    const peers = publishedPeers()

    for (const entry of apiEntries) {
      for (const requirement of entry.requires) {
        expect(peers[requirement.package], `${entry.specifier} needs ${requirement.package}`).toBeDefined()
        expect(requirement.range).toBe(peers[requirement.package]?.range)
      }
    }
  })

  it("tells a reader of the contract suites that they load a test runner", () => {
    const contracts = apiEntryAt("testing-contracts")

    /**
     * The finding this band was built for. Importing this door from a plain
     * Node script fails with `Vitest failed to access its internal state`,
     * which is correct behaviour and was documented nowhere a reader would
     * look.
     */
    expect(contracts?.requires.find((requirement) => requirement.package === "vitest")).toEqual({
      package: "vitest",
      range: "^3.0.5",
      optional: true,
      reach: "loaded",
    })
  })

  it("names the driver those suites reach as well, which no sentence anywhere does", () => {
    const contracts = apiEntryAt("testing-contracts")

    expect(contracts?.requires.map((requirement) => requirement.package)).toEqual(["drizzle-orm", "vitest"])
  })

  it("does not tell a reader of the adapter that it loads a vendor SDK, because it does not", () => {
    const anthropic = apiEntryAt("anthropic")

    expect(anthropic?.requires).toEqual([
      { package: "@anthropic-ai/sdk", range: "^0.115.0", optional: true, reach: "declared" },
    ])
  })

  it("says the root door needs nothing, which is what makes the rest worth reading", () => {
    expect(apiEntryAt("runtime")?.requires).toEqual([])
  })

  it("refuses a reference whose requirement is reached in no way anybody knows", () => {
    expect(() =>
      parseReference({
        entries: [
          {
            specifier: "@loom/runtime",
            slug: "runtime",
            types: "./dist/index.d.ts",
            requires: [{ package: "vitest", range: "^3.0.5", optional: true, reach: "imagined" }],
            groups: [],
          },
        ],
      })
    ).toThrow(/is reached by being imagined/)
  })

  it("refuses a reference that does not say what a door needs at all", () => {
    expect(() =>
      parseReference({
        entries: [{ specifier: "@loom/runtime", slug: "runtime", types: "./dist/index.d.ts", groups: [] }],
      })
    ).toThrow(/does not say what it needs installed/)
  })
})

describe("a doc comment a stranger has to read", () => {
  it("lifts out a parenthetical citation and leaves the sentence whole", () => {
    expect(readerFacing("Props arrive as one JSON-encoded object (0014). Parse it.")).toBe(
      "Props arrive as one JSON-encoded object. Parse it."
    )
    expect(readerFacing("The configurations a primitive is probed under (0075).")).toBe(
      "The configurations a primitive is probed under."
    )
    expect(readerFacing("Refused for the reasons given (0053, 0055).")).toBe(
      "Refused for the reasons given."
    )
    expect(readerFacing("Reports and never enforces (see 0012), so a host must run it.")).toBe(
      "Reports and never enforces, so a host must run it."
    )
  })

  it("lifts out a trailing attribution clause", () => {
    expect(readerFacing("The prop-validation seam, inherited from 0009.")).toBe(
      "The prop-validation seam."
    )
    expect(readerFacing("The conformance probe, per 0010.")).toBe("The conformance probe.")
  })

  it("withholds a sentence whose grammar needs the number", () => {
    expect(readerFacing("0049's three theme ids, honoured on the root node.")).toBe("")
    expect(readerFacing("The bar 0074 set, as a function a host can run.")).toBe("")
  })

  it("leaves the spaced em dash this codebase writes on purpose", () => {
    expect(readerFacing("A host runs it — and most will not.")).toBe(
      "A host runs it — and most will not."
    )
    expect(readerFacing("A host runs it (0012) — and most will not.")).toBe(
      "A host runs it — and most will not."
    )
  })

  it("lifts a citation out of a comment inside a signature, and leaves the code", () => {
    const signature = [
      "type TreeError = {",
      "    readonly code: \"node-not-found\";",
      "}",
      "/** An id this delta removed, re-inserted as a different node (0038). */",
      " | { readonly code: \"recycled-node-id\" };",
    ].join("\n")

    expect(readerFacingSignature(signature)).toContain(
      "/** An id this delta removed, re-inserted as a different node. */"
    )
    expect(readerFacingSignature(signature)).toContain('readonly code: "node-not-found";')
  })

  it("drops a comment whose grammar needs the number, and keeps what it described", () => {
    const signature = ["type Theme = {", "    /** 0049's three ids. */", "    readonly id: string;", "}"].join("\n")
    const cleaned = readerFacingSignature(signature)

    expect(cleaned).not.toContain("0049")
    expect(cleaned).not.toContain("/**")
    expect(cleaned).toContain("readonly id: string;")
    expect(cleaned.split("\n")).toHaveLength(3)
  })

  it("leaves a signature with nothing to lift exactly as it was", () => {
    const signature = "const applyDelta: (tree: LoomTree, delta: TreeDelta) => Result<LoomTree, TreeError>"

    expect(readerFacingSignature(signature)).toBe(signature)
  })

  it("leaves a number that is not a decision record alone", () => {
    expect(readerFacing("Rounded to 0.05 of a second.")).toBe("Rounded to 0.05 of a second.")
    expect(readerFacing("The 1024-byte ceiling.")).toBe("The 1024-byte ceiling.")
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
