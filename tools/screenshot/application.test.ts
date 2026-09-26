import { chmod, mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  describeBuildError,
  describeReadinessError,
  freePort,
  locateApplication,
  newestWrite,
  startApplication,
  waitUntilReachable,
  type ReadinessProbe,
} from "./application.js"
import { describeShootArgsError, parseShootArgs, SHOOT_USAGE } from "./args.js"

const scratch = () => mkdtemp(join(tmpdir(), "loom-shoot-"))

/** An application directory with a build in it, and nothing else real. */
const builtApplication = async (options: { readonly runner?: string } = {}) => {
  const dir = await scratch()
  await mkdir(join(dir, ".next", "cache"), { recursive: true })
  await mkdir(join(dir, "node_modules", ".bin"), { recursive: true })
  await writeFile(join(dir, ".next", "BUILD_ID"), "abc")

  if (options.runner !== undefined) {
    const runner = join(dir, "node_modules", ".bin", "next")
    await writeFile(runner, options.runner)
    await chmod(runner, 0o755)
  }

  return dir
}

describe("when a build was last written", () => {
  it("takes the newest entry, because which file a build writes last is not ours to know", () => {
    expect(
      newestWrite([
        { name: "BUILD_ID", mtimeMs: 100 },
        { name: "export-marker.json", mtimeMs: 400 },
        { name: "server", mtimeMs: 250 },
      ])
    ).toBe(400)
  })

  /**
   * `.next/cache` is the one directory a build keeps — measured on 25
   * September, when a file written into it survived a build and a file written
   * anywhere else in `.next` did not. Its age is the age of the build before
   * this one, so counting it would date every build from the first.
   */
  it("ignores the one directory a build keeps rather than writes", () => {
    expect(
      newestWrite([
        { name: "cache", mtimeMs: 9_000 },
        { name: "BUILD_ID", mtimeMs: 100 },
      ])
    ).toBe(100)
  })

  it("has no answer for a directory that holds only what was kept", () => {
    expect(newestWrite([{ name: "cache", mtimeMs: 9_000 }])).toBeUndefined()
    expect(newestWrite([])).toBeUndefined()
  })
})

describe("locating a built application", () => {
  it("refuses a directory with no build, and says which command makes one", async () => {
    const dir = await scratch()
    const located = await locateApplication(dir)

    expect(located.ok).toBe(false)
    if (located.ok) return
    expect(located.error.code).toBe("no-build")
    expect(describeBuildError(located.error)).toContain("pnpm --filter @loom/app build")
  })

  it("refuses a build with no runner beside it, because the fix is a different command", async () => {
    const dir = await builtApplication()
    const located = await locateApplication(dir)

    expect(located.ok).toBe(false)
    if (located.ok) return
    expect(located.error.code).toBe("no-runner")
    expect(describeBuildError(located.error)).toContain("pnpm install")
  })

  it("dates the build by what it last wrote, not by what a previous build left", async () => {
    const dir = await builtApplication({ runner: "#!/bin/sh\n" })
    const kept = new Date("2020-01-01T00:00:00.000Z")
    const written = new Date("2026-09-25T21:20:27.000Z")
    await utimes(join(dir, ".next", "cache"), kept, kept)
    await utimes(join(dir, ".next", "BUILD_ID"), written, written)

    const located = await locateApplication(dir)

    expect(located.ok).toBe(true)
    if (!located.ok) return
    expect(located.value.finishedAt.toISOString()).toBe("2026-09-25T21:20:27.000Z")
    expect(located.value.distDir).toBe(join(dir, ".next"))
  })
})

describe("waiting for an application to answer", () => {
  const probeOf = (overrides: Partial<ReadinessProbe> = {}): ReadinessProbe => {
    let clock = 0
    return {
      reach: async () => false,
      stopped: () => undefined,
      wait: async (ms) => {
        clock += ms
      },
      now: () => clock,
      ...overrides,
    }
  }

  it("is satisfied by any answer at all, because a status is not the question", async () => {
    let attempts = 0
    const waited = await waitUntilReachable(
      "http://127.0.0.1:1",
      probeOf({
        reach: async () => {
          attempts += 1
          return attempts > 2
        },
      })
    )

    expect(waited.ok).toBe(true)
    expect(attempts).toBe(3)
  })

  /**
   * The failure a lane actually hits is a server that dies on a missing
   * environment variable, and a timeout would report that as slowness ninety
   * seconds later. What killed it is what the message has to carry.
   */
  it("stops the moment the child is gone, and reports how it went", async () => {
    let clock = 0
    const waited = await waitUntilReachable("http://127.0.0.1:1", {
      reach: async () => false,
      stopped: () => (clock > 0 ? "exit 1" : undefined),
      wait: async (ms) => {
        clock += ms
      },
      now: () => clock,
    })

    expect(waited.ok).toBe(false)
    if (waited.ok) return
    expect(waited.error).toEqual({ code: "exited", status: "exit 1" })
    expect(describeReadinessError(waited.error)).toContain("exit 1")
  })

  it("gives up at the deadline and says how long it waited", async () => {
    const waited = await waitUntilReachable("http://127.0.0.1:1", probeOf(), 1_000)

    expect(waited.ok).toBe(false)
    if (waited.ok) return
    expect(waited.error.code).toBe("timed-out")
    expect(describeReadinessError(waited.error)).toContain("http://127.0.0.1:1")
  })
})

