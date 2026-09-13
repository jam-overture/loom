import { execFile } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"

import type { MergeAttempt, MergeTree } from "./plan.js"

const run = promisify(execFile)

/**
 * The one place in this tool that touches a repository.
 *
 * Everything above it is a plan over answers, so this is the seam and it is
 * deliberately four operations wide. Two rules hold it honest:
 *
 * **It never works in the checkout you are standing in.** Every merge happens
 * in a detached worktree under the system temp directory, created at the base
 * and thrown away at the end. A tool that measures thirty merges by performing
 * them in the working tree is one interrupted run away from leaving somebody's
 * branch in a conflicted state, and the run that would do it is the run where
 * something went wrong.
 *
 * **An attempt leaves no trace.** `git merge --no-commit` followed by
 * `git merge --abort` returns the worktree to exactly where it was, so the
 * order in which the plan asks its questions cannot change the answers.
 */

/** Non-empty lines, which is what every porcelain listing here comes back as. */
export const linesOf = (stdout: string): readonly string[] =>
  stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

type Exec = (args: readonly string[]) => Promise<string>

const gitIn =
  (directory: string): Exec =>
  async (args) => {
    const { stdout } = await run("git", ["-C", directory, ...args], { maxBuffer: 64 * 1024 * 1024 })
    return stdout
  }

/**
 * `--diff-filter=U` rather than parsing what `git merge` printed.
 *
 * The merge's own output is prose that changes between git versions and mixes
 * the conflicted paths in with advice. The index knows which paths are
 * unmerged, and asking it gives one path per line and nothing else.
 */
const conflictedFiles = async (git: Exec): Promise<readonly string[]> =>
  linesOf(await git(["diff", "--name-only", "--diff-filter=U"]))

/**
 * A tree at `base` that accumulates merges, and the temp directory to remove
 * when the run is over.
 *
 * The caller gets `close` back rather than this cleaning up after itself,
 * because the plan holds the tree for its whole life and there is no scope here
 * that knows when that ends.
 */
export const worktreeAt = async (
  repository: string,
  base: string
): Promise<{ readonly tree: MergeTree; readonly close: () => Promise<void> }> => {
  const directory = await mkdtemp(join(tmpdir(), "loom-queue-"))
  const path = join(directory, "tree")

  const repo = gitIn(repository)
  await repo(["worktree", "add", "--detach", path, base])

  const git = gitIn(path)

  const attempt = async (branch: string): Promise<MergeAttempt> => {
    try {
      await git(["merge", "--no-commit", "--no-ff", branch])
    } catch {
      const files = await conflictedFiles(git)
      await git(["merge", "--abort"])
      return { outcome: "conflict", files }
    }

    /**
     * A merge that changes nothing exits 0 and leaves no `MERGE_HEAD`, which is
     * git's way of saying the branch is already contained. Aborting then is an
     * error, so the two cases are told apart by whether there is a merge in
     * progress rather than by the exit code.
     */
    const inProgress = await git(["rev-parse", "--verify", "--quiet", "MERGE_HEAD"]).catch(() => "")
    if (linesOf(inProgress).length === 0) return { outcome: "already-in" }

    await git(["merge", "--abort"])
    return { outcome: "clean" }
  }

  const take = async (branch: string): Promise<void> => {
    await git(["merge", "--no-ff", "-m", `queue: ${branch}`, branch])
  }

  const changedFiles = async (branch: string): Promise<readonly string[]> =>
    linesOf(await git(["diff", "--name-only", `${base}...${branch}`]))

  const close = async (): Promise<void> => {
    await repo(["worktree", "remove", "--force", path]).catch(() => "")
    await rm(directory, { recursive: true, force: true })
  }

  return { tree: { attempt, take, changedFiles }, close }
}

/**
 * The branches this repository has that the base does not already contain.
 *
 * Read from the local refs rather than from GitHub: the queue is a property of
 * the repository, the tool needs no token and no network beyond the fetch the
 * caller has already done, and a run with the API unavailable still measures.
 */
export const unmergedBranches = async (repository: string, base: string): Promise<readonly string[]> => {
  const git = gitIn(repository)
  const all = linesOf(await git(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"]))
  const merged = new Set(
    linesOf(await git(["for-each-ref", "--format=%(refname:short)", "--merged", base, "refs/remotes/origin"]))
  )

  return all.filter((ref) => !merged.has(ref) && ref !== "origin/HEAD")
}
