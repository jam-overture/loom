import { execFileSync } from "node:child_process"
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, it } from "vitest"

import { GOVERNED_ARGV, governedFiles, parseGovernedFiles } from "./governed.js"

/**
 * The two `reports/` commands have to agree about which files exist, because
 * one of them is the gate and the other is how you satisfy it. They did not,
 * and the disagreement was invisible from either side: each call read correctly
 * and the pair was wrong.
 */

const HERE = "tools/reports"

describe("the files git is asked about", () => {
  /**
   * Locked as a value rather than described in prose, because the whole defect
   * was two argvs that looked equally reasonable in isolation.
   */
  it("includes what a run has just written and not yet added", () => {
    expect(GOVERNED_ARGV).toContain("--others")
    expect(GOVERNED_ARGV).toContain("--cached")
  })

  it("still honours .gitignore, so build output stays out", () => {
    expect(GOVERNED_ARGV).toContain("--exclude-standard")
  })

  it("asks for NUL-separated names, because a run writes the filenames", () => {
    expect(GOVERNED_ARGV).toContain("-z")
  })
})

describe("reading git's answer", () => {
  it("splits on the separator and drops the trailing empty", () => {
    expect(parseGovernedFiles("a.md\0b.png\0")).toEqual(["a.md", "b.png"])
  })

  it("keeps a name with a space in it, which newlines would have quoted", () => {
    expect(parseGovernedFiles("reports/a shot.png\0")).toEqual(["reports/a shot.png"])
  })

  it("reads an empty repository as no files rather than as one empty name", () => {
    expect(parseGovernedFiles("")).toEqual([])
  })
})

/**
 * A repository whose first branch is named, without `git init -b` — which
 * postdates the 2.15 floor in `tools/git/portability.ts`.
 */
const temporary: string[] = []

const repoWith = async (files: Record<string, string>, ignore?: string): Promise<string> => {
  const repo = await mkdtemp(join(tmpdir(), "loom-governed-"))
  temporary.push(repo)
  const git = (args: readonly string[]): void => {
    execFileSync("git", [...args], { cwd: repo, stdio: "pipe" })
  }

  git(["init", "-q"])
  git(["symbolic-ref", "HEAD", "refs/heads/main"])
  git(["config", "user.email", "harness@example.com"])
  git(["config", "user.name", "harness"])

  if (ignore !== undefined) await writeFile(join(repo, ".gitignore"), ignore)

  for (const [path, body] of Object.entries(files)) {
    const at = path.lastIndexOf("/")
    if (at !== -1) await mkdir(join(repo, path.slice(0, at)), { recursive: true })
    await writeFile(join(repo, path), body)
  }

  return repo
}

afterAll(async () => {
  for (const dir of temporary) await rm(dir, { recursive: true, force: true })
})

describe("the set, against a real git", () => {
  it("returns a committed file, an uncommitted one and an unadded one alike", async () => {
    const repo = await repoWith({
      "reports/committed.webp": "x",
      "reports/unadded.png": "y",
    })
    execFileSync("git", ["add", "reports/committed.webp"], { cwd: repo, stdio: "pipe" })
    execFileSync("git", ["commit", "-qm", "first"], { cwd: repo, stdio: "pipe" })

    const files = await governedFiles(repo)

    expect(files.ok).toBe(true)
    if (!files.ok) return
    expect([...files.value].sort()).toEqual(["reports/committed.webp", "reports/unadded.png"])
  })

  /**
   * The case the gate's comment is about and the shrinker could not see: the
   * pictures exist, nothing has been added, and the command that is supposed to
   * store them has to find them.
   */
  it("finds a freshly captured raster that git has never been told about", async () => {
    const repo = await repoWith({ "reports/2026-11-03-shot.png": "z" })

    const files = await governedFiles(repo)

    expect(files.ok && files.value).toEqual(["reports/2026-11-03-shot.png"])
  })

  it("leaves an ignored file out, so node_modules is not surveyed", async () => {
    const repo = await repoWith(
      { "reports/kept.png": "a", "scratch/dropped.png": "b" },
      "scratch/\n"
    )

    const files = await governedFiles(repo)

    expect(files.ok && files.value).toEqual([".gitignore", "reports/kept.png"])
  })

  it("reports a directory that is not a repository rather than throwing", async () => {
    const outside = await mkdtemp(join(tmpdir(), "loom-governed-bare-"))
    temporary.push(outside)

    const files = await governedFiles(outside)

    expect(files.ok).toBe(false)
    if (files.ok) return
    expect(files.error.code).toBe("not-a-repository")
  })
})

/**
 * The property, rather than today's two call sites: a third command added to
 * this directory must not be free to pick a third set. This is the check that
 * fails on the branch which writes the next one.
 */
describe("one definition of the set", () => {
  it("names ls-files in exactly one module", async () => {
    const entries = await readdir(HERE)
    const modules = entries.filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))

    const naming: string[] = []
    for (const file of modules) {
      const source = await readFile(join(HERE, file), "utf8")
      if (source.includes("ls-files")) naming.push(file)
    }

    expect(naming).toEqual(["governed.ts"])
  })
})
