import { readFile } from "node:fs/promises"
import { join } from "node:path"

import * as runtime from "@jam-overture/loom"
import * as telemetry from "@jam-overture/loom/telemetry"
import * as write from "@jam-overture/loom/write"
import { describe, expect, it } from "vitest"

import { REPOSITORY_ROOT } from "../architecture/source"

/**
 * The code blocks on this page, checked against the modules they name.
 *
 * A fenced block is the one kind of prose on a documentation site a reader will
 * paste. A function that does not exist costs them an hour before they conclude
 * the documentation is lying, and nothing about a page renders differently when
 * it is wrong — so the only thing that catches it is asking the module.
 *
 * The two entry points this page teaches are imported for real above, and every
 * name the page imports in a fenced block is looked up in them. The postgres
 * door is named rather than imported: pulling it in loads Drizzle and a database
 * driver into a test about wording, and its own entry-point test already holds
 * it against `package.json`.
 */

const PAGE = join(
  REPOSITORY_ROOT,
  "apps",
  "loom",
  "app",
  "(docs)",
  "docs",
  "the-runtime",
  "what-every-ask-leaves-behind",
  "page.mdx"
)

const MODULES: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  "@jam-overture/loom": runtime,
  "@jam-overture/loom/telemetry": telemetry,
  "@jam-overture/loom/write": write,
}

/** Named imports only — `import Anthropic from …` has no names to check. */
const IMPORT_LINE = /^import \{ ([^}]+) \} from "([^"]+)"$/

type Imported = { readonly names: readonly string[]; readonly specifier: string }

const fencedBlocks = (source: string): readonly string[] =>
  source.split("\n```").filter((_, index) => index % 2 === 1)

const importsIn = (source: string): readonly Imported[] =>
  fencedBlocks(source)
    .flatMap((block) => block.split("\n"))
    .flatMap((line) => {
      const match = IMPORT_LINE.exec(line.trim())

      return match === null || match[1] === undefined || match[2] === undefined
        ? []
        : [{ names: match[1].split(",").map((name) => name.trim()), specifier: match[2] }]
    })

describe("the code blocks on What every ask leaves behind", () => {
  it("import something, so the check below is not passing on an empty list", async () => {
    const imports = importsIn(await readFile(PAGE, "utf8"))

    expect(imports.length).toBeGreaterThanOrEqual(3)
  })

  it("name only entry points this page is about", async () => {
    const imports = importsIn(await readFile(PAGE, "utf8"))

    for (const { specifier } of imports) {
      expect(
        specifier in MODULES || specifier === "@jam-overture/loom/telemetry/postgres"
      ).toBe(true)
    }
  })

  it("import only names those entry points really publish", async () => {
    const imports = importsIn(await readFile(PAGE, "utf8"))

    for (const { names, specifier } of imports) {
      const module = MODULES[specifier]

      if (module === undefined) continue

      for (const name of names) {
        expect(Object.keys(module), `${specifier} does not publish ${name}`).toContain(name)
      }
    }
  })

  /**
   * A mutation check written down rather than performed by hand: a name that
   * does not exist has to fail the rule above, or the rule is decoration.
   */
  it("would notice a name that does not exist", () => {
    expect(Object.keys(telemetry)).not.toContain("collectTelemetryData")
    expect(Object.keys(telemetry)).toContain("collectTelemetry")
  })
})
