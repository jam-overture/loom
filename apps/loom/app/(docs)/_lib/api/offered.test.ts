import { existsSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { packageRoot, publishedEntries } from "./extract"
import type { ApiEntry, ApiKind } from "./model"
import { disagreements, offeredBy, type Offered } from "./offered"
import { apiEntries, apiEntryAt } from "./reference"

/**
 * What keeps a generated reference **true**, as opposed to merely current.
 *
 * `extract.test.ts` next door asks whether the committed reference is what the
 * generator produces right now. That is the right question about staleness and
 * it is no question at all about correctness: the generator produced the file,
 * so of course it matches. On 12 September the generator produced a page
 * listing two functions that do not exist on the entry point it listed them
 * under, and that test passed, because it was asked whether the generator had
 * been run.
 *
 * So these tests open the doors.
 *
 * The first half exercises the rules against invented pages and invented
 * modules. It is the half that can fail *usefully* — the real check below is
 * green today and the day it goes red somebody will want to know that the thing
 * going red understands what it is looking at. Each case is a defect somebody
 * could ship tomorrow, and one of them is the one that was shipped.
 *
 * The second half is the whole published surface, every door opened for real.
 */

const built = existsSync(join(packageRoot, "dist", "index.d.ts"))

const missingBuild =
  "loom: dist/ is not built, so there is nothing behind the doors to open. Run `pnpm build` at the repository root — `pnpm verify` already does."

/** A page, as small as one can be and still be an entry. */
const page = (specifier: string, symbols: readonly (readonly [string, ApiKind])[]): ApiEntry => ({
  specifier,
  slug: "invented",
  types: "./dist/invented.d.ts",
  requires: [],
  files: 0,
  narrower: [],
  standing: { packageNames: 0, otherDoors: 0, doorsSharingNothing: 0, widest: true, sharedWith: [], collisions: [] },
  groups: [
    {
      module: "invented",
      title: "Invented",
      summary: "",
      symbols: symbols.map(([name, kind]) => ({ name, kind, signature: "", truncated: false, summary: "" })),
    },
  ],
})

/** A door, as the module namespace would report itself. */
const door = (offers: Readonly<Record<string, string>>): Offered => new Map(Object.entries(offers))

describe("holding a page against the door it describes", () => {
  /**
   * The defect of 12 September, reconstructed.
   *
   * `export type * from "../catalogue.js"` put three types and two `const`s on
   * the page and two types and no `const`s in the module. This is what that
   * looked like from the reader's side, which is the only side that matters.
   */
  it("catches a page offering a value the module never carried", () => {
    const faults = disagreements(
      page("@jam-overture/loom/sdk", [
        ["PrimitiveCatalogue", "type"],
        ["catalogueFields", "function"],
        ["closedChoices", "function"],
      ]),
      door({ catalogueOf: "function" })
    )

    expect(faults.map((fault) => [fault.name, fault.kind])).toEqual([
      ["catalogueFields", "not-offered"],
      ["closedChoices", "not-offered"],
      ["catalogueOf", "not-listed"],
    ])
    expect(faults[0]?.sentence).toContain("importing catalogueFields from @jam-overture/loom/sdk gives nothing")
  })

  it("catches a page calling something a function that cannot be called", () => {
    const faults = disagreements(
      page("@jam-overture/loom", [["applyDelta", "function"]]),
      door({ applyDelta: "object" })
    )

    expect(faults.map((fault) => fault.kind)).toEqual(["not-a-function"])
    expect(faults[0]?.sentence).toContain("hands back a object")
  })

  it("catches a door handing back something no page mentions", () => {
    const faults = disagreements(page("@jam-overture/loom/store", []), door({ memoryStore: "function" }))

    expect(faults.map((fault) => [fault.name, fault.kind])).toEqual([["memoryStore", "not-listed"]])
  })

  /**
   * The direction that is easy to leave out, and the reason not to.
   *
   * A name declared twice — a type and a `const` under one name — reaches the
   * generator as two declarations and is described as whichever came first. The
   * page then says *type*, the module hands back a function, and a reader is
   * told they may refer to the name and never that they may call it. Nothing is
   * false on the page; something is simply missing from it, permanently and
   * invisibly.
   */
  it("catches a page calling something a type when the door hands back a value", () => {
    const faults = disagreements(page("@jam-overture/loom", [["Revision", "type"]]), door({ Revision: "function" }))

    expect(faults.map((fault) => fault.kind)).toEqual(["offered-as-a-value"])
  })

  it("expects nothing behind a type and is content when there is nothing", () => {
    expect(disagreements(page("@jam-overture/loom", [["TreeDelta", "type"], ["LoomTree", "interface"]]), door({}))).toEqual(
      []
    )
  })

  /** A class is a function once the types are gone, and the door reports it as one. */
  it("is content with a class the door hands back as a function", () => {
    expect(disagreements(page("@jam-overture/loom", [["HoldError", "class"]]), door({ HoldError: "function" }))).toEqual([])
  })

  /**
   * A schema is a `const` holding an object, so what it commits the door to is
   * that something is there — not that it is callable. Zod objects are not
   * functions and a rule that forgot this would fail the whole reference.
   */
  it("asks of a schema only that it is there", () => {
    expect(
      disagreements(page("@jam-overture/loom", [["treeSchema", "schema"]]), door({ treeSchema: "object" }))
    ).toEqual([])
  })

  it("says nothing about a page and a door that agree", () => {
    expect(
      disagreements(
        page("@jam-overture/loom", [
          ["applyDelta", "function"],
          ["TreeDelta", "type"],
          ["treeSchema", "schema"],
        ]),
        door({ applyDelta: "function", treeSchema: "object" })
      )
    ).toEqual([])
  })
})

describe("every published door", () => {
  it("has something behind it", () => {
    for (const entry of publishedEntries()) {
      expect(
        entry.runtime,
        `${entry.specifier} publishes declarations and no implementation`
      ).toBeDefined()
    }
  })

  /**
   * The check itself.
   *
   * Every entry point in the package is imported and held against the page that
   * describes it. It is one test rather than one per door on purpose: a failure
   * here is about the reference as a whole, and a reader who hits it wants the
   * entire list of what is wrong rather than the first door that happened to
   * sort earliest.
   */
  it("hands back exactly what its page says it does", { timeout: 120_000 }, async () => {
    if (!built) throw new Error(missingBuild)

    const faults = (
      await Promise.all(
        publishedEntries().map(async (entry) => {
          const described = apiEntries.find((candidate) => candidate.specifier === entry.specifier)

          expect(described, `${entry.specifier} is published and has no page`).toBeDefined()

          return disagreements(described as ApiEntry, await offeredBy(entry))
        })
      )
    ).flat()

    expect(
      faults.map((fault) => fault.sentence),
      "the reference and the package disagree about what is published. The reference is read from dist/*.d.ts and this is read from the modules themselves, so one of the two is describing something that is not there."
    ).toEqual([])
  })

  /**
   * A floor under the test above, and it is not ceremony.
   *
   * Everything here is a comparison of two lists, and two empty lists agree
   * perfectly. An entry point that failed to import, a reference that parsed to
   * nothing, or a `publishedEntries` that returned `[]` would all produce a
   * green run with nothing compared — the exact failure this lane has written
   * down twice before. So the run is required to have actually opened doors and
   * found things behind them.
   */
  it("was really opened, and really had names on it", async () => {
    if (!built) throw new Error(missingBuild)

    const entries = publishedEntries()

    expect(entries.length).toBeGreaterThanOrEqual(16)

    const offered = await offeredBy(entries[0] as (typeof entries)[number])

    expect(offered.size).toBeGreaterThan(20)
    expect([...offered.values()]).toContain("function")
  })

  /** The one door whose page a reader is most likely to arrive at first. */
  it("offers applyDelta from the root, as the root's page says", async () => {
    if (!built) throw new Error(missingBuild)

    const root = publishedEntries().find((entry) => entry.specifier === "@jam-overture/loom")
    const offered = await offeredBy(root as NonNullable<typeof root>)

    expect(offered.get("applyDelta")).toBe("function")
    expect(apiEntryAt("runtime")?.groups.flatMap((group) => group.symbols).map((symbol) => symbol.name)).toContain(
      "applyDelta"
    )
  })
})
