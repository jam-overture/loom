import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"

import { err, ok, type Result } from "../../src/result.js"

import type { Overflow, SpecimenBrowser, SpecimenPage } from "./capture.js"
import type { SpecimenViewport } from "./specimen.js"

/**
 * The one file here that knows what a browser driver is.
 *
 * `playwright-core`, not `playwright`: the second's postinstall re-fetches
 * about 200MB of browsers that this image already has and that the egress proxy
 * blocks, so it fails slowly and for a reason nothing in its output mentions.
 * Neither belongs in a `package.json` in this repository — a picture is a thing
 * a run takes, not a thing the framework ships — so it is resolved at call time
 * from wherever the caller installed it, and its absence is a `Result` rather
 * than a stack trace.
 *
 * The types below are the shape this file uses and nothing more. Structural
 * typing is doing real work: they are satisfied by Playwright and by a double,
 * which is how the launch flags and the context options are asserted on in a
 * test rather than discovered by a lane whose screenshots came out wrong.
 */

export type LaunchedPage = {
  readonly goto: (url: string, options: { readonly waitUntil: "load" }) => Promise<unknown>
  readonly evaluate: <TValue>(body: () => TValue) => Promise<TValue>
  readonly screenshot: (options: {
    readonly path: string
    readonly fullPage: boolean
  }) => Promise<unknown>
}

export type LaunchedContext = {
  readonly newPage: () => Promise<LaunchedPage>
  readonly close: () => Promise<void>
}

export type ContextOptions = {
  readonly viewport: { readonly width: number; readonly height: number }
  readonly deviceScaleFactor: number
  readonly reducedMotion: "reduce"
}

export type LaunchedBrowser = {
  readonly newContext: (options: ContextOptions) => Promise<LaunchedContext>
  readonly close: () => Promise<void>
}

export type LaunchOptions = {
  readonly executablePath: string
  readonly args: readonly string[]
}

export type ChromiumLauncher = {
  readonly launch: (options: LaunchOptions) => Promise<LaunchedBrowser>
}

/**
 * Chromium refuses to start as root without this, and the failure is a launch
 * error naming a sandbox nobody asked for. Every routine in this repository
 * runs as root.
 */
export const LAUNCH_ARGS: readonly string[] = ["--no-sandbox"]

export const contextOptionsFor = (viewport: SpecimenViewport): ContextOptions => ({
  viewport: { width: viewport.width, height: viewport.height },
  deviceScaleFactor: viewport.deviceScaleFactor,
  /**
   * Not a preference — a correctness condition. A band that reveals on scroll
   * starts at zero opacity and is photographed blank, and `prefers-reduced-motion`
   * is what the library's own stylesheet keys its "already arrived" rules on.
   * Every full-page screenshot taken in this repository before this harness was
   * taken without it.
   */
  reducedMotion: "reduce",
})

/** Run in the page: the overflow check four reports quote, at the source. */
const measureOverflow = (): Overflow => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
})

export const chromiumBrowser = async (
  launcher: ChromiumLauncher,
  executablePath: string
): Promise<SpecimenBrowser> => {
  const browser = await launcher.launch({ executablePath, args: LAUNCH_ARGS })

  return {
    open: async (viewport: SpecimenViewport): Promise<SpecimenPage> => {
      const context = await browser.newContext(contextOptionsFor(viewport))
      const page = await context.newPage()

      return {
        goto: async (url) => {
          await page.goto(url, { waitUntil: "load" })
        },
        measure: () => page.evaluate(measureOverflow),
        capture: async (file) => {
          await page.screenshot({ path: file, fullPage: true })
        },
        close: () => context.close(),
      }
    },
    close: () => browser.close(),
  }
}

export const PLAYWRIGHT_PATH_VARIABLE = "LOOM_PLAYWRIGHT"

export type LauncherError = {
  readonly code: "no-playwright"
  readonly reason: string
  readonly searched: readonly string[]
}

export const describeLauncherError = (error: LauncherError): string =>
  `playwright-core is not resolvable from here (${error.reason}). It is not a dependency of this repository and should not become one — a picture is a thing a run takes, not a thing the framework ships. Install it into a scratch directory:\n` +
  `  mkdir -p /tmp/shot && cd /tmp/shot && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright-core\n` +
  `then run the harness with ${PLAYWRIGHT_PATH_VARIABLE}=/tmp/shot/node_modules.` +
  (error.searched.length === 0 ? "" : `\nSearched: ${error.searched.join(", ")}`)

const asLauncher = (candidate: unknown): ChromiumLauncher | undefined => {
  if (typeof candidate !== "object" || candidate === null) return undefined
  const record = candidate as Record<string, unknown>
  const direct = record["chromium"]
  if (typeof direct === "object" && direct !== null) return direct as ChromiumLauncher
  return asLauncher(record["default"])
}

/**
 * Where to look, when the package is not beside this file.
 *
 * `NODE_PATH` is honoured because it is what the four lanes that wrote this
 * script privately reached for — and it does **not** work on its own here:
 * Node's ESM resolver ignores it entirely, which is a five-minute discovery
 * with a misleading error at the end of it. Resolving through `createRequire`
 * is what makes the variable mean what the person setting it thought it meant.
 */
export const playwrightSearchPaths = (
  environment: Readonly<Record<string, string | undefined>>
): readonly string[] =>
  [environment[PLAYWRIGHT_PATH_VARIABLE], environment["NODE_PATH"]]
    .filter((value): value is string => value !== undefined && value.length > 0)
    .flatMap((value) => value.split(":"))
    .filter((value) => value.length > 0)

/**
 * A variable specifier, so the compiler does not resolve a package that is
 * deliberately absent — the same reason the runtime's own optional adapters
 * reach for their peer this way.
 */
export const loadChromium = async (
  searchPaths: readonly string[] = playwrightSearchPaths(process.env)
): Promise<Result<ChromiumLauncher, LauncherError>> => {
  const specifier = "playwright-core"
  const attempts: string[] = []

  const specifiers: string[] = [specifier]
  if (searchPaths.length > 0) {
    try {
      const resolved = createRequire(import.meta.url).resolve(specifier, { paths: [...searchPaths] })
      specifiers.push(pathToFileURL(resolved).href)
    } catch (cause) {
      attempts.push(cause instanceof Error ? cause.message : "unknown")
    }
  }

  for (const candidate of specifiers) {
    try {
      const launcher = asLauncher(await import(candidate))
      if (launcher) return ok(launcher)
      attempts.push(`${candidate} has no chromium export`)
    } catch (cause) {
      attempts.push(cause instanceof Error ? cause.message : "unknown")
    }
  }

  return err({
    code: "no-playwright",
    reason: attempts[0] ?? "not found",
    searched: searchPaths,
  })
}
