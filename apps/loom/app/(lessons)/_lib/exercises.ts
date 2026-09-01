import type { Block } from "./markdown"

/**
 * A lesson's Try it section, as the program it actually is.
 *
 * Every lesson from 02 on ends its explanation with a handful of fenced
 * snippets and one instruction: paste them into `src/scratch.test.ts` and run
 * them. That instruction is doing more work than it looks like. The snippets are
 * not independent — the first declares the imports and the helpers the rest use,
 * and later ones reach back for a `spare` id factory or a `deltaOf` defined
 * three fences earlier. **A lesson's exercises are one file, split across the
 * prose that introduces each part of it**, and this module is that reading made
 * explicit.
 *
 * Two kinds of fence appear in a Try it section and only one of them is code
 * that runs:
 *
 * - The **program**: anything that imports something or registers a test. These
 *   concatenate, in document order, into the file the reader would have pasted.
 * - An **illustration**: lesson 03's list of four operation literals, lesson
 *   09's rule table. They are there to be read, not executed, and running them
 *   would fail on the first line.
 *
 * The rule below is that distinction and nothing cleverer, because a cleverer
 * rule would be one an author has to remember. An illustration that grows an
 * `it(` is a program; a program that loses its last import and its last test is
 * an illustration. Both readings are the obvious one.
 */

/** An `import` at the start of a line, or a call to something that registers a test. */
const PROGRAM = /^import\s|\b(?:it|test|describe)\s*\(/m

const LANGUAGES = new Set(["ts", "tsx"])

export type ExerciseChunk = {
  /** Position among the code fences of the section, which is what the marker carries. */
  readonly index: number
  readonly code: string
  /** Whether this fence is part of the program or an illustration beside it. */
  readonly runs: boolean
}

export const exerciseChunks = (blocks: readonly Block[]): readonly ExerciseChunk[] =>
  blocks
    .filter((block) => block.kind === "code" && LANGUAGES.has(block.language ?? ""))
    .map((block, index) => ({
      index,
      code: block.kind === "code" ? block.code : "",
      runs: block.kind === "code" && PROGRAM.test(block.code),
    }))

/**
 * The chunks that run, as one source file.
 *
 * Each is preceded by a call to `__chunk`, which the runner injects and which
 * does nothing but record where evaluation has reached. It is there because a
 * transcript has to be attributable: the reader predicted *this* fence's output
 * and needs *this* fence's output back, and by the time a test's body executes
 * there is nothing left in the call stack that says which fence registered it.
 * `describe` and `it` register synchronously as the module evaluates, so the
 * marker immediately above them is always the right answer.
 *
 * The blank line between chunks is not cosmetic. Two fences joined without one
 * can put a statement that ends without a semicolon next to a line that starts
 * with a bracket, which is a different program.
 */
export const exerciseProgram = (chunks: readonly ExerciseChunk[]): string =>
  chunks
    .filter((chunk) => chunk.runs)
    .map((chunk) => `__chunk(${chunk.index});\n${chunk.code}`)
    .join("\n\n")

/** One test's name and the lines it printed, in the order it printed them. */
export type ExerciseTest = {
  readonly name: string
  readonly output: readonly string[]
}

/** What one runnable fence produced when it ran. */
export type ExerciseOutput = {
  readonly index: number
  readonly tests: readonly ExerciseTest[]
}

/**
 * What a lesson's exercises did when this page was built.
 *
 * `failed` is a state the page renders rather than a build that stops, and the
 * distinction is deliberate. A lesson whose code no longer runs against `src/`
 * is a defect in the course and has to be loud — but loud is a red test in this
 * surface's suite, which names the lesson and prints the error, not a site that
 * will not build. The reader of a broken lesson is better served by being told
 * the exercise is broken than by a 404 where the course was.
 */
export type ExerciseRun =
  | { readonly kind: "ran"; readonly outputs: readonly ExerciseOutput[] }
  | { readonly kind: "failed"; readonly message: string }

/**
 * One fence's output, as the terminal would have shown it.
 *
 * Named by test rather than run together, because the names are the author's
 * sentences — "inverts against the state each operation observed" — and a wall
 * of printed lines with the names taken out is a worse artefact than the one
 * the reader would have got from `pnpm vitest`. A test that printed nothing
 * says so: silence is a result, and it is the answer to at least one Self-check
 * question in this course.
 */
export const transcriptText = (output: ExerciseOutput): string =>
  output.tests
    .map((test) => [`> ${test.name}`, ...(test.output.length === 0 ? ["  (printed nothing)"] : test.output)].join("\n"))
    .join("\n\n")
