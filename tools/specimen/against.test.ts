import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

import { describe, expect, it } from "vitest"

import {
  AGAINST_SUBDIR,
  compareSheets,
  countVerdicts,
  describeAgainst,
  describeTally,
  shotFiles,
  type Baseline,
} from "./against.js"
import {
  baselineTreePlan,
  describeBaselineError,
  digestShots,
  failureSentence,
  firstLine,
  photographBaseline,
  ROOT_FILES,
  subjectPath,
} from "./baseline.js"
import type { ShotResult } from "./capture.js"
import { WIDE } from "./specimen.js"

const digests = (entries: Record<string, string>): ReadonlyMap<string, string> =>
  new Map(Object.entries(entries))

describe("the pair either side of a change", () => {
  it("calls a shot identical when the two files are the same bytes", () => {
    const compared = compareSheets(digests({ "a.png": "11", "b.png": "22" }), digests({ "a.png": "11", "b.png": "22" }))

    expect(compared).toEqual([
      { file: "a.png", verdict: "identical" },
      { file: "b.png", verdict: "identical" },
    ])
  })

  /**
   * The shape every report of this kind has, and the reason the flag exists:
   * the two unchanged shots are what make the third one evidence rather than a
   * picture of something that was always there.
   */
  it("reports the two either side as identical and the one in the middle as differing", () => {
    const compared = compareSheets(
      digests({ "arrived.png": "aa", "inside.png": "bb", "back.png": "cc" }),
      digests({ "arrived.png": "aa", "inside.png": "bb", "back.png": "zz" })
    )

    expect(compared.map((entry) => entry.verdict)).toEqual(["identical", "identical", "differs"])
  })

  it("keeps the order this run took its shots in, not an alphabetical one", () => {
    const compared = compareSheets(digests({ "z.png": "1", "a.png": "2" }), digests({ "a.png": "2", "z.png": "1" }))

    expect(compared.map((entry) => entry.file)).toEqual(["z.png", "a.png"])
  })

  /**
   * Both sides are photographed with this branch's sheet, so this is unusual
   * rather than impossible: a sheet whose themes come from `src/` names its
   * shots off the subject, and a theme added on this branch is a shot the ref
   * cannot take.
   */
  it("names a shot only this run took, and one only the ref took, without pairing them", () => {
    const compared = compareSheets(digests({ "new.png": "1" }), digests({ "gone.png": "2" }))

    expect(compared).toEqual([
      { file: "new.png", verdict: "only-here" },
      { file: "gone.png", verdict: "only-there" },
    ])
  })

  it("counts each verdict", () => {
    const counted = countVerdicts([
      { file: "a.png", verdict: "identical" },
      { file: "b.png", verdict: "identical" },
      { file: "c.png", verdict: "differs" },
    ])

    expect(counted).toEqual({ identical: 2, differs: 1, "only-here": 0, "only-there": 0 })
  })
})

describe("the line a report quotes", () => {
  it("names the ref and the two numbers that mean something", () => {
    const line = describeTally(
      [
        { file: "a.png", verdict: "identical" },
        { file: "b.png", verdict: "identical" },
        { file: "c.png", verdict: "differs" },
      ],
      "origin/main"
    )

    expect(line).toBe("3 shots against origin/main: 2 identical, 1 differs")
  })

  it("leaves out a verdict nothing fell under", () => {
    const line = describeTally([{ file: "a.png", verdict: "identical" }], "HEAD~1")

    expect(line).toBe("1 shot against HEAD~1: 1 identical, 0 differ")
    expect(line).not.toContain("new")
    expect(line).not.toContain("there only")
  })

  it("says so when a shot exists on one side only", () => {
    const line = describeTally(
      [
        { file: "a.png", verdict: "only-here" },
        { file: "b.png", verdict: "only-there" },
      ],
      "origin/main"
    )

    expect(line).toContain("1 new")
    expect(line).toContain("1 there only")
  })
})

