import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { inspect } from "node:util"

import {
  exerciseChunks,
  exerciseProgram,
  type ExerciseChunk,
  type ExerciseOutput,
  type ExerciseRun,
  type ExerciseTest,
} from "./exercises"
import type { Block } from "./markdown"
import { RUNTIME_SRC } from "./source"

/**
 * The exercises, run.
 *
 * `lessons/README.md` has said since the first lesson that every exercise in
 * this course was executed before it was written down, and two of them were
 * still wrong on the day they shipped. That claim is a promise about a routine's
 * discipline, made in prose, checked by nobody. Here it is a build step: the
 * program in each Try it section is compiled and executed when this page is
 * built, against the `src/` in this checkout, and what the page shows is what it
 * printed. Not what it printed in August.
 *
 * **What this does not do is let the reader edit and re-run.** That would have
 * to happen in the browser, and it cannot yet: the exercises import
 * `./testing/fixtures.js` more often than they import anything else, and
 * `src/testing/**` is excluded from the runtime's build, so there is no
 * published module for a browser to load. Filed, not worked around — a runner
 * that reimplemented `sampleTree` in this directory would produce output that
 * agreed with the lesson and disagreed with Loom, which is the exact failure the
 * whole exercise discipline exists to prevent.
 *
 * The friction the brief named is gone either way. Nobody has to clone anything
 * to see what the code does; what they have to do is say what they think it does
 * first, and that part is enforced here rather than requested.
 */

/**
 * Loaded out of the bundler's sight.
 *
 * `typescript` is a nine-megabyte build-time dependency and this is a page that
 * prerenders. Naming it in an `import` asks the bundler to trace it into the
 * server chunk; naming it here asks Node for it at the moment it is needed,
 * which is during the build and never after.
 */
type Transpiler = {
  readonly ModuleKind: { readonly CommonJS: number }
  readonly ScriptTarget: { readonly ES2022: number }
  readonly transpileModule: (
    input: string,
    options: { readonly fileName: string; readonly compilerOptions: Record<string, unknown> }
  ) => { readonly outputText: string }
}

/**
 * A compiler, configured to emit what the sandbox can run.
 *
 * CommonJS because the sandbox is a `require` function, and
 * `verbatimModuleSyntax` off because it is the setting that matters here: the
 * lessons and the runtime both write `import type { TreeDelta }`, and a
 * transpile that kept those would emit a require for a module that exports no
 * value at all.
 */
const compiler = (): ((code: string, file: string) => string) => {
  const ts = createRequire(import.meta.url)("typescript") as Transpiler

  const compilerOptions = {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
    verbatimModuleSyntax: false,
    isolatedModules: true,
  }

  return (code, file) => ts.transpileModule(code, { fileName: file, compilerOptions }).outputText
}

/**
 * A relative specifier, resolved the way Node would if the `.js` were `.ts`.
 *
 * The runtime writes `./tree/apply.js` in its source because that is what Node's
 * ESM loader will want from `dist/`, and this reads the `src/` those files were
 * emitted from. `index.ts` is tried second so a directory import lands where a
 * bundler would put it.
 */
