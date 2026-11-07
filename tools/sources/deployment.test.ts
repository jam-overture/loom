import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  countWord,
  environmentNames,
  fencedObjectKeys,
  fieldsOf,
  namedIn,
  NOT_SET_BY_AN_OPERATOR,
  offered,
  settingsTable,
} from "./deployment.js"
import { relative, ROOT, sourcesUnder } from "./files.js"

const GUIDE = join(ROOT, "docs", "deployment.md")
const EXAMPLE = join(ROOT, "apps", "loom", ".env.example")
const INTAKE = join(ROOT, "apps", "loom", "app", "_lib", "reader-signals", "receive.ts")

const read = (path: string): string => readFileSync(path, "utf8")

/**
 * The application's own sources.
 *
 * `(docs)/_lib/fences/compiled/` is left out, and it is the only exclusion: a
 * compiled fence is a code sample this deployment never runs, generated from a
 * documentation page so that the page's examples typecheck. Two of them read an
 * environment a *reader's* application has, and a guide forced to name those as
 * its own settings would be wrong in the direction this check exists to stop.
 */
const applicationSources = (): readonly string[] =>
  [
    ...sourcesUnder(join(ROOT, "apps", "loom", "app")),
    ...sourcesUnder(join(ROOT, "apps", "loom", "scripts")),
  ].filter(
    (path) =>
      !path.endsWith(".d.ts") &&
      !/\.test\.tsx?$/.test(path) &&
      !path.includes(join("fences", "compiled"))
  )

/** Every variable the application reads, with the sources that read it. */
const readBy = (): ReadonlyMap<string, readonly string[]> => {
  const found = new Map<string, readonly string[]>()

  for (const path of applicationSources()) {
    for (const name of environmentNames(read(path))) {
      found.set(name, [...(found.get(name) ?? []), relative(path)])
    }
  }

  return found
}

describe("the variables a source reads", () => {
  it("reads a name written at the read", () => {
    expect(environmentNames(`const a = process.env.LOOM_SITE_ORIGIN\n`)).toEqual([
      "LOOM_SITE_ORIGIN",
    ])
  })

  it("reads a name exported as a constant and used as a subscript", () => {
    const source = `const KEY = "LOOM_SIGNAL_INTAKE"\nconst read = (env = process.env) => env[KEY]\n`

    expect(environmentNames(source)).toEqual(["LOOM_SIGNAL_INTAKE"])
  })

  it("reads a name written as a subscript literal", () => {
    const source = `const read = (env = process.env) => env["LOOM_PORTAL_TRUSTED_PROXY_HOPS"]\n`

    expect(environmentNames(source)).toEqual(["LOOM_PORTAL_TRUSTED_PROXY_HOPS"])
  })

  it("reports each name once however many times it is read", () => {
    const source = `const a = process.env.LOOM_URL\nconst b = process.env.LOOM_URL\n`

    expect(environmentNames(source)).toEqual(["LOOM_URL"])
  })

  /**
   * The docblock hazard `code.ts` exists for. `settings.ts` explains every one
   * of its settings in prose that quotes the variable, and a check that read
   * the file rather than its code would report the one module that already
   * documents them.
   */
  it("ignores a variable named in a comment", () => {
    const source = `/** It was "LOOM_PORTAL_REVIEWERS" until 0285. */\nconst a = process.env.LOOM_PORTAL_EMAILS\n`

    expect(environmentNames(source)).toEqual(["LOOM_PORTAL_EMAILS"])
  })

  /**
   * The portal's *Credentials* screen, which is the instance that happened: it
   * prints a snippet for a customer to paste, and the snippet reads an
   * environment that is theirs rather than this deployment's.
   */
  it("ignores a variable inside a snippet a page prints", () => {
    const source = [
      "const snippet = `loom({",
      "  ingestKey: process.env.LOOM_INGEST_KEY,",
      "})`",
      "const real = process.env.LOOM_SITE_PROJECT",
      "",
    ].join("\n")

    expect(environmentNames(source)).toEqual(["LOOM_SITE_PROJECT"])
  })

  it("ignores a constant name that is not screaming snake case", () => {
    const source = `const label = "DEFAULT"\nconst a = process.env.LOOM_URL\n`

    expect(environmentNames(source)).toEqual(["LOOM_URL"])
  })

  /**
   * The stated limit, written as a test so it is a measured property rather
   * than a sentence in a doc comment. A documentation page that prints the
   * names of exported constants matched the name shape until the gate was
   * added, and the gate is what costs this.
   */
  it("reads nothing from a file that never names process.env", () => {
    expect(environmentNames(`export const KEY = "LOOM_SIGNAL_INTAKE"\n`)).toEqual([])
  })
})

describe("what the example offers", () => {
  it("takes a name from an assignment at the start of a line", () => {
    expect(offered(`# a comment\nLOOM_SITE_ORIGIN=\n`)).toEqual(["LOOM_SITE_ORIGIN"])
  })

  it("does not take a name the file only mentions", () => {
    expect(offered(`# It was LOOM_PORTAL_REVIEWERS until 0285.\nLOOM_PORTAL_EMAILS=\n`)).toEqual([
      "LOOM_PORTAL_EMAILS",
    ])
  })
})

