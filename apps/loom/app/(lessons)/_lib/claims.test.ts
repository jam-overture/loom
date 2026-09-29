import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import {
  dispositionReasonCodeSchema,
  ESCALATION_LADDER,
  treeOperationSchema,
} from "@jam-overture/loom"
import { BEHAVIOUR_NAMES } from "@jam-overture/loom/react"
import { describe, expect, it } from "vitest"

import { COURSE_DIR } from "./source"

/**
 * Sentences in `lessons/` that count a list in the runtime, held against it.
 *
 * `run.test.ts` compiles every Try it program and runs it; `transcripts.test.ts`
 * holds what a lesson says it printed against what it printed. Both are about
 * *executed* prose. Neither reaches a sentence, and a sentence is where this
 * course has now been wrong twice about the same list.
 *
 * The Gate's ladder gained a rung on 19 August and lesson 09 said "six rules"
 * for a week afterwards. It gained another on 16 September — 0163, the third
 * rule in the band above the ceiling — and lesson 09 said "seven" until
 * 23 September, with every rung below the new one numbered one too low, an
 * *In the code* row counting eight reason codes when there were nine, lesson 25
 * opening its warm-up with the wrong number, and two review sets checking a
 * reader's recall against a list with a rung missing. Every exercise in lesson
 * 09 passed throughout, both times, because `sampleTree` contains no form and
 * no binding and the new rules are silent rather than wrong on every row it has.
 *
 * What caught it in `decisions/` is `src/record-claims.test.ts`, written after
 * the first drift: the two records that count this ladder both said "seven" on
 * the morning the rung landed and both were corrected in the same edit, because
 * the suite was red until they were. Lesson 09 said, in a sentence this run
 * deleted, that *nothing connects an array in `src/` to a sentence in
 * `lessons/`, and nothing ever will*. The first clause was true. This is the
 * second clause being wrong.
 *
 * ## Why this is not `record-claims.test.ts` moved one directory over
 *
 * That file registers a sentence and requires it to appear **once**. A course
 * repeats itself on purpose: the same count reaches a reader in a lesson's
 * summary, in its self-check, in its come-back list, and again in two review
 * sets written months apart, and an interleaved schedule means the repetition
 * is the design rather than an accident. So a claim here is a **phrase**, every
 * occurrence of it across `lessons/` has to carry the same number, and the
 * number of occurrences is pinned — because a claim that has quietly stopped
 * matching anything is a check that passes while reading nothing, which is the
 * way a registry like this rots.
 *
 * A match whose captured word is not a number word is not a claim and is
 * skipped: lesson 26 writes *a ladder of rules in a fixed order*, which is the
 * same phrase deliberately declining to count, and 02 writes *the node kinds*.
 * Declining to count is the better fix wherever it reads naturally — lessons 22
 * and 24 already do it for the size of the primitive library — and nothing here
 * should discourage it.
 *
 * What a phrase cannot do is tell a claim from a **quotation** of one. The first
 * draft of lesson 09's account of its own drift quoted the stale sentence
 * verbatim, and this file counted the quotation as a third place the course was
 * getting the number wrong. It is reported rather than skipped, and the lesson
 * paraphrases instead: a course that quotes a wrong number in order to discuss
 * it is one search-and-replace away from having a wrong number again, and the
 * version that paraphrases loses nothing.
 *
 * ## What this cannot do, and it is half of the problem
 *
 * A count is the checkable part of a claim, and it was not all that was wrong.
 * Rungs numbered one too low, a `GateRule` signature the runtime had stopped
 * having, and a rung nothing in the lesson had a fixture for are all prose
 * about a list rather than a count of one, and nothing here reaches any of them.
 * The general shape is worth stating where the registry is: **a claim is
 * checkable when there are two copies of one fact and something compares them**,
 * and a count is the cheapest second copy a sentence can carry. Where a sentence
 * can be written so it carries none, that is better than being checked.
 */

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
] as const

const wordFor = (count: number): string => {
  const word = NUMBER_WORDS[count]

  if (word === undefined) {
    throw new Error(`loom: no number word for ${count} — add one, or write the claim as a digit`)
  }

  return word
}

const isNumberWord = (word: string): boolean =>
  (NUMBER_WORDS as readonly string[]).includes(word.toLowerCase())

