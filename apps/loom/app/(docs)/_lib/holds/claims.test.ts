import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { apiEntries } from "../api/reference"

import { produceAnswers, produceQueue } from "./queue"

/**
 * What *Answering a held change* says in its own words, held against what it
 * shows.
 *
 * The blocks on that page are produced and cannot lie. The **prose around them**
 * can: it counts the cards, it says one of the two changes can never be applied,
 * and it tells a reader which functions to import. Those sentences are typed by
 * hand, and every one of them is a claim about something the reader is looking
 * at further down the same page.
 *
 * A number that drifted would leave the page confidently wrong rather than
 * merely out of date — the failure this site keeps saying it will not accept —
 * and it is invisible, because nothing renders differently when a sentence
 * stops matching the table under it.
 */

const page = readFileSync(
  fileURLToPath(new URL("../../docs/the-runtime/answering-a-held-change/page.mdx", import.meta.url)),
  "utf8"
)

/**
 * The page's prose with its line breaks flattened.
 *
 * Every sentence here is hard-wrapped at eighty columns, so a claim this test
 * looks for is as likely to straddle a newline as not — and a test that only
 * found the ones that happened to fit on one line would be a test that passes
 * for the wrong reason.
 */
const flowed = page.replace(/\s+/g, " ")

/** Written-out numbers, because the page is prose and prose spells them. */
const WORDS: Readonly<Record<number, string>> = { 1: "one", 2: "two", 3: "three", 4: "four" }

const wordFor = (value: number): string => {
  const word = WORDS[value]

  if (word === undefined) throw new Error(`loom: this page's claims test has no word for ${value}`)

  return word
}

/** The same word where the page's sentence starts with it. */
const capitalised = (word: string): string => `${word.charAt(0).toUpperCase()}${word.slice(1)}`

describe("the counts this page writes out", () => {
  it("names as many waiting changes as the queue it shows has", async () => {
    const queue = await produceQueue()

    expect(flowed).toContain(`${wordFor(queue.waiting.length)} changes asked for by a colleague`)
  })

  /**
   * The sentence the whole middle of the page turns on. If the story ever grew
   * a second dead change, "one of those two" would be wrong in the one place a
   * reader is being asked to take the page's word for something.
   */
  it("claims exactly as many changes can never be applied as the badges say", async () => {
    const queue = await produceQueue()

    expect(queue.dead).toBe(1)
    expect(flowed).toContain(
      `**${capitalised(wordFor(queue.dead))} of those ${wordFor(queue.waiting.length)} changes can never be applied`
    )
  })

  it("counts the answers it prints", async () => {
    const answers = await produceAnswers()

    expect(flowed).toContain(`${capitalised(wordFor(answers.length))} answers, given in one sitting`)
  })
})

/**
 * Every name the page tells a reader to import, asked of the module the page
 * says it comes from.
 *
 * A page that names a function the runtime does not export is worse than a page
 * that says nothing: it costs somebody an hour before they conclude the
 * documentation is lying. The generated programs already compile these blocks,
 * which catches a name that is gone; this catches a name that is published from
 * a *different* door than the line says, which compiles and still sends a reader
 * to the wrong import.
 */
const IMPORT_LINE = /import\s+\{([^}]+)\}\s+from\s+"(@loom\/[^"]+)"/g

const publishedNames = (specifier: string): ReadonlySet<string> => {
  const entry = apiEntries.find((candidate) => candidate.specifier === specifier)

  if (entry === undefined) throw new Error(`loom: nothing publishes ${specifier}`)

  return new Set(entry.groups.flatMap((group) => group.symbols.map((symbol) => symbol.name)))
}

describe("what this page tells a reader to import", () => {
  it("names something the door it names really exports", () => {
    const lines = [...page.matchAll(IMPORT_LINE)]

    expect(lines.length).toBeGreaterThan(0)

    for (const line of lines) {
      const specifier = line[2] ?? ""
      const published = publishedNames(specifier)

      for (const name of (line[1] ?? "").split(",").map((part) => part.trim())) {
        expect([specifier, name, published.has(name)]).toEqual([specifier, name, true])
      }
    }
  })
})

/**
 * The two calls a reviewer's click becomes, and the read the screen is built
 * out of. The page teaches all three by name, and a rename in the runtime
 * should make this page go red rather than quietly send people to functions
 * that are no longer there.
 */
describe("the calls this page teaches", () => {
  it("names each of them somewhere on the page", () => {
    for (const name of ["forTree", "confirmHeld", "discardHeld", "baseRevision"]) {
      expect(page, name).toContain(name)
    }
  })

  it("finds confirmHeld and discardHeld on the write door", () => {
    const published = publishedNames("@loom/runtime/write")

    expect(published.has("confirmHeld")).toBe(true)
    expect(published.has("discardHeld")).toBe(true)
  })
})