describe("the guide's own table", () => {
  const guide = `# Deploying\n\n## Environment\n\nThe example is the full list. Two\nvariables, **one** of which is required:\n\n| Variable | Required |\n| --- | --- |\n| \`LOOM_A\` | yes |\n| \`LOOM_B\` | no |\n\n## Next\n\n| \`LOOM_C\` | no |\n`

  /**
   * Mid-sentence and across a line break, which is where the guide's own count
   * sits. A reading anchored to the start of a line found nothing and said the
   * section was absent, which is the one answer that would have let the count
   * drift unchecked.
   */
  it("reads the count its prose claims", () => {
    expect(settingsTable(guide)?.claimed).toBe("Two")
  })

  it("reads the variable each row is about", () => {
    expect(settingsTable(guide)?.rows).toEqual(["LOOM_A", "LOOM_B"])
  })

  it("stops at the next section, so another table's rows are not counted", () => {
    expect(settingsTable(guide)?.rows).not.toContain("LOOM_C")
  })

  it("says nothing rather than guessing when there is no such section", () => {
    expect(settingsTable(`# Deploying\n\n## Database\n`)).toBeUndefined()
  })
})

describe("counting in words", () => {
  it("spells a count the way the guide's prose does", () => {
    expect(countWord(19)).toBe("Nineteen")
  })

  it("has no word past twenty, and says so", () => {
    expect(countWord(21)).toBeUndefined()
  })
})

describe("the fields a type declares", () => {
  const source = [
    "export type Status = {",
    "  readonly intake: string",
    "  /** The readonly word is in this comment. */",
    "  readonly durable: boolean",
    "  readonly nested: {",
    "    readonly inside: number",
    "  }",
    "  readonly optional?: string",
    "}",
    "",
  ].join("\n")

  it("reads the fields in the order the type gives them", () => {
    expect(fieldsOf(source, "Status")).toEqual(["intake", "durable", "nested", "optional"])
  })

  it("does not read a nested object's fields as the type's own", () => {
    expect(fieldsOf(source, "Status")).not.toContain("inside")
  })

  it("reads nothing for a type that is not there", () => {
    expect(fieldsOf(source, "Missing")).toEqual([])
  })
})

describe("the samples a guide prints", () => {
  it("reads the keys of each fenced JSON object", () => {
    const guide = '```json\n{ "framework": "nextjs" }\n```\n'

    expect(fencedObjectKeys(guide)).toEqual([["framework"]])
  })

  it("leaves out a fence that does not parse, because a guide may print a fragment", () => {
    const guide = '```json\n{ "intake": …\n```\n```json\n{ "framework": "nextjs" }\n```\n'

    expect(fencedObjectKeys(guide)).toEqual([["framework"]])
  })
})

describe("docs/deployment.md, against the application it is about", () => {
  /**
   * The assertion the three findings asked for. It fails naming the variable
   * and the source that reads it, because the cost those findings measured was
   * a run discovering from the code what the guide should have said.
   */
  it("names every variable the application reads", () => {
    const guide = namedIn(read(GUIDE))

    const missing = [...readBy()]
      .filter(([name]) => !guide.has(name))
      .map(([name, sources]) => `${name}, read by ${sources.join(" and ")}`)

    expect(missing).toEqual([])
  })

  it("offers every one of them in .env.example, or says here why an operator does not set it", () => {
    const excused = new Set(NOT_SET_BY_AN_OPERATOR.map((entry) => entry.name))
    const has = new Set(offered(read(EXAMPLE)))

    const unoffered = [...readBy().keys()].filter((name) => !has.has(name) && !excused.has(name))

    expect(unoffered).toEqual([])
  })

  it("offers nothing the application has stopped reading", () => {
    const reads = new Set(readBy().keys())

    expect(offered(read(EXAMPLE)).filter((name) => !reads.has(name))).toEqual([])
  })

  it("excuses nothing the application has stopped reading either", () => {
    const reads = new Set(readBy().keys())

    expect(NOT_SET_BY_AN_OPERATOR.map((entry) => entry.name).filter((name) => !reads.has(name))).toEqual(
      []
    )
  })

  /**
   * The guide calls `.env.example` the full list, so its table is a row per
   * line of that file. Said as a comparison of the two lists rather than of
   * their lengths: a row for a variable the example does not offer and a
   * missing row for one it does are different mistakes with different fixes.
   */
  it("has a row in its table for every variable the example offers, and no others", () => {
    const table = settingsTable(read(GUIDE))

    expect([...(table?.rows ?? [])].sort()).toEqual([...offered(read(EXAMPLE))].sort())
  })

  it("claims a count its table has rows for", () => {
    const table = settingsTable(read(GUIDE))

    expect(table?.claimed).toBe(countWord(table?.rows.length ?? -1))
  })

  /**
   * The one claim here about what the application *answers*. The sample is
   * found by the key that identifies it rather than by where it sits, so moving
   * the section does not quietly stop this being checked.
   *
   * **A renamed field on `IntakeStatus` now fails on the branch that renames
   * it**, in this file, naming the sample. That is deliberate and it is what
   * the 26 October finding asked for: the sample had been three fields behind
   * for a fortnight with nothing failing, and the finding declined to rename a
   * field precisely because the documented copy could not change with it.
   */
  it("prints a reader-signal status sample with every field the status has", () => {
    const sample = fencedObjectKeys(read(GUIDE)).find((keys) => keys.includes("intake"))

    expect(sample).toBeDefined()
    expect([...(sample ?? [])].sort()).toEqual([...fieldsOf(read(INTAKE), "IntakeStatus")].sort())
  })
})
