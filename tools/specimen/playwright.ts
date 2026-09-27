import { mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname } from "node:path"
import { pathToFileURL } from "node:url"

import { err, ok, type Result } from "../../src/result.js"

import type { Overflow, SpecimenBrowser, SpecimenPage, StartState } from "./capture.js"
import { scriptFor } from "./start-state.js"
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

/**
 * One element: everything the harness does to a page, it does through one.
 *
 * `page.click(selector)` and `page.waitForSelector(selector)` were the older
 * spelling and neither has a frame-shaped version. A locator does, so
 * resolving every selector to a locator first is what lets the frame be a
 * field on an approach rather than a second code path beside each call.
 */
export type LaunchedLocator = {
  readonly click: () => Promise<unknown>
  readonly fill: (value: string) => Promise<unknown>
  readonly waitFor: () => Promise<unknown>
  /**
   * The first match, which is what waiting for a selector has always meant
   * here and is **not** what acting on one means.
   *
   * A locator is strict and `page.waitForSelector` was not, so moving the wait
   * onto a locator quietly made *wait until the results appear* an error the
   * moment two results appeared — found by this harness photographing a search
   * box with two hits in it. A press or a keystroke keeps the strictness: which
   * of two buttons was pressed is a coin flip whose outcome ends up in the
   * picture, and there the ambiguity is the lane's to resolve.
   */
  readonly first: () => LaunchedLocator
  /**
   * Strict, like `click` and `fill` and unlike `waitFor`.
   *
   * Which of two matches is brought into view decides what the picture is of,
   * exactly as which of two buttons is pressed does, so the ambiguity is the
   * lane's to resolve rather than the driver's to settle by taking the first.
   */
  readonly scrollIntoViewIfNeeded: () => Promise<unknown>
  readonly screenshot: (options: { readonly path: string }) => Promise<unknown>
}

/** A browsing context inside the page, which resolves selectors and nothing else. */
export type LaunchedFrame = {
  readonly locator: (selector: string) => LaunchedLocator
}

export type LaunchedPage = {
  readonly goto: (url: string, options: { readonly waitUntil: "load" }) => Promise<unknown>
  readonly evaluate: <TValue>(body: () => TValue) => Promise<TValue>
  /**
   * Registered before a navigation and run in every document that follows.
   *
   * `evaluate` is the wrong tool for a start state and the difference is the
   * whole point: it runs against a document that already exists, and by then
   * the page has read what it reads. This runs first.
   *
   * Source rather than a function, and `start-state.ts` says why at length:
   * a compiled function arrives carrying its compiler's helpers, which do not
   * exist in the page.
   */
  readonly addInitScript: (script: string) => Promise<unknown>
  readonly waitForTimeout: (ms: number) => Promise<unknown>
  readonly locator: (selector: string) => LaunchedLocator
  readonly frameLocator: (selector: string) => LaunchedFrame
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
 * The two arguments Chromium needs to start here at all.
 *
 * It refuses to run its own sandbox as root and exits with an error that reads
 * like a missing binary rather than a refused one; every routine in this
 * repository runs as root. `--disable-dev-shm-usage` is the second half of the
 * same story: the container's `/dev/shm` is small enough that a full-page shot
 * of a long page dies partway through, and the crash arrives as a closed target
 * rather than as an out-of-space message.
 */
export const LAUNCH_ARGS: readonly string[] = ["--no-sandbox", "--disable-dev-shm-usage"]

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

/**
 * Run in the top document before the first step of a `do` list: hold it still.
 *
 * A click on a real `a[href]` in the starter library navigates, and every step
 * after it then runs on a different page — so a three-step shot silently
 * photographs somewhere else, which is the single failure mode this harness
 * exists to prevent. A `do` list is a sequence against *one* page by
 * construction, so the navigation is refused rather than the lane being asked
 * to remember.
 *
 * It is the **top** document, and that is stated rather than glossed: a
 * listener added here does not reach inside a frame, so a link pressed in a
 * framed approach still navigates that frame. A `waitFor` step is how such a
 * shot re-synchronises with the document it landed in.
 *
 * Capture phase, and `preventDefault` rather than `stopPropagation`: the page's
 * own delegated listeners must still see the click. A reader-signal broadcaster
 * is precisely a delegated listener on the root, and suppressing the event
 * would make the picture a photograph of the instrument rather than of the
 * page.
 */
const pinNavigation = (): void => {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target
      if (target instanceof Element && target.closest("a[href]")) event.preventDefault()
    },
    true
  )
}

export const chromiumBrowser = async (
  launcher: ChromiumLauncher,
  executablePath: string
): Promise<SpecimenBrowser> => {
  const browser = await launcher.launch({ executablePath, args: LAUNCH_ARGS })

  return {
    open: async (viewport: SpecimenViewport): Promise<SpecimenPage> => {
      const context = await browser.newContext(contextOptionsFor(viewport))
      const page = await context.newPage()

      /**
       * Where a selector is resolved: the top document, or the frame an
       * approach named. One function, used by `waitFor`, by every step and by
       * a clipped capture, so the three cannot disagree about what `frame`
       * means.
       */
      const locatorFor =
        (frame: string | undefined) =>
        (selector: string): LaunchedLocator =>
          frame === undefined ? page.locator(selector) : page.frameLocator(frame).locator(selector)

      return {
        start: async (state: StartState) => {
          await page.addInitScript(scriptFor(state))
        },
        goto: async (url, waitFor, frame) => {
          await page.goto(url, { waitUntil: "load" })
          if (waitFor !== undefined) await locatorFor(frame)(waitFor).first().waitFor()
        },
        act: async (steps, frame) => {
          await page.evaluate(pinNavigation)
          const at = locatorFor(frame)
          for (const step of steps) {
            if ("click" in step) await at(step.click).click()
            else if ("fill" in step) await at(step.fill).fill(step.text)
            else if ("scrollTo" in step) await at(step.scrollTo).scrollIntoViewIfNeeded()
            else if ("waitFor" in step) await at(step.waitFor).first().waitFor()
            else await page.waitForTimeout(step.wait)
          }
        },
        measure: () => page.evaluate(measureOverflow),
        /**
         * The directory is made here rather than in the capture loop, because
         * this is the file that writes and the loop is exercised against a
         * double that should not touch a disk.
         */
        capture: async (file, target) => {
          await mkdir(dirname(file), { recursive: true })
          if (target.clip !== undefined) {
            await locatorFor(target.frame)(target.clip).screenshot({ path: file })
            return
          }
          await page.screenshot({ path: file, fullPage: target.fullPage })
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
