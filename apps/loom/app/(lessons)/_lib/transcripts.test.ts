import { describe, expect, it } from "vitest"

import { transcriptText } from "./exercises"
import { readLesson, section } from "./lesson"
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
 * How many plain fences across the course are currently recognised as
 * transcripts. Pinned so that a change in how the exercises print — which would
 * make every block stop matching and so stop being recognised — fails here
 * rather than quietly checking nothing.
 *
 * 89 since lesson 25 (exhaustiveness), which added six — one per exercise, with
 * its two compiler diagnostics and its pair of type-check counts fenced as
 * `text` rather than plain, because no program in this course prints them. It
 * was 83 after lesson 18 was repaired on 14 September (two exercises added, one
 * for the reason the runtime could not produce until the ceiling landed and one
 * for the reason no tree and no source can cause), 81 after lesson 24 (silence),
 * which added eight — seven exercises, one of which prints its transcript in two
 * blocks — 73 after lesson 23, and 66 when this was written.
 */
const RECOGNISED_TRANSCRIPTS = 89

/** Printable, so that a byte a markdown file cannot hold compares as the space it is written as. */
const printable = (line: string): string =>
  line.replace(/[\u0000-\u001f\u007f]/g, " ").trim()

const linesOf = (block: string): readonly string[] =>
  block
    .split("\n")
    .map(printable)
    .filter((line) => line !== "")

const transcriptsIn = async (
  file: string
): Promise<{ readonly recognised: number; readonly drifted: readonly string[] }> => {
  const blocks = section(readLesson(file), TRY_IT)?.blocks ?? []
  const { run } = await runExercises(blocks)

  if (run.kind === "failed") return { recognised: 0, drifted: [run.message] }

  const printed = run.outputs
    .map(transcriptText)
    .join("\n")
    .split("\n")
    .map(printable)

  const shown = (line: string): boolean => printed.some((one) => one === line || one.includes(line))

  const recorded = blocks.filter(
    (block): block is Extract<typeof block, { kind: "code" }> =>
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

describe("what a lesson says its exercises print", () => {
  let total = 0

  for (const entry of WRITTEN_LESSONS) {
    if (entry.file === undefined) continue

    it(`is what lesson ${entry.number} actually prints`, async () => {
      const { recognised, drifted } = await transcriptsIn(entry.file as string)

      total += recognised

      expect(drifted).toEqual([])
    }, 60_000)
  }

  it("still recognises as many transcripts as it did when this was written", () => {
    expect(total).toBe(RECOGNISED_TRANSCRIPTS)
  })
})
