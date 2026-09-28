import { describe, expect, it } from "vitest"

import { transcriptText } from "./exercises"
import { readLesson, section } from "./lesson"
import type { Block } from "./markdown"
import { runExercises } from "./run"
import { WRITTEN_LESSONS } from "./syllabus"

/**
 * The half of the course's promise that nothing was checking.
 *
 * `run.test.ts` compiles every Try it program and runs it against this
 * checkout's `src/`, so a lesson whose code has stopped working is a red suite
 * naming the lesson. That is not the same promise. A program can keep running
 * perfectly and print something other than what the lesson says it prints, and
 * on 11 September two lessons did. Lesson 22 claimed 70 registered primitives
 * and 10 declaring a target, when the library had grown to 91 and 12. Lesson 15
 * was the worse of the two: it did not merely print stale numbers, it taught
 * that a component throwing under every configuration is absent from
 * `throwsOnDeclaredProps` — which was true when it was written, and which
 * [0090] changed three days later, on the strength of that very exercise.
 *
 * None of that was visible at `/lessons`, which renders the run rather than a
 * transcript. It was visible only in the markdown — which is the source, the
 * reviewed artefact, and the version you read on a train. A lesson that lies
 * about what the code does is worse than no lesson, because the reader trusts it
 * over their own eyes.
 *
 * **What counts as a transcript**, since a Try it section also holds
 * illustrations — a tree drawn in ASCII, a list of candidate URLs — that are
 * prose in a fence and print nowhere. A plain fence is taken to be a transcript
 * when at least one of its lines appears in what the program actually printed;
 * every line is then required to. An illustration shares no line with the output
 * and is left alone.
 *
 * That heuristic has one failure mode: a transcript whose every single line has
 * drifted looks like an illustration and would be skipped in silence. So the
 * number of blocks it recognises is pinned. A format change that moves the whole
 * course out from under this check fails here rather than passing quietly.
 *
 * **Control characters are normalised to a space on both sides**, and lesson 18
 * is why. A data request's key is `${source}\0${params}` — a NUL separator,
 * chosen in `plan.ts` because it is a byte that can occur in neither a source id
 * nor JSON, so two different questions cannot collide on one key. A markdown
 * file cannot hold that byte, so the lesson prints the key with a space where
 * the NUL is, which is the honest rendering rather than a drifted one. Comparing
 * raw bytes would demand a transcript no text file can contain.
 */

const TRY_IT = "Try it"

/**
 * The other place a lesson prints what its code did.
 *
 * Lessons 01 to 11 hold their exercise transcripts under `## Answers`, beside
 * the answers to the questions the exercises ask; from lesson 12 on they stand
 * under Try it. Only the second half was ever compared to anything, and the pin
 * below could not notice, because it counts Try it blocks and there were always
 * exactly as many of those as there were.
 *
 * What that cost is on the record. Lesson 05's exercise D emits into a sink that
 * throws, and its answer said the exception reaches the caller — which was true
 * when it was written, was made false the next day by 0042, and stayed in the
 * lesson for seven weeks with a green suite either side of it. The lesson had
 * found that defect itself, and the report that fixed it predicted in writing
 * that this lesson would be left wrong. Nothing was in a position to act on the
 * prediction.
 */
const ANSWERS = "Answers"

