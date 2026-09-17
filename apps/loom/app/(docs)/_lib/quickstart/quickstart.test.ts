import { execFile } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"

import { afterAll, describe, expect, it } from "vitest"

import { REPOSITORY_ROOT } from "../architecture/source"
import { readPageSource } from "../search/headings"

import {
  QUICKSTART_COMMANDS,
  QUICKSTART_DEPENDENCIES,
  QUICKSTART_FILENAME,
  QUICKSTART_OUTPUT_FILE,
  QUICKSTART_PATH,
  QUICKSTART_TRANSCRIPT,
  QUICKSTART_VERDICTS,
  quickstartTranscriptLines,
  quickstartUtterances,
  readQuickstartSource,
} from "./program"

/**
 * The one page on this site that is checked by running it.
 *
 * Every example here is already a real tree mounted through the real runtime,
 * which is what makes a broken example a failing test rather than a stale
 * screenshot. The quickstart is that promise one step further out: it is a file
 * a stranger copies into an empty directory and runs, and the only honest way
 * to keep it is to copy it into an empty directory and run it.
 *
 * **The directory is built to be theirs and not ours**, because the difference
 * between the two is what breaks the file. A project `pnpm add` created has a
 * package.json with dependencies and no `"type": "module"`; this repository's
 * has the field, and under it the wrong filename works fine. So the workspace
 * below gets a package.json shaped like a reader's, the four packages linked
 * where Node will find them walking up from the file, and the file under the
 * name the page tells them to use.
 *
 * It is the slowest test in this directory by a wide margin — two process
 * starts and a whole runtime import. That is the trade, made deliberately: the
 * alternative is asserting what we believe the file does.
 */

const run = promisify(execFile)

const SOURCE = join(REPOSITORY_ROOT, ...QUICKSTART_PATH)
const TSX = join(REPOSITORY_ROOT, "apps", "loom", "node_modules", ".bin", "tsx")

/** Where each package really is, from a directory that is not in this workspace. */
const INSTALLED: Readonly<Record<string, string>> = {
  "@loom": join(REPOSITORY_ROOT, "apps", "loom", "node_modules", "@loom"),
  react: join(REPOSITORY_ROOT, "apps", "loom", "node_modules", "react"),
  "react-dom": join(REPOSITORY_ROOT, "apps", "loom", "node_modules", "react-dom"),
  zod: join(REPOSITORY_ROOT, "node_modules", "zod"),
}

const workspace = mkdtempSync(join(tmpdir(), "loom-quickstart-"))

mkdirSync(join(workspace, "node_modules"))

/** A package.json with no `"type"`, which is what `pnpm add` leaves behind. */
writeFileSync(
  join(workspace, "package.json"),
  JSON.stringify({ name: "a-readers-project", dependencies: {} })
)

for (const [name, target] of Object.entries(INSTALLED)) {
  symlinkSync(target, join(workspace, "node_modules", name))
}

copyFileSync(SOURCE, join(workspace, QUICKSTART_FILENAME))

afterAll(() => rmSync(workspace, { recursive: true, force: true }))

const executed = run(TSX, [QUICKSTART_FILENAME], { cwd: workspace, encoding: "utf8" })

const drawnPage = async (): Promise<string> => {
  await executed

  return readFileSync(join(workspace, QUICKSTART_OUTPUT_FILE), "utf8")
}

describe("the quickstart, run the way the page says to run it", () => {
  it("finishes with nothing on standard error", async () => {
    const { stderr } = await executed

    expect(stderr).toBe("")
  })

  it("prints exactly the transcript the page shows", async () => {
    const { stdout } = await executed

    expect(stdout.split("\n")).toEqual([...QUICKSTART_TRANSCRIPT, ""])
  })

  it("draws a page a browser can open, wearing the theme its root names", async () => {
    const html = await drawnPage()

    expect(html.startsWith("<!doctype html>")).toBe(true)
    /**
     * The theme is mounted by the root primitive as custom properties on its own
     * element (0050). A tree that renders with none of them set is legal,
     * diagnostic-free, and looks exactly like a stylesheet that failed to load —
     * a poor first page, and nothing else would notice.
     */
    expect(html).toContain("--loom-bg-canvas")
  })

  it("leaves the reader's own primitive on the page, and the headline it refused to delete", async () => {
    const html = await drawnPage()

    /** The insert landed: a node of a type nothing but this file registered. */
    expect(html).toContain("Nobody typed this line into a file.")
    /** The configure landed — level 1 became level 3 — and the remove did not. */
    expect(html).toContain("<h3")
    expect(html).toContain("Hello from a tree")
  })
})

describe("the filename the page insists on", () => {
  /**
   * The page spends a sentence on `.mts` and this is why it is worth one. Under
   * a reader's package.json the same bytes named `.ts` are read as CommonJS,
   * and the file stops before a line of it runs — with an error about output
   * formats that names nothing the reader did.
   *
   * Asserted rather than described, because the day it stops being true the
   * page should stop saying it.
   */
  it("is required: the same file as .ts does not run in a reader's project", async () => {
    copyFileSync(SOURCE, join(workspace, "misnamed.ts"))

    await expect(run(TSX, ["misnamed.ts"], { cwd: workspace, encoding: "utf8" })).rejects.toThrow(
      /top-level await/iu
    )
  })
})

