import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { entryPoints } from "../entry-points"

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

/** Written-out numbers, because the page is prose and prose spells them. */
const WORDS: Readonly<Record<number, string>> = {
  12: "twelve",
  13: "thirteen",
  14: "fourteen",
}

const wordFor = (value: number): string => {
  const word = WORDS[value]

  if (word === undefined) {
    throw new Error(`loom: this page's claims test has no word for ${value}`)
  }

  return word
}

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
 * editing. Normalising is not weakening the check: a line break is not something
 * the page is saying.
 */
const prose = page.replace(/\s+/g, " ")

/** The page is prose and starts sentences with these, so the test has to as well. */
const opening = (word: string): string => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`

describe("what the page says about the settings", () => {
  it("says how many there are, and is right", () => {
    expect(prose).toContain(`${opening(wordFor(KNOB_ORDER.length))} settings`)
  })

  /**
   * The sentence about the type catching a missing row names both numbers, so a
   * fifteenth knob would leave the page arguing from arithmetic that no longer
   * works. Derived here rather than spelled, because that is the whole claim.
   */
  it("keeps its own arithmetic true", () => {
    expect(prose).toContain(`${wordFor(KNOB_ORDER.length - 1)} of ${wordFor(KNOB_ORDER.length)}`)
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
