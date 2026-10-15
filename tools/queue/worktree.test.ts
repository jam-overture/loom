import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { linesOf, worktreeAt } from "./git.js"

const git = (cwd: string, args: readonly string[]): string =>
  execFileSync("git", [...args], { cwd, encoding: "utf8" })

/**
 * A repository with two branches and nothing else, built with the portable
 * spelling of a named first branch (`tools/git/portability.ts`).
 */
const aRepository = async (): Promise<string> => {
  const repo = await mkdtemp(join(tmpdir(), "loom-queue-repo-"))

  await writeFile(join(repo, "a.txt"), "base\n")
  git(repo, ["init", "-q"])
  git(repo, ["symbolic-ref", "HEAD", "refs/heads/main"])
  git(repo, ["config", "user.email", "queue@example.com"])
  git(repo, ["config", "user.name", "queue"])
  git(repo, ["add", "-A"])
  git(repo, ["commit", "-q", "-m", "base"])

  git(repo, ["checkout", "-q", "-b", "a-branch"])
  await writeFile(join(repo, "b.txt"), "a branch\n")
  git(repo, ["add", "-A"])
  git(repo, ["commit", "-q", "-m", "a branch"])
  git(repo, ["checkout", "-q", "main"])

  return repo
}

/** The worktrees a repository has registered, by path, main one included. */
const registered = (repo: string): readonly string[] =>
  linesOf(git(repo, ["worktree", "list", "--porcelain"]))
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length))

describe("the detached tree the queue measures merges in", () => {
  it("leaves the repository with no tree and no registration of one", async () => {
    const repo = await aRepository()

    try {
      const before = registered(repo)
      const { tree, close } = await worktreeAt(repo, "main")

      const added = registered(repo)
      expect(added).toHaveLength(before.length + 1)

      const path = added.find((entry) => !before.includes(entry))
      if (path === undefined) throw new Error("no worktree was registered to measure")

      expect(existsSync(path)).toBe(true)

      expect(await tree.attempt("a-branch")).toEqual({ outcome: "clean" })

      await close()

      /**
       * Both halves. Deleting the directory without pruning leaves the entry
       * under `.git/worktrees` standing, and a repository that still believes
       * in a tree that is gone refuses the next `worktree add` at the same
       * base — which is the next run of this tool.
       */
      expect(existsSync(path)).toBe(false)
      expect(registered(repo)).toEqual(before)
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })

  it("can take the base again after a close, which is what the prune is for", async () => {
    const repo = await aRepository()

    try {
      const first = await worktreeAt(repo, "main")
      await first.close()

      const second = await worktreeAt(repo, "main")
      expect(await second.tree.attempt("a-branch")).toEqual({ outcome: "clean" })
      await second.close()

      expect(registered(repo)).toHaveLength(1)
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })
})