describe("what the command prints under its shot lines", () => {
  const built = (entries: Record<string, string>): Baseline => ({ built: true, digests: digests(entries) })

  it("prints a verdict per shot and where the other half of the pair is", () => {
    const printed = describeAgainst(
      "origin/main",
      digests({ "a.png": "1", "b.png": "2" }),
      built({ "a.png": "1", "b.png": "9" }),
      "reports/against"
    )

    expect(printed.split("\n")).toEqual([
      "2 shots against origin/main: 1 identical, 1 differs",
      "  a.png  identical",
      "  b.png  differs",
      "  the pictures taken at origin/main are in reports/against",
    ])
  })

  /**
   * The ordinary case for a sheet written in the same run as the thing it
   * photographs, and it is an answer rather than a failure: the subject is new,
   * so there is nothing at the ref for it to stand on.
   */
  it("says the sheet does not build at the ref, and why, rather than reporting a comparison", () => {
    const printed = describeAgainst(
      "origin/main",
      digests({ "a.png": "1" }),
      { built: false, reason: "Cannot find module '../present.js'" },
      "reports/against"
    )

    expect(printed).toContain("the sheet does not build there")
    expect(printed).toContain("Cannot find module")
    expect(printed).toContain("every shot above is new")
    expect(printed).not.toContain("identical")
  })

  /**
   * The defect this was written after, and the only assertion that could have
   * caught it: a `ShotResult` carries the *path* it was written to, the two
   * sides write into different directories, and a comparison keyed on the path
   * pairs nothing with anything. It read as three shots the ref alone had taken.
   */
  it("takes the file names from the results by name, in the order they were shot", () => {
    const result = (file: string): ShotResult => ({
      name: file.replace(".png", ""),
      file: join("reports", file),
      viewport: WIDE,
      overflow: { scrollWidth: 1280, innerWidth: 1280, clipped: [] },
      overflowed: false,
      clipped: false,
      measured: [],
    })

    expect(shotFiles([result("z.png"), result("a.png")])).toEqual(["z.png", "a.png"])
    expect(shotFiles([result("z.png")])[0]).not.toContain("reports")
  })
})

describe("what to take from where", () => {
  it("takes the library from the ref and the harness from the working tree", () => {
    const plan = baselineTreePlan("src/render/a.specimen.ts")

    expect(plan.extract).toEqual(["src", ...ROOT_FILES])
    expect(plan.overlay).toEqual(["tools", "src/render/a.specimen.ts"])
  })

  /**
   * The sheet is the question, never the subject, so it is copied from the
   * working tree over whatever the ref holds at the same path — including when
   * the ref holds nothing there at all.
   */
  it("copies the sheet in from the working tree even when it lives under the library", () => {
    expect(baselineTreePlan("src/primitives/a.specimen.ts").overlay).toContain("src/primitives/a.specimen.ts")
  })

  it("adds nothing for a sheet that lives in the harness, which is already overlaid", () => {
    expect(baselineTreePlan("tools/specimen/a.specimen.ts").extract).toEqual(["src", ...ROOT_FILES])
  })

  it("brings a sheet's own top directory along when it is neither", () => {
    expect(baselineTreePlan("apps/loom/a.specimen.ts").extract).toEqual(["src", "apps", ...ROOT_FILES])
  })
})

describe("the sheet's path, as a revision of this repository would hold it", () => {
  it("takes a relative path as it stands", () => {
    expect(subjectPath("src/a.specimen.ts", "/repo")).toEqual({ ok: true, value: "src/a.specimen.ts" })
  })

  it("makes an absolute path inside the repository relative to it", () => {
    expect(subjectPath("/repo/src/a.specimen.ts", "/repo")).toEqual({ ok: true, value: "src/a.specimen.ts" })
  })

  it("refuses a sheet outside the repository, because no revision of it exists", () => {
    const outside = subjectPath("/elsewhere/a.specimen.ts", "/repo")

    expect(!outside.ok && outside.error.code).toBe("outside-repository")
    expect(!outside.ok && describeBaselineError(outside.error)).toContain("outside the repository")
  })

  it("refuses the repository root itself", () => {
    expect(subjectPath("/repo", "/repo").ok).toBe(false)
  })
})

describe("the sentence a failure is reported as", () => {
  it("is the first line that says anything", () => {
    expect(firstLine("\n  \nCannot find module 'x'\n    at file:///y\n")).toBe("Cannot find module 'x'")
  })

  it("is empty when nothing was said, so the caller can fall back", () => {
    expect(firstLine("\n \n")).toBe("")
  })

  it("names the revision a reader should have passed", () => {
    expect(describeBaselineError({ code: "unknown-ref", ref: "mian" })).toContain("origin/main")
  })
})

