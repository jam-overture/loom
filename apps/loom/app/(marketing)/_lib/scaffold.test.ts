import { sequentialIdFactory, type ElementNode, type LoomNode } from "@jam-overture/loom"
import { parseArguments, planCommand, PRIMITIVES_DIRECTORY } from "@jam-overture/loom/cli"
import { describe, expect, it } from "vitest"

import { SCAFFOLD_ANCHOR } from "./bands"
import { RESERVED_VOCABULARY } from "./copy"
import { SCAFFOLDING } from "./docs-pages"
import { scaffoldBand, SCAFFOLDED, SCAFFOLD_COMMAND, SCAFFOLD_RUNNER } from "./scaffold"
import { uses, readerCopy } from "./words"

/**
 * The band that says the package writes your first files, held to the command
 * that really writes them.
 *
 * **The panel is run rather than transcribed**, which is the standard
 * `written.test.ts` set for this lane and `connected.test.ts` and
 * `wired.test.ts` raised twice. A panel that compiles is better than a panel
 * that does not; a panel put through the thing it is a panel *of* is better
 * than both. Here the thing is the framework's own command line: everything
 * the site prints after `npx loom` is handed to `parseArguments`, the command
 * that comes back is handed to `planCommand`, and the three lines a reader
 * reads are held against the three files that plan writes.
 *
 * So the ways this band can go wrong are the ways it cannot go wrong quietly:
 *
 * | if | then |
 * | --- | --- |
 * | the command is edited into something the CLI does not take | the parse fails here |
 * | the scaffold grows or loses a file | the row count fails here |
 * | a file is renamed in `src/cli/templates.ts` | the row naming it fails here |
 * | a later run prints the command that adds a part of your own | the register guard fails here |
 *
 * The last of those is the one worth reading, and `scaffold.ts` has it at
 * length: the command that follows this one names a word the maintainer took
 * off this site on 26 September, so it is filed in `FINDINGS.md` rather than
 * printed. A guard is cheaper than the pull request that would find out.
 */

const band = (): ElementNode => {
  const node = scaffoldBand(sequentialIdFactory("scaffold"))

  if (node.kind !== "element") throw new Error("loom: the band is not an element")

  return node
}

const nodesOf = (node: LoomNode): readonly LoomNode[] =>
  node.kind === "text" ? [node] : [node, ...node.children.flatMap(nodesOf)]

const typesIn = (node: LoomNode): readonly string[] =>
  nodesOf(node).flatMap((child) => (child.kind === "element" ? [child.type] : []))

/** Everything a reader reads in the band, the panel included. */
const wordsOfBand = (): string =>
  readerCopy(band())
    .map((string) => string.text)
    .join(" ")

/** The plan `npx loom init` produces in an empty project, through the real CLI. */
const plan = () => {
  const argv = SCAFFOLD_COMMAND.slice(SCAFFOLD_RUNNER.length).trim().split(/\s+/).filter(Boolean)
  const command = parseArguments(argv)

  if (!command.ok) throw new Error(`loom: the site prints a command the CLI refuses: ${argv.join(" ")}`)

  const planned = planCommand(command.value, [])

  if (!planned.ok) throw new Error("loom: the site prints a command that plans nothing")

  return planned.value
}

describe("the command this site prints", () => {
  it("is spelled with the runner the test strips, so the two cannot drift", () => {
    expect(SCAFFOLD_COMMAND.startsWith(`${SCAFFOLD_RUNNER} `)).toBe(true)
  })

  it("is a command the framework's own parser accepts", () => {
    const argv = SCAFFOLD_COMMAND.slice(SCAFFOLD_RUNNER.length).trim().split(/\s+/)

    expect(parseArguments(argv)).toEqual({ ok: true, value: { kind: "init", directory: "loom" } })
  })

  /**
   * The failure this is written about is a reader pasting a command that does
   * nothing, which no renderer, typechecker or screenshot would report.
   */
  it("plans files rather than refusing", () => {
    expect(plan().files.length).toBeGreaterThan(0)
  })
})

describe("the three lines under the panel", () => {
  it("is one line per file the command writes", () => {
    expect(SCAFFOLDED.length).toBe(plan().files.length)
  })

  it("names the files the plan writes, in the order it writes them", () => {
    const written = plan().files.map(({ path }) => path.slice(path.lastIndexOf("/") + 1))

    expect(SCAFFOLDED.map(({ module }) => module)).toEqual(written)
  })

  /**
   * Where the three files land, which is the half of the plan the band does
   * not print. It is asserted so that a scaffold which started writing into
   * the project root would be a red test rather than a band still saying
   * *in your project* about something that no longer is.
   */
  it("writes all of them into one folder of their own", () => {
    const folders = new Set(plan().files.map(({ path }) => path.slice(0, path.lastIndexOf("/"))))

    expect([...folders]).toEqual([`loom/${PRIMITIVES_DIRECTORY}`])
  })

  /**
   * The module names are the test's and never the page's. Two of the three are
   * named after words this site is not allowed to print, so a row rendering its
   * `module` instead of its `says` would be a register failure on a surface
   * whose whole job is not using them.
   */
  it("renders none of the filenames it is held against", () => {
    const words = wordsOfBand()

    for (const { module } of SCAFFOLDED) {
      expect({ module, shown: words.includes(module) }).toEqual({ module, shown: false })
    }
  })

  it("renders every line it carries", () => {
    const words = wordsOfBand()

    for (const { says } of SCAFFOLDED) {
      expect({ says, shown: words.includes(says) }).toEqual({ says, shown: true })
    }
  })
})

describe("the band", () => {
  it("is a section with the anchor a report and a comment reach it by", () => {
    expect(band().type).toBe("loom.section")
    expect(band().props["anchor"]).toBe(SCAFFOLD_ANCHOR)
  })

  it("is composed of parts the library already registers", () => {
    expect([...new Set(typesIn(band()))].sort()).toEqual([
      "loom.action",
      "loom.code",
      "loom.heading",
      "loom.list",
      "loom.list-item",
      "loom.prose",
      "loom.section",
      "loom.stack",
    ])
  })

  it("hands over to the guide that teaches the command rather than to the front of the docs", () => {
    const hrefs = nodesOf(band()).flatMap((node) =>
      node.kind === "element" && typeof node.props["href"] === "string" ? [node.props["href"]] : []
    )

    expect(hrefs).toEqual([SCAFFOLDING.path])
  })

  /**
   * **The guard, and the reason this band is one command rather than two.**
   *
   * `voice.test.ts` reads source panels for `RESERVED_VOCABULARY` over every
   * page and says so in as many words, so the command that adds a component of
   * your own cannot be printed here. It would be a one-line edit to add it and
   * the failure would land on whoever opened the pull request, three files away
   * from this one. This says it where the edit would be made.
   */
  it("names no word this site keeps off every page", () => {
    const words = wordsOfBand()

    for (const term of RESERVED_VOCABULARY) {
      expect({ term, uses: uses(words, term) }).toEqual({ term, uses: false })
    }
  })
})
