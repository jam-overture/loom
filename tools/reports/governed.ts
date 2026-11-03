import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { err, ok, type Result } from "../../src/result.js"

/**
 * The one set of files the `reports/` commands govern, read one way.
 *
 * `reports:check` is the gate and `reports:shrink` is how you satisfy it, so
 * the two have to be looking at the same files. They were not. The gate asked
 * for **tracked and untracked-but-not-ignored**, for the reason written beside
 * its own call: a PNG written a moment ago and not yet added is invisible to
 * `ls-files` alone, *and that is exactly the state a run is in when it has just
 * taken its screenshots*. The shrinker asked for tracked only, so it could not
 * see the files the gate was about to fail on.
 *
 * What that cost is a closed loop rather than a missing feature. Capture, then
 * shrink, then verify — which is the order `docs/routines.md` gives and the only
 * order that makes sense — produced:
 *
 * ```
 * $ pnpm reports:shrink
 * nothing to shrink — no raster images under reports/
 * $ pnpm reports:check
 * reports/<shot>.png is not .webp or .svg — run `pnpm reports:shrink`
 * ```
 *
 * The gate's advice was advice the other command could not take, and the way
 * out — `git add` the pictures first — is written nowhere. Two lanes lost a gate
 * cycle to it and filed it twice.
 *
 * **So the set is defined once, here, and both commands call this.** The
 * alternative on offer was to leave the two calls alone and have the shrinker
 * print a line about the files it was declining to touch, which turns a silent
 * no-op into an instruction but leaves the disagreement in place and a third
 * command free to pick a third set. `reports.test.ts` sweeps this directory for
 * a second `ls-files`, so the next command here cannot quietly do that.
 *
 * There is no scratch-file case to protect. An untracked raster under `reports/`
 * is not a file somebody is keeping out of the way — it is a **fault the gate
 * already fails on**, which is what settled which of the two sets was the right
 * one to keep.
 */

const run = promisify(execFile)

/**
 * Every switch here predates the 2.15 floor in `tools/git/portability.ts` by a
 * decade, so this is portable as written; it is a constant rather than a
 * literal so that the sweep has one name to point at.
 */
export const GOVERNED_ARGV: readonly [string, ...string[]] = [
  "ls-files",
  "-z",
  "--cached",
  "--others",
  "--exclude-standard",
]

export type GovernedError = { readonly code: "not-a-repository"; readonly reason: string }

/**
 * `-z` rather than newlines, because a report's filename is written by a run
 * and not by a person, and one with a space in it is a filename git would
 * otherwise quote.
 */
export const parseGovernedFiles = (stdout: string): readonly string[] =>
  stdout.split("\0").filter((line) => line.length > 0)

export const governedFiles = async (
  root: string
): Promise<Result<readonly string[], GovernedError>> => {
  try {
    const { stdout } = await run("git", [...GOVERNED_ARGV], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
    })

    return ok(parseGovernedFiles(stdout))
  } catch (cause) {
    return err({
      code: "not-a-repository",
      reason: cause instanceof Error ? cause.message : String(cause),
    })
  }
}