describe("digesting what was photographed", () => {
  it("keeps the order it was asked in, and skips a picture that is not there", async () => {
    const dir = await mkdtemp(join(tmpdir(), "loom-digest-"))
    try {
      await writeFile(join(dir, "b.png"), "second")
      await writeFile(join(dir, "a.png"), "first")

      const read = await digestShots(dir, ["b.png", "a.png", "missing.png"])

      expect([...read.keys()]).toEqual(["b.png", "a.png"])
      expect(read.get("b.png")).not.toBe(read.get("a.png"))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("gives one byte's difference a different digest", async () => {
    const dir = await mkdtemp(join(tmpdir(), "loom-digest-"))
    try {
      await writeFile(join(dir, "a.png"), "ring")
      await writeFile(join(dir, "b.png"), "rinh")

      const read = await digestShots(dir, ["a.png", "b.png"])

      expect(read.get("a.png")).not.toBe(read.get("b.png"))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

/**
 * The half with a real `git` in it.
 *
 * A tiny repository is built in a temp directory with a one-line library, a
 * harness that photographs it by writing a text file, and a sheet that exists on
 * the working tree only. Nothing here needs a browser, which is the point: the
 * two facts worth pinning — **the subject comes from the ref** and **the
 * instrument does not** — are decided by the tree that gets assembled, and a
 * photograph would only make them slower to check.
 */
const HARNESS = (literal: string): string =>
  [
    `import { writeFile } from "node:fs/promises"`,
    `import { readFile } from "node:fs/promises"`,
    `import { join } from "node:path"`,
    `import { WORD } from "../../src/subject.js"`,
    ``,
    `const out = process.argv[process.argv.indexOf("--out") + 1] ?? ""`,
    `const sheet = process.argv[2] ?? ""`,
    `await writeFile(join(out, "word.png"), ${literal})`,
    `await writeFile(join(out, "sheet.png"), await readFile(sheet, "utf8"))`,
    ``,
  ].join("\n")

const git = (cwd: string, args: readonly string[]): void => {
  execFileSync("git", [...args], { cwd, stdio: "ignore" })
}

const aRepository = async (): Promise<string> => {
  const repo = await mkdtemp(join(tmpdir(), "loom-against-repo-"))

  await mkdir(join(repo, "src"), { recursive: true })
  await mkdir(join(repo, "tools", "specimen"), { recursive: true })
  await writeFile(join(repo, "package.json"), JSON.stringify({ name: "subject", type: "module" }))
  await writeFile(join(repo, "src", "subject.ts"), `export const WORD = "before"\n`)
  await writeFile(join(repo, "tools", "specimen", "main.ts"), `throw new Error("the harness at the ref")\n`)

  git(repo, ["init", "-q", "-b", "main"])
  git(repo, ["config", "user.email", "harness@example.com"])
  git(repo, ["config", "user.name", "harness"])
  git(repo, ["add", "-A"])
  git(repo, ["commit", "-q", "-m", "the revision to photograph against"])

  /** The working tree now moves on: a new library, a new harness, a new sheet. */
  await writeFile(join(repo, "src", "subject.ts"), `export const WORD = "after"\n`)
  await writeFile(join(repo, "tools", "specimen", "main.ts"), HARNESS("WORD"))
  await writeFile(join(repo, "src", "a.specimen.ts"), `the sheet from the working tree\n`)
  await symlink(fileURLToPath(new URL("../../node_modules", import.meta.url)), join(repo, "node_modules"))

  return repo
}

describe("photographing the same sheet against a revision", () => {
  it("photographs the library at the ref with the harness and the sheet from the working tree", async () => {
    const repo = await aRepository()
    const out = join(repo, "out", AGAINST_SUBDIR)

    try {
      const baseline = await photographBaseline({
        ref: "main",
        module: "src/a.specimen.ts",
        outDir: out,
        cwd: repo,
        env: process.env,
      })

      expect(baseline.ok && baseline.value.built).toBe(true)

      /**
       * `before`, not `after`: the library the harness imported came out of the
       * ref. This is the assertion the whole flag exists for.
       */
      expect(await readFile(join(out, "word.png"), "utf8")).toBe("before")

      /**
       * And the sheet is this branch's, although the ref has no such file — so a
       * specimen written in the same run as the change it photographs can still
       * ask the question.
       */
      expect(await readFile(join(out, "sheet.png"), "utf8")).toBe("the sheet from the working tree\n")

      /** The harness that ran is the working tree's. The ref's throws. */
      expect(baseline.ok && baseline.value.built && [...baseline.value.digests.keys()].sort()).toEqual([
        "sheet.png",
        "word.png",
      ])
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })

  /**
   * A sheet that stands on something the ref does not have. It is reported as a
   * reading rather than as a failure, because *"it does not build there"* is the
   * answer to the question and the run's own pictures are still good.
   */
  it("reports a sheet that will not build at the ref, with the first line of why", async () => {
    const repo = await aRepository()
    const out = join(repo, "out", AGAINST_SUBDIR)

    try {
      await writeFile(
        join(repo, "tools", "specimen", "main.ts"),
        `import { MISSING } from "../../src/subject.js"\nconsole.log(MISSING)\n`
      )

      const baseline = await photographBaseline({
        ref: "main",
        module: "src/a.specimen.ts",
        outDir: out,
        cwd: repo,
        env: process.env,
      })

      expect(baseline.ok && baseline.value.built).toBe(false)
      expect(baseline.ok && !baseline.value.built && baseline.value.reason).not.toBe("")
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })

  /**
   * A sheet in a directory this branch invented. The ref holds nothing at that
   * path for the copy to land in, and the overlay has to make the room.
   */
  it("copies a sheet into a directory the ref does not have", async () => {
    const repo = await aRepository()
    const out = join(repo, "out", AGAINST_SUBDIR)

    try {
      await mkdir(join(repo, "src", "brand-new"), { recursive: true })
      await writeFile(join(repo, "src", "brand-new", "a.specimen.ts"), `a sheet in a new room\n`)

      const baseline = await photographBaseline({
        ref: "main",
        module: "src/brand-new/a.specimen.ts",
        outDir: out,
        cwd: repo,
        env: process.env,
      })

      expect(baseline.ok && baseline.value.built).toBe(true)
      expect(await readFile(join(out, "sheet.png"), "utf8")).toBe("a sheet in a new room\n")
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })

  /**
   * Two runs with two refs into one output directory. Without this, the second
   * comparison reads the first ref's pictures and reports a verdict about a
   * revision nobody asked about.
   */
  it("clears the pictures a previous comparison left, rather than comparing against them", async () => {
    const repo = await aRepository()
    const out = join(repo, "out", AGAINST_SUBDIR)

    try {
      await mkdir(out, { recursive: true })
      await writeFile(join(out, "stale.png"), "from a comparison against something else")

      const baseline = await photographBaseline({
        ref: "main",
        module: "src/a.specimen.ts",
        outDir: out,
        cwd: repo,
        env: process.env,
      })

      expect(baseline.ok && baseline.value.built && [...baseline.value.digests.keys()]).not.toContain("stale.png")
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })

  it("refuses a revision git cannot resolve, rather than photographing something else", async () => {
    const repo = await aRepository()

    try {
      const baseline = await photographBaseline({
        ref: "no-such-branch",
        module: "src/a.specimen.ts",
        outDir: join(repo, "out", AGAINST_SUBDIR),
        cwd: repo,
        env: process.env,
      })

      expect(!baseline.ok && baseline.error.code).toBe("unknown-ref")
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })

  it("refuses a revision that holds no library, which is not a revision of this repository", async () => {
    const repo = await mkdtemp(join(tmpdir(), "loom-against-bare-"))

    try {
      await writeFile(join(repo, "README.md"), "nothing here\n")
      git(repo, ["init", "-q", "-b", "main"])
      git(repo, ["config", "user.email", "harness@example.com"])
      git(repo, ["config", "user.name", "harness"])
      git(repo, ["add", "-A"])
      git(repo, ["commit", "-q", "-m", "no library"])

      const baseline = await photographBaseline({
        ref: "main",
        module: "src/a.specimen.ts",
        outDir: join(repo, "out"),
        cwd: repo,
        env: process.env,
      })

      expect(!baseline.ok && baseline.error.code).toBe("nothing-at-ref")
    } finally {
      await rm(repo, { recursive: true, force: true })
    }
  })
})

/**
 * The rule this flag is on the near side of, held by reading the source.
 *
 * A comparison is the one reading in this harness that would be most tempting to
 * fail on, and failing on it would make every deliberate visual change a build
 * failure. The two modules behind `--against` therefore do not touch the exit
 * code at all — not conditionally, not in an error path — and the only way to
 * state that about a module rather than about one of its calls is to read what
 * it says.
 */
describe("an instrument that prints and never asserts", () => {
  it("never reaches for the exit code in either module behind --against", async () => {
    for (const module of ["against.ts", "baseline.ts"]) {
      const source = await readFile(fileURLToPath(new URL(`./${module}`, import.meta.url)), "utf8")

      expect(source, module).not.toMatch(/process\.exit/)
      expect(source, module).not.toMatch(/exitCode/)
    }
  })
})

describe("a baseline run that stopped half way through", () => {
  /**
   * The one misreading available here, and it is the quiet kind: a sheet the ref
   * photographed part of looks exactly like a sheet whose every shot is new.
   */
  it("explains a missing shot rather than letting it read as a new one", () => {
    const printed = describeAgainst(
      "origin/main",
      digests({ "a.png": "1", "b.png": "2" }),
      { built: true, digests: digests({ "a.png": "1" }), trouble: "Target page crashed" },
      "reports/against"
    )

    expect(printed).toContain("b.png  new")
    expect(printed).toContain("stopped early: Target page crashed")
  })

  /**
   * And says nothing when there is nothing to explain. The commonest non-zero
   * status this harness returns is a shot that overflowed its viewport, which is
   * a reading about the page rather than trouble with the run.
   */
  it("says nothing when every shot was taken on both sides", () => {
    const printed = describeAgainst(
      "origin/main",
      digests({ "a.png": "1" }),
      { built: true, digests: digests({ "a.png": "9" }), trouble: "1420 > 390" },
      "reports/against"
    )

    expect(printed).not.toContain("stopped early")
  })
})

describe("the sentence a build failure is reported as", () => {
  /**
   * The real output of a sheet that would not build at a ref, verbatim. The
   * useful line is the fifth, and the first names a scratch directory that is
   * deleted before anybody reads the report.
   */
  const NODE_FAILURE = [
    "/tmp/loom-baseline-pR0Jhv/tree/src/primitives/a.specimen.ts:51",
    "  if (composition === undefined) throw new Error(`${id} is not in the phrasebook`)",
    "                                       ^",
    "",
    "Error: nav-menus is not in the phrasebook",
    "    at band (/tmp/loom-baseline-pR0Jhv/tree/src/primitives/a.specimen.ts:51:40)",
  ].join("\n")

  it("picks the line the error announced itself on, not the location above it", () => {
    expect(failureSentence(NODE_FAILURE, "/tmp/loom-baseline-pR0Jhv/tree")).toBe(
      "Error: nav-menus is not in the phrasebook"
    )
  })

  it("takes the scratch tree off a path, leaving one a reader can open", () => {
    const stripped = failureSentence(
      "Error: Cannot find module '/tmp/loom-baseline-x/tree/src/render/present.js'",
      "/tmp/loom-baseline-x/tree"
    )

    expect(stripped).toBe("Error: Cannot find module 'src/render/present.js'")
  })

  it("finds esbuild's announcement too", () => {
    expect(failureSentence("some/file.ts:3:1:\n✘ [ERROR] Could not resolve \"./gone.js\"", "/t")).toBe(
      '✘ [ERROR] Could not resolve "./gone.js"'
    )
  })

  it("falls back to the first line that says anything when nothing announced itself", () => {
    expect(failureSentence("\n\n  killed  \nand then more", "/t")).toBe("killed")
  })

  it("is empty when nothing was said at all, so the caller can say what it knows", () => {
    expect(failureSentence("\n  \n", "/t")).toBe("")
  })
})
