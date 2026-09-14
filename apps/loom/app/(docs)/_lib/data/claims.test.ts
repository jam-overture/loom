import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { produceAnswers, produceMissingAnswers, produceQuestions } from "./answers"
import { produceRepointing } from "./repointing"

/**
 * What *Where the content comes from* says in its own words, held against what
 * it shows.
 *
 * The blocks on that page are produced and cannot lie. The **prose around them**
 * can: it counts the bindings, it counts the questions, it says two of the six
 * failures never reach your code, and it tells a reader which line to add to a
 * policy. Every one of those sentences is typed by hand and is a claim about
 * something the reader is looking at further down the same page.
 *
 * A number that drifted would leave the page confidently wrong rather than
 * merely out of date, and nothing renders differently when it does.
 */

const page = readFileSync(
  fileURLToPath(
    new URL("../../docs/building-with-loom/where-content-comes-from/page.mdx", import.meta.url)
  ),
  "utf8"
)

/** The prose with its line breaks flattened — every sentence here is hard-wrapped. */
const flowed = page.replace(/\s+/g, " ")

const WORDS: Readonly<Record<number, string>> = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
}

const wordFor = (value: number): string => {
  const word = WORDS[value]

  if (word === undefined) throw new Error(`loom: this page's claims test has no word for ${value}`)

  return word
}

const capitalised = (word: string): string => `${word.charAt(0).toUpperCase()}${word.slice(1)}`

describe("the counts this page writes out", () => {
  it("names as many bindings and questions as the tree produced", () => {
    const asked = produceQuestions()

    expect(flowed).toContain(
      `${capitalised(wordFor(asked.written.length))} bindings, ${wordFor(asked.asked)} questions.`
    )
  })

  /**
   * The sentence the deduplication section turns on. If the story grew a second
   * shared question, "one question and one answer shared between them" would be
   * the one place a reader is asked to take the page's word for something.
   */
  it("claims exactly as many shared questions as the planner produced", () => {
    const asked = produceQuestions()

    expect(asked.shared).toBe(1)
    expect(flowed).toContain("that is **one** question and one answer shared between them")
  })

  it("counts the ways an answer can fail to arrive", async () => {
    const missing = await produceMissingAnswers()

    expect(flowed).toContain(`${capitalised(wordFor(missing.length))} ways a question goes unanswered`)
    expect(flowed).toContain(`produced by causing all ${wordFor(missing.length)}`)
  })

  /**
   * The paragraph that tells a reader two rows of one table carry the same
   * reason. It is the one sentence on this page that is about a *pair* of rows,
   * so it goes wrong silently if either of them stops being what it is — and the
   * page names both sources, which is what makes it checkable at all.
   */
  it("names both routes to the reason that has two", async () => {
    const missing = await produceMissingAnswers()
    const unavailable = missing.filter((row) => row.reason === "unavailable")

    expect(unavailable).toHaveLength(2)
    expect(flowed).toContain("Two rows come back with the same reason")

    for (const row of unavailable) {
      expect(flowed, `the page never says which question ${row.binding} is`).toContain(row.binding)
    }
  })

  /**
   * The page's division of the six into the two a deployment never hears about
   * and the four that are its own afternoon. Derived from the producer rather
   * than counted by hand, so a reason moving from one side to the other is a red
   * test.
   */
  it("splits them the way the seam does", async () => {
    const missing = await produceMissingAnswers()
    const early = missing.filter((row) => row.reached === "the adapter was never called")

    expect(flowed).toContain(`${capitalised(wordFor(early.length))} of those never reach your code`)
    expect(flowed).toContain(
      `The other ${wordFor(missing.length - early.length)} are your deployment's own afternoon`
    )
  })
})

describe("what the page says the runtime decided", () => {
  /**
   * Both halves of the repointing section are claims about a verdict. The page
   * says the free policy applies the change and the guarded one sends it to a
   * person, and the producer asserts the dispositions themselves — this is the
   * check that the *prose* still describes the columns beside it.
   */
  it("describes each verdict the way the Gate gave it", async () => {
    const [free, guarded] = await produceRepointing()

    expect(free?.kind).toBe("accepted")
    expect(guarded?.kind).toBe("requires-confirmation")

    expect(flowed).toContain("the Gate applies it")
    expect(flowed).toContain("every change to one goes to a person")
  })

  it("prints the line it tells a reader to add", async () => {
    const [, guarded] = await produceRepointing()

    expect(guarded?.detail).toContain("loom:data")
    expect(page).toContain('protectedPropKeys: ["loom:data"],')
  })

  /**
   * The empty answer is named in prose as well as printed, and the two have to
   * agree: a source that started answering with something would leave the page
   * pointing at a row that no longer says what it says.
   */
  it("points at an answer that really is ready and really is empty", async () => {
    const answers = await produceAnswers()
    const hours = answers.find((answer) => answer.reads === "loom.data.hours")

    expect(hours?.status).toBe("ready")
    expect(hours?.rows).toBe(0)
    expect(flowed).toContain("answered `ready` with an empty list")
  })
})
