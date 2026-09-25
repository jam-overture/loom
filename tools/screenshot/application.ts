import { spawn, type ChildProcess } from "node:child_process"
import { readdir, stat } from "node:fs/promises"
import { createServer } from "node:net"
import { join, resolve } from "node:path"

import { err, ok, type Result } from "../../src/result.js"

/**
 * Starting the application the shot list points at, so that a picture cannot be
 * of a build that is no longer on disk.
 *
 * [0117](../../decisions/0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
 * said `pnpm shoot` photographs a server you are already running and does not
 * start one, because *running your application is your lane's recipe, and it is
 * the part that differs*. That premise was true of five applications and is no
 * longer true of one: since the migration there is a single `apps/loom`, and
 * what differs between lanes is the environment it is handed rather than the
 * command. 0191 records the change; what it buys is below.
 *
 * **A `next start` loads a route's compiled module the first time it is asked
 * for one and keeps it.** So a server that was running before a rebuild serves
 * a mixture afterwards — stale for every route it had already answered, fresh
 * for every route it had not — and nothing it puts in a response says which.
 * Measured on 25 September: a build exited 0, the new string was in
 * `.next/server/chunks`, and the server that had been running since before it
 * served the old one. That is what cost the documentation lane a screenshot
 * cycle on 24 September, and no probe over HTTP can see it.
 *
 * A server this harness started is a server that cannot be in that state: it is
 * younger than the build directory it read.
 */

/** `.next/cache` is the one directory a build keeps, so it says nothing about when. */
const KEPT_ACROSS_BUILDS = "cache"

export type BuildError =
  | { readonly code: "no-build"; readonly distDir: string }
  | { readonly code: "no-runner"; readonly binary: string }

export const describeBuildError = (error: BuildError): string => {
  switch (error.code) {
    case "no-build":
      return `${error.distDir} holds no build: run \`pnpm --filter @loom/app build\` first`
    case "no-runner":
      return `${error.binary} is not there: run \`pnpm install\` in the workspace first`
  }
}

export type BuiltApplication = {
  readonly dir: string
  readonly distDir: string
  readonly runner: string
  /** When the build last wrote anything, which is what a report should quote. */
  readonly finishedAt: Date
}

/**
 * The newest of a build directory's own entries, `cache` excluded.
 *
 * Which file a version of Next writes last is not something this harness should
 * claim to know — `BUILD_ID` is written before static generation finishes, so
 * the obvious choice is the wrong one by twenty seconds. Taking the maximum
 * over the directory needs no such claim and survives the day the order
 * changes.
 */
export const newestWrite = (
  entries: readonly { readonly name: string; readonly mtimeMs: number }[]
): number | undefined => {
  const dated = entries.filter((entry) => entry.name !== KEPT_ACROSS_BUILDS)
  return dated.length === 0 ? undefined : Math.max(...dated.map((entry) => entry.mtimeMs))
}

const mtimesIn = async (
  distDir: string
): Promise<readonly { readonly name: string; readonly mtimeMs: number }[]> => {
  const names = await readdir(distDir).catch(() => undefined)
  if (names === undefined) return []

  const dated = await Promise.all(
    names.map(async (name) => {
      const info = await stat(join(distDir, name)).catch(() => undefined)
      return info === undefined ? undefined : { name, mtimeMs: info.mtimeMs }
    })
  )

  return dated.filter((entry) => entry !== undefined)
}

const isFile = async (path: string): Promise<boolean> =>
  stat(path)
    .then((info) => info.isFile())
    .catch(() => false)

/**
 * `dir` is an application directory — the one holding `.next` and
 * `package.json`. It is resolved here, and that is load-bearing rather than
 * tidiness: the child is spawned with its `cwd` set to this directory, and a
 * relative runner path is resolved against *that* cwd, so `apps/loom/node_…`
 * is looked for inside `apps/loom`. It fails with `ENOENT` on a path that is
 * plainly there, which is a confusing half-minute.
 */
export const locateApplication = async (
  where: string
): Promise<Result<BuiltApplication, BuildError>> => {
  const dir = resolve(where)
  const distDir = join(dir, ".next")
  if (!(await isFile(join(distDir, "BUILD_ID")))) return err({ code: "no-build", distDir })

  const runner = join(dir, "node_modules", ".bin", "next")
  if (!(await isFile(runner))) return err({ code: "no-runner", binary: runner })

  const newest = newestWrite(await mtimesIn(distDir))

  return ok({ dir, distDir, runner, finishedAt: new Date(newest ?? 0) })
}

