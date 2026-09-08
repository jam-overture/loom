import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { browsersRoot, describeBrowserError, locateChromium } from "../specimen/browser.js"
import { captureShots, describeShot } from "../specimen/capture.js"
import { chromiumBrowser, describeLauncherError, loadChromium } from "../specimen/playwright.js"

import { planShots, shotListSchema } from "./plan.js"

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

const listPath = process.argv[2]
if (listPath === undefined) fail("usage: pnpm shoot <shot-list.json>")

const list = await readList(listPath)

const chromium = await loadChromium()
if (!chromium.ok) fail(describeLauncherError(chromium.error))

const executable = await locateChromium(browsersRoot(process.env))
if (!executable.ok) fail(describeBrowserError(executable.error))

const browser = await chromiumBrowser(chromium.value, executable.value)
try {
  const results = await captureShots(planShots(list), browser, { outDir: list.outDir })

  for (const result of results) process.stdout.write(`${describeShot(result)}\n`)
  process.exitCode = results.some((result) => result.overflowed) ? 1 : 0
} finally {
  await browser.close()
}