/**
 * How many plain fences across the course are currently recognised as
 * transcripts. Pinned so that a change in how the exercises print — which would
 * make every block stop matching and so stop being recognised — fails here
 * rather than quietly checking nothing.
 *
 * 125 since lesson 30 (rendezvous), which added seven — one per exercise, each a
 * whole transcript in a single block. Two of them print an empty string as the
 * whole of what a page says, which is the lesson's subject rather than a fence
 * that lost its content: a binding answered under a name nothing reads draws the
 * primitive's empty region, and a transcript that elided that would be eliding
 * the finding. None of them prints the size of the primitive library; exercise G
 * prints it on a line of its own and the prose under it declines to repeat the
 * number, on lessons 22 and 24's precedent.
 *
 * It was 118 after lesson 29 (readership), which added seven — one per exercise, each a
 * whole transcript in a single block. Exercise B's second fence is a `tsc`
 * diagnostic and is marked `text` rather than left plain, on lesson 25's
 * precedent: no program in this course prints a compiler error, so a plain fence
 * there would be a transcript nothing could match. That lesson's exercise C is
 * also the one block in the course that is deliberately a second copy of a fact
 * about `src/primitives/` — the set of primitives with a conditionally-read prop —
 * and is expected to go red when a primitive joins it, which is the point of the
 * lesson rather than a cost it forgot to count.
 *
 * It was 111 after lesson 28 (corroboration), which added nine — seven exercises, two
 * of which split their output across two fences so that the half about the
 * check and the half about the people writing the records are not read as one
 * thing. Every one of them prints a verdict rather than a total, and the lesson
 * argues the reason in its own Try it: a transcript is a second copy of
 * whatever it prints, and these exercises read a directory that six routines
 * add to three times a day. Printing the size of that directory here would make
 * a red lessons build the ordinary consequence of writing a decision record —
 * which is what the size of the primitive library has already done to lessons
 * 22, 23 and 24.
 *
 * It was 102 after lesson 27 (scale), which added seven — one per exercise, every one
 * of them a whole transcript in a single block, and two of them carrying a line
 * of CSS read out of the library's own stylesheet rather than computed. It was
 * 95 after lesson 26 (liveness), which added six on the same terms; 89 after
 * lesson 25
 * (exhaustiveness), which added six, with its two compiler diagnostics and its
 * pair of type-check counts fenced as `text` rather than plain, because no
 * program in this course prints them; 83 after lesson 18 was repaired on
 * 14 September (two exercises added, one for the reason the runtime could not
 * produce until the ceiling landed and one for the reason no tree and no source
 * can cause), 81 after lesson 24 (silence), which added eight — seven exercises,
 * one of which prints its transcript in two blocks — 73 after lesson 23, and 66
 * when this was written.
 */
const RECOGNISED_TRANSCRIPTS = 125

/**
 * The same, for the `## Answers` sections of lessons 01 to 11.
 *
 * Fifty-one blocks: nine in lesson 05, eight in 09, seven in 11, six each in 06,
 * 08 and 10, five in 07 and four in 04. Lessons 02 and 03 print nothing and 01
 * has no exercises, so they contribute none and always did.
 *
 * It was 50 until 26 September, when lesson 11 gained a seventh: the exercise
 * that hangs a client and gets an answer anyway, written the same day the
 * declaration check found that lesson printing a `ModelClient.complete` the
 * runtime had stopped having.
 *
 * It is pinned for the reason the other one is, and with one extra failure mode
 * worth naming: these fences sit under a heading the reader is meant to reach
 * last, so nobody is looking at them. A format change that stopped every block
 * matching would take this from 50 to 0 and, without the pin, read as a clean
 * sheet.
 */
const RECOGNISED_ANSWERS = 51

/**
 * Lines under `## Answers` that are the author speaking rather than the program
 * printing, per lesson, and why each lesson is allowed any.
 *
 * Lesson 04 is the only one. Its Q4 block labels two transcripts `move:` and
 * `rebuild:` so that a reader can tell which run produced which, and its Q5
 * block appends `a different node at n_4`, `the card itself, moved` and `a
 * look-alike is not it` to three otherwise identical-looking lines. Every value
 * in both is correct — they were checked by hand, line by line, against a run.
 *
 * The alternative was to flatten them into raw terminal output, and that is the
 * trade this file declines to make: the annotation is the explanatory device,
 * and a check that demands its removal has bought a comparison by spending the
 * thing being compared. So the count is declared and held **exactly**. Annotate
 * a sixth line and this fails; remove one and it fails; let a real transcript
 * drift and it fails, because a drift makes six.
 *
 * What it cannot catch is a real drift arriving in the same commit that removes
 * an annotation. That is the residue, it is small, and it is written down rather
 * than discovered.
 */
