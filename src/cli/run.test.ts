import { describe, expect, it } from "vitest"

import { memoryFileSystem } from "../testing/filesystem.js"

import { CLI_USAGE, describeCliError, runCli, type CliReport } from "./run.js"
import type { CliError } from "./plan.js"

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

describe("describeCliError", () => {
  it("says what was wrong and what to do about it", () => {
    expect(describeCliError({ code: "unknown-command", given: "deploy" })).toContain("--help")
    expect(describeCliError({ code: "missing-argument", argument: "<type>" })).toContain("<type>")
    expect(describeCliError({ code: "unexpected-argument", given: "extra" })).toContain("extra")
    expect(describeCliError({ code: "invalid-primitive-type", type: "X" })).toContain("kebab-case")
    expect(describeCliError({ code: "reserved-primitive-type", type: "registry" })).toContain("overwrite")
    expect(describeCliError({ code: "framework-namespace", type: "loom.card" })).toContain(`"app.card"`)
    expect(describeCliError({ code: "already-registered", type: "app.card" })).toContain("already")
    expect(describeCliError({ code: "file-exists", path: "a/b.ts" })).toContain("nothing was written")
    expect(describeCliError({ code: "filesystem-failed", path: "a", detail: "EACCES" })).toContain("EACCES")
  })
})
