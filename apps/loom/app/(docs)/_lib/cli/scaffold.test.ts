import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { createStarterPrimitiveRegistry } from "@loom/runtime/primitives"
import { auditRegistry, describeRegistryError } from "@loom/runtime/sdk"
import { describe, expect, it } from "vitest"

import {
  ADDED_PRIMITIVE_TYPE,
  ALTERNATIVE_DIRECTORY,
  commandRefusals,
  directoryOptionRun,
  EXECUTED_COMMANDS,
  helpOutput,
  REFUSAL_ORDER,
  refusedInitLeaves,
  SCAFFOLD_DIRECTORY,
  scaffoldSession,
} from "./scaffold"

/**
 * The scaffolding page, held against the CLI it describes.
 *
 * Two different kinds of claim are checked here and they fail for different
 * reasons. The first kind is about the **runs**: what `loom init` writes, what
 * it refuses, what it leaves behind when it refuses. Those come back red when
 * `src/cli/` changes under the page.
 *
 * The second kind is about the **prose**: every command printed on the page is
 * one that was executed, and every file and command it asks a component for is
 * one the session produced. Those come back red when somebody edits the MDX and
 * invents a command, which is the failure a documentation site cannot see and a
 * reader meets first.
 *
 * Deliberately not asserted: the *text* of the generated files. That is
 * `templates.test.ts`'s job in the lane that owns it, and a second copy of those
 * expectations here would turn an ordinary framework improvement into a red
 * documentation suite — the failure mode filed against this directory on
 * 24 August. What is asserted is only what the page says out loud.
 */

const PAGE = fileURLToPath(
  new URL("../../docs/getting-started/scaffolding-a-project/page.mdx", import.meta.url)
)

const pageSource = (): string => readFileSync(PAGE, "utf8")

const BASH_FENCE = /```bash\n([\s\S]*?)```/g
const SCAFFOLDED_FILE = /<ScaffoldedFile\s+path="([^"]+)"/g
const TRANSCRIPT = /<ScaffoldTranscript\s+command="([^"]+)"/g

const matches = (pattern: RegExp): readonly string[] =>
  [...pageSource().matchAll(pattern)].map((match) => match[1] ?? "")

/**
 * Command lines as a reader would type them, with the runner stripped.
 *
 * `pnpm loom init` and `loom init` are the same command reached two ways — the
 * package is not published yet, so the page has to show both — and the CLI only
 * ever sees the second.
 */
const printedCommands = (): readonly string[] =>
  matches(BASH_FENCE)
    .flatMap((block) => block.split("\n"))
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => line.replace(/^(?:pnpm|npx) /, ""))

describe("the session the page walks through", () => {
  it("scaffolds exactly the three files the page names", async () => {
    const session = await scaffoldSession()
    const [init] = session.steps

    expect(init?.written).toEqual([
      `${SCAFFOLD_DIRECTORY}/primitives/app.page.ts`,
      `${SCAFFOLD_DIRECTORY}/primitives/registry.ts`,
      `${SCAFFOLD_DIRECTORY}/primitives/registry.test.ts`,
    ])
  })

  it("regenerates the registry rather than adding a fourth file", async () => {
    const session = await scaffoldSession()
    const [, added] = session.steps

    expect(added?.written).toEqual([
      `${SCAFFOLD_DIRECTORY}/primitives/${ADDED_PRIMITIVE_TYPE}.ts`,
      `${SCAFFOLD_DIRECTORY}/primitives/registry.ts`,
    ])
  })

  /**
   * The claim under "The registry rewrites itself": the second command's
   * registry holds *both*, in sorted order, without anyone having listed them.
   */
  it("leaves a registry that imports both primitives, sorted", async () => {
    const session = await scaffoldSession()
    const registry = session.files.get(`${SCAFFOLD_DIRECTORY}/primitives/registry.ts`) ?? ""

    const imported = [...registry.matchAll(/from "\.\/(.+)\.js"/g)].map((match) => match[1])

    expect(imported).toEqual(["app.page", `${ADDED_PRIMITIVE_TYPE}`])
  })

  /** The `loom.editable` paragraph is about a line that is really in the file. */
  it("writes a starter that spreads the edit-mode contract", async () => {
    const session = await scaffoldSession()
    const starter = session.files.get(`${SCAFFOLD_DIRECTORY}/primitives/app.page.ts`) ?? ""

    expect(starter).toContain("...loom.editable")
  })

  it("puts everything under the directory --dir names", async () => {
    const step = await directoryOptionRun()

    for (const path of step.written) {
      expect(path.startsWith(`${ALTERNATIVE_DIRECTORY}/`), path).toBe(true)
    }
  })

  it("prints usage naming both commands and the one option", async () => {
    const usage = await helpOutput()

    expect(usage).toContain("loom init")
    expect(usage).toContain("loom add primitive <type>")
    expect(usage).toContain("--dir <directory>")
  })
})

