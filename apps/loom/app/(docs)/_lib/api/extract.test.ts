import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { entryPoints } from "../entry-points"
import { docsHref, docsLandingOf, docsPagesIn, docsSections } from "../nav"
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
import { apiAnchorFor, apiNavLabelFor, apiSlugFor, apiSymbolCount } from "./model"
import { apiEntries, apiEntryAt, apiSlugs, parseReference } from "./reference"

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
        subpath === "." ? "@jam-overture/loom" : `@jam-overture/loom${subpath.slice(1)}`
      )
    )
  })

  /**
   * The same doors in two orders, deliberately. `package.json` lists them in
   * the order the package's conditions are written; the rail lists them in the
   * order a reader should meet them, which is the order `entryPoints` is in.
   * What must never differ is *which* doors, so both checks sort first.
   *
   * `docsPagesIn` rather than the section's pages, because the section's own
   * landing page is not a door and would be a seventeenth slug here.
   */
  it("each have a page in the rail, and the rail invents none", () => {
    const section = docsSections.find((candidate) => candidate.slug === "api-reference")

    expect(section?.source).toBe("generated")
    expect(
      section === undefined ? [] : docsPagesIn(section).map((page) => page.slug).sort()
    ).toEqual(
      publishedEntries()
        .map((entry) => apiSlugFor(entry.specifier))
        .sort()
    )
  })

  /**
   * The landing page is the section itself, and the check that matters about it
   * is that it is not mistaken for a door: nothing may generate a page for it,
   * and its address has no segment of its own.
   */
  it("are not joined by the section's own page", () => {
    const section = docsSections.find((candidate) => candidate.slug === "api-reference")
    const landing = section === undefined ? undefined : docsLandingOf(section)

    expect(landing).toBeDefined()
    expect(apiSlugs).not.toContain(landing?.slug)
    expect(docsHref("api-reference", landing?.slug ?? "x")).toBe("/docs/api-reference")
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
            specifier: "@jam-overture/loom",
            slug: "runtime",
            types: "./dist/index.d.ts",
            requires: [{ package: "vitest", range: "^3.0.5", optional: true, reach: "imagined" }],
            files: 0,
            narrower: [],
            groups: [],
          },
        ],
      })
    ).toThrow(/is reached by being imagined/)
  })

  it("refuses a reference that offers a narrower door saving nothing", () => {
    /*
     * The rule cannot produce one: a strict subset of a set is missing at least
     * one member. A file carrying one was written by nobody's generator, and
     * the sentence it would render — *it does not load, which this import
     * does* — is true and empty.
     */
    expect(() =>
      parseReference({
        entries: [
          {
            specifier: "@jam-overture/loom",
            slug: "runtime",
            types: "./dist/index.d.ts",
            requires: [],
            files: 91,
            narrower: [{ specifier: "@jam-overture/loom/x", slug: "x", avoids: [], shared: 2, files: 1 }],
            groups: [],
          },
        ],
      })
    ).toThrow(/loads everything the wider door does/)
  })

  it("refuses a reference that does not say which doors are narrower than a door", () => {
    expect(() =>
      parseReference({
        entries: [
          {
            specifier: "@jam-overture/loom",
            slug: "runtime",
            types: "./dist/index.d.ts",
            requires: [],
            files: 91,
            groups: [],
          },
        ],
      })
    ).toThrow(/does not say which doors are narrower than it/)
  })

  it("refuses a reference that does not say how much of the package a door goes through", () => {
    expect(() =>
      parseReference({
        entries: [
          {
            specifier: "@jam-overture/loom",
            slug: "runtime",
            types: "./dist/index.d.ts",
            requires: [],
            narrower: [],
            groups: [],
          },
        ],
      })
    ).toThrow(/has no @jam-overture\/loom\.files/)
  })

  it("refuses a reference that does not say what a door needs at all", () => {
    expect(() =>
      parseReference({
        entries: [{ specifier: "@jam-overture/loom", slug: "runtime", types: "./dist/index.d.ts", groups: [] }],
      })
    ).toThrow(/does not say what it needs installed/)
  })
})

