import { mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname } from "node:path"
import { pathToFileURL } from "node:url"

import { err, ok, type Result } from "../../src/result.js"

import {
  clippedFrom,
  type ClippingBox,
  type ElementBox,
  type MeasuredSelector,
  type Overflow,
  type SpecimenBrowser,
  type SpecimenPage,
  type StartState,
} from "./capture.js"
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
  /**
   * Every match, read in the page in one round trip.
   *
   * Deliberately **not** strict, unlike `click` and `scrollIntoViewIfNeeded`.
   * There the ambiguity of two matches decides what the picture is of and is
   * the lane's to resolve; here the two matches *are* the answer — a lane
   * asking the size of a list's rows is asking about all of them — so a
   * locator that would refuse them is the wrong one.
   *
   * This is also the call that makes a Playwright selector work here at all:
   * `text=Put it back` and `>> nth=` are the driver's engine and not the
   * document's, so a `page.evaluate` with `querySelectorAll` in it would accept
   * such a selector from a lane and hand back `no match` forever.
   */
  readonly evaluateAll: <TValue>(body: (elements: Element[]) => TValue) => Promise<TValue>
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
  readonly hasTouch: boolean
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
  /**
   * The same kind of condition, for the pointer rather than for motion, and
   * `SpecimenViewport.touch` says what it buys.
   *
   * **`hasTouch` alone, and `isMobile` deliberately not set.** That pair is how
   * Playwright's own device descriptors are written, so the choice needs the
   * measurement behind it. Taken in this container, at 390x844, reading
   * `matchMedia` in the page:
   *
   * | context | `hover` | `pointer` | `innerWidth` |
   * | --- | --- | --- | --- |
   * | neither | `hover` | `fine` | 390 |
   * | `hasTouch` | `none` | `coarse` | 390 |
   * | `isMobile` | `hover` | `fine` | **980** |
   * | both | `none` | `coarse` | 390 |
   *
   * `hasTouch` is what moves the pointer; `isMobile` moves nothing about it.
   * What `isMobile` does move is the **meta viewport**, and the 980 above is
   * that: on a document with no `<meta name="viewport">` Chromium falls back to
   * a 980-pixel layout width and the picture is a desktop page scaled down —
   * the exact failure the comment on `PHONE` has warned about since it was
   * written. Every page the application serves declares the meta tag, so
   * `isMobile` would be inert there; a specimen's rendered page and any
   * hand-written fixture are the cases that would silently break. So it is left
   * off: it buys nothing and it can cost the whole picture.
   *
   * **One residual limit, measured rather than assumed.** `"ontouchstart" in
   * window` stays `false` under `hasTouch`, while `navigator.maxTouchPoints`
   * becomes 1. A page that sniffs the pointer in CSS is now photographed
   * truthfully; a page that sniffs `ontouchstart` in a script still is not.
   */
  hasTouch: viewport.touch,
})

/** Run in the page: the overflow check four reports quote, at the source. */
const measureDocument = (): { scrollWidth: number; innerWidth: number } => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
})

/**
 * Run in the page: every box that clips horizontally, and how much it is
 * hiding.
 *
 * The document measurement above cannot see through a clip, and four bands in
 * the starter catalogue are rooted in one. A `loom.backdrop` sets
 * `overflow: hidden` and has to — its paints reach the element's edges — so a
 * band that overflows inside one reports `390 / 390` while a figure sits off
 * the edge of the page. Measured on one tree rendered twice on 27 September:
 * wrapped, 390 / 390; the identical content unwrapped, 401 / 390.
 *
 * Every reading it can take, unfiltered. Which of them is a defect is decided
 * by `clippedFrom` in Node, because that part is arithmetic and this part needs
 * a laid-out page.
 *
 * `overflow-x` only, and only `hidden` or `clip`. A box with `auto` or
 * `scroll` gets a scrollbar, which is the box telling the reader there is more
 * — the opposite of the thing being looked for. A `loom.code` block that
 * scrolls sideways is working.
 *
 * **Not one named helper inside it**, and the flat loop below is that rule
 * rather than a style. Playwright serialises this function with `toString`, and
 * the compiler wraps every named inner function in a `__name` call that exists
 * in this process and not in the page — `ReferenceError: __name is not defined`,
 * thrown from a line number in generated source. It is the same trap
 * `start-state.ts` states for a start script, met from the other direction, and
 * the two sibling functions here happen to have no inner functions to lose.
 */