const ANNOTATED: Readonly<Record<string, number>> = {
  "04-identity.md": 5,
}

/**
 * Printable, so that a byte a markdown file cannot hold compares as the space it
 * is written as — and so that a run of spaces compares as one.
 *
 * The second half is what lets an Answers fence be checked at all. Lesson 08
 * lays its six transcripts out in columns (`stakes: low     reversible: true`)
 * because six rows of settings are unreadable otherwise, and lesson 04 indents
 * a wrapped JSON line under the one above it. Neither is drift and both would
 * be reported as drift by a byte comparison.
 *
 * It is the one normalisation here that cannot weaken the check, which is the
 * test to apply to any other one proposed: **a value is never whitespace**, so
 * collapsing runs of spaces can hide a difference in layout and nothing else.
 * Stripping a trailing annotation or rejoining a wrapped line would each hide a
 * class of real difference, and neither is done — see `ANNOTATED` below for what
 * happens to the fences that would have needed them.
 *
 * Applying it to Try it as well changed nothing there: the same 102 blocks are
 * recognised and none of them drifted before or after. One rule, two sections.
 */
const printable = (line: string): string =>
  line.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/ {2,}/g, " ").trim()

const linesOf = (block: string): readonly string[] =>
  block
    .split("\n")
    .map(printable)
    .filter((line) => line !== "")

type Comparison = { readonly recognised: number; readonly drifted: readonly string[] }

const compare = (blocks: readonly Block[], printed: readonly string[]): Comparison => {
  const shown = (line: string): boolean => printed.some((one) => one === line || one.includes(line))

  const recorded = blocks.filter(
    (block): block is Extract<Block, { kind: "code" }> =>
      block.kind === "code" && block.language === undefined
  )

  let recognised = 0
  const drifted: string[] = []

  for (const block of recorded) {
    const lines = linesOf(block.code)

    if (lines.length === 0 || !lines.some(shown)) continue

    recognised += 1

    for (const line of lines) {
      if (!shown(line)) drifted.push(line)
    }
  }

  return { recognised, drifted }
}

const transcriptsIn = async (
  file: string
): Promise<{ readonly tryIt: Comparison; readonly answers: Comparison }> => {
  const doc = readLesson(file)
  const exercises = section(doc, TRY_IT)?.blocks ?? []
  const { run } = await runExercises(exercises)

  if (run.kind === "failed") {
    const failed = { recognised: 0, drifted: [run.message] }

    return { tryIt: failed, answers: { recognised: 0, drifted: [] } }
  }

  const printed = run.outputs
    .map(transcriptText)
    .join("\n")
    .split("\n")
    .map(printable)

  return {
    tryIt: compare(exercises, printed),
    answers: compare(section(doc, ANSWERS)?.blocks ?? [], printed),
  }
}

describe("what a lesson says its exercises print", () => {
  let underTryIt = 0
  let underAnswers = 0

  for (const entry of WRITTEN_LESSONS) {
    if (entry.file === undefined) continue

    const file = entry.file as string

    it(`is what lesson ${entry.number} actually prints`, async () => {
      const { tryIt, answers } = await transcriptsIn(file)

      underTryIt += tryIt.recognised
      underAnswers += answers.recognised

      expect(tryIt.drifted).toEqual([])

      const allowed = ANNOTATED[file] ?? 0

      if (allowed === 0) {
        expect(answers.drifted).toEqual([])
      } else {
        expect(
          answers.drifted.length,
          `${file}: ${allowed} lines under Answers are annotation rather than output, and this ` +
            `is not that number — a line was annotated, un-annotated, or has genuinely drifted. ` +
            `Read them: ${JSON.stringify(answers.drifted)}`
        ).toBe(allowed)
      }
    }, 60_000)
  }

  it("still recognises as many transcripts as it did when this was written", () => {
    expect(underTryIt).toBe(RECOGNISED_TRANSCRIPTS)
  })

  it("still recognises as many answer transcripts as it did when this was written", () => {
    expect(underAnswers).toBe(RECOGNISED_ANSWERS)
  })
})
