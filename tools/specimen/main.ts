import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { describeRenderDiagnostic } from "../../src/render/diagnostics.js"

import { AGAINST_SUBDIR, describeAgainst, shotFiles } from "./against.js"
import { describeArgsError, parseSpecimenArgs } from "./args.js"
import { describeBaselineError, digestShots, photographBaseline } from "./baseline.js"
import { browsersRoot, describeBrowserError, locateChromium } from "./browser.js"
import { bundleSpecimen, describeBundleError } from "./bundle.js"
import { captureShots, describeShot, type ShotResult } from "./capture.js"
import { SPECIMEN_BUNDLE_FILE } from "./page.js"
import { isLive, planShots, shotsAt } from "./plan.js"
import { chromiumBrowser, describeLauncherError, loadChromium } from "./playwright.js"
import { describeRenderError, renderSpecimen } from "./render.js"
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
const { module: modulePath, outDir, against } = parsed.value

const loaded: Record<string, unknown> = await import(pathToFileURL(resolve(modulePath)).href)
const specimen = loaded["default"]
if (!isSpecimen(specimen)) fail(`${modulePath} does not default-export a Specimen`)

const rendered = await renderSpecimen(specimen)
if (!rendered.ok) fail(describeRenderError(rendered.error))

/**
 * Bundled before the browser is looked for, so a specimen whose module will not
 * build says so in a second rather than after Chromium has been located and
 * launched. It is also the failure most likely to be a lane's own typo.
 */
const bundle = isLive(specimen) ? await bundleSpecimen(modulePath) : undefined
if (bundle !== undefined && !bundle.ok) fail(describeBundleError(bundle.error))

for (const page of rendered.value) {
  for (const diagnostic of page.diagnostics) {
    process.stderr.write(`note: ${page.page.name}: ${describeRenderDiagnostic(diagnostic)}\n`)
  }
}

const chromium = await loadChromium()
if (!chromium.ok) fail(describeLauncherError(chromium.error))

const executable = await locateChromium(browsersRoot(process.env))
if (!executable.ok) fail(describeBrowserError(executable.error))

/**
 * Serving, launching and photographing, and then nothing: the shot lines are
 * printed and the comparison is run after this returns, so that a second
 * harness is never launched while this one still holds a browser and a port.
 */
const photograph = async (): Promise<readonly ShotResult[]> => {
  const pages = await mkdtemp(join(tmpdir(), "loom-specimen-"))
  await mkdir(outDir, { recursive: true })

  try {
    for (const page of rendered.value) {
      await writeFile(join(pages, page.page.file), page.html, "utf8")
    }

    if (bundle?.ok === true) {
      await writeFile(join(pages, SPECIMEN_BUNDLE_FILE), bundle.value, "utf8")
    }

    /**
     * Nested rather than flat: an open server holds the event loop, so a browser
     * that fails to launch would leave the command hanging instead of reporting.
     */
    const server = await serveDirectory(pages)
    try {
      const browser = await chromiumBrowser(chromium.value, executable.value)
      try {
        return await captureShots(shotsAt(server.origin, planShots(specimen)), browser, { outDir })
      } finally {
        await browser.close()
      }
    } finally {
      await server.close()
    }
  } finally {
    await rm(pages, { recursive: true, force: true })
  }
}

const results = await photograph()

for (const result of results) process.stdout.write(`${describeShot(result)}\n`)
process.exitCode = results.some((result) => result.overflowed) ? 1 : 0

/**
 * The comparison comes after the verdict is already set, and never touches it.
 *
 * A moved picture is the commonest reason to have run the harness at all, so a
 * comparison that failed the run would make every deliberate visual change a
 * build failure (0159). An unresolvable ref is the one thing here that does
 * fail, because it is a question that could not be asked rather than an answer
 * nobody liked.
 */
if (against !== undefined) {
  const baselineDir = resolve(outDir, AGAINST_SUBDIR)

  const baseline = await photographBaseline({
    ref: against,
    module: modulePath,
    outDir: baselineDir,
    cwd: process.cwd(),
    env: process.env,
  })

  if (!baseline.ok) fail(describeBaselineError(baseline.error))

  const here = await digestShots(outDir, shotFiles(results))
  process.stdout.write(`${describeAgainst(against, here, baseline.value, baselineDir)}\n`)
}
