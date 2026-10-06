import { describe, expect, it } from "vitest"

import { exerciseChunks, exerciseProgram } from "./exercises"
import { readLesson, section, TRY_IT } from "./lesson"
import { parseBlocks } from "./markdown"
import { runExercises } from "./run"
import { WRITTEN_LESSONS } from "./syllabus"

/**
 * The claim `lessons/README.md` has been making since lesson 01, as a test.
 *
 * "Every exercise in these lessons was executed before it was written down."
 * That was true and it was checked by one routine remembering to do it, which
 * is the same arrangement as no check at all — and two of the first three
 * lessons shipped with an output that was wrong anyway. What follows is the
 * mechanical version: every Try it program in the course is compiled and run
 * against this checkout's `src/`, and a lesson whose exercises no longer run is
 * a red suite naming the lesson.
 *
 * This is deliberately a merge gate for the whole repository and not only for
 * this lane. Renaming an export in `src/` breaks the course silently today;
 * after this it breaks it loudly, in the run that did the renaming, with the
 * lesson named and the error printed. The course is downstream of the runtime
 * and this is what being downstream should feel like.
 */

describe("the course's exercises", () => {
  for (const entry of WRITTEN_LESSONS) {
    if (entry.file === undefined) continue

    it(`runs the exercises in lesson ${entry.number}`, async () => {
      const document = readLesson(entry.file as string)
      const blocks = section(document, TRY_IT)?.blocks ?? []
      const { run } = await runExercises(blocks)

      expect(run.kind === "failed" ? run.message : "ran").toBe("ran")
    }, 30_000)
  }
})

describe("what counts as part of the program", () => {
  const chunksOf = (markdown: string) => exerciseChunks(parseBlocks(markdown))

  it("takes a fence that imports something", () => {
    const chunks = chunksOf('```ts\nimport { it } from "vitest"\n```')

    expect(chunks.map((chunk) => chunk.runs)).toEqual([true])
  })

  it("takes a fence that registers a test without importing anything", () => {
    const chunks = chunksOf('```ts\nit("continues the file above", () => {})\n```')

    expect(chunks.map((chunk) => chunk.runs)).toEqual([true])
  })

  /**
   * Lesson 03's third fence, which is four operation literals with no statement
   * around them. Concatenating it into the program is a `ReferenceError` on the
   * first line, and it is the reason this distinction exists at all.
   */
  it("leaves an illustration out", () => {
    const chunks = chunksOf('```ts\n{ op: "remove", nodeId: ids.page }   // the root\n```')

    expect(chunks.map((chunk) => chunk.runs)).toEqual([false])
  })

  it("ignores a fence that is not TypeScript", () => {
    expect(chunksOf("```bash\npnpm vitest run\n```")).toEqual([])
  })

  it("numbers chunks by their position among the code fences, marker and all", () => {
    const chunks = chunksOf(
      ['```ts\nimport { it } from "vitest"\n```', "```ts\n{ op: \"remove\" }\n```", '```ts\nit("last", () => {})\n```'].join(
        "\n\n"
      )
    )

    expect(chunks.map((chunk) => chunk.index)).toEqual([0, 1, 2])
    expect(exerciseProgram(chunks)).toContain("__chunk(2);")
    expect(exerciseProgram(chunks)).not.toContain("__chunk(1);")
  })
})

describe("running a program", () => {
  it("attributes each fence's output to the fence that registered it", async () => {
    const markdown = [
      '```ts\nimport { describe, it } from "vitest"\n\ndescribe("first", () => {\n  it("prints a number and an object", () => {\n    console.log(1, { a: [2, 3] })\n  })\n})\n```',
      '```ts\nit("prints later", async () => {\n  await Promise.resolve()\n  console.log("after the await")\n})\n```',
    ].join("\n\n")

    const { run } = await runExercises(parseBlocks(markdown))

    expect(run).toEqual({
      kind: "ran",
      outputs: [
        { index: 0, tests: [{ name: "prints a number and an object", output: ["1 { a: [ 2, 3 ] }"] }] },
        { index: 1, tests: [{ name: "prints later", output: ["after the await"] }] },
      ],
    })
  })

  it("reports a program that throws rather than refusing to build", async () => {
    const { run } = await runExercises(
      parseBlocks('```ts\nimport { it } from "vitest"\n\nit("throws", () => {\n  throw new Error("nope")\n})\n```')
    )

    expect(run.kind).toBe("failed")
    expect(run.kind === "failed" ? run.message : "").toContain("nope")
  })

  it("says which import it could not resolve", async () => {
    const { run } = await runExercises(
      parseBlocks('```ts\nimport { nothing } from "./not-a-module.js"\n\nit("never runs", () => {\n  console.log(nothing)\n})\n```')
    )

    expect(run.kind === "failed" ? run.message : "").toContain("./not-a-module.js")
  })
})
