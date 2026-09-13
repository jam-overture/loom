import { describe, expect, it } from "vitest"

import { memoryFileSystem } from "../testing/filesystem.js"

import { CLI_USAGE, describeCliError, runCli, type CliReport } from "./run.js"
import { CLI_ERROR_CODES, type CliError, type CliErrorCode } from "./plan.js"

const reportOf = async (
  argv: readonly string[],
  filesystem = memoryFileSystem()
): Promise<CliReport> => {
  const result = await runCli(argv, filesystem)
  if (!result.ok) throw new Error(`expected a report, got ${result.error.code}`)

  return result.value
}

const errorOf = async (
  argv: readonly string[],
  filesystem = memoryFileSystem()
): Promise<CliError> => {
  const result = await runCli(argv, filesystem)
  if (result.ok) throw new Error("expected the command to be refused")

  return result.error
}

describe("runCli", () => {
  it("prints usage without touching the filesystem", async () => {
    const filesystem = memoryFileSystem({ listFails: "should not have been listed" })
    const report = await reportOf(["--help"], filesystem)

    expect(report.usage).toBe(true)
    expect(report.notes).toEqual([CLI_USAGE])
    expect(report.written).toEqual([])
  })

  it("writes the scaffold and reports every path it wrote", async () => {
    const filesystem = memoryFileSystem()
    const report = await reportOf(["init"], filesystem)

    expect(report.written).toEqual([
      "loom/primitives/app.page.ts",
      "loom/primitives/registry.ts",
      "loom/primitives/registry.test.ts",
    ])
    expect([...filesystem.files.keys()]).toEqual(report.written)
    expect(report.notes.length).toBeGreaterThan(0)
  })

  it("adds a primitive to a scaffolded directory", async () => {
    const filesystem = memoryFileSystem()
    await reportOf(["init"], filesystem)
    await reportOf(["add", "primitive", "app.card"], filesystem)

    expect(filesystem.files.get("loom/primitives/registry.ts")).toContain("appCard")
    expect(filesystem.files.get("loom/primitives/registry.ts")).toContain("appPage")
  })

  /**
   * The property that makes a refusal safe: planning happens before any write, so
   * a command that cannot complete leaves the directory exactly as it was.
   */
  it("writes nothing at all when the plan is refused", async () => {
    const filesystem = memoryFileSystem({ existing: ["loom/primitives/registry.ts"] })

    expect(await errorOf(["init"], filesystem)).toEqual({
      code: "file-exists",
      path: "loom/primitives/registry.ts",
    })
    expect([...filesystem.files.keys()]).toEqual(["loom/primitives/registry.ts"])
  })

  it("reports a directory it could not read rather than scaffolding over it", async () => {
    const filesystem = memoryFileSystem({ listFails: "EACCES" })

    expect(await errorOf(["init"], filesystem)).toEqual({
      code: "filesystem-failed",
      path: "loom",
      detail: "EACCES",
    })
  })

  it("stops at the file it could not write and names it", async () => {
    const filesystem = memoryFileSystem({ writeFailsAt: "loom/primitives/registry.ts" })

    expect(await errorOf(["init"], filesystem)).toEqual({
      code: "filesystem-failed",
      path: "loom/primitives/registry.ts",
      detail: "permission denied",
    })
    expect([...filesystem.files.keys()]).toEqual(["loom/primitives/app.page.ts"])
  })

  it("passes an argument refusal through without reading anything", async () => {
    const filesystem = memoryFileSystem({ listFails: "should not have been listed" })

    expect(await errorOf(["add", "primitive", "Loom.Card"], filesystem)).toEqual({
      code: "invalid-primitive-type",
      type: "Loom.Card",
    })
  })
})

/**
 * One sample per code, keyed by the code. Being a `Record<CliErrorCode, …>`
 * rather than an array is what makes a tenth code fail to compile here instead
 * of quietly going undescribed, and it is the shape the published list exists to
 * let a consumer outside `src/` use.
 */
const sampleErrors: Record<CliErrorCode, CliError> = {
  "unknown-command": { code: "unknown-command", given: "deploy" },
  "missing-argument": { code: "missing-argument", argument: "<type>" },
  "unexpected-argument": { code: "unexpected-argument", given: "extra" },
  "invalid-primitive-type": { code: "invalid-primitive-type", type: "X" },
  "reserved-primitive-type": { code: "reserved-primitive-type", type: "registry" },
  "framework-namespace": { code: "framework-namespace", type: "loom.card" },
  "already-registered": { code: "already-registered", type: "app.card" },
  "file-exists": { code: "file-exists", path: "a/b.ts" },
  "filesystem-failed": { code: "filesystem-failed", path: "a", detail: "EACCES" },
}

describe("describeCliError", () => {
  it("says what was wrong and what to do about it", () => {
    expect(describeCliError(sampleErrors["unknown-command"])).toContain("--help")
    expect(describeCliError(sampleErrors["missing-argument"])).toContain("<type>")
    expect(describeCliError(sampleErrors["unexpected-argument"])).toContain("extra")
    expect(describeCliError(sampleErrors["invalid-primitive-type"])).toContain("kebab-case")
    expect(describeCliError(sampleErrors["reserved-primitive-type"])).toContain("overwrite")
    expect(describeCliError(sampleErrors["framework-namespace"])).toContain(`"app.card"`)
    expect(describeCliError(sampleErrors["already-registered"])).toContain("already")
    expect(describeCliError(sampleErrors["file-exists"])).toContain("nothing was written")
    expect(describeCliError(sampleErrors["filesystem-failed"])).toContain("EACCES")
  })

  /**
   * Walked from the published list rather than from a copy written here, which
   * is the thing the list was added for: a consumer that reads
   * `CLI_ERROR_CODES` gets a sentence for every one of them or this goes red.
   */
  it("has a sentence for every published code", () => {
    for (const code of CLI_ERROR_CODES) {
      expect(describeCliError(sampleErrors[code]).length).toBeGreaterThan(0)
    }
  })
})
