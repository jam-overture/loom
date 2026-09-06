import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { COMPILED_DIR, CONTEXT_DIR, compiledBaseName, compiledPrograms } from "./compiled"
import { pagesWithFences } from "./extract"
import { isAlternative, isCheckable } from "./model"
import { contextExportsIn } from "./program"
import { apiEntries } from "../api/reference"

/**
 * The check that the checking is happening.
 *
 * `tsc` reads the files in `compiled/` because they are ordinary files in the
 * application, which is the whole design — there is no second compiler and no
 * second configuration. What `tsc` cannot know is whether those files still say
 * what the pages say. A page edited without regenerating would leave a program
 * describing last week's page, compiling perfectly, and proving nothing.
 *
 * So this suite is about the seam: on disk equals derived, nothing orphaned
 * either way, and the context files held to the one rule that keeps them from
 * becoming a place to fake an API.
 */

const onDisk = (): readonly string[] =>
  readdirSync(COMPILED_DIR)
    .filter((name) => name !== "README.md")
    .sort()

describe("the programs in compiled/", () => {
  it("are exactly the ones the pages produce, file for file", () => {
    const expected = compiledPrograms().map((program) => program.fileName).sort()

    expect(onDisk()).toEqual(expected)
  })

  it("say what the pages currently say", () => {
    compiledPrograms().forEach((program) => {
      const written = readFileSync(join(COMPILED_DIR, program.fileName), "utf8")

      expect(
        written,
        `${program.fileName} is stale — run \`pnpm --filter @loom/app docs:fences\``
      ).toBe(program.source)
    })
  })

  it("cover every page that has code on it", () => {
    const withCode = pagesWithFences()
      .filter((page) => page.fences.some(isCheckable))
      .map((page) => compiledBaseName(page.sectionSlug, page.pageSlug))
      .sort()

    const covered = [
      ...new Set(compiledPrograms().map((program) => compiledBaseName(program.sectionSlug, program.pageSlug))),
    ].sort()

    expect(covered).toEqual(withCode)
    expect(covered.length).toBeGreaterThan(0)
  })

  /**
   * A page is usually one program and is not always one. A block that redoes the
   * block above it gets a module of its own, which is the only way both halves of
   * a choice get compiled — so the count of programs is the count of pages plus
   * the alternatives, and every alternative on the site has a file.
   */
  it("are one per page, plus one for every block that redoes the one above it", () => {
    const pages = pagesWithFences().filter((page) => page.fences.some(isCheckable))
    const alternatives = pages.flatMap((page) => page.fences.filter(isCheckable).filter(isAlternative))

    expect(compiledPrograms()).toHaveLength(pages.length + alternatives.length)
    expect(alternatives.length).toBeGreaterThan(0)

    const named = onDisk().filter((name) => name.includes("--alternative-"))

    expect(named).toHaveLength(alternatives.length)
  })
})

/**
 * The context files, and the one rule they live under.
 *
 * A context file exists so a page can be written from inside a story — a
 * request that already happened, a database a deployment opened. The danger is
 * obvious: the same file could declare `renderRequest`, and every snippet on the
 * page would compile against a definition nobody ships.
 *
 * So a context file may name what the story assumes and must import what the
 * runtime provides. The published surface is the arbiter, and it is the same
 * generated reference the API section is built from — so this rule tightens by
 * itself every time the runtime exports something new.
 */
describe("what a page is allowed to assume", () => {
  const published = new Set(
    apiEntries.flatMap((entry) => entry.groups.flatMap((group) => group.symbols.map((symbol) => symbol.name)))
  )

  const contextFiles = readdirSync(CONTEXT_DIR).filter((name) => name.endsWith(".ts"))

  it("is checked against a published surface that is not empty", () => {
    expect(published.size).toBeGreaterThan(100)
    expect(contextFiles.length).toBeGreaterThan(0)
  })

  it("never declares a name the runtime already exports", () => {
    contextFiles.forEach((fileName) => {
      const source = readFileSync(join(CONTEXT_DIR, fileName), "utf8")

      const declared = source
        .split("\n")
        .flatMap((line) => {
          const match = /^export declare (?:const|function) (?<name>[A-Za-z_$][\w$]*)/.exec(line)

          return match?.groups?.["name"] === undefined ? [] : [match.groups["name"]]
        })
        .filter((name) => published.has(name))

      expect(
        declared,
        `${fileName} stands in for something the runtime really exports — import it instead`
      ).toEqual([])
    })
  })

  it("belongs to a page that exists", () => {
    const pages = new Set(pagesWithFences().map((page) => `${compiledBaseName(page.sectionSlug, page.pageSlug)}.ts`))

    contextFiles.forEach((fileName) => {
      expect(pages.has(fileName), `${fileName} names no page on this site`).toBe(true)
    })
  })

  it("offers nothing its page does not use", () => {
    contextFiles.forEach((fileName) => {
      const source = readFileSync(join(CONTEXT_DIR, fileName), "utf8")
      const base = fileName.replace(/\.ts$/, "")

      // Every program the page produces, because a page with an alternative
      // produces more than one and a name may be lent to either.
      const programs = compiledPrograms().filter(
        (entry) => entry.fileName === `${base}.ts` || entry.fileName.startsWith(`${base}.`) || entry.fileName.startsWith(`${base}--`)
      )

      expect(programs.length, `${fileName} has no program`).toBeGreaterThan(0)

      const reached = programs.map((program) => program.source).join("\n")

      const unused = contextExportsIn(source, fileName)
        .map((entry) => entry.name)
        .filter((name) => !new RegExp(`\\b${name}\\b`).test(reached))

      expect(unused, `${fileName} offers names nothing on the page reaches for`).toEqual([])
    })
  })
})

/**
 * What the site is actually claiming.
 *
 * Derived rather than typed, because the number is going to move: it is the
 * count of copyable TypeScript on the site, and a page added next week should
 * raise it without anyone editing this file. What is asserted is the shape of
 * the claim — most of the code here is a program, and the blocks that escape
 * compilation are a countable few.
 */
describe("the code a reader can copy", () => {
  const fences = pagesWithFences().flatMap((page) => page.fences)
  const typescript = fences.filter((fence) => fence.language !== "bash")

  it("is nearly all of it, and what is left is declared", () => {
    const compiled = typescript.filter(isCheckable)
    const sketched = typescript.filter((fence) => fence.kind === "sketch")

    expect(compiled.length + sketched.length).toBe(typescript.length)
    expect(compiled.length).toBeGreaterThan(typescript.length * 0.8)
  })
})
