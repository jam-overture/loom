import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"

import { err, ok, type Result } from "../../src/result.js"

import type { Baseline } from "./against.js"

/**
 * Photographing the same sheet against an older revision of the tree.
 *
 * **What varies between the two photographs is the subject and nothing else.**
 * The library at the ref is extracted into a scratch tree; the harness and the
 * specimen sheet are copied in from the working tree over the top. That
 * asymmetry is the whole design, and it is forced rather than chosen: the sheet
 * is the *question* — it says what to photograph and in which states — and a
 * sheet that came from the ref would be a different question, or, for a sheet
 * written this morning, no question at all. The same holds for the harness: the
 * `{ key }` step that made a keyboard journey photographable did not exist a
 * day before the change it was built to photograph, so an instrument taken from
 * the ref could not have taken the *before* picture at all.
 *
 * So this is not "what did `main` look like". It is **this sheet, pointed at an
 * older library**, which is the question a report asks when it claims a picture
 * moved.
 */

/** The library — the subject, taken from the ref. */
export const SUBJECT_ROOT = "src"

/** The harness — the instrument, taken from the working tree. */
export const INSTRUMENT_ROOT = "tools"

/**
 * Enough of the root to run `tsx` against. Not a build: nothing is compiled, so
 * what these decide is the module type and the resolution, and a ref that is
 * missing one of them is simply extracted without it.
 */
export const ROOT_FILES: readonly string[] = [
  "package.json",
  "tsconfig.json",
  "tsconfig.build.json",
]

/**
 * A ceiling, which is a wait's ceiling applied to a second process (0140): a
 * harness that hangs reports nothing at all, and a merge gate that hangs is
 * indistinguishable from one that is slow. Ten minutes is a whole sheet of a
 * live specimen with room to spare, and running out of it is a reading rather
 * than a crash.
 */
export const BASELINE_CEILING_MS = 600_000

export type BaselineError =
  | { readonly code: "outside-repository"; readonly module: string }
  | { readonly code: "unknown-ref"; readonly ref: string }
  | { readonly code: "nothing-at-ref"; readonly ref: string }
  | { readonly code: "git-failed"; readonly step: string; readonly detail: string }

export const describeBaselineError = (error: BaselineError): string => {
  switch (error.code) {
    case "outside-repository":
      return `${error.module} is outside the repository, so there is no revision of it to photograph`
    case "unknown-ref":
      return `no such revision as ${error.ref} — pass something \`git rev-parse\` resolves, like origin/main`
    case "nothing-at-ref":
      return `${error.ref} holds no ${SUBJECT_ROOT}/, so it is not a revision of this repository`
    case "git-failed":
      return `could not build a tree at the ref (${error.step}): ${error.detail}`
  }
}

export type BaselineTreePlan = {
  /** Pathspecs taken from the ref: the subject. */
  readonly extract: readonly string[]
  /** Paths copied from the working tree over it: the instrument and the sheet. */
  readonly overlay: readonly string[]
}

/**
 * What to take from where, given where the sheet lives.
 *
 * Every specimen in this repository today is under `src/` or `tools/`, both of
 * which are already in the plan. A sheet somewhere else brings its own top
 * directory with it so that its neighbours resolve — and is still itself copied
 * from the working tree, because the sheet is never the subject.
 */
export const baselineTreePlan = (module: string): BaselineTreePlan => {
  const root = module.split("/")[0] ?? ""
  const extra = root === "" || root === SUBJECT_ROOT || root === INSTRUMENT_ROOT ? [] : [root]

  return {
    extract: [SUBJECT_ROOT, ...extra, ...ROOT_FILES],
    overlay: [INSTRUMENT_ROOT, module],
  }
}

/** The sheet's path relative to the repository root, with forward slashes. */
export const subjectPath = (module: string, cwd: string): Result<string, BaselineError> => {
  const within = relative(cwd, isAbsolute(module) ? module : resolve(cwd, module))

  return within === "" || within.startsWith("..") || isAbsolute(within)
    ? err({ code: "outside-repository", module })
    : ok(within.split(sep).join("/"))
}

type Ran = { readonly code: number | null; readonly stdout: string; readonly stderr: string }

const run = (
  command: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv; readonly timeoutMs?: number }
): Promise<Ran> =>
  new Promise((settle) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
      ...(options.timeoutMs === undefined ? {} : { timeout: options.timeoutMs }),
    })

    let stdout = ""
    let stderr = ""
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => (stdout += chunk))
    child.stderr.on("data", (chunk: string) => (stderr += chunk))

    child.on("error", (thrown) => settle({ code: null, stdout, stderr: `${stderr}${thrown.message}` }))
    child.on("close", (code) => settle({ code, stdout, stderr }))
  })

/**
 * The first line of a failure, which is what a reader wants.
 *
 * A build failure arrives as a stack, a module resolution error or an esbuild
 * report, and all three put the sentence first. The rest belongs in the log of
 * the run that wanted it, not in the one line printed beside a verdict.
 */
export const firstLine = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line !== "") ?? ""

/**
 * A thrown error announces itself on a line of its own, and it is not the first
 * one.
 *
 * Node prints the offending file and line, then the source, then a caret, and
 * only then `Error: …`; esbuild leads with `✘ [ERROR]`. So the first non-empty
 * line of a failed build is a path into a scratch directory that no longer
 * exists by the time anybody reads it — which is how the first version of this
 * reported *"the sheet does not build there"* and then named a temp file.
 */
const ANNOUNCED = /^(✘ \[ERROR\]|[A-Za-z]*(Error|Exception):)/