describe("what the page says about the file", () => {
  const source = readQuickstartSource()

  it("quotes the three asks the file actually makes", () => {
    expect(quickstartUtterances(source)).toEqual([
      "Add a notice to the end of the page.",
      "Make the headline smaller.",
      "Delete the headline.",
    ])
  })

  /**
   * The check that keeps it copy-pasteable.
   *
   * This file lives inside the application, where `@/app/(docs)/…` resolves and
   * would resolve nowhere a reader could take it. An import of anything other
   * than a published door, a peer the install line names, or a Node builtin is
   * a file that compiles in this repository and fails in the first directory
   * anybody copies it to.
   */
  it("imports only what the install line installs", () => {
    const imported = [...source.matchAll(/^.*\bfrom "(?<from>[^"]+)"$/gmu)]
      .map((match) => match.groups?.from)
      .filter((specifier): specifier is string => specifier !== undefined)
      .filter((specifier) => !specifier.startsWith("node:"))

    expect(imported.length).toBeGreaterThan(0)

    /** `@loom/runtime/write` is the `@loom/runtime` package; `react-dom/server` is `react-dom`. */
    const packageOf = (specifier: string): string => {
      const segments = specifier.split("/")

      return specifier.startsWith("@")
        ? segments.slice(0, 2).join("/")
        : (segments[0] ?? specifier)
    }

    for (const specifier of imported) {
      expect(QUICKSTART_DEPENDENCIES, specifier).toContain(packageOf(specifier))
    }
  })

  it("tells the reader to install every one of them", () => {
    const [install] = QUICKSTART_COMMANDS

    for (const dependency of QUICKSTART_DEPENDENCIES) {
      expect(install).toContain(dependency)
    }
  })

  it("runs the file under the name it tells the reader to save it as", () => {
    expect(QUICKSTART_COMMANDS.at(-1)).toContain(QUICKSTART_FILENAME)
  })

  /**
   * *Things worth breaking* asks a reader to exceed the notice's maximum and
   * says what it is. The number lives in the file's schema, and a page that
   * carries its own copy of it is wrong the first time the schema moves — with
   * nothing failing, because the experiment still produces a diagnostic either
   * way and only the instruction has gone stale.
   */
  it("quotes the schema's own maximum rather than a second copy of it", () => {
    const maximum = /\.max\((?<max>\d+)\)/u.exec(source)?.groups?.max

    expect(maximum).toBeDefined()
    expect(readPageSource("getting-started", "quickstart")).toContain(`${maximum} characters`)
  })
})

/**
 * *Things worth breaking* is three claims about edits nobody has made, which is
 * the most rottable prose on the page: the file changes, the runtime changes,
 * and a paragraph describing an experiment keeps reading exactly as confidently
 * as it did the day somebody ran it.
 *
 * So each one is run. The edit is made to a copy in the reader's workspace, by
 * the same substitution the page describes in words, and the ending the page
 * promises is the ending asserted. A page that invites somebody to try
 * something owes them the thing actually happening.
 */
const variant = async (
  name: string,
  edit: (source: string) => string
): Promise<{ readonly stdout: string; readonly stderr: string }> => {
  const file = `${name}.mts`

  writeFileSync(join(workspace, file), edit(readQuickstartSource()))

  return run(TSX, [file], { cwd: workspace, encoding: "utf8" })
}

describe("the three edits the page invites", () => {
  it("empties the protected list and all three asks are committed", async () => {
    const { stdout } = await variant("unprotected", (source) =>
      source.replace('protectedPrimitiveTypes: ["loom.heading"],', "protectedPrimitiveTypes: [],")
    )

    expect(stdout.match(/^ {3}committed —/gmu)).toHaveLength(3)
    expect(stdout).toContain("Drew it again: revision 3")
  })

  it("breaks a prop and the change still lands, as a render diagnostic", async () => {
    const { stdout, stderr } = await variant("long-notice", (source) =>
      source.replace("Nobody typed this line into a file.", "x".repeat(200))
    )

    /** A diagnostic is a warning, and the file prints it where warnings go. */
    expect(stderr).toContain("render diagnostic: invalid-props")
    /** Committed, not refused: the write path never saw the primitive's schema. */
    expect(stdout).toContain("the page is now at revision 1")
  })

  it("asks for something nothing can plan, and gets a different ending from a refusal", async () => {
    const { stdout } = await variant("unplannable", (source) =>
      source.replace(
        'await ask("Delete the headline.")',
        'await ask("Delete the headline.")\nawait ask("Make it pop.")'
      )
    )

    expect(stdout).toContain("not-interpreted")
    expect(stdout).toContain("this quickstart only knows three sentences")
  })
})

describe("the transcript, as the page colours it", () => {
  const lines = quickstartTranscriptLines()

  it("finds all three of the Gate's answers in it", () => {
    const found = new Set(lines.flatMap((line) => (line.verdict === undefined ? [] : [line.verdict])))

    expect([...found].sort()).toEqual([...new Set(Object.values(QUICKSTART_VERDICTS))].sort())
  })

  it("colours a line only where the Gate answered on it", () => {
    for (const line of lines) {
      const answered = /\b(committed|held|refused)\b/u.test(line.text)

      expect(line.verdict !== undefined, line.text).toBe(answered)
    }
  })

  it("reads a person's yes as the verdict at the end of the line, not the one before it", () => {
    const answered = lines.find((line) => line.text.includes("you said yes"))

    expect(answered?.verdict).toBe("accepted")
  })
})