type CourseClaim = {
  /** What the phrase is counting, for the failure message. */
  readonly what: string
  /** Finds the counted phrase, with the number word as its one capture group. */
  readonly phrase: RegExp
  /** What the runtime says, at the moment the test runs. */
  readonly count: number
  /** How many times the course says it. Pinned so a claim cannot stop matching in silence. */
  readonly occurrences: number
  /** What a reader loses when this goes stale — the reason it is worth a test. */
  readonly matters: string
}

const CLAIMS: readonly CourseClaim[] = [
  {
    what: "the rungs of the Gate's ladder",
    phrase: /\b(\w+) rules in a fixed order/,
    count: ESCALATION_LADDER.length,
    occurrences: 3,
    matters:
      "the sentence lesson 09 states the whole mechanism in, lesson 25's warm-up, and the " +
      "example in this course's README — which this file caught within a minute of being written",
  },
  {
    what: "the rungs of the Gate's ladder",
    phrase: /Name the (\w+) (?:Gate )?rules in order/,
    count: ESCALATION_LADDER.length,
    occurrences: 2,
    matters: "a retrieval question that grades a reader against a list with a rung missing",
  },
  {
    what: "the rungs of the Gate's ladder",
    phrase: /Write the (\w+) (?:Gate )?rules in order from memory/,
    count: ESCALATION_LADDER.length,
    occurrences: 2,
    matters: "the same, a week and a month later, which is where the count does its damage",
  },
  {
    what: "the rungs of the Gate's ladder",
    phrase: /in the (\w+) rules it names/,
    count: ESCALATION_LADDER.length,
    occurrences: 1,
    matters: "the line under the loop, where the ladder's length is the point being made",
  },
  {
    what: "the rungs of the Gate's ladder",
    phrase: /by (\w+) rungs\b/,
    count: ESCALATION_LADDER.length,
    occurrences: 1,
    matters: "lesson 25's worked failure, which is a claim about every rung behaving",
  },
  {
    what: "the disposition reason codes",
    phrase: /Three kinds, (\w+) reason codes/,
    count: dispositionReasonCodeSchema.options.length,
    occurrences: 1,
    matters: "lesson 09's In the code row, which is where a reader goes to find the vocabulary",
  },
  {
    what: "the members of the behaviour vocabulary",
    phrase: /behaviour vocabulary has (\w+) members/,
    count: BEHAVIOUR_NAMES.length,
    occurrences: 3,
    matters:
      "the sentence lesson 31 states the closed set in, its self-check, and Set AJ — and the " +
      "reason it is registered is that `loom.before-after` carries the same count in `src/`, " +
      "has carried it since the vocabulary had one member, and nothing compares it to anything",
  },
  {
    what: "the operations a delta may contain",
    phrase: /of the (\w+) operations/,
    count: treeOperationSchema.options.length,
    occurrences: 10,
    matters: "the count five lessons and the schedule lean on, and the limit that makes a delta gateable",
  },
]

const COURSE: ReadonlyMap<string, string> = new Map(
  readdirSync(COURSE_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => [file, readFileSync(join(COURSE_DIR, file), "utf8")])
)

type Sighting = { readonly file: string; readonly word: string }

const sightings = (phrase: RegExp): readonly Sighting[] =>
  [...COURSE.entries()].flatMap(([file, text]) =>
    [...text.matchAll(new RegExp(phrase, "g"))].flatMap((match): readonly Sighting[] => {
      const word = match[1]

      return word === undefined || !isNumberWord(word) ? [] : [{ file, word }]
    })
  )

describe("what a lesson says about a list in the runtime", () => {
  it.each(CLAIMS)("counts $what correctly, in $occurrences places", (claim) => {
    const found = sightings(claim.phrase)

    expect(
      found.length,
      `${claim.phrase} should be counting in ${claim.occurrences} places across lessons/ — ` +
        `if a lesson reworded it, move the pin; if it stopped counting, lower it`
    ).toBe(claim.occurrences)

    for (const { file, word } of found) {
      expect(
        word.toLowerCase(),
        `${file} counts ${claim.what} and the list has moved (${claim.matters})`
      ).toBe(wordFor(claim.count))
    }
  })

  /**
   * The registry is only worth what its phrases are worth. A phrase carrying its
   * own global flag would be reused across files with its `lastIndex` in tow and
   * would skip matches; the runner adds the flag per file itself.
   */
  it("registers phrases that are findable, so a rewording fails rather than escapes", () => {
    for (const { what, phrase } of CLAIMS) {
      expect(phrase.flags, `${what}: the runner adds the global flag itself`).not.toContain("g")
      expect(phrase.source, `${what}: the number word is the capture group`).toContain("(\\w+)")
    }
  })
})