describe("which door a reader should have gone through instead", () => {
  it("sends a reader of the signals door to the broadcaster, which is the pair the package has", () => {
    expect(apiEntryAt("signals")?.narrower).toEqual([
      {
        specifier: "@jam-overture/loom/signals/broadcast",
        slug: "signals-broadcast",
        avoids: ["zod"],
        shared: 14,
        files: 9,
      },
    ])
  })

  it("does not send a reader of the broadcaster back to the wider door", () => {
    expect(apiEntryAt("signals-broadcast")?.narrower).toEqual([])
  })

  it("does not call the Postgres journal a narrower way into the journal", () => {
    /*
     * It loads a strict subset of the journal's packages and publishes four
     * names that are none of the journal's sixty-four. Packages alone would
     * have made this pair qualify, and a reader who followed it would have
     * lost everything they came for.
     */
    expect(apiEntryAt("telemetry")?.narrower).toEqual([])
  })

  it("finds exactly one pair in the whole package, so the band is rare rather than decorative", () => {
    const offering = apiEntries.filter((entry) => entry.narrower.length > 0).map((entry) => entry.specifier)

    expect(offering).toEqual(["@jam-overture/loom/signals"])
  })

  it("counts every door's reach, so the band always has both halves of its comparison", () => {
    expect(apiEntries.every((entry) => entry.files > 0)).toBe(true)
  })

  it("never offers a door more of the package than the one a reader is standing at", () => {
    const wider = apiEntries.flatMap((entry) =>
      entry.narrower.filter((door) => door.files >= entry.files).map((door) => door.specifier)
    )

    expect(wider).toEqual([])
  })
})

describe("how much of the package is behind one door", () => {
  it("says the root door is the widest and still has less than half of it", () => {
    const runtime = apiEntryAt("runtime")
    const published = runtime === undefined ? 0 : apiSymbolCount(runtime)

    expect(runtime?.standing.widest).toBe(true)
    expect(published * 2).toBeLessThan(runtime?.standing.packageNames ?? 0)
  })

  /**
   * The belief this band exists to correct, stated as a number. Thirteen of
   * the fifteen other doors publish not one name the root door publishes, so a
   * reader who reads `@jam-overture/loom` as the door with everything behind it is
   * wrong about almost the whole package.
   */
  it("finds that thirteen of the other fifteen doors share nothing with the root door", () => {
    expect(apiEntryAt("runtime")?.standing.doorsSharingNothing).toBe(13)
    expect(apiEntryAt("runtime")?.standing.otherDoors).toBe(15)
  })

  it("counts a shared name once, so the package publishes fewer names than its doors do slots", () => {
    const slots = apiEntries.reduce((total, entry) => total + apiSymbolCount(entry), 0)
    const names = apiEntries[0]?.standing.packageNames ?? 0

    expect(names).toBeLessThan(slots)
    expect(names).toBeGreaterThan(0)
  })

  it("gives every door the same count of the package, because it is one package", () => {
    expect(new Set(apiEntries.map((entry) => entry.standing.packageNames)).size).toBe(1)
  })

  it("names the two doors the root door overlaps, and says how much", () => {
    expect(apiEntryAt("runtime")?.standing.sharedWith).toEqual([
      { specifier: "@jam-overture/loom/react", slug: "react", names: 5 },
      { specifier: "@jam-overture/loom/sdk", slug: "sdk", names: 8 },
    ])
  })

  it("finds every name of the broadcaster behind the wider signals door", () => {
    const broadcast = apiEntryAt("signals-broadcast")

    expect(broadcast?.standing.sharedWith).toEqual([
      { specifier: "@jam-overture/loom/signals", slug: "signals", names: 14 },
    ])
    expect(broadcast?.standing.sharedWith[0]?.names).toBe(broadcast === undefined ? -1 : apiSymbolCount(broadcast))
  })

  it("never lists a door as sharing nothing and as an overlap at once", () => {
    for (const entry of apiEntries) {
      expect(
        entry.standing.doorsSharingNothing + entry.standing.sharedWith.length,
        entry.specifier
      ).toBeLessThanOrEqual(entry.standing.otherDoors)
    }
  })
})