describe("starting and stopping an application", () => {
  it("offers a port nothing is listening on", async () => {
    const port = await freePort()

    expect(port).toBeGreaterThan(0)
    expect(port).toBeLessThan(65_536)
  })

  /**
   * A stub runner rather than Next: what is under test is that the harness
   * passes the port it chose, waits for the socket, and stops the child again.
   * Doing that against a real `next start` would be a ninety-second test of
   * somebody else's release.
   */
  it("hands back the origin it chose, and the server is gone once it is stopped", async () => {
    const dir = await builtApplication({
      runner: [
        "#!/usr/bin/env node",
        "const { createServer } = require('node:http')",
        "const port = Number(process.argv[process.argv.indexOf('--port') + 1])",
        "createServer((_, response) => response.writeHead(200).end('up')).listen(port, '127.0.0.1')",
        "",
      ].join("\n"),
    })

    const application = await locateApplication(dir)
    expect(application.ok).toBe(true)
    if (!application.ok) return

    const running = await startApplication(application.value)
    expect(running.ok).toBe(true)
    if (!running.ok) return

    await expect(fetch(running.value.origin).then((response) => response.text())).resolves.toBe("up")

    await running.value.stop()

    await expect(fetch(running.value.origin)).rejects.toThrow()
  })

  /**
   * A child that cannot be spawned at all emits `error` and never `exit`, and
   * an unhandled `error` on a ChildProcess throws out of the event loop. The
   * first run of this path did exactly that, on a runner path that was plainly
   * on disk — a relative one, resolved against the cwd the child was given.
   */
  it("reports a runner it cannot spawn rather than throwing out of the event loop", async () => {
    const dir = await builtApplication({ runner: "#!/usr/bin/env node\n" })
    await chmod(join(dir, "node_modules", ".bin", "next"), 0o644)

    const application = await locateApplication(dir)
    expect(application.ok).toBe(true)
    if (!application.ok) return

    const running = await startApplication(application.value)

    expect(running.ok).toBe(false)
    if (running.ok) return
    expect(running.error.code).toBe("exited")
  })

  it("resolves the application directory, because the child is given it as a cwd", async () => {
    const dir = await builtApplication({ runner: "#!/bin/sh\n" })
    const located = await locateApplication(dir)

    expect(located.ok).toBe(true)
    if (!located.ok) return
    expect(located.value.runner.startsWith("/")).toBe(true)
  })

  it("reports a runner that dies rather than waiting out the deadline", async () => {
    const dir = await builtApplication({ runner: "#!/usr/bin/env node\nprocess.exit(3)\n" })

    const application = await locateApplication(dir)
    expect(application.ok).toBe(true)
    if (!application.ok) return

    const running = await startApplication(application.value)

    expect(running.ok).toBe(false)
    if (running.ok) return
    expect(running.error).toEqual({ code: "exited", status: "exit 3" })
  })
})

describe("reading the arguments", () => {
  it("takes a shot list on its own, which is what every lane runs today", () => {
    const parsed = parseShootArgs(["shots.json"])

    expect(parsed).toEqual({ ok: true, value: { listPath: "shots.json" } })
  })

  it("takes an application directory to serve the shots from", () => {
    const parsed = parseShootArgs(["shots.json", "--serve", "apps/loom"])

    expect(parsed).toEqual({
      ok: true,
      value: { listPath: "shots.json", serveDir: "apps/loom" },
    })
  })

  it("refuses a --serve with nothing after it rather than reading the next flag as a path", () => {
    const parsed = parseShootArgs(["shots.json", "--serve", "--out"])

    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(describeShootArgsError(parsed.error)).toContain("--serve")
  })

  it("refuses an unknown option and a second positional, rather than photographing something else", () => {
    expect(parseShootArgs(["shots.json", "--wide"]).ok).toBe(false)
    expect(parseShootArgs(["a.json", "b.json"]).ok).toBe(false)
  })

  it("says how it is called when it is called with nothing", () => {
    const parsed = parseShootArgs([])

    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(describeShootArgsError(parsed.error)).toBe(SHOOT_USAGE)
  })
})