describe("the refusals the page tabulates", () => {
  /**
   * The record they are built from is typed over `CliError["code"]`, so a ninth
   * refusal is already a type error. This is the other half: an order that
   * silently dropped one would leave the page describing seven of eight with
   * nothing red.
   */
  it("reads every refusal the CLI can produce, once each", () => {
    expect([...REFUSAL_ORDER].sort()).toEqual([...new Set(REFUSAL_ORDER)].sort())
    expect(REFUSAL_ORDER).toHaveLength(9)
  })

  /**
   * `commandRefusals` throws if a documented refusal succeeds or comes back as
   * a different code, so resolving at all is most of this assertion.
   */
  it("gets the runtime's own sentence back for each one", async () => {
    const refusals = await commandRefusals()

    expect(refusals.map((refusal) => refusal.code)).toEqual(REFUSAL_ORDER)

    for (const refusal of refusals) {
      expect(refusal.message.length, refusal.code).toBeGreaterThan(0)
    }
  })

  it("leaves the directory exactly as it was when it refuses", async () => {
    const left = await refusedInitLeaves()

    expect([...left.keys()]).toEqual([`${SCAFFOLD_DIRECTORY}/primitives/registry.ts`])
  })
})

describe("the page and the commands it prints", () => {
  it("prints no command that was not run", () => {
    for (const command of printedCommands()) {
      expect(EXECUTED_COMMANDS, command).toContain(command)
    }
  })

  it("prints at least one", () => {
    expect(printedCommands().length).toBeGreaterThan(0)
  })

  it("asks only for files the scaffold wrote", async () => {
    const session = await scaffoldSession()

    for (const path of matches(SCAFFOLDED_FILE)) {
      expect([...session.files.keys()], path).toContain(path)
    }
  })

  it("asks only for commands the session runs", async () => {
    const session = await scaffoldSession()
    const run = session.steps.map((step) => step.command)

    for (const command of matches(TRANSCRIPT)) {
      expect(run, command).toContain(command)
    }
  })
})

describe("the claims the page makes about the runtime", () => {
  /**
   * The page says the generated test runs three checks and describes each. The
   * names are the audit's own fields, so a rename in `src/sdk/` should take this
   * red rather than leave the page describing a check nobody runs.
   */
  it("names three checks that a real audit actually reports", () => {
    const built = createStarterPrimitiveRegistry()

    if (!built.ok) throw new Error(describeRegistryError(built.error))

    const audit = auditRegistry(built.value)

    expect(audit).toHaveProperty("notDecorated")
    expect(audit).toHaveProperty("notProbeable")
    expect(audit).toHaveProperty("throwsOnDeclaredProps")
  })

  /**
   * This asserted the opposite until 1 September, and the flip is the news.
   *
   * The scaffold used to write a `loom.page`, which the starter library also
   * registers, so the page carried a callout warning that a reader who combined
   * the two got a registry that refused itself. `framework-20` closed that —
   * [0101](../../../../../../decisions/0101-the-loom-namespace-is-the-frameworks-and-the-cli-will-not-write-in-it.md)
   * gave the whole `loom.` namespace to the framework and the scaffold writes
   * `app.page` — so the callout now describes something that cannot happen.
   *
   * Kept rather than deleted, and inverted rather than weakened: the guarantee
   * a reader needs is that following this page and *Rendering a tree* in order
   * produces a registry that builds. That is worth an assertion permanently,
   * where the collision was only ever worth one while it lasted.
   */
  it("scaffolds a type the starter library leaves free, so the two combine", async () => {
    const session = await scaffoldSession()

    expect([...session.files.keys()]).toContain(`${SCAFFOLD_DIRECTORY}/primitives/app.page.ts`)

    const built = createStarterPrimitiveRegistry()

    if (!built.ok) throw new Error(describeRegistryError(built.error))

    expect(built.value.primitives.map((primitive) => primitive.type)).not.toContain("app.page")
  })
})