describe("one name that means two things", () => {
  /**
   * The whole package has exactly one, which is what makes it worth a sentence
   * on two pages rather than a policy. `horizonOf` answers *when does a reader
   * signal fall out of the window* behind one door and *when may this
   * telemetry be forgotten* behind the other.
   */
  it("finds horizonOf at the signals door and at the telemetry door", () => {
    expect(apiEntryAt("signals")?.standing.collisions).toEqual([
      { name: "horizonOf", specifier: "@jam-overture/loom/telemetry", slug: "telemetry" },
    ])
    expect(apiEntryAt("telemetry")?.standing.collisions).toEqual([
      { name: "horizonOf", specifier: "@jam-overture/loom/signals", slug: "signals" },
    ])
  })

  it("is the only one in the package, so the band is rare rather than decorative", () => {
    const colliding = apiEntries
      .filter((entry) => entry.standing.collisions.length > 0)
      .map((entry) => entry.specifier)

    expect(colliding).toEqual(["@jam-overture/loom/signals", "@jam-overture/loom/telemetry"])
  })

  /**
   * The other name those two doors share *is* the same type, and counting it
   * as a collision would make the page say `ForgetOutcome` means two different
   * things when a reader can take either import and get the same one.
   */
  it("leaves the name the two doors really do share as an overlap", () => {
    expect(apiEntryAt("signals")?.standing.sharedWith).toContainEqual({
      specifier: "@jam-overture/loom/telemetry",
      slug: "telemetry",
      names: 1,
    })
  })
})

describe("a reference file that says nothing usable about where a door stands", () => {
  const entry = (standing: unknown): unknown => ({
    entries: [
      {
        specifier: "@jam-overture/loom",
        slug: "runtime",
        types: "./dist/index.d.ts",
        requires: [],
        files: 91,
        narrower: [],
        standing,
        groups: [
          {
            module: "tree/tree",
            title: "Trees",
            summary: "",
            symbols: [
              { name: "createTree", kind: "function", signature: "createTree(): Tree", truncated: false, summary: "" },
              { name: "buildText", kind: "function", signature: "buildText(): Node", truncated: false, summary: "" },
            ],
          },
        ],
      },
    ],
  })

  const sound = {
    packageNames: 4,
    otherDoors: 1,
    doorsSharingNothing: 0,
    widest: false,
    sharedWith: [{ specifier: "@jam-overture/loom/react", slug: "react", names: 1 }],
    collisions: [],
  }

  it("is refused when a door publishes more names than it says the package does", () => {
    /*
     * The shape an unfilled second pass leaves behind. It renders as *publishes
     * 526 of the package's 0 names*, which is a sentence no reader can make
     * sense of and no test would otherwise notice.
     */
    expect(() => parseReference(entry({ ...sound, packageNames: 0 }))).toThrow(
      /publishes 2 names and says the whole package publishes 0/
    )
  })

  it("is refused when more doors share nothing with it than there are doors", () => {
    expect(() => parseReference(entry({ ...sound, doorsSharingNothing: 2 }))).toThrow(
      /says 2 of 1 other doors share none of its names/
    )
  })

  it("is refused when a door is listed as an overlap and overlaps in nothing", () => {
    expect(() =>
      parseReference(entry({ ...sound, sharedWith: [{ specifier: "@jam-overture/loom/react", slug: "react", names: 0 }] }))
    ).toThrow(/is listed as sharing names and shares 0/)
  })

  it("is refused when it does not say where the door stands at all", () => {
    expect(() => parseReference(entry(undefined))).toThrow(
      /does not say where it stands among the doors/
    )
  })

  it("is refused when it does not say which of its names mean two things", () => {
    expect(() => parseReference(entry({ ...sound, collisions: undefined }))).toThrow(
      /does not say which of its names mean two things/
    )
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
    expect(apiSlugFor("@jam-overture/loom")).toBe("runtime")
    expect(apiNavLabelFor("@jam-overture/loom")).toBe("loom")
  })

  it("flattens a subpath rather than nesting it", () => {
    expect(apiSlugFor("@jam-overture/loom/telemetry/postgres")).toBe("telemetry-postgres")
    expect(apiNavLabelFor("@jam-overture/loom/telemetry/postgres")).toBe("loom/telemetry/postgres")
  })

  it("finds the entry a page slug documents", () => {
    expect(apiEntryAt("react")?.specifier).toBe("@jam-overture/loom/react")
    expect(apiEntryAt("nowhere")).toBeUndefined()
  })
})
