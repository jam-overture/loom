import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { entryPoints } from "../entry-points"

import { WRITE_ENDING_ORDER } from "./endings"

/**
 * What *What your app has to do* claims, held against the runtime it claims it
 * about.
 *
 * This page is mostly code blocks, and a code block is the one kind of prose on
 * this site a reader will paste. A page that names a function the runtime does
 * not export is worse than a page that says nothing: it costs somebody an hour
 * before they conclude the documentation is lying.
 *
 * So every import line in every fenced block is read back off the file, and
 * each name in it is asked of the module the line says it comes from. Type-only
 * imports are checked for the door being real and no further — a type is not a
 * key on the namespace object, and there is nothing at run time to ask.
 */

const page = readFileSync(
  fileURLToPath(new URL("../../docs/the-runtime/what-your-app-has-to-do/page.mdx", import.meta.url)),
  "utf8"
)

/** Written-out numbers, because the page is prose and prose spells them. */
const WORDS: Readonly<Record<number, string>> = { 3: "three", 4: "four", 7: "seven" }

const wordFor = (value: number): string => {
  const word = WORDS[value]

  if (word === undefined) {
    throw new Error(`loom: this page's claims test has no word for ${value}`)
  }

  return word
}

type ImportLine = {
  readonly specifier: string
  /** Names that exist at run time. `type Foo` is excluded deliberately. */
  readonly values: readonly string[]
}

const IMPORT_LINE = /import\s+\{([^}]+)\}\s+from\s+"(@jam-overture\/[^"]+)"/g

const importLines = (): readonly ImportLine[] =>
  [...page.matchAll(IMPORT_LINE)].map((match) => ({
    specifier: match[2] ?? "",
    values: (match[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0 && !name.startsWith("type ")),
  }))

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

  /**
   * The four a host calls. Named here rather than derived, because this is the
   * page's argument — the write surface is small — and a test that derived the
   * list from the page would be agreeing with the page about itself.
   */
  it("names the four functions a host calls, and all four are functions", async () => {
    const write: Readonly<Record<string, unknown>> = await import("@jam-overture/loom/write")

    for (const name of ["commitIntent", "confirmHeld", "discardHeld", "revertRevision"]) {
      expect(page, `the page does not mention ${name}`).toContain(name)
      expect(typeof write[name], `${name} is not a function`).toBe("function")
    }
  })
})

/** The page is prose and starts sentences with these, so the test has to as well. */
const opening = (word: string): string => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`

/**
 * How the page divides the endings: the three the Gate produces, and the four
 * the world does. Named here because the split is the page's argument rather
 * than the runtime's — and because the sum of them is what has to keep matching
 * the number of endings there are.
 */
const FROM_THE_GATE = 3
const FROM_THE_WORLD = 4

describe("what the page says about the endings", () => {
  it("says how many there are, and is right", () => {
    const seven = wordFor(WRITE_ENDING_ORDER.length)

    expect(page).toContain(`${seven} answers`)
    expect(page).toContain(`${opening(seven)} ways that call can end`)
  })

  /**
   * The cards are generated, so the prose deliberately does not repeat the
   * kinds. What it does instead is group them, and a group that stopped adding
   * up would be a page quietly failing to mention an ending a host has to
   * handle.
   */
  it("accounts for every ending in the two groups it draws", () => {
    expect(page).toContain(`${opening(wordFor(FROM_THE_GATE))} of these are the Gate speaking`)
    expect(page).toContain(`The other ${wordFor(FROM_THE_WORLD)} are the world being ordinary`)
    expect(FROM_THE_GATE + FROM_THE_WORLD).toBe(WRITE_ENDING_ORDER.length)
  })
})
