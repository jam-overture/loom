import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { entryPoints } from "../entry-points"

import { siteCount } from "../counts"

import { KNOB_ORDER } from "./knobs"
import { COMPARISON_IDS } from "./verdicts"

/**
 * What *What AI may change* claims, held against the runtime it claims it about.
 *
 * The generated blocks on this page cannot go stale — they are produced from the
 * policy's own type and from real runs. The **prose and the code fences around
 * them** can, and this page is the one where that costs the most: a reader who
 * copies a policy naming a field the runtime dropped gets no error and no
 * protection, because an unknown key is simply not a rule.
 *
 * So every field written into a fenced policy is asked of the knob list, every
 * import is asked of the door it says it comes from, and the two places the
 * prose counts the settings are counted rather than trusted.
 */

const page = readFileSync(
  fileURLToPath(new URL("../../docs/building-with-loom/what-ai-may-change/page.mdx", import.meta.url)),
  "utf8"
)

const IMPORT_LINE = /import\s+\{([^}]+)\}\s+from\s+"(@jam-overture\/[^"]+)"/g

type ImportLine = {
  readonly specifier: string
  /** Names that exist at run time. `type Foo` is excluded deliberately. */
  readonly values: readonly string[]
}

const importLines = (): readonly ImportLine[] =>
  [...page.matchAll(IMPORT_LINE)].map((match) => ({
    specifier: match[2] ?? "",
    values: (match[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0 && !name.startsWith("type ")),
  }))

/**
 * The keys written into every `gatePolicySchema.parse({ … })` on the page.
 *
 * Top-level only, which is what the indentation selects: a nested key belongs to
 * a value rather than to the policy, and `protectedPrimitiveTypes` is the field
 * whose *contents* are a deployment's own vocabulary and not the runtime's to
 * know.
 */
const POLICY_CALL = /gatePolicySchema\.parse\(\{\n([\s\S]*?)\n\}\)/g
const TOP_LEVEL_KEY = /^ {2}(\w+):/gm

const fieldsWritten = (): readonly string[] =>
  [...page.matchAll(POLICY_CALL)].flatMap((call) =>
    [...(call[1] ?? "").matchAll(TOP_LEVEL_KEY)].map((key) => key[1] ?? "")
  )

describe("the imports this page prints", () => {
  it("prints some, so the checks below are not vacuous", () => {
    expect(importLines().length).toBeGreaterThan(0)
  })

  it("only imports from doors the runtime actually publishes", () => {
    const published = new Set(entryPoints.map((entry) => entry.specifier))

    for (const line of importLines()) {
      expect(published, `${line.specifier} is not a published entry point`).toContain(
        line.specifier
      )
    }
  })

  it("only names exports those doors actually have", async () => {
    for (const line of importLines()) {
      const module: Readonly<Record<string, unknown>> = await import(line.specifier)

      for (const name of line.values) {
        expect(module, `${line.specifier} does not export ${name}`).toHaveProperty(name)
      }
    }
  })
})

describe("the policies this page writes out", () => {
  it("writes some, so the check below is not vacuous", () => {
    expect(fieldsWritten().length).toBeGreaterThan(0)
  })

  it("sets only fields the policy actually has", () => {
    for (const field of fieldsWritten()) {
      expect(KNOB_ORDER, `the page sets ${field}, which is not a policy field`).toContain(field)
    }
  })

  it("names the policy every deployment has to name", () => {
    expect(fieldsWritten()).toContain("policyId")
  })
})

/**
 * The page as one line.
 *
 * A sentence in MDX is wrapped at eighty columns, so a claim four words long
 * straddles a newline about half the time and which half is an accident of
 * editing. Normalizing is not weakening the check: a line break is not something
 * the page is saying.
 */
const prose = page.replace(/\s+/g, " ")

/**
 * What the page says about how many settings there are.
 *
 * **Both assertions here used to pin a spelled number**, derived from
 * `KNOB_ORDER` and correct every day they ran. They were also the reason a
 * fifteenth knob could not land without reddening four surfaces until somebody
 * retyped two words on this page — which is the 16 September finding, filed by
 * this lane against itself. The remedy it names is that the page may not say
 * the number.
 *
 * So the count is produced, spelled, by `<Count of="policy-settings" />`, and
 * the sentence that argued from *thirteen of fourteen* makes the same argument
 * without the arithmetic. What is asserted now is that the page **asks** for
 * the number. The guarantee is strictly stronger: the old pair could only be
 * right about the day it ran, and `counts.test.ts` additionally refuses any
 * number standing in front of *settings* or *knobs* on **any** page of the
 * site, which is where the stale one actually was.
 */
describe("what the page says about the settings", () => {
  it("asks for the number of settings rather than spelling it", () => {
    expect(prose).toContain(siteCount("policy-settings").rendered)
  })

  /**
   * And the sentence next to it still makes its case. The claim is about the
   * type — a knob added to the runtime and not to this page stops the build —
   * and the page is allowed to say that without counting anything, which is
   * what it does now.
   */
  it("keeps the argument that does not depend on the count", () => {
    expect(prose).toContain("stops the site compiling")
  })
})

describe("the comparisons the page shows", () => {
  const shown = (): readonly string[] =>
    [...page.matchAll(/<PolicyComparison\s+id="([^"]+)"/g)].map((match) => match[1] ?? "")

  it("names only comparisons that exist", () => {
    for (const id of shown()) {
      expect(COMPARISON_IDS, `<PolicyComparison id="${id}">`).toContain(id)
    }
  })

  it("leaves none of them unshown", () => {
    expect([...shown()].sort()).toEqual([...COMPARISON_IDS].sort())
  })

  it("shows each of them once", () => {
    expect(new Set(shown()).size).toBe(shown().length)
  })
})