/**
 * The one sentence worth printing beside a verdict, with the scratch tree's path
 * taken off it.
 *
 * The paths in it are real and are inside a directory this function's caller is
 * about to delete, so they are rewritten to the repository-relative ones a
 * reader can open — the tree at the ref holds the same files at the same places.
 */
export const failureSentence = (text: string, treeRoot: string): string => {
  const lines = text
    .split("\n")
    .map((line) => line.replaceAll(`${treeRoot}/`, "").trim())
    .filter((line) => line !== "")

  return lines.find((line) => ANNOUNCED.test(line)) ?? lines[0] ?? ""
}

/**
 * The digest of each named picture, in the order it was named.
 *
 * A file that is not there is left out rather than digested as empty: a shot the
 * harness planned and did not write is a different fact from a shot that came
 * out blank, and only the comparison can tell which side is missing it.
 */
export const digestShots = async (
  dir: string,
  files: readonly string[]
): Promise<ReadonlyMap<string, string>> => {
  const digests = new Map<string, string>()

  for (const file of files) {
    try {
      digests.set(file, createHash("sha256").update(await readFile(join(dir, file))).digest("hex"))
    } catch {
      continue
    }
  }

  return digests
}

/** Everything photographed into a directory, which is how the ref's side is read. */
const digestsIn = async (dir: string): Promise<ReadonlyMap<string, string>> =>
  digestShots(dir, (await readdir(dir)).filter((entry) => entry.endsWith(".png")).sort())

export type BaselineRequest = {
  readonly ref: string
  /** The sheet, as it was given on the command line. */
  readonly module: string
  /** Where the photographs taken at the ref are to be left. */
  readonly outDir: string
  readonly cwd: string
  readonly env: NodeJS.ProcessEnv
}

/**
 * Photograph the sheet against the ref, and report what came out.
 *
 * The `Result` is about whether the question could be *asked* — an unresolvable
 * ref, a sheet outside the repository, a `git` that would not run. Whether the
 * sheet *builds* at the ref is inside the value, because it is an answer.
 */
export const photographBaseline = async (
  request: BaselineRequest
): Promise<Result<Baseline, BaselineError>> => {
  const { ref, cwd, env } = request

  /**
   * Resolved against the repository rather than against this process's working
   * directory, which are the same thing in a real run and need not be. The
   * directory is about to be emptied and then handed to a child started
   * elsewhere, and both of those want to be sure which one they mean.
   */
  const outDir = resolve(cwd, request.outDir)

  const subject = subjectPath(request.module, cwd)
  if (!subject.ok) return subject

  const git = (args: readonly string[]): Promise<Ran> => run("git", args, { cwd, env })

  const resolved = await git(["rev-parse", "--verify", "--quiet", `${ref}^{tree}`])
  if (resolved.code !== 0) return err({ code: "unknown-ref", ref })

  const plan = baselineTreePlan(subject.value)

  /**
   * Which of the planned paths the ref actually holds. `git archive` fails the
   * whole extraction on a pathspec that matches nothing, and a `tsconfig` that
   * arrived after the ref is not a reason to refuse the comparison.
   */
  const listed = await git(["ls-tree", "--name-only", ref, "--", ...plan.extract])
  if (listed.code !== 0) {
    return err({ code: "git-failed", step: "ls-tree", detail: firstLine(listed.stderr) })
  }

  const present = listed.stdout.split("\n").map((line) => line.trim()).filter((line) => line !== "")
  if (!present.includes(SUBJECT_ROOT)) return err({ code: "nothing-at-ref", ref })

  const scratch = await mkdtemp(join(tmpdir(), "loom-baseline-"))
  const tree = join(scratch, "tree")

  try {
    const tarball = join(scratch, "tree.tar")
    const archived = await git(["archive", "--format=tar", `--output=${tarball}`, ref, "--", ...present])
    if (archived.code !== 0) {
      return err({ code: "git-failed", step: "archive", detail: firstLine(archived.stderr) })
    }

    await mkdir(tree, { recursive: true })
    const extracted = await run("tar", ["-xf", tarball, "-C", tree], { cwd, env })
    if (extracted.code !== 0) {
      return err({ code: "git-failed", step: "tar", detail: firstLine(extracted.stderr) })
    }

    for (const path of plan.overlay) {
      /**
       * The sheet's own directory may be new on this branch, in which case the
       * ref holds nothing there for the copy to land in.
       */
      await mkdir(dirname(join(tree, path)), { recursive: true })
      await cp(join(cwd, path), join(tree, path), { recursive: true, force: true })
    }

    /**
     * Symlinked rather than installed. A second `pnpm install` is minutes and a
     * network, and it would be answering a question nobody asked: the
     * dependencies are the instrument's, and the instrument is this branch's by
     * construction.
     */
    await symlink(join(cwd, "node_modules"), join(tree, "node_modules"))

    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })

    const shot = await run(
      process.execPath,
      ["--import", "tsx", join(INSTRUMENT_ROOT, "specimen", "main.ts"), subject.value, "--out", outDir],
      { cwd: tree, env, timeoutMs: BASELINE_CEILING_MS }
    )

    const digests = await digestsIn(outDir)
    const trouble = shot.code === 0 ? "" : failureSentence(shot.stderr, tree)

    if (digests.size > 0) {
      return ok(trouble === "" ? { built: true, digests } : { built: true, digests, trouble })
    }

    return ok({
      built: false,
      reason:
        failureSentence(shot.stderr, tree) ||
        failureSentence(shot.stdout, tree) ||
        `the harness exited ${shot.code === null ? "without a status" : String(shot.code)} and wrote no picture`,
    })
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}