const resolveSource = (from: string, specifier: string): string => {
  const base = resolve(dirname(from), specifier.replace(/\.js$/, ""))

  for (const candidate of [`${base}.ts`, join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate
  }

  throw new Error(`loom: an exercise imports "${specifier}", which is not a file under src/`)
}

/**
 * One module registry per run.
 *
 * Not shared between lessons, deliberately. Several modules under `src/` hold
 * module-level state, and a registry reused across sixteen programs would let
 * lesson 13's run decide what lesson 04 prints — a build whose output depends on
 * page order is worse than a slow one.
 */
const sandbox = (compile: (code: string, file: string) => string): ((file: string) => unknown) => {
  const done = new Map<string, unknown>()
  const loading = new Map<string, Record<string, unknown>>()

  const load = (file: string): unknown => {
    const settled = done.get(file)
    if (settled !== undefined) return settled

    /** A cycle gets the half-built exports object, which is what Node does too. */
    const partial = loading.get(file)
    if (partial !== undefined) return partial

    const exported: Record<string, unknown> = {}
    loading.set(file, exported)

    const module = { exports: exported }
    const source = compile(readFileSync(file, "utf8"), file)

    /**
     * A package is loaded from the file that asked for it, not from this
     * surface. `zod` is a dependency of the runtime and not of this
     * application, and the runtime's own source is the only place from which
     * that resolves — which is correct, and is why the anchor is the source
     * file rather than `import.meta.url`.
     */
    const require = (specifier: string): unknown =>
      specifier.startsWith(".") ? load(resolveSource(file, specifier)) : createRequire(file)(specifier)

    new Function("require", "exports", "module", source)(require, exported, module)

    loading.delete(file)
    done.set(file, module.exports)

    return module.exports
  }

  return load
}

/** What `console.log` would have put on a terminal, for the four levels an exercise uses. */
const line = (args: readonly unknown[]): string =>
  args
    .map((value) => (typeof value === "string" ? value : inspect(value, { depth: 5, breakLength: 76 })))
    .join(" ")

type Registered = {
  readonly chunk: number
  readonly name: string
  readonly body: () => unknown
}

/**
 * The program, evaluated, then its tests run in the order they registered.
 *
 * This is what vitest does with the same file, minus the parts an exercise never
 * uses: there are no hooks, no `expect`, no concurrency and no retries anywhere
 * in the course, and the two lessons that need a failure make it themselves with
 * a `throw`. Anything an exercise reaches for that is not here should fail
 * loudly rather than quietly do nothing, so `expect` throws.
 */
const execute = async (
  program: string,
  compile: (code: string, file: string) => string,
  load: (file: string) => unknown
): Promise<readonly ExerciseOutput[]> => {
  const registered: Registered[] = []
  const printed: string[] = []
  let chunk = -1

  const it = (name: string, body: () => unknown): void => {
    registered.push({ chunk, name, body })
  }

  const vitest = {
    describe: (_name: string, body: () => void): void => body(),
    it,
    test: it,
    expect: (): never => {
      throw new Error("loom: an exercise used expect(), which this course does not")
    },
  }

  const scratch = join(RUNTIME_SRC, "scratch.test.ts")
  const record = (...args: readonly unknown[]): void => {
    printed.push(line(args))
  }

  const require = (specifier: string): unknown => {
    if (specifier === "vitest") return vitest
    if (specifier.startsWith(".")) return load(resolveSource(scratch, specifier))

    return createRequire(scratch)(specifier)
  }

  const exported = {}

  new Function(
    "require",
    "exports",
    "module",
    "console",
    "__chunk",
    compile(program, scratch)
  )(
    require,
    exported,
    { exports: exported },
    { log: record, info: record, warn: record, error: record, debug: record },
    (index: number) => {
      chunk = index
    }
  )

  const outputs = new Map<number, ExerciseTest[]>()

  for (const test of registered) {
    const before = printed.length
    await test.body()

    const tests = outputs.get(test.chunk) ?? []
    tests.push({ name: test.name, output: printed.slice(before) })
    outputs.set(test.chunk, tests)
  }

  return [...outputs.entries()]
    .map(([index, tests]): ExerciseOutput => ({ index, tests }))
    .sort((a, b) => a.index - b.index)
}

export type LessonExercises = {
  readonly chunks: readonly ExerciseChunk[]
  readonly run: ExerciseRun
}

export const runExercises = async (blocks: readonly Block[]): Promise<LessonExercises> => {
  const chunks = exerciseChunks(blocks)
  const program = exerciseProgram(chunks)

  if (program === "") return { chunks, run: { kind: "ran", outputs: [] } }

  const compile = compiler()

  try {
    const outputs = await execute(program, compile, sandbox(compile))

    return { chunks, run: { kind: "ran", outputs } }
  } catch (error) {
    return {
      chunks,
      run: {
        kind: "failed",
        message: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      },
    }
  }
}
