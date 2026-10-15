import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  argvLiterals,
  GIT_FLOOR,
  NEWER_THAN_FLOOR,
  reasonText,
  runsGit,
  unportable,
  versionText,
} from "./portability.js"

const ROOT = fileURLToPath(new URL("../../", import.meta.url))
const HERE = fileURLToPath(new URL("./", import.meta.url))

/** Every TypeScript source under the directories this repository's tools live in. */
const sourcesUnder = (directory: string): readonly string[] => {
  const entries = readdirSync(directory, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourcesUnder(path)
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [path] : []
  })
}

describe("the git invocations the floor has", () => {
  it("reads the subcommand through a -C prefix", () => {
    expect(unportable(["-C", "/tmp/repo", "switch", "main"]).map((u) => u.entry.tokens)).toEqual([
      ["switch"],
    ])
  })

  it("catches a switch anywhere after the subcommand, not only beside it", () => {
    expect(unportable(["init", "-q", "-b", "main"]).map((u) => u.entry.tokens)).toEqual([
      ["init", "-b"],
    ])
  })

  it("catches the other spelling of the same feature", () => {
    expect(unportable(["init", "--initial-branch", "main"]).map((u) => u.entry.tokens)).toEqual([
      ["init", "--initial-branch"],
    ])
  })

  it("catches a two-word subcommand", () => {
    expect(unportable(["worktree", "remove", "--force", "/tmp/t"])).toHaveLength(1)
  })

  /**
   * The match that makes the table usable rather than noisy. `-b` is `switch`'s
   * and `init`'s flag and it is also `checkout`'s, where it has been since
   * before any floor worth naming — so the subcommand has to be the argv's own
   * and not merely somewhere in it.
   */
  it("does not accuse a flag of belonging to a subcommand it was not handed to", () => {
    expect(unportable(["checkout", "-b", "main"])).toEqual([])
    expect(unportable(["worktree", "add", "--detach", "/tmp/t", "main"])).toEqual([])
    expect(unportable(["worktree", "prune"])).toEqual([])
    expect(unportable(["symbolic-ref", "HEAD", "refs/heads/main"])).toEqual([])
  })

  it("passes everything this repository's tooling actually runs", () => {
    const argvs: readonly (readonly string[])[] = [
      ["init", "-q"],
      ["config", "user.email", "harness@example.com"],
      ["add", "-A"],
      ["commit", "-q", "-m", "a message"],
      ["rev-parse", "--verify", "--quiet", "main^{tree}"],
      ["ls-tree", "--name-only", "main", "--", "src"],
      ["archive", "--format=tar", "--output=/tmp/t.tar", "main"],
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      ["merge", "--no-commit", "--no-ff", "a-branch"],
      ["merge", "--abort"],
      ["diff", "--name-only", "--diff-filter=U"],
      ["for-each-ref", "--format=%(refname:short)", "--merged", "main", "refs/remotes/origin"],
    ]

    expect(argvs.flatMap((argv) => unportable(argv))).toEqual([])
  })

  /**
   * An entry the floor already has is an entry nobody has to read. Raising
   * `GIT_FLOOR` is meant to retire rows rather than to leave them standing as
   * rules about a git that is no longer anybody's.
   */
  it("holds only entries the floor does not already have", () => {
    const retired = NEWER_THAN_FLOOR.filter(
      ({ since }) =>
        since.major < GIT_FLOOR.major ||
        (since.major === GIT_FLOOR.major && since.minor <= GIT_FLOOR.minor)
    )

    expect(retired.map(({ tokens }) => tokens.join(" "))).toEqual([])
  })

  it("names the floor, the release and the replacement in one sentence", () => {
    const [first] = unportable(["init", "-q", "-b", "main"])
    if (first === undefined) throw new Error("the table no longer catches git init -b")

    expect(reasonText(first)).toBe(
      "git init -q -b main needs git 2.28; the floor is 2.15. Instead: git init -q, then git symbolic-ref HEAD refs/heads/<branch>"
    )
  })

  it("says a version the way a reader writes one", () => {
    expect(versionText(GIT_FLOOR)).toBe("2.15")
  })
})

describe("reading argvs out of a source", () => {
  it("takes a list of string literals as tokens", () => {
    expect(argvLiterals(`git(repo, ["init", "-q", "-b", "main"])`)).toEqual([
      ["init", "-q", "-b", "main"],
    ])
  })

  it("reads anything that is not a string literal as a token that matches nothing", () => {
    expect(argvLiterals(`repo(["worktree", "remove", "--force", path])`)).toEqual([
      ["worktree", "remove", "--force", "*"],
    ])
  })

  /**
   * A token that is not a string literal is `*`, and `*` is in nothing the
   * table names — so a list that is not an argv cannot trip it, whatever is
   * nested or interpolated inside it. This is the property the sweep rests on,
   * asserted rather than argued.
   */
  it("reads a list that is not an argv as one that trips nothing", () => {
    const sources = ["const a = [[1], [2]]", "const a = [`${x}`]", "const a = [switchable, b]"]

    expect(sources.flatMap((source) => argvLiterals(source).flatMap(unportable))).toEqual([])
  })

  it("knows which sources run git", () => {
    expect(runsGit(`run("git", args)`)).toBe(true)
    expect(runsGit(`execFileSync('git', args)`)).toBe(true)
    expect(runsGit(`const branch = "a git branch name"`)).toBe(false)
  })
})

/**
 * The sweep, and the only check here that could have caught the defect this
 * module was written for.
 *
 * It reads literals in files that name git, which is narrower than *every git
 * this repository runs* and is stated rather than implied: an argv assembled
 * from variables is invisible to it. Every git invocation in this repository
 * is written as a list of literals today, and one that is not should be
 * reviewed by somebody who has read this sentence.
 */
describe("every git this repository's sources are written to run", () => {
  it("runs on the git the maintainer has", () => {
    const sources = [...sourcesUnder(join(ROOT, "tools")), ...sourcesUnder(join(ROOT, "src"))]

    const reasons = sources.flatMap((path) => {
      const source = readFileSync(path, "utf8")
      if (!runsGit(source)) return []

      /**
       * This module's own directory. The table is a list of what the floor
       * lacks and the tests above invoke every row of it on purpose, so both
       * files name git and neither one runs it.
       */
      if (path.startsWith(HERE)) return []

      return argvLiterals(source)
        .flatMap((argv) => unportable(argv))
        .map((found) => `${path.slice(ROOT.length)}: ${reasonText(found)}`)
    })

    expect(reasons).toEqual([])
  })

  it("is reading something, which is the assertion above's own precondition", () => {
    const sources = [...sourcesUnder(join(ROOT, "tools")), ...sourcesUnder(join(ROOT, "src"))]
    const running = sources.filter((path) => runsGit(readFileSync(path, "utf8")))

    expect(running.length).toBeGreaterThanOrEqual(5)
  })
})