const readClippingBoxes = (): readonly ClippingBox[] => {
  const boxes: {
    element: string
    reach: number
    width: number
    contentWidth: number
    contentHeight: number
  }[] = []

  for (const element of Array.from(document.querySelectorAll("*"))) {
    const style = window.getComputedStyle(element)
    if (style.overflowX !== "hidden" && style.overflowX !== "clip") continue

    /**
     * How far the box's own in-flow content reaches, walked rather than read
     * off `scrollWidth`.
     *
     * Two things `scrollWidth` counts that are not content being hidden, and
     * both are in the starter library. A `loom.halo` is an absolutely
     * positioned rim drawn four pixels outside the box it lights and clipped on
     * purpose; and a box that scrolls sideways inside this one — a comparison
     * table on a phone — is wide by design and says so with a scrollbar. So the
     * walk skips anything out of flow, and stops at anything that clips or
     * scrolls on its own account: a scroller's own box is in this box's flow,
     * and what is inside it is that scroller's business.
     */
    const edge = element.getBoundingClientRect().right - parseFloat(style.borderRightWidth)
    const ink = document.createRange()
    let reach = element.clientWidth
    const pending: Element[] = Array.from(element.children)
    while (pending.length > 0) {
      const child = pending.pop()
      if (child === undefined) continue
      const childStyle = window.getComputedStyle(child)
      if (childStyle.position === "absolute" || childStyle.position === "fixed") continue

      const overBox = child.getBoundingClientRect().right - edge
      if (overBox > 0) reach = Math.max(reach, element.clientWidth + overBox)

      /**
       * Stop here if the child handles its own overflow.
       *
       * Its box is in this box's flow and has been counted; what is inside it
       * is its own business, and it is measured on its own account when the
       * outer loop reaches it. Before this line was above the two measurements
       * below rather than beneath them, the documentation site's quickstart
       * reported a code block as hiding 905 pixels in a 348-pixel box — the
       * `pre` scrolls sideways, which is the feature.
       */
      if (childStyle.overflowX !== "visible") continue

      /**
       * The words, not the box that holds them.
       *
       * A heading is a block: its box is the width it was given, and one long
       * word inside it paints past that edge while the box's own rectangle
       * says nothing at all. That is the commonest shape of this defect and it
       * is invisible to every rectangle on the way down, so the text itself is
       * measured — a range over each run of characters, which is the only
       * thing that reports where the ink actually ends.
       */
      for (const node of Array.from(child.childNodes)) {
        if (node.nodeType !== Node.TEXT_NODE) continue
        ink.selectNodeContents(node)
        const overInk = ink.getBoundingClientRect().right - edge
        if (overInk > 0) reach = Math.max(reach, element.clientWidth + overInk)
      }

      for (const grandchild of Array.from(child.children)) pending.push(grandchild)
    }

    /**
     * A path short enough for a report line and long enough to find the
     * element in a file: the box and up to two ancestors, each as tag plus id
     * plus its first two classes.
     */
    const trail: string[] = []
    let node: Element | null = element
    while (node !== null && trail.length < 3) {
      let label = node.localName
      if (node.id !== "") label += `#${node.id}`
      for (const one of Array.from(node.classList).slice(0, 2)) label += `.${one}`
      trail.unshift(label)
      node = node.parentElement
    }

    /**
     * The box's first few words, which on a page of registered primitives is
     * the only thing that identifies it at all.
     *
     * A surface written in Tailwind hands over a usable path — the
     * documentation site's skip link came back as `a.bg-surface-page.text-ink`
     * — and a tree rendered through the seam does not: every primitive is a
     * `div` carrying inline styles and no class, so three of them in a row
     * print `div > div > div` and a lane has nothing to search for. What it
     * says is what a lane recognises.
     */
    const words = (element.textContent ?? "").replace(/\s+/g, " ").trim()
    const excerpt = words.length > 48 ? `${words.slice(0, 47)}…` : words

    boxes.push({
      element: trail.join(" > ") + (excerpt === "" ? "" : `  "${excerpt}"`),
      reach: Math.round(reach),
      width: element.clientWidth,
      contentWidth:
        element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      contentHeight:
        element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
    })
  }

  return boxes
}

/**
 * Run in the page over every element one selector matched: its rectangle and
 * its content extent.
 *
 * Six numbers and no judgement. Whether a block fits, where the fold falls and
 * which of these readings is a defect is all arithmetic over these six, so all
 * of it is in Node where it can be tested without a browser — the same split
 * `readClippingBoxes` and `clippedFrom` are on, for the same reason
 * ([0213](../../decisions/0213-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md)).
 *
 * **Not one named helper inside it**, and the flat loop is that rule rather
 * than a style — `readClippingBoxes` above says why at length: the compiler
 * wraps a named inner function in a `__name` call that exists in this process
 * and not in the page.
 */
const readBoxes = (elements: Element[]): readonly ElementBox[] => {
  const boxes: ElementBox[] = []

  for (const element of elements) {
    const rect = element.getBoundingClientRect()
    boxes.push({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    })
  }

  return boxes
}

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
        measure: async (): Promise<Overflow> => ({
          ...(await page.evaluate(measureDocument)),
          clipped: clippedFrom(await page.evaluate(readClippingBoxes)),
        }),
        /**
         * Through `locatorFor`, so `frame` means here what it means to a
         * `waitFor`, to every step and to a clipped capture. A lane that can
         * photograph inside the framed `/demo` can measure inside it too,
         * without the harness learning a second word for the same field.
         *
         * One round trip per selector rather than one for all of them: the
         * selectors are the driver's own engine, and resolving them is the one
         * part of this that cannot happen in a single `evaluate`.
         */
        boxes: async (selectors, frame): Promise<readonly MeasuredSelector[]> => {
          const at = locatorFor(frame)
          const measured: MeasuredSelector[] = []

          for (const selector of selectors) {
            measured.push({ selector, found: await at(selector).evaluateAll(readBoxes) })
          }

          return measured
        },
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
