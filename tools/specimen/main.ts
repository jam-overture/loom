import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { describeRenderDiagnostic } from "../../src/render/diagnostics.js"

import { describeArgsError, parseSpecimenArgs } from "./args.js"
import { browsersRoot, describeBrowserError, locateChromium } from "./browser.js"
import { captureShots, describeShot } from "./capture.js"
import { planShots } from "./plan.js"
import { chromiumBrowser, describeLauncherError, loadChromium } from "./playwright.js"
import { renderSpecimen } from "./render.js"
import { serveDirectory } from "./serve.js"
import type { Specimen } from "./specimen.js"

/**
 * `pnpm specimen <module>` — render a specimen, serve it, photograph it.
 *
 * Every failure here is a sentence and an exit code rather than a stack trace,
 * because the three that actually happen (no `playwright-core`, no browser
 * where the image put one, a specimen whose default export is something else)
 * each cost a lane a run when they arrived as one.
 */

function fail(message: string): never {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

const isSpecimen = (candidate: unknown): candidate is Specimen =>
  typeof candidate === "object" &&
  candidate !== null &&
  typeof (candidate as { name?: unknown }).name === "string" &&
  typeof (candidate as { build?: unknown }).build === "function" &&
  Array.isArray((candidate as { themes?: unknown }).themes)

const parsed = parseSpecimenArgs(process.argv.slice(2))
if (!parsed.ok) fail(describeArgsError(parsed.error))
const { module: modulePath, outDir } = parsed.value

const loaded: Record<string, unknown> = await import(pathToFileURL(resolve(modulePath)).href)
const specimen = loaded["default"]
if (!isSpecimen(specimen)) fail(`${modulePath} does not default-export a Specimen`)

const rendered = renderSpecimen(specimen)
if (!rendered.ok) fail(`the starter library would not build a registry: ${rendered.error.detail}`)

for (const page of rendered.value) {
  for (const diagnostic of page.diagnostics) {
    process.stderr.write(`note: ${page.page.name}: ${describeRenderDiagnostic(diagnostic)}\n`)
  }
}

const chromium = await loadChromium()
if (!chromium.ok) fail(describeLauncherError(chromium.error))

const executable = await locateChromium(browsersRoot(process.env))
if (!executable.ok) fail(describeBrowserError(executable.error))

const pages = await mkdtemp(join(tmpdir(), "loom-specimen-"))
await mkdir(outDir, { recursive: true })

try {
  for (const page of rendered.value) {
    await writeFile(join(pages, page.page.file), page.html, "utf8")
  }

  /**
   * Nested rather than flat: an open server holds the event loop, so a browser
   * that fails to launch would leave the command hanging instead of reporting.
   */
  const server = await serveDirectory(pages)
  try {
    const browser = await chromiumBrowser(chromium.value, executable.value)
    try {
      const results = await captureShots(planShots(specimen), browser, {
        origin: server.origin,
        outDir,
      })

      for (const result of results) process.stdout.write(`${describeShot(result)}\n`)
      process.exitCode = results.some((result) => result.overflowed) ? 1 : 0
    } finally {
      await browser.close()
    }
  } finally {
    await server.close()
  }
} finally {
  await rm(pages, { recursive: true, force: true })
}