/**
 * Port 0 and then let go of it, rather than a fixed port.
 *
 * A lane's own `next dev` is very often on 3000 and the point of this path is
 * that the harness's server is its own. The gap between closing this socket and
 * the child binding the number back is a race nothing here can close, and it is
 * the same one `tools/specimen/serve.ts` accepts for the same reason.
 */
export const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once("error", reject)
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address()
      if (address === null || typeof address === "string") {
        probe.close(() => {
          reject(new Error("no TCP address was given for the port probe"))
        })
        return
      }
      const { port } = address
      probe.close(() => {
        resolve(port)
      })
    })
  })

export type ReadinessError =
  | { readonly code: "timed-out"; readonly origin: string; readonly waitedMs: number }
  | { readonly code: "exited"; readonly status: string }

export const describeReadinessError = (error: ReadinessError): string => {
  switch (error.code) {
    case "timed-out":
      return `${error.origin} did not answer within ${Math.round(error.waitedMs / 1000)}s`
    case "exited":
      return `the application stopped before it answered (${error.status})`
  }
}

export const READY_TIMEOUT_MS = 90_000
const POLL_MS = 250

export type ReadinessProbe = {
  /** Resolves true once the origin answers at all — any status is an answer. */
  readonly reach: (origin: string) => Promise<boolean>
  /** Non-undefined once the child is gone, and what to say about it. */
  readonly stopped: () => string | undefined
  readonly wait: (ms: number) => Promise<void>
  readonly now: () => number
}

/**
 * Polling rather than reading the child's output for a banner.
 *
 * The banner is a string in someone else's release notes; a socket that answers
 * is the property actually wanted, and it is the same property under `next
 * start`, a static server or anything a later lane points this at.
 */
export const waitUntilReachable = async (
  origin: string,
  probe: ReadinessProbe,
  timeoutMs = READY_TIMEOUT_MS
): Promise<Result<number, ReadinessError>> => {
  const startedAt = probe.now()

  for (;;) {
    const status = probe.stopped()
    if (status !== undefined) return err({ code: "exited", status })

    if (await probe.reach(origin)) return ok(probe.now() - startedAt)

    const waitedMs = probe.now() - startedAt
    if (waitedMs >= timeoutMs) return err({ code: "timed-out", origin, waitedMs })

    await probe.wait(POLL_MS)
  }
}

export type RunningApplication = {
  readonly origin: string
  readonly stop: () => Promise<void>
}

const describeExit = (child: ChildProcess): string =>
  child.signalCode !== null ? `killed by ${child.signalCode}` : `exit ${child.exitCode ?? "?"}`

const stopping = (child: ChildProcess): Promise<void> =>
  new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve()
      return
    }
    child.once("exit", () => {
      resolve()
    })
    child.kill("SIGTERM")
  })

/**
 * Starts the built application and hands back the origin it answers on.
 *
 * `stdio` is dropped rather than inherited: a page table and a request log
 * interleaved with the shot lines is how a lane misses the one line that says
 * the picture overflowed. What the child says when it *fails* is what the
 * caller needs, so the readiness error carries how it died.
 */
export const startApplication = async (
  application: BuiltApplication,
  environment: NodeJS.ProcessEnv = process.env
): Promise<Result<RunningApplication, ReadinessError>> => {
  const port = await freePort()
  const origin = `http://127.0.0.1:${port}`

  const child = spawn(application.runner, ["start", "--port", String(port)], {
    cwd: application.dir,
    env: { ...environment, PORT: String(port) },
    stdio: "ignore",
  })

  /**
   * `error` as well as `exit`. A child that cannot be spawned at all emits only
   * the first, and an unhandled `error` event on a ChildProcess is a throw out
   * of the event loop — which is how this arrived as a stack trace rather than
   * as the one sentence the caller needed.
   */
  let gone: string | undefined
  child.once("exit", () => {
    gone ??= describeExit(child)
  })
  child.once("error", (cause: Error) => {
    gone ??= cause.message
  })

  const ready = await waitUntilReachable(origin, {
    reach: (address) =>
      fetch(address, { redirect: "manual" }).then(
        () => true,
        () => false
      ),
    stopped: () => gone,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  })

  if (!ready.ok) {
    await stopping(child)
    return ready
  }

  return ok({ origin, stop: () => stopping(child) })
}
