import { spawn } from "node:child_process"
import { mkdtemp, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

/**
 * The one test that spawns a process.
 *
 * Everything the CLI decides is tested as pure functions against an in-memory
 * filesystem, so this is not about the scaffolding logic — it is about the entry
 * point being runnable at all. That was broken until `bin` went through `tsx`:
 * `runCli` was correct and `loom` did not exist, and no unit test could tell the
 * difference. This one can.
 *
 * It runs the real executable against a real temporary directory, so it also
 * covers what the unit tests deliberately fake — that a directory gets created,
 * that a refusal is a non-zero exit, and that the message reaches stderr.
 */

const BIN = join("node_modules", ".bin", "tsx")
const ENTRY = join("src", "cli", "main.ts")

type Invocation = {
  readonly code: number | null
  readonly stdout: string
  readonly stderr: string
}

const loom = (...args: readonly string[]): Promise<Invocation> =>
  new Promise((resolve, reject) => {
    const child = spawn(BIN, [ENTRY, ...args], { stdio: ["ignore", "pipe", "pipe"] })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8")
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8")
    })

    child.on("error", reject)
    child.on("close", (code) => resolve({ code, stdout, stderr }))
  })

let directory: string

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "loom-cli-"))
})

afterAll(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe("the loom executable", () => {
  it("prints usage and exits cleanly", async () => {
    const run = await loom("--help")

    expect(run.code).toBe(0)
    expect(run.stdout).toContain("loom add primitive <type>")
    expect(run.stderr).toBe("")
  }, 30_000)

  it("scaffolds a real directory, then adds to it", async () => {
    const initialised = await loom("init", "--dir", directory)
    expect(initialised.code).toBe(0)

    const added = await loom("add", "primitive", "commerce.product-card", "--dir", directory)
    expect(added.code).toBe(0)

    const written = await readdir(join(directory, "primitives"))
    expect([...written].sort()).toEqual([
      "commerce.product-card.ts",
      "loom.page.ts",
      "registry.test.ts",
      "registry.ts",
    ])
  }, 30_000)

  it("refuses a second init on the same directory, on stderr and with a non-zero exit", async () => {
    const run = await loom("init", "--dir", directory)

    expect(run.code).toBe(1)
    expect(run.stderr).toContain("already exists; nothing was written")
    expect(run.stdout).toBe("")
  }, 30_000)
})
