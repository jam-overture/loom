import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { ESCALATION_LADDER } from "./runtime/gate.js"
import { STAKE_FACTOR_CODES } from "./runtime/stakes.js"
import { treeOperationSchema } from "./tree/delta.js"

/**
 * Sentences in `decisions/` that count a list in this package, held against it.
 *
 * A record states a decision, and a decision is not the kind of thing a test can
 * check. But a record also describes the *shape* the decision produced, and some
 * of that shape is a number: how many rules the ladder has, how many operations
 * a delta may contain. Those numbers are claims about code in this directory,
 * and until now nothing in the repository connected one to the other — a list
 * grew, the sentence counting it did not, and `pnpm verify` had no opinion.
 *
 * That is not hypothetical and it is not cheap. The Gate gained a sixth rule on
 * 4 August and a seventh on 19 August; the sentence a reader takes the Gate from
 * said six throughout. A lesson written from it repeated the wrong count eleven
 * times, numbered ten cross-references one too low, and asked the maintainer two
 * review questions about a list with a rung missing. Nothing was wrong with the
 * runtime and nothing was wrong with the decision. What was wrong was a number in
 * a sentence, for a week, in the record four surfaces read first.
 *
 * ## Why this is a registry rather than a sweep
 *
 * Every number in every record could be scanned for, and the result would be a
 * test that fails on prose. A count is only checkable when something in `src/`
 * *is* the list — most numbers in a record are about the world, an argument, or
 * a thing that no longer exists. So each claim is registered here deliberately,
 * with the expression that finds it and the list that settles it, and a record
 * whose count nothing can check is simply not registered.
 *
 * ## Adding a claim
 *
 * Register the record, a pattern that matches the sentence **once**, and the
 * list. The pattern matching exactly once is part of the check: a record
 * reworded so the sentence no longer matches fails here rather than quietly
 * dropping out of the registry, which is the way a check like this rots.
 */

const RECORDS = "decisions"

/** Counts in a record are written as words, because a record is prose. */
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
  "thirteen",
  "fourteen",
] as const

const wordFor = (count: number): string => {
  const word = NUMBER_WORDS[count]

  if (word === undefined) {
    throw new Error(`loom: no number word for ${count} — add one, or write the claim as a digit`)
  }

  return word
}

type RecordClaim = {
  readonly record: string
  /** Finds the counted phrase, with the number word as its one capture group. */
  readonly sentence: RegExp
  /** What the runtime says, at the moment the test runs. */
  readonly count: number
  /** What a reader loses when this goes stale — the reason it is worth a test. */
  readonly matters: string
}

const CLAIMS: readonly RecordClaim[] = [
  {
    record: "0002-gate-is-a-pure-function-of-two-axes.md",
    sentence: /The decision is (\w+) ordered rules/,
    count: ESCALATION_LADDER.length,
    matters: "the sentence a reader takes the Gate's shape from",
  },
  {
    record: "0007-confidence-is-self-graded-and-must-be-calibrated.md",
    sentence: /Two of the Gate's (\w+) rules read/,
    count: ESCALATION_LADDER.length,
    matters: "the same count, in the record that explains what confidence is for",
  },
  {
    record: "0001-tree-and-delta-as-the-unit-of-change.md",
    sentence: /The operation count is held at (\w+)/,
    count: treeOperationSchema.options.length,
    matters: "the limit that makes everything AI produces gateable",
  },
  {
    record: "0198-a-refusal-records-which-rules-it-broke-and-the-rules-names-are-a-closed-vocabulary.md",
    sentence: /one of (\w+) fixed strings/,
    count: STAKE_FACTOR_CODES.length,
    matters: "the argument for letting the codes into a retained corpus is that the set is closed and small",
  },
]

const textOf = (record: string): string => readFileSync(join(RECORDS, record), "utf8")

describe("what a record says about a list in this package", () => {
  it.each(CLAIMS)("counts correctly in $record", ({ record, sentence, count }) => {
    const matches = [...textOf(record).matchAll(new RegExp(sentence, "g"))]

    expect(matches.length, `the registered sentence should appear once in ${record}`).toBe(1)
    expect(matches[0]?.[1], `${record} counts a list in src/, and the list has moved`).toBe(
      wordFor(count)
    )
  })

  /**
   * The registry is only worth what its patterns are worth, so this asserts the
   * patterns are specific enough to be about one sentence rather than a shape
   * that happens to occur.
   */
  it("registers claims that are findable, so a rewording fails rather than escapes", () => {
    for (const { record, sentence } of CLAIMS) {
      expect(sentence.flags, `${record}: the runner adds the global flag itself`).not.toContain("g")
      expect(sentence.source, `${record}: the number word is the capture group`).toContain("(\\w+)")
    }
  })
})
