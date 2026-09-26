import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { err, ok, type Result } from "../../src/result.js"
import { browsersRoot, describeBrowserError, locateChromium } from "../specimen/browser.js"
import { captureShots, describeShot } from "../specimen/capture.js"
import { chromiumBrowser, describeLauncherError, loadChromium } from "../specimen/playwright.js"

import {
  describeBuildError,
  describeReadinessError,
  locateApplication,
  startApplication,
  type RunningApplication,
} from "./application.js"
import { describeShootArgsError, parseShootArgs } from "./args.js"
import { planShots, shotListSchema, type ShotList } from "./plan.js"

/**
 * `pnpm shoot <shot-list.json>` — photograph pages something else is serving.
 *
 *   pnpm shoot shots.json
 *
 * The harness's other entry point is `pnpm specimen`, which renders a tree and
 * serves it itself; use that one whenever the subject is a composition rather
 * than a running application. Everything below the plan is shared with it, and
 * that is deliberate: this file used to carry its own copy of finding Chromium,
 * launching it and sizing a viewport, and the copy had already drifted — a
 * different `wide`, a different set of launch flags, and a hard dependency on
 * `playwright-core` that [0116](../../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
 * had already refused.
 *
 * What is left here is the shot list, which is genuinely this subject's own.
 *
 * `--serve <application-dir>` is the one thing this entry point does that the
 * specimen path does not need: it starts the built application, photographs it
 * and stops it again, so the pictures cannot be of a build that is no longer on
 * disk. `./application.ts` says why that is worth a flag, and 0191 records it.
 */

function fail(message: string): never {
  process.stderr.write(`loom shoot: ${message}\n`)
  process.exit(1)
}

const reason = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause))

const readList = async (path: string) => {
  const source = await readFile(resolve(path), "utf8").catch((cause: unknown) =>
    fail(`cannot read ${path}: ${reason(cause)}`)
  )

  const parsed: unknown = (() => {
    try {
      return JSON.parse(source)
    } catch (cause) {
      return fail(`${path} is not JSON: ${reason(cause)}`)
    }
  })()

  const list = shotListSchema.safeParse(parsed)
  if (!list.success) {
    fail(
      `${path} is not a shot list:\n${list.error.issues
        .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("\n")}`
    )
  }

  return list.data
}

const args = parseShootArgs(process.argv.slice(2))
if (!args.ok) fail(describeShootArgsError(args.error))

const list = await readList(args.value.listPath)

/**
 * Started here rather than inside the capture loop: a browser that cannot be
 * launched should not have cost a `next start` first, and an application that
 * will not answer should be said so before Chromium is looked for.
 */
const served: RunningApplication | undefined = await (async () => {
  const dir = args.value.serveDir
  if (dir === undefined) return undefined

  const application = await locateApplication(dir)
  if (!application.ok) fail(describeBuildError(application.error))

  const running = await startApplication(application.value)
  if (!running.ok) fail(describeReadinessError(running.error))

  process.stdout.write(
    `serving ${dir} at ${running.value.origin}  built ${application.value.finishedAt.toISOString()}\n`
  )

  return running.value
})()

/**
 * A base the harness is responsible for beats one the list guessed. A shot
 * whose `path` is already a whole URL is untouched, which is what lets one list
 * mix this server with something else.
 */
const addressed: ShotList = served === undefined ? list : { ...list, baseUrl: served.origin }

/**
 * The shots, as a value rather than as an exit.
 *
 * `fail` is `process.exit`, and `process.exit` does not run a `finally` — so a
 * missing Chromium inside a `try` would have left the server this run started
 * alive after the command returned. The failure comes back as a message and is
 * taken after the server has been stopped.
 */
const takeShots = async (): Promise<Result<boolean, string>> => {
  const chromium = await loadChromium()
  if (!chromium.ok) return err(describeLauncherError(chromium.error))

  const executable = await locateChromium(browsersRoot(process.env))
  if (!executable.ok) return err(describeBrowserError(executable.error))

  const browser = await chromiumBrowser(chromium.value, executable.value)
  try {
    const results = await captureShots(planShots(addressed), browser, { outDir: addressed.outDir })

    for (const result of results) process.stdout.write(`${describeShot(result)}\n`)
    return ok(results.some((result) => result.overflowed))
  } finally {
    await browser.close()
  }
}

const outcome = await takeShots().finally(async () => {
  await served?.stop()
})

if (!outcome.ok) fail(outcome.error)
process.exitCode = outcome.value ? 1 : 0
