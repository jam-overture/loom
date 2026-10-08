import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import {
  dispositionReasonCodeSchema,
  ESCALATION_LADDER,
  FIXED_STAKE_FACTOR_CODES,
  MEASURED_STAKE_FACTOR_CODES,
  STAKE_FACTOR_CODES,
  treeOperationSchema,
} from "@jam-overture/loom"
import { BEHAVIOUR_NAMES } from "@jam-overture/loom/react"
import { describe, expect, it } from "vitest"

import { readLesson, section, TRY_IT } from "./lesson"
import { linesOf, recordedIn } from "./marks"
import { COURSE_DIR } from "./source"
import { WRITTEN_LESSONS } from "./syllabus"

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
  {
    what: "the Gate's stakes rules",
    phrase: /stakes vocabulary has (\w+) rules/,
    count: STAKE_FACTOR_CODES.length,
    occurrences: 3,
    matters:
      "the sentence lesson 34 states the partition in, its self-check, and Set AM — the same " +
      "three places lesson 09's ladder was wrong in twice, about the list one level down",
  },
  {
    what: "the stakes rules a policy field decides",
    phrase: /(\w+) of those rules read a field of the policy/,
    count: MEASURED_STAKE_FACTOR_CODES.length,
    occurrences: 1,
    matters:
      "the half lesson 34 says can be asked again — a rule that joins it by derivation reaches " +
      "both exported lists and neither sentence",
  },
  {
    what: "the stakes rules fixed at their code",
    phrase: /(\w+) are fixed at their code/,
    count: FIXED_STAKE_FACTOR_CODES.length,
    occurrences: 1,
    matters: "the other half, where the recorded code is the whole of the answer",
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

/**
 * A sentence that counts a list a few lines under it — and the one case in this
 * file where the second copy can be *derived* rather than registered.
 *
 * `lessons/README.md` said *reading one there differs from reading the file in
 * exactly three ways* above a list of four, and had said it since the fourth was
 * added. Every check in this repository was green throughout: no runtime list is
 * being counted, so the registry above has nothing to hold it against; the count
 * is of a list in the same document, four lines below the number.
 *
 * Which makes it lesson 28's first remedy rather than its third. There is no
 * author to ask and nothing to register — the second copy already exists, as the
 * list itself, and what was missing was the comparison. So this reads the number
 * word out of the sentence, counts the items in the list that follows it, and
 * requires them to agree. Adding a way, removing one, or rewording the sentence
 * all fail here, and the obligation is discharged by a program rather than by
 * somebody remembering, which is the whole argument for deriving.
 *
 * It is deliberately not general. A pattern that went looking for every *N
 * things* in the course would find the ones that count a list, the ones that
 * count something in `src/` — that is the registry above — and the ones that
 * count nothing at all, and would have to guess between them. Each entry here is
 * a sentence somebody decided is counting the list under it.
 */
const SELF_COUNTED: readonly {
  readonly file: string
  readonly what: string
  readonly phrase: RegExp
}[] = [
  {
    file: "README.md",
    what: "the ways a lesson on the surface differs from the lesson in this directory",
    phrase: /differs from reading the file in exactly (\w+) ways/,
  },
]

/**
 * The top-level items of the markdown list that starts after a line, counted.
 *
 * A continuation line is indented and an item is not, which is the only
 * distinction needed here: the lists this is pointed at are bulleted, one
 * paragraph deep, and end at the first line that is neither blank, indented, nor
 * a bullet.
 */
const itemsAfter = (lines: readonly string[], from: number): number => {
  const start = lines.findIndex((line, index) => index > from && line.startsWith("- "))

  if (start < 0) return 0

  let items = 0

  for (const line of lines.slice(start)) {
    if (line.startsWith("- ")) items += 1
    else if (line !== "" && !line.startsWith("  ")) break
  }

  return items
}

describe("a sentence that counts the list under it", () => {
  it.each(SELF_COUNTED)("agrees with the list in $file, counting $what", ({ file, what, phrase }) => {
    const text = COURSE.get(file)

    expect(text, `${file} is not in ${COURSE_DIR}`).toBeDefined()

    const lines = (text ?? "").split("\n")
    const at = lines.findIndex((line) => phrase.test(line))

    expect(at, `${file} no longer contains the sentence counting ${what}`).toBeGreaterThanOrEqual(0)

    const word = phrase.exec(lines[at] ?? "")?.[1] ?? ""

    expect(
      word.toLowerCase(),
      `${file} counts ${what} and the list under it has ${itemsAfter(lines, at)} items`
    ).toBe(wordFor(itemsAfter(lines, at)))
  })
})

/**
 * A sentence in a lesson, held against a number the transcript above it printed.
 *
 * This is the third place a second copy can come from, and lesson 28 puts them
 * in order of preference: **derive it**, duplicate it in a form that can
 * disagree, register it by hand. The registry at the top of this file is the
 * third of those — somebody writes down a phrase and the list in `src/` that
 * settles it. `SELF_COUNTED` is the first, with the source four lines below the
 * sentence. This is the first as well, with the source one step further away and
 * the step is what makes it worth having: **the number is read off the
 * transcript, and the transcript is already held against a real run** by
 * `transcripts.test.ts`. Nothing new is derived and no third copy is
 * manufactured. Two checks compose, and a sentence becomes a function of what
 * the code actually printed.
 *
 * ## Why this exists, which is an incident rather than a tidiness
 *
 * Five fences in this course carry a `moves:` mark (`marks.ts`), and two of them
 * carry it for this reason in as many words: *the paragraphs under it are prose
 * about these lines and no check reads prose.*
 *
 * On 2 October a test for `readBoxes` moved three rows of lesson 32's table. On
 * 4 October the declaration pass moved seven lines of lesson 24's. Both times
 * the numbers were corrected from outside this lane, the same day, which is
 * exactly what the convention asks of a lane that has just made somebody's suite
 * red. Both times the paragraph drawing the conclusion under them was left
 * saying the opposite, on `main` — three paragraphs reading "Zero and zero"
 * under a transcript saying 102. Nothing was wrong with how either was handled.
 * What was missing was any way for a check to notice, so the mark asked a human
 * to, twice, and twice nobody did.
 *
 * A mark is a sentence addressed to whoever trips over it. This is the half of
 * it a program can do: where the prose under a marked fence **counts** something
 * the fence prints, correcting the fence without reading the paragraph now fails,
 * naming the sentence and the file. The remedy is one word, in prose, and the
 * message says which word — which is the same class of edit `docs/routines.md`
 * already expects of a lane that corrects a lesson transcript.
 *
 * ## What it does not reach, stated here rather than discovered later
 *
 * **A sentence about the past looks exactly like a claim about now.** Lesson 24
 * says *both of those counts were zero when this lesson was written*, which is
 * true, historical, and indistinguishable to a regular expression from the stale
 * sentence it replaced. So a claim is registered per sentence by somebody who has
 * read it, never found by pattern — the same rule the registry above follows, for
 * the same reason.
 *
 * **And most of what a marked fence's prose says carries no count at all.**
 * Lesson 32's own account of what drifted on 2 October is a *classification* —
 * `in code` against `in prose` — and only one sentence of it counts anything.
 * That sentence is registered below and the rest is reached by reading. A count
 * is the cheapest second copy a sentence can carry and it is not the only thing
 * a sentence says.
 */
type TranscriptClaim = {
  readonly lesson: number
  readonly file: string
  /** What the sentence is counting, for the failure message. */
  readonly what: string
  /** The sentence, with the number word as its one capture group. */
  readonly phrase: RegExp
  /** How many times the course says it. Pinned, so a rewording fails rather than escapes. */
  readonly occurrences: number
  /** A line only the settling fence has, which is how it is found among the untagged ones. */
  readonly fence: RegExp
  /** The number the sentence is counting, read off that fence. */
  readonly count: (lines: readonly string[]) => number
  readonly matters: string
}

/** The quoted strings of a `words:` line under a heading, counted. */
const quotedAfter = (lines: readonly string[], heading: RegExp): number => {
  const at = lines.findIndex((line) => heading.test(line))
  const words = lines.slice(at + 1).find((line) => line.startsWith("words:"))

  return [...(words ?? "").matchAll(/"[^"]*"/g)].length
}

/** The comma-separated names a line ends in, counted. */
const namesOn = (lines: readonly string[], label: RegExp): number => {
  const names = lines.flatMap((line) => label.exec(line)?.[1] ?? [])

  return names.length === 0 ? 0 : (names[0] ?? "").split(/,\s*/).filter((name) => name !== "").length
}

/** The one number a line states. */
const numberOn = (lines: readonly string[], label: RegExp): number =>
  Number(lines.flatMap((line) => label.exec(line)?.[1] ?? [])[0] ?? NaN)

/** The lines matching something, counted. */
const rowsMatching = (lines: readonly string[], row: RegExp): number =>
  lines.filter((line) => row.test(line)).length

const TRANSCRIPT_CLAIMS: readonly TranscriptClaim[] = [
  {
    lesson: 24,
    file: "24-silence.md",
    what: "the words the metrics band shows",
    phrase: /is the (\w+) words the band shows/,
    occurrences: 1,
    fence: /^primitives registered:/,
    count: (lines) => quotedAfter(lines, /^copyIn\(metrics band/),
    matters:
      "the sentence that says what the reading came back with on the day the library spoke — " +
      "the fence whose numbers moved on 4 October with three paragraphs left asserting zero",
  },
  {
    lesson: 29,
    file: "29-readership.md",
    what: "the control zeros above the census",
    phrase: /The (\w+) zeros are the control/,
    occurrences: 1,
    fence: /^primitives with a declared prop nothing read:/,
    count: (lines) => rowsMatching(lines, /: 0$/),
    matters:
      "the sentence the whole comparison rests on, and the one the mark on that fence " +
      "explicitly declines to cover — a fourth control line is a change this prose is wrong about",
  },
  {
    lesson: 32,
    file: "32-layout.md",
    what: "the functions the harness hands to a browser",
    phrase: /are the (\w+) that say what each function handed to the page/,
    occurrences: 1,
    fence: /^top-level consts in playwright\.ts:/,
    count: (lines) => numberOn(lines, /^of those, handed to the page: (\d+)/),
    matters:
      "the instruction telling a reader how many lines of exercise G to predict — a fifth " +
      "function handed to the page makes it ask for four predictions out of five",
  },
  {
    lesson: 32,
    file: "32-layout.md",
    what: "the faculties `capture.ts` names in prose rather than calling",
    phrase: /The (\w+) `in prose` rows on `capture\.ts`/,
    occurrences: 1,
    fence: /^top-level consts in playwright\.ts:/,
    count: (lines) => rowsMatching(lines, /capture\.ts in prose/),
    matters:
      "the one sentence in this lesson's account of that table that counts rather than " +
      "classifies, in the fence whose rows moved on 2 October",
  },
  {
    lesson: 33,
    file: "33-shortfall.md",
    what: "the starter primitives that read a binding",
    phrase: /Today (\w+) primitives read a binding/,
    occurrences: 1,
    fence: /^primitives that read a binding:/,
    count: (lines) => namesOn(lines, /^primitives that read a binding: (.+)$/),
    matters:
      "the sentence under the last three lines of lesson 33, where the state of play is the " +
      "point and a further primitive reading a binding would make it wrong. The pin is the " +
      "`Today …` sentence and not the `On the day it was written …` one above it, which is " +
      "history and says two on purpose",
  },
  {
    lesson: 35,
    file: "35-instruments.md",
    what: "the primitives in the library a binding is read by",
    phrase: /A binding is read by (\w+) of them/,
    occurrences: 1,
    fence: /^primitives registered:/,
    count: (lines) => namesOn(lines, /^primitives that read a binding: (.+)$/),
    matters:
      "the sentence under lesson 35's exercise E, whose subject is that the library's own " +
      "audit never answers a bound primitive — so how many of them there are to answer is " +
      "the figure the paragraph turns on. A sixth bound primitive makes it wrong",
  },
]

/** The untagged fences of a lesson's Try it, as the comparison sees their lines. */
const fencesIn = (file: string): readonly (readonly string[])[] =>
  recordedIn(section(readLesson(file), TRY_IT)?.blocks ?? []).map(({ block }) => linesOf(block.code))

describe("a sentence that counts what the transcript above it printed", () => {
  it.each(TRANSCRIPT_CLAIMS)(
    "holds lesson $lesson's sentence about $what to its fence",
    ({ file, what, phrase, occurrences, fence, count, matters }) => {
      const settling = fencesIn(file).filter((lines) => lines.some((line) => fence.test(line)))

      expect(
        settling.length,
        `${file}: ${fence} should find exactly one untagged fence in ${TRY_IT} — if the ` +
          `exercise was renumbered or its output reshaped, point this at a line the new one has`
      ).toBe(1)

      const printed = count(settling[0] ?? [])

      expect(printed, `${file}: counting ${what} off its fence produced nothing usable`).toBeGreaterThan(0)

      const found = sightings(phrase)

      expect(
        found.length,
        `${phrase} should be counting in ${occurrences} places across lessons/ — if a lesson ` +
          `reworded it, move the pin; if it stopped counting, lower it`
      ).toBe(occurrences)

      for (const { file: where, word } of found) {
        expect(
          word.toLowerCase(),
          `${where} counts ${what} and the transcript above it now prints ${printed} ` +
            `(${matters})`
        ).toBe(wordFor(printed))
      }
    }
  )

  /**
   * Every marked fence has at least one of these, and that is the point of the
   * check rather than a happy accident.
   *
   * A mark says *the paragraphs under this are prose about these lines*. Where
   * those paragraphs count something, this file holds them; where they do not,
   * the mark is still only a sentence to a human. So the gap is worth a failure
   * naming the fence.
   *
   * **It is a pin on the five that exist and not a law that a mark requires
   * one.** A fence whose prose declines to count has nothing here to derive, and
   * declining is the better fix wherever it reads naturally — lessons 22 and 23
   * do it deliberately for the size of the primitive library. The way to say so
   * is to name the fence here, with the reason, rather than to weaken this.
   */
  it("covers the prose under every fence that carries a mark", () => {
    const uncovered = WRITTEN_LESSONS.flatMap((entry) => {
      if (entry.file === undefined) return []

      const file = entry.file

      return recordedIn(section(readLesson(file), TRY_IT)?.blocks ?? [])
        .filter(({ moves }) => moves !== undefined)
        .map(({ block }) => linesOf(block.code))
        .filter(
          (lines) =>
            !TRANSCRIPT_CLAIMS.some(
              (claim) => claim.file === file && lines.some((line) => claim.fence.test(line))
            )
        )
        .map((lines) => `${file}: ${lines[0] ?? "(empty fence)"}`)
    })

    expect(
      uncovered,
      "a fence carrying a moves: mark has no sentence held against it, so correcting its " +
        "numbers from outside this lane would leave the paragraphs under it unread — register " +
        "the sentence that counts, or say here why its prose declines to count.\n" +
        JSON.stringify(uncovered, null, 2)
    ).toEqual([])
  })
})
