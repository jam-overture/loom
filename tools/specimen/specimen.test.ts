import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { renderToString } from "react-dom/server"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { sequentialIdFactory } from "../../src/ids.js"
import { DATA_PROP_KEY, SUBMIT_PROP_KEY, THEME_PROP_KEY } from "../../src/reserved-props.js"
import { buildElement, buildSlot, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { describeArgsError, parseSpecimenArgs } from "./args.js"
import {
  browsersRoot,
  chromiumCandidates,
  describeBrowserError,
  locateChromium,
} from "./browser.js"
import {
  captureShots,
  clippedFrom,
  clips,
  CLIPPED_SHOWN,
  describeShot,
  insideViewport,
  MEASURED_SHOWN,
  overflows,
  pastTheFold,
  type CaptureTarget,
  type ClippingBox,
  type ElementBox,
  type Overflow,
  type Shot,
  type SpecimenBrowser,
  type SpecimenPage,
} from "./capture.js"
import behaviourSpecimen from "./behaviour.specimen.js"
import { bundleOptions, bundleSpecimen, describeBundleError, entrySource } from "./bundle.js"
import { specimenElement } from "./element.js"
import exampleSpecimen from "./example.specimen.js"
import {
  escapeHtml,
  SPECIMEN_BUNDLE_FILE,
  SPECIMEN_PAGE_ATTRIBUTE,
  specimenDocument,
} from "./page.js"
import { isLive, planPages, planShots, planStates, shotsAt, slug } from "./plan.js"
import {
  chromiumBrowser,
  contextOptionsFor,
  describeLauncherError,
  LAUNCH_ARGS,
  loadChromium,
  playwrightSearchPaths,
  type ChromiumLauncher,
  type ContextOptions,
  type LaunchedLocator,
  type LaunchOptions,
} from "./playwright.js"
import { describeRenderError, renderSpecimen } from "./render.js"
import { BLOCK_STORAGE_SCRIPT, seedStorageScript } from "./start-state.js"
import { contentTypeFor, resolveServedPath, serveDirectory } from "./serve.js"
import {
  defineSpecimen,
  DEFAULT_VIEWPORTS,
  PHONE,
  WIDE,
  type Specimen,
  type SpecimenViewport,
} from "./specimen.js"

const selection = (palette: string): ThemeSelection =>
  themeSelectionSchema.parse({ palette, fontPack: "editorial-serif", stylePreset: "comfortable" })

const specimenOf = (overrides: Partial<Specimen> = {}): Specimen =>
  defineSpecimen({
    name: "A Band",
    title: "A band",
    build: (theme) => {
      const idFactory = sequentialIdFactory()
      const heading = buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 1 },
        children: [buildText(idFactory, "Hello")],
      })
      const page = buildElement(idFactory, {
        type: "loom.page",
        props: { [THEME_PROP_KEY]: theme },
        children: [heading],
      })
      return createTree(page, idFactory)
    },
    themes: [{ label: "Editorial serif", selection: selection("editorial") }],
    ...overrides,
  })

describe("naming what a run will produce", () => {
  it("slugs a label written as prose, because every label reaches a file name", () => {
    expect(slug("Editorial serif")).toBe("editorial-serif")
    expect(slug("1280 (wide)")).toBe("1280-wide")
    expect(slug("--edges--")).toBe("edges")
  })

  it("plans one page per theme, because a theme is what changes the markup", () => {
    const pages = planPages(
      specimenOf({
        themes: [
          { label: "Editorial", selection: selection("editorial") },
          { label: "Bold", selection: selection("bold") },
        ],
      })
    )

    expect(pages.map((page) => page.file)).toEqual(["a-band-editorial.html", "a-band-bold.html"])
  })

  it("plans one shot per theme and viewport, and reuses the page across viewports", () => {
    const shots = planShots(specimenOf())

    expect(shots.map((shot) => shot.file)).toEqual([
      "a-band-editorial-serif-phone.png",
      "a-band-editorial-serif-wide.png",
    ])
    expect(new Set(shots.map((shot) => shot.page.file)).size).toBe(1)
  })

  it("takes the phone and the laptop when a specimen declares no viewports", () => {
    expect(planShots(specimenOf()).map((shot) => shot.viewport)).toEqual([PHONE, WIDE])
  })

  it("takes only the viewports a specimen declares when it declares any", () => {
    const shots = planShots(specimenOf({ viewports: [PHONE] }))

    expect(shots).toHaveLength(1)
    expect(shots[0]?.viewport.width).toBe(390)
  })
})

describe("the document a specimen is photographed inside", () => {
  it("escapes a title, which is prose a lane wrote", () => {
    expect(escapeHtml('a & b <c> "d"')).toBe("a &amp; b &lt;c&gt; &quot;d&quot;")
  })

  it("declares the charset and the viewport, without which a phone shot is a lie", () => {
    const html = specimenDocument({ title: "A band", markup: "<p>x</p>" })

    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('name="viewport" content="width=device-width, initial-scale=1"')
  })

  it("resets the body margin, which otherwise puts eight pixels round every band", () => {
    expect(specimenDocument({ title: "t", markup: "" })).toContain("body{margin:0")
  })

  it("carries the markup verbatim and adds no styling of its own", () => {
    const html = specimenDocument({ title: "t", markup: '<div class="loom-card">x</div>' })

    expect(html).toContain('<div class="loom-card">x</div>')
    expect(html).not.toMatch(/font-family|background/)
  })
})

describe("finding the browser that is already on disk", () => {
  it("prefers the unversioned entry, which is the one that cannot go stale", () => {
    const candidates = chromiumCandidates("/browsers", ["chromium", "chromium-1194"])

    expect(candidates[0]).toBe("/browsers/chromium")
  })

  it("takes the highest build when there is no unversioned entry", () => {
    const candidates = chromiumCandidates("/browsers", ["chromium-1194", "chromium-1301"])

    expect(candidates).toEqual([
      "/browsers/chromium-1301/chrome-linux/chrome",
      "/browsers/chromium-1194/chrome-linux/chrome",
    ])
  })

  it("names no build number of its own, so a new image needs no edit here", () => {
    expect(chromiumCandidates("/browsers", [])).toEqual([])
  })

  it("reaches the headless shell only after every headed Chromium", () => {
    const candidates = chromiumCandidates("/browsers", [
      "chromium_headless_shell-1194",
      "chromium-1194",
    ])

    expect(candidates).toEqual([
      "/browsers/chromium-1194/chrome-linux/chrome",
      "/browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
    ])
  })

  it("reads PLAYWRIGHT_BROWSERS_PATH before its own default", () => {
    expect(browsersRoot({ PLAYWRIGHT_BROWSERS_PATH: "/elsewhere" })).toBe("/elsewhere")
    expect(browsersRoot({})).toBe("/opt/pw-browsers")
  })

  it("says which root it could not read, rather than failing at launch", async () => {
    const located = await locateChromium("/no/such/browsers")

    expect(located.ok).toBe(false)
    expect(!located.ok && located.error.code).toBe("no-browsers-root")
    expect(!located.ok && describeBrowserError(located.error)).toContain("PLAYWRIGHT_BROWSERS_PATH")
  })

  it("lists what it tried when the root holds no Chromium", async () => {
    const root = await mkdtemp(join(tmpdir(), "specimen-browsers-"))
    try {
      const located = await locateChromium(root)

      expect(!located.ok && located.error.code).toBe("no-chromium")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe("serving the pages", () => {
  let root = ""
  let origin = ""
  let close: () => Promise<void> = async () => {}

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "specimen-serve-"))
    await writeFile(join(root, "a-band.html"), "<p>served</p>", "utf8")
    const server = await serveDirectory(root)
    origin = server.origin
    close = server.close
  })

  afterAll(async () => {
    await close()
    await rm(root, { recursive: true, force: true })
  })

  it("serves a page over http, because an image URL may not be file: or data:", async () => {
    const response = await fetch(`${origin}/a-band.html`)

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(await response.text()).toBe("<p>served</p>")
  })

  it("answers 404 rather than hanging, which is how a wrong file name presents", async () => {
    expect((await fetch(`${origin}/missing.html`)).status).toBe(404)
  })

  it("keeps a request inside the served directory", () => {
    expect(resolveServedPath("/pages", "/a-band.html")).toBe("/pages/a-band.html")
    /** An absolute request collapses its own `..`, so this is the served file. */
    expect(resolveServedPath("/pages", "/../../etc/passwd")).toBe("/pages/etc/passwd")
    expect(resolveServedPath("/pages", "../secret")).toBeUndefined()
    /** A sibling directory whose name starts with the root's is not inside it. */
    expect(resolveServedPath("/pages", "../pages-other/x")).toBeUndefined()
  })

  it("refuses a malformed escape rather than throwing inside the request handler", () => {
    expect(resolveServedPath("/pages", "/%zz.html")).toBeUndefined()
  })

  it("types a png as a png, so a served specimen can carry one", () => {
    expect(contentTypeFor("/x/y.png")).toBe("image/png")
    expect(contentTypeFor("/x/y.bin")).toBe("application/octet-stream")
  })
})

const describeTarget = (file: string, target: CaptureTarget): string => {
  if (target.clip !== undefined) {
    const where = target.frame === undefined ? target.clip : `${target.clip} in ${target.frame}`
    return `${file} (clipped to ${where})`
  }
  return target.fullPage ? file : `${file} (viewport only)`
}

const fakeBrowser = (
  measurements: readonly Overflow[],
  /**
   * What a selector matches, by selector. Absent means no match, which is a
   * reading the loop has to carry rather than an error.
   */
  boxes: Readonly<Record<string, readonly ElementBox[]>> = {}
): {
  browser: SpecimenBrowser
  /** Every address opened, and every start state applied before one. */
  visited: string[]
  written: string[]
  /** Every step, and every measurement, in the order the loop reached them. */
  journal: string[]
} => {
  const visited: string[] = []
  const written: string[] = []
  const journal: string[] = []
  let opened = 0

  const browser: SpecimenBrowser = {
    open: async (): Promise<SpecimenPage> => {
      const measurement = measurements[opened] ?? { scrollWidth: 390, innerWidth: 390, clipped: [] }
      opened += 1

      return {
        /**
         * Recorded into `visited` and not into `journal`, because the property
         * worth asserting is *before which navigation* rather than *between
         * which steps* — and `visited` is the list that has the navigations in
         * it.
         */
        start: async (state) => {
          visited.push(
            "storage" in state
              ? `start storage ${JSON.stringify(state.storage)}`
              : "start storageBlocked"
          )
        },
        goto: async (url, waitFor, frame) => {
          const after = waitFor === undefined ? "" : ` after ${waitFor}`
          visited.push(`${url}${after}${frame === undefined ? "" : ` in ${frame}`}`)
        },
        act: async (steps, frame) => {
          const where = frame === undefined ? "" : ` in ${frame}`
          for (const step of steps) {
            if ("click" in step) journal.push(`click ${step.click}${where}`)
            else if ("fill" in step) journal.push(`fill ${step.fill}${where} "${step.text}"`)
            else if ("scrollTo" in step) journal.push(`scrollTo ${step.scrollTo}${where}`)
            else if ("waitFor" in step) journal.push(`waitFor ${step.waitFor}${where}`)
            else if ("key" in step) journal.push(`key ${step.key}`)
            else journal.push(`wait ${step.wait}`)
          }
        },
        measure: async () => {
          journal.push("measure")
          return measurement
        },
        boxes: async (selectors, frame) => {
          const where = frame === undefined ? "" : ` in ${frame}`
          journal.push(`boxes ${selectors.join(", ")}${where}`)
          return selectors.map((selector) => ({ selector, found: boxes[selector] ?? [] }))
        },
        capture: async (file, target) => {
          written.push(describeTarget(file, target))
        },
        close: async () => {},
      }
    },
    close: async () => {},
  }

  return { browser, visited, written, journal }
}

/** A shot at an address, with the defaults `shoot` gives one. */
const shotAt = (overrides: Partial<Shot> = {}): Shot => ({
  name: "a-shot",
  url: "http://127.0.0.1:1234/page",
  file: "a-shot.png",
  viewport: WIDE,
  do: [],
  fullPage: false,
  measure: [],
  ...overrides,
})

describe("taking the shots", () => {
  it("visits every planned page and writes every planned file under the out directory", async () => {
    const { browser, visited, written } = fakeBrowser([])

    const results = await captureShots(
      shotsAt("http://127.0.0.1:1234", planShots(specimenOf())),
      browser,
      { outDir: "reports" }
    )

    expect(visited).toEqual([
      "http://127.0.0.1:1234/a-band-editorial-serif.html",
      "http://127.0.0.1:1234/a-band-editorial-serif.html",
    ])
    expect(written).toEqual([
      "reports/a-band-editorial-serif-phone.png",
      "reports/a-band-editorial-serif-wide.png",
    ])
    /** A composition is photographed whole; only an address shoots a viewport. */
    expect(written.every((file) => !file.includes("viewport only"))).toBe(true)
    expect(results.map((result) => result.overflowed)).toEqual([false, false])
  })

  it("flags the page that is wider than the phone, and still takes its picture", async () => {
    const { browser, written } = fakeBrowser([{ scrollWidth: 1420, innerWidth: 390, clipped: [] }])

    const [phone] = await captureShots(
      shotsAt("http://127.0.0.1:1234", planShots(specimenOf({ viewports: [PHONE] }))),
      browser,
      { outDir: "reports" }
    )

    expect(phone?.overflowed).toBe(true)
    expect(written).toHaveLength(1)
  })

  it("closes the page even when the page will not load", async () => {
    let closed = 0
    const browser: SpecimenBrowser = {
      open: async () => ({
        start: async () => {},
        goto: async () => {
          throw new Error("net::ERR_CONNECTION_REFUSED")
        },
        act: async () => {},
        measure: async () => ({ scrollWidth: 0, innerWidth: 0, clipped: [] }),
        boxes: async () => [],
        capture: async () => {},
        close: async () => {
          closed += 1
        },
      }),
      close: async () => {},
    }

    await expect(
      captureShots(shotsAt("http://x", planShots(specimenOf())), browser, { outDir: "reports" })
    ).rejects.toThrow("ERR_CONNECTION_REFUSED")
    expect(closed).toBe(1)
  })

  it("runs a shot's steps after the load and before the shutter", async () => {
    const { browser, journal, written } = fakeBrowser([])

    await captureShots(
      [shotAt({ do: [{ click: "[data-open]" }, { wait: 400 }] })],
      browser,
      { outDir: "reports" }
    )

    expect(journal).toEqual(["click [data-open]", "wait 400", "measure"])
    expect(written).toEqual(["reports/a-shot.png (viewport only)"])
  })

  /**
   * A disclosure that opens or a list that grows is exactly the kind of thing
   * that pushes a page past the phone, so measuring the page the load produced
   * would report the width of something nobody is looking at.
   */
  it("measures the page the steps produced, not the one the load did", async () => {
    const { browser, journal } = fakeBrowser([{ scrollWidth: 1420, innerWidth: 390, clipped: [] }])

    const [result] = await captureShots(
      [shotAt({ viewport: PHONE, do: [{ click: "[data-open]" }] })],
      browser,
      { outDir: "reports" }
    )

    expect(journal.indexOf("click [data-open]")).toBeLessThan(journal.indexOf("measure"))
    expect(result?.overflowed).toBe(true)
  })

  it("never touches the page when a shot has no steps", async () => {
    const { browser, journal } = fakeBrowser([])

    await captureShots([shotAt()], browser, { outDir: "reports" })

    expect(journal).toEqual(["measure"])
  })

  /**
   * The ask behind this: six consecutive runs of one lane photographed a portal
   * behind a session with a private Playwright script, because a shot has one
   * address and a session is not one.
   */
  it("makes a shot's before approach in the same page, before the shot's own address", async () => {
    const { browser, visited, journal, written } = fakeBrowser([])

    await captureShots(
      [
        shotAt({
          url: "http://127.0.0.1:1234/portal/readers",
          waitFor: "[data-readers]",
          before: {
            url: "http://127.0.0.1:1234/portal/sign-in",
            waitFor: "form",
            do: [
              { fill: "#email", text: "reviewer@example.com" },
              { click: "button[type=submit]" },
              { waitFor: "[data-signed-in]" },
            ],
          },
        }),
      ],
      browser,
      { outDir: "reports" }
    )

    expect(visited).toEqual([
      "http://127.0.0.1:1234/portal/sign-in after form",
      "http://127.0.0.1:1234/portal/readers after [data-readers]",
    ])
    expect(journal).toEqual([
      'fill #email "reviewer@example.com"',
      "click button[type=submit]",
      "waitFor [data-signed-in]",
      "measure",
    ])
    /** One shot is one picture, whatever it had to do to get there. */
    expect(written).toEqual(["reports/a-shot.png (viewport only)"])
  })

  it("opens one page for a shot with no before, and measures nothing twice", async () => {
    const { browser, visited, journal } = fakeBrowser([])

    await captureShots([shotAt()], browser, { outDir: "reports" })

    expect(visited).toEqual(["http://127.0.0.1:1234/page"])
    expect(journal).toEqual(["measure"])
  })

  /**
   * One rule, no exceptions: the frame is the document this approach's
   * selectors resolve against — the load's wait, every step, and the clip.
   */
  it("resolves the wait, the steps and the clip against the frame a shot names", async () => {
    const { browser, visited, journal, written } = fakeBrowser([])

    await captureShots(
      [
        shotAt({
          frame: "iframe#demo",
          waitFor: "[data-stage]",
          do: [{ click: "[data-yes]" }],
          clip: "[data-rail]",
        }),
      ],
      browser,
      { outDir: "reports" }
    )

    expect(visited).toEqual(["http://127.0.0.1:1234/page after [data-stage] in iframe#demo"])
    expect(journal).toEqual(["click [data-yes] in iframe#demo", "measure"])
    expect(written).toEqual(["reports/a-shot.png (clipped to [data-rail] in iframe#demo)"])
  })

  it("keeps a before's frame to the before, and the shot's to the shot", async () => {
    const { browser, journal } = fakeBrowser([])

    await captureShots(
      [
        shotAt({
          frame: "iframe#demo",
          do: [{ click: "[data-yes]" }],
          before: { url: "http://127.0.0.1:1234/setup", frame: "iframe#setup", do: [{ click: "[data-seed]" }] },
        }),
      ],
      browser,
      { outDir: "reports" }
    )

    expect(journal).toEqual([
      "click [data-seed] in iframe#setup",
      "click [data-yes] in iframe#demo",
      "measure",
    ])
  })

  /**
   * The ask behind this: three screens in one lane whose whole subject is
   * what the browser arrived with, all three photographed by a hand-written
   * driver in a scratch directory, because by the time there is something to
   * click the page has already read the record and decided what to say.
   */
  it("puts the browser in its start state before the address is opened", async () => {
    const { browser, visited } = fakeBrowser([])

    await captureShots(
      [
        shotAt({
          url: "http://127.0.0.1:1234/lessons/3",
          start: { storage: { "loom.lessons.progress.v1": "{{{" } },
        }),
      ],
      browser,
      { outDir: "reports" }
    )

    expect(visited).toEqual([
      'start storage {"loom.lessons.progress.v1":"{{{"}',
      "http://127.0.0.1:1234/lessons/3",
    ])
  })

  /**
   * Before the `before`, not between it and the shot. A shot that signs in and
   * then reads a record wants the record there for both loads, and this is the
   * only ordering that gives it that.
   */
  it("starts the browser before the before, not after it", async () => {
    const { browser, visited } = fakeBrowser([])

    await captureShots(
      [
        shotAt({
          url: "http://127.0.0.1:1234/portal/lessons",
          start: { storageBlocked: true },
          before: { url: "http://127.0.0.1:1234/portal/sign-in", do: [] },
        }),
      ],
      browser,
      { outDir: "reports" }
    )

    expect(visited).toEqual([
      "start storageBlocked",
      "http://127.0.0.1:1234/portal/sign-in",
      "http://127.0.0.1:1234/portal/lessons",
    ])
  })

  it("leaves the browser alone for a shot that asks for no start state", async () => {
    const { browser, visited } = fakeBrowser([])

    await captureShots([shotAt()], browser, { outDir: "reports" })

    expect(visited).toEqual(["http://127.0.0.1:1234/page"])
  })

  /**
   * A fresh context per shot is what keeps one picture from depending on the
   * one before it, and a start state is part of a context rather than of a
   * run: the shot that does not ask for one must not inherit it.
   */
  it("does not carry one shot's start state into the next shot", async () => {
    const { browser, visited } = fakeBrowser([])

    await captureShots(
      [
        shotAt({ url: "http://127.0.0.1:1234/a", start: { storageBlocked: true } }),
        shotAt({ url: "http://127.0.0.1:1234/b" }),
      ],
      browser,
      { outDir: "reports" }
    )

    expect(visited).toEqual([
      "start storageBlocked",
      "http://127.0.0.1:1234/a",
      "http://127.0.0.1:1234/b",
    ])
  })

  it("drives a scroll among the steps, in the order it was written", async () => {
    const { browser, journal } = fakeBrowser([])

    await captureShots(
      [shotAt({ do: [{ click: "[data-ask]" }, { scrollTo: "[data-controls]" }] })],
      browser,
      { outDir: "reports" }
    )

    expect(journal).toEqual(["click [data-ask]", "scrollTo [data-controls]", "measure"])
  })

  /**
   * A scroll changes how much of the page is in view and nothing about how
   * wide it is, but it is a step like any other and the measurement is taken
   * after the steps — so the assertion worth having is that the order did not
   * quietly become *measure, then scroll*.
   */
  it("measures after the scroll, as it does after every other step", async () => {
    const { browser, journal } = fakeBrowser([])

    await captureShots([shotAt({ do: [{ scrollTo: "[data-controls]" }] })], browser, {
      outDir: "reports",
    })

    expect(journal).toEqual(["scrollTo [data-controls]", "measure"])
  })

  /**
   * The journal is the assertion: a keypress goes in among the presses in the
   * order written, and comes out with **no frame and no selector beside it**. It
   * is the one step addressed to focus rather than to an element, and a frame
   * suffix appearing here would mean the harness had quietly made it one.
   */
  it("drives a keypress among the steps, addressed to nothing, even inside a frame", async () => {
    const { browser, journal } = fakeBrowser([])

    await captureShots(
      [shotAt({ frame: "iframe#demo", do: [{ click: "[data-open]" }, { key: "Escape" }] })],
      browser,
      { outDir: "reports" }
    )

    expect(journal).toEqual(["click [data-open] in iframe#demo", "key Escape", "measure"])
  })

  it("resolves a scroll against the frame a shot names, like every other selector", async () => {
    const { browser, journal } = fakeBrowser([])

    await captureShots(
      [shotAt({ frame: "iframe#demo", do: [{ scrollTo: "[data-controls]" }] })],
      browser,
      { outDir: "reports" }
    )

    expect(journal).toEqual(["scrollTo [data-controls] in iframe#demo", "measure"])
  })

  it("points the shutter at one element when a shot clips", async () => {
    const { browser, written } = fakeBrowser([])

    await captureShots([shotAt({ clip: "[data-figure]" })], browser, { outDir: "reports" })

    expect(written).toEqual(["reports/a-shot.png (clipped to [data-figure])"])
  })

  it("reports a shot as one line a report can paste", () => {
    expect(
      describeShot({
        name: "a-band-editorial-phone",
        file: "reports/a-band-editorial-phone.png",
        viewport: PHONE,
        overflow: { scrollWidth: 1420, innerWidth: 390, clipped: [] },
        overflowed: true,
        clipped: false,
        measured: [],
      })
    ).toBe("a-band-editorial-phone  390x844@2x touch  scrollWidth 1420 / innerWidth 390  ← overflows")
  })

  it("calls a page wider than its viewport an overflow and nothing narrower", () => {
    expect(overflows({ scrollWidth: 391, innerWidth: 390, clipped: [] })).toBe(true)
    expect(overflows({ scrollWidth: 390, innerWidth: 390, clipped: [] })).toBe(false)
  })
})

/**
 * The measurement the document one cannot take.
 *
 * Filed by `Loom primitives` on 27 September: a `loom.backdrop` sets
 * `overflow: hidden`, so the identical tree measures 390 / 390 wrapped in one
 * and 401 / 390 outside it. The harness reported the wrapped page as clean
 * because the defect was being clipped rather than fixed.
 */
describe("the boxes a page hides content inside", () => {
  const box = (overrides: Partial<ClippingBox> = {}): ClippingBox => ({
    element: "div.loom-backdrop",
    reach: 401,
    width: 390,
    contentWidth: 390,
    contentHeight: 400,
    ...overrides,
  })

  it("names a clipping box whose content reaches past it", () => {
    expect(clippedFrom([box()])).toEqual([
      { element: "div.loom-backdrop", reach: 401, width: 390 },
    ])
  })

  it("says nothing about a clipping box whose content fits", () => {
    expect(clippedFrom([box({ reach: 390 })])).toEqual([])
  })

  /**
   * Layout is fractional and these readings are not, so a box whose content is
   * a third of a pixel too wide reports a shortfall of one and every page has a
   * dozen of them. Nothing is hidden at that size.
   */
  it("ignores a one-pixel shortfall and reports a two-pixel one", () => {
    expect(clippedFrom([box({ reach: 391 })])).toEqual([])
    expect(clippedFrom([box({ reach: 392 })])).toHaveLength(1)
  })

  /**
   * The one exclusion that is about intent. A visually-hidden announcement is
   * `width:1px; height:1px; overflow:hidden` holding a sentence, which is a
   * clipping box hiding a sentence by construction — the pattern working, not a
   * defect, and the library uses it.
   */
  it("leaves out a box with no room for content in it", () => {
    expect(
      clippedFrom([box({ contentWidth: 1, contentHeight: 1, width: 1, reach: 240 })])
    ).toEqual([])
    expect(clippedFrom([box({ contentHeight: 1 })])).toEqual([])
  })

  /**
   * The documentation site's skip link, as the first run of this instrument
   * found it: `sr-only` gives it `width: 1px`, and the `px-3 py-2` beside that
   * class puts 24 pixels of padding back on. The client box says 24 and the
   * content box says 1, and only the second number says what the element is.
   */
  it("reads the content box and not the client box, so padding cannot disguise it", () => {
    expect(
      clippedFrom([
        box({
          element: "a.bg-surface-page.text-ink",
          reach: 142,
          width: 24,
          contentWidth: 1,
          contentHeight: 1,
        }),
      ])
    ).toEqual([])
  })

  it("puts the widest shortfall first, and breaks a tie by name", () => {
    expect(
      clippedFrom([
        box({ element: "div.b", reach: 400 }),
        box({ element: "div.c", reach: 500 }),
        box({ element: "div.a", reach: 400 }),
      ]).map((one) => one.element)
    ).toEqual(["div.c", "div.a", "div.b"])
  })

  /**
   * Two facts, two fields. A page can be clean on the document measurement and
   * hiding a figure inside a backdrop, which is exactly the case that was
   * filed.
   */
  it("is independent of whether the document is wider than the viewport", () => {
    const measurement: Overflow = {
      scrollWidth: 390,
      innerWidth: 390,
      clipped: [{ element: "div.loom-backdrop", reach: 401, width: 390 }],
    }

    expect(overflows(measurement)).toBe(false)
    expect(clips(measurement)).toBe(true)
  })

  /**
   * Only when it is a finger, which is what keeps every `wide` line this
   * harness has ever printed byte-identical. The reading beside it is quoted in
   * reports as *what a phone gets*, and a reader cannot tell a hovering 390
   * from a touching one from a number.
   */
  it("says which device took the picture, and only when it is not a mouse", () => {
    const of = (viewport: SpecimenViewport): string =>
      describeShot({
        name: "a-page",
        file: "reports/a-page.png",
        viewport,
        overflow: { scrollWidth: viewport.width, innerWidth: viewport.width, clipped: [] },
        overflowed: false,
        clipped: false,
        measured: [],
      })

    expect(of(PHONE)).toBe("a-page  390x844@2x touch  scrollWidth 390 / innerWidth 390")
    expect(of(WIDE)).toBe("a-page  1280x900@2x  scrollWidth 1280 / innerWidth 1280")
  })

  it("prints each box under the shot's own line, indented", () => {
    expect(
      describeShot({
        name: "a-band-bold-phone",
        file: "reports/a-band-bold-phone.png",
        viewport: PHONE,
        overflow: {
          scrollWidth: 390,
          innerWidth: 390,
          clipped: [{ element: "section > div.loom-backdrop", reach: 401, width: 390 }],
        },
        overflowed: false,
        clipped: true,
        measured: [],
      })
    ).toBe(
      "a-band-bold-phone  390x844@2x touch  scrollWidth 390 / innerWidth 390  ← 1 clipping box hides content\n" +
        "    section > div.loom-backdrop  content reaches 401 in 390"
    )
  })

  /**
   * A page with forty of them has one cause, and forty lines is a wall a lane
   * scrolls past. The count stays exact.
   */
  it("shows the worst five and counts the rest", () => {
    const many = Array.from({ length: 8 }, (_unused, index) => ({
      element: `div.n${index}`,
      reach: 500 - index,
      width: 390,
    }))

    const lines = describeShot({
      name: "a-page",
      file: "reports/a-page.png",
      viewport: PHONE,
      overflow: { scrollWidth: 390, innerWidth: 390, clipped: many },
      overflowed: false,
      clipped: true,
      measured: [],
    }).split("\n")

    expect(lines[0]).toContain("← 8 clipping boxes hide content")
    expect(lines).toHaveLength(1 + CLIPPED_SHOWN + 1)
    expect(lines[lines.length - 1]).toBe("    …and 3 more")
  })

  it("carries the verdict onto every shot the loop takes", async () => {
    const { browser } = fakeBrowser([
      {
        scrollWidth: 390,
        innerWidth: 390,
        clipped: [{ element: "div.loom-backdrop", reach: 401, width: 390 }],
      },
    ])

    const results = await captureShots([shotAt()], browser, { outDir: "reports" })

    expect(results[0]?.clipped).toBe(true)
    expect(results[0]?.overflowed).toBe(false)
  })
})

/**
 * The reading nothing in this repository could take.
 *
 * Filed by `Loom demo` on 30 September, after four consecutive runs of three
 * lanes had each written a throwaway `playwright-core` script in a scratch
 * directory to answer *how tall is that*. Every unit those runs shipped was
 * argued on a number none of them could show anybody.
 */
describe("the boxes a lane asked the size of", () => {
  /**
   * A box that fits `WIDE` on every edge and holds exactly what it shows, so
   * each test below states its own one departure from fitting rather than
   * inheriting two.
   */
  const box = (overrides: Partial<ElementBox> = {}): ElementBox => ({
    x: 24,
    y: 24,
    width: 352,
    height: 800,
    scrollHeight: 800,
    clientHeight: 800,
    ...overrides,
  })

  it("prints the rectangle under the shot's own line, indented like a clipping box", () => {
    expect(
      describeShot({
        name: "the-rail",
        file: "reports/the-rail.png",
        viewport: WIDE,
        overflow: { scrollWidth: 1280, innerWidth: 1280, clipped: [] },
        overflowed: false,
        clipped: false,
        measured: [{ selector: "aside", found: [box()] }],
      })
    ).toBe(
      "the-rail  1280x900@2x  scrollWidth 1280 / innerWidth 1280\n" +
        "    aside  x 24 y 24  352x800"
    )
  })

  /**
   * The claim `Loom demo` has made in four reports and could not evidence:
   * *857px of rail holding 1,239px of asks*. Both numbers, because the
   * difference alone says how much is hidden and not where the remedy is.
   */
  it("names the content extent of a box holding more than it shows", () => {
    const [, line] = describeShot({
      name: "the-rail",
      file: "reports/the-rail.png",
      viewport: WIDE,
      overflow: { scrollWidth: 1280, innerWidth: 1280, clipped: [] },
      overflowed: false,
      clipped: false,
      measured: [{ selector: "aside", found: [box({ scrollHeight: 1239 })] }],
    }).split("\n")

    expect(line).toBe("    aside  x 24 y 24  352x800  holding 1239 in 800")
  })

  /**
   * A box whose content fits says nothing about it. Every element on a page is
   * one, so a line per element saying `holding 857 in 857` is a line no report
   * would paste and a wall every lane would learn to scroll past.
   */
  it("says nothing about the extent of a box whose content fits", () => {
    const [, line] = describeShot({
      name: "the-rail",
      file: "reports/the-rail.png",
      viewport: WIDE,
      overflow: { scrollWidth: 1280, innerWidth: 1280, clipped: [] },
      overflowed: false,
      clipped: false,
      measured: [{ selector: "aside", found: [box()] }],
    }).split("\n")

    expect(line).not.toContain("holding")
  })

  /**
   * The defect `Loom demo` shipped a unit to fix and had nothing that could
   * fail if it came back: *the payoff card fits its frame*. A card that grows
   * two lines puts the closing argument under the fold, and the suite stays
   * green — so the number arrives in the run's own output instead.
   */
  it("says how far past the fold a block reaches", () => {
    const [, line] = describeShot({
      name: "the-card",
      file: "reports/the-card.png",
      viewport: WIDE,
      overflow: { scrollWidth: 1280, innerWidth: 1280, clipped: [] },
      overflowed: false,
      clipped: false,
      measured: [{ selector: "[data-payoff]", found: [box({ y: 120, height: 975 })] }],
    }).split("\n")

    expect(line).toBe("    [data-payoff]  x 24 y 120  352x975  ← 195 past the fold")
  })

  /**
   * Scrolled above the top of the viewport is out of the picture too, and it
   * has no number worth printing: *how far above* is a distance to somewhere
   * the reader cannot get back to by reading on. Said, not measured.
   */
  it("calls a block above the top of the viewport outside it, without a distance", () => {
    const [, line] = describeShot({
      name: "the-lead",
      file: "reports/the-lead.png",
      viewport: WIDE,
      overflow: { scrollWidth: 1280, innerWidth: 1280, clipped: [] },
      overflowed: false,
      clipped: false,
      measured: [{ selector: "h1", found: [box({ y: -40, height: 60 })] }],
    }).split("\n")

    expect(line).toBe("    h1  x 24 y -40  352x60  ← outside the viewport")
  })

  /**
   * `(n of m)` and not a bare repetition. The two facts a lane needs about the
   * second row of a table are which row it is and how many rows there are, and
   * the selector printed three times gives it neither — which is how a report
   * quotes the wrong row's height with the right selector beside it.
   */
  it("numbers every match of a selector that matched more than once", () => {
    const lines = describeShot({
      name: "the-asks",
      file: "reports/the-asks.png",
      viewport: WIDE,
      overflow: { scrollWidth: 1280, innerWidth: 1280, clipped: [] },
      overflowed: false,
      clipped: false,
      measured: [
        {
          selector: "aside li[id]",
          found: [
            box({ y: 377, height: 358, scrollHeight: 358, clientHeight: 358 }),
            box({ y: 751, height: 17, scrollHeight: 17, clientHeight: 17 }),
          ],
        },
      ],
    }).split("\n")

    expect(lines.slice(1)).toEqual([
      "    aside li[id] (1 of 2)  x 24 y 377  352x358",
      "    aside li[id] (2 of 2)  x 24 y 751  352x17",
    ])
  })

  /**
   * A selector that stops matching is the thing a lane most wants to be told,
   * and it arrives as a reading rather than as a failed run — which is
   * 0213's line: this prints, and nothing in it decides an exit code.
   */
  it("reports a selector that matched nothing, and does not fail the shot", async () => {
    const { browser } = fakeBrowser([])

    const [result] = await captureShots(
      [shotAt({ measure: ["text=Put it back"] })],
      browser,
      { outDir: "reports" }
    )

    expect(result?.measured).toEqual([{ selector: "text=Put it back", found: [] }])
    expect(result?.overflowed).toBe(false)
    expect(describeShot(result as never).split("\n")[1]).toBe("    text=Put it back  no match")
  })

  /**
   * A lane that asked for `li` on a long page gets a wall, and the line that
   * makes the wall safe is the one saying it was cut: a truncated table a lane
   * can see is truncated is a table it narrows the selector for, and the only
   * version of this whose numbers are safe to quote.
   */
  it("shows the first twenty matches and counts the rest", () => {
    const many = Array.from({ length: 24 }, (_unused, index) =>
      box({ y: index * 20, height: 16, scrollHeight: 16, clientHeight: 16 })
    )

    const lines = describeShot({
      name: "a-list",
      file: "reports/a-list.png",
      viewport: WIDE,
      overflow: { scrollWidth: 1280, innerWidth: 1280, clipped: [] },
      overflowed: false,
      clipped: false,
      measured: [{ selector: "li", found: many }],
    }).split("\n")

    expect(lines).toHaveLength(1 + MEASURED_SHOWN + 1)
    expect(lines[1]).toContain("(1 of 24)")
    expect(lines[lines.length - 1]).toBe("    …and 4 more matches")
  })

  /**
   * The case that put this field's contract in the open: `#476` was green on
   * its own branch and red the moment `main` arrived, because lesson 32
   * hand-builds a shot result to teach what a report's line is made of, and a
   * hand-built shot has no measurement in it.
   *
   * `DescribableShot` is the answer, and this is the test that holds it: the
   * formatter takes a result whose `measured` is simply absent and prints the
   * shot's own line, the same as one that measured nothing. The producer's
   * guarantee is untouched — `captureShots` still always carries the field —
   * so neither side had to be weakened to the other.
   */
  it("prints a hand-built shot that carries no measurement at all", () => {
    const overflow = { scrollWidth: 390, innerWidth: 390, clipped: [] }

    const handBuilt = describeShot({
      name: "a-page-with-nothing-wrong-with-it",
      file: "reports/a-page-with-nothing-wrong-with-it.png",
      viewport: PHONE,
      overflow,
      overflowed: false,
      clipped: false,
    })

    expect(handBuilt).toBe(
      "a-page-with-nothing-wrong-with-it  390x844@2x touch  scrollWidth 390 / innerWidth 390"
    )
    expect(handBuilt).toBe(
      describeShot({
        name: "a-page-with-nothing-wrong-with-it",
        file: "reports/a-page-with-nothing-wrong-with-it.png",
        viewport: PHONE,
        overflow,
        overflowed: false,
        clipped: false,
        measured: [],
      })
    )
  })

  /**
   * An absent measurement must not swallow the readings that come before it:
   * the clipped lines are the page's own business and are taken whether a lane
   * asked about a selector or not.
   */
  it("still prints the clipped lines when no measurement was carried", () => {
    const lines = describeShot({
      name: "a-clip-hides-an-overflow",
      file: "reports/a-clip-hides-an-overflow.png",
      viewport: PHONE,
      overflow: {
        scrollWidth: 390,
        innerWidth: 390,
        clipped: [{ element: "div > div", reach: 370, width: 346 }],
      },
      overflowed: false,
      clipped: true,
    }).split("\n")

    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain("← 1 clipping box hides content")
    expect(lines[1]).toBe("    div > div  content reaches 370 in 346")
  })

  /** Rounded for the line and never at the source. `ElementBox` says why. */
  it("rounds a fractional rectangle for the line and leaves the reading alone", () => {
    const fractional = box({ x: 23.6, y: 24.4, width: 351.52, height: 799.6 })

    const [, line] = describeShot({
      name: "the-rail",
      file: "reports/the-rail.png",
      viewport: WIDE,
      overflow: { scrollWidth: 1280, innerWidth: 1280, clipped: [] },
      overflowed: false,
      clipped: false,
      measured: [{ selector: "aside", found: [fractional] }],
    }).split("\n")

    expect(line).toBe("    aside  x 24 y 24  352x800")
    expect(fractional.y).toBe(24.4)
  })

  it("calls a box inside all four edges inside the viewport and nothing over one", () => {
    expect(insideViewport(box({ x: 0, y: 0, width: 1280, height: 900 }), WIDE)).toBe(true)
    expect(insideViewport(box({ x: 0, y: 0, width: 1281, height: 900 }), WIDE)).toBe(false)
    expect(insideViewport(box({ x: 0, y: 0, width: 1280, height: 901 }), WIDE)).toBe(false)
    expect(insideViewport(box({ x: -1, y: 0, width: 100, height: 100 }), WIDE)).toBe(false)
    expect(insideViewport(box({ x: 0, y: -1, width: 100, height: 100 }), WIDE)).toBe(false)
  })

  /**
   * Two independent facts, like `overflows` and `clips`: a block can be past
   * the fold, outside the viewport another way, or both, and folding them into
   * one verdict would lose the only one of the two that has a remedy.
   */
  it("measures the fold only downwards, and reports nothing for a box that fits", () => {
    expect(pastTheFold(box({ y: 0, height: 900 }), WIDE)).toBe(0)
    expect(pastTheFold(box({ y: 0, height: 901 }), WIDE)).toBe(1)
    expect(pastTheFold(box({ y: -500, height: 100 }), WIDE)).toBe(0)
    expect(pastTheFold(box({ x: 2000, y: 0, height: 100 }), WIDE)).toBe(0)
  })

  /**
   * After the steps, for the reason the overflow measurement is: a rail that
   * was scrolled or a card that was opened is the state whose size the lane
   * asked about, and measuring the page the load produced would report the
   * height of something nobody is looking at.
   */
  it("reads the boxes after the steps, and after the overflow measurement", async () => {
    const { browser, journal } = fakeBrowser([])

    await captureShots(
      [shotAt({ do: [{ click: "[data-ask]" }], measure: ["aside"] })],
      browser,
      { outDir: "reports" }
    )

    expect(journal).toEqual(["click [data-ask]", "measure", "boxes aside"])
  })

  /**
   * Every shot in this repository names no selector, and a round trip into the
   * page to be handed an empty list is a cost all of them would pay for none
   * of them.
   */
  it("does not reach into the page for a shot that named nothing", async () => {
    const { browser, journal } = fakeBrowser([])

    const [result] = await captureShots([shotAt()], browser, { outDir: "reports" })

    expect(journal).toEqual(["measure"])
    expect(result?.measured).toEqual([])
  })

  /** One field, applied wherever a selector is resolved. `Approach.frame`. */
  it("reads the boxes in the frame the shot's own selectors resolve against", async () => {
    const { browser, journal } = fakeBrowser([])

    await captureShots(
      [shotAt({ frame: "iframe#demo", measure: ["aside", "text=Put it back"] })],
      browser,
      { outDir: "reports" }
    )

    expect(journal).toEqual(["measure", "boxes aside, text=Put it back in iframe#demo"])
  })

  it("keeps the selectors in the order the shot asked, and carries every reading", async () => {
    const { browser } = fakeBrowser([], {
      aside: [box()],
      "aside li[id]": [box({ y: 377 }), box({ y: 751 })],
    })

    const [result] = await captureShots(
      [shotAt({ measure: ["aside li[id]", "aside", "text=gone"] })],
      browser,
      { outDir: "reports" }
    )

    expect(result?.measured.map((entry) => entry.selector)).toEqual([
      "aside li[id]",
      "aside",
      "text=gone",
    ])
    expect(result?.measured.map((entry) => entry.found.length)).toEqual([2, 1, 0])
  })
})

/**
 * The two sizes every report quotes, and the devices they claim to be.
 *
 * A specimen that declares no viewports takes these, which is most of the
 * thirty-four sheets in this repository — so what they say about the pointer is
 * what almost every picture here was taken with.
 */
describe("the two named viewports", () => {
  it("is a phone with a finger and a window with a mouse, in that order", () => {
    expect(DEFAULT_VIEWPORTS).toEqual([PHONE, WIDE])
    expect(PHONE.touch).toBe(true)
    expect(WIDE.touch).toBe(false)
  })

  /**
   * The size half of the same argument, and it is the half this file has always
   * made. A phone is not a narrow window and a window is not a wide phone.
   */
  it("keeps the sizes every report in this repository has been quoting", () => {
    expect([PHONE.width, PHONE.height]).toEqual([390, 844])
    expect([WIDE.width, WIDE.height]).toEqual([1280, 900])
    expect([PHONE.deviceScaleFactor, WIDE.deviceScaleFactor]).toEqual([2, 2])
  })
})

describe("the browser adapter", () => {
  /**
   * One element as the only six numbers `readBoxes` reads off one.
   *
   * A reading rather than an element, because the point of handing the real
   * in-page function a double is to pin *which six* it asks for: a
   * `getBoundingClientRect` and two properties, and nothing a laid-out page
   * would be needed to answer.
   */
  type ElementReading = {
    readonly rect: { x: number; y: number; width: number; height: number }
    readonly scrollHeight: number
    readonly clientHeight: number
  }

  const elementOf = (reading: ElementReading): Element =>
    ({
      getBoundingClientRect: () => reading.rect,
      scrollHeight: reading.scrollHeight,
      clientHeight: reading.clientHeight,
    }) as unknown as Element

  const recordingLauncher = (
    /** What each selector matches, keyed as the double names it. */
    matched: Readonly<Record<string, readonly ElementReading[]>> = {}
  ): {
    launcher: ChromiumLauncher
    launches: LaunchOptions[]
    contexts: ContextOptions[]
    screenshots: { path: string; fullPage: boolean }[]
    waits: string[]
    selectors: string[]
    /** Steps and evaluations, in the order the adapter reached them. */
    journal: string[]
    elementShots: { selector: string; path: string }[]
    /** The source registered to run before the first paint, verbatim. */
    initScripts: string[]
  } => {
    const launches: LaunchOptions[] = []
    const contexts: ContextOptions[] = []
    const screenshots: { path: string; fullPage: boolean }[] = []
    const waits: string[] = []
    const selectors: string[] = []
    const journal: string[] = []
    const elementShots: { selector: string; path: string }[] = []
    const initScripts: string[] = []

    return {
      launches,
      contexts,
      screenshots,
      waits,
      selectors,
      journal,
      elementShots,
      initScripts,
      launcher: {
        launch: async (options) => {
          launches.push(options)
          return {
            newContext: async (contextOptions) => {
              contexts.push(contextOptions)
              return {
                newPage: async () => {
                  /**
                   * Every selector the adapter resolves arrives here with the
                   * frame it was resolved through, which is what lets a test
                   * say *this press landed inside the frame* rather than only
                   * that a press happened.
                   */
                  const locatorAt = (
                    frame: string | undefined,
                    selector: string,
                    first = false
                  ): LaunchedLocator => {
                    const named = frame === undefined ? selector : `${selector} in ${frame}`
                    const where = first ? `${named} (first)` : named
                    return {
                      first: () => locatorAt(frame, selector, true),
                      click: async () => {
                        journal.push(`click ${where}`)
                      },
                      fill: async (value: string) => {
                        journal.push(`fill ${where} "${value}"`)
                      },
                      waitFor: async () => {
                        journal.push(`waitFor ${where}`)
                        selectors.push(where)
                      },
                      scrollIntoViewIfNeeded: async () => {
                        journal.push(`scrollTo ${where}`)
                      },
                      screenshot: async (options: { path: string }) => {
                        elementShots.push({ selector: where, path: options.path })
                      },
                      /**
                       * The real in-page function is run against the doubles,
                       * so what a test pins is the reading the adapter takes
                       * rather than only that it asked for one.
                       */
                      evaluateAll: async <TValue,>(
                        body: (elements: Element[]) => TValue
                      ): Promise<TValue> => {
                        journal.push(`evaluateAll ${where}`)
                        return body((matched[where] ?? []).map(elementOf))
                      },
                    }
                  }

                  return {
                    goto: async (_url: string, options: { waitUntil: "load" }) => {
                      waits.push(options.waitUntil)
                    },
                    evaluate: async <TValue,>(body: () => TValue): Promise<TValue> => {
                      journal.push(`evaluate ${body.name}`)
                      return { scrollWidth: 390, innerWidth: 390, clipped: [] } as TValue
                    },
                    /**
                     * The source, verbatim. It is a string by the time it
                     * reaches here — `start-state.ts` says why a compiled
                     * function was the wrong thing to hand a browser — so the
                     * assertion a test can make is the exact one that matters:
                     * *this is what the page will run*.
                     */
                    addInitScript: async (script: string) => {
                      initScripts.push(script)
                    },
                    waitForTimeout: async (ms: number) => {
                      journal.push(`wait ${ms}`)
                    },
                    /**
                     * Journalled with no selector beside it, which is the one
                     * thing this member asserts about the driver: a keypress
                     * reaches the page and never an element.
                     */
                    keyboard: {
                      press: async (key: string) => {
                        journal.push(`key ${key}`)
                      },
                    },
                    locator: (selector: string) => locatorAt(undefined, selector),
                    frameLocator: (frame: string) => ({
                      locator: (selector: string) => locatorAt(frame, selector),
                    }),
                    screenshot: async (options: { path: string; fullPage: boolean }) => {
                      screenshots.push(options)
                    },
                  }
                },
                close: async () => {},
              }
            },
            close: async () => {},
          }
        },
      },
    }
  }

  it("launches the executable it was given, with the flag Chromium needs as root", async () => {
    const recorder = recordingLauncher()

    await chromiumBrowser(recorder.launcher, "/browsers/chromium")

    expect(recorder.launches).toEqual([
      { executablePath: "/browsers/chromium", args: LAUNCH_ARGS },
    ])
    expect(LAUNCH_ARGS).toContain("--no-sandbox")
    /** A long full-page shot dies partway through the container's small /dev/shm. */
    expect(LAUNCH_ARGS).toContain("--disable-dev-shm-usage")
  })

  it("opens a context at a true viewport, at 2x, with motion reduced", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")

    await browser.open(PHONE)

    expect(recorder.contexts).toEqual([
      {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        reducedMotion: "reduce",
        hasTouch: true,
      },
    ])
  })

  it("reduces motion for every viewport, because a revealing band photographs blank", () => {
    expect(contextOptionsFor(WIDE).reducedMotion).toBe("reduce")
  })

  /**
   * The pointer is carried from the viewport and nowhere else: a context is not
   * free to decide what device it is, which is the property that keeps the
   * `phone` label and the picture it produces in agreement.
   */
  it("emulates a finger for a touch viewport and a mouse for a window", () => {
    expect(contextOptionsFor(PHONE).hasTouch).toBe(true)
    expect(contextOptionsFor(WIDE).hasTouch).toBe(false)
    expect(contextOptionsFor({ ...WIDE, touch: true }).hasTouch).toBe(true)
  })

  /**
   * `isMobile` is the field Playwright's own device descriptors pair with
   * `hasTouch`, and it is left off deliberately. Measured in this container:
   * it moves nothing about the pointer, and on a document with no
   * `<meta name="viewport">` it moves the layout width to 980 — a desktop page
   * scaled down, which is the failure `PHONE`'s comment has warned about since
   * it was written. `contextOptionsFor` carries the table.
   */
  it("never asks for mobile emulation, which would change the layout width and not the pointer", () => {
    expect(contextOptionsFor(PHONE)).not.toHaveProperty("isMobile")
    expect(Object.keys(contextOptionsFor(PHONE)).sort()).toEqual([
      "deviceScaleFactor",
      "hasTouch",
      "reducedMotion",
      "viewport",
    ])
  })

  it("waits for load and writes the page to the file it was given", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)
    const file = join(await mkdtemp(join(tmpdir(), "loom-shot-")), "a.png")

    await page.goto("http://127.0.0.1:1/a.html")
    await page.capture(file, { fullPage: true })

    expect(recorder.waits).toEqual(["load"])
    expect(recorder.screenshots).toEqual([{ path: file, fullPage: true }])
    expect(recorder.selectors).toEqual([])
  })

  /**
   * The load event resolves before a form driven by `useActionState` has
   * finished submitting, which is how a run photographed a sign-in page
   * believing it was the screen behind it.
   */
  it("waits for the selector a shot names, after the load event", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.goto("http://127.0.0.1:1/portal", "[data-signed-in]")

    expect(recorder.waits).toEqual(["load"])
    expect(recorder.selectors).toEqual(["[data-signed-in] (first)"])
  })

  it("takes a viewport-sized shot when it is asked for one", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)
    const file = join(await mkdtemp(join(tmpdir(), "loom-shot-")), "b.png")

    await page.capture(file, { fullPage: false })

    expect(recorder.screenshots).toEqual([{ path: file, fullPage: false }])
  })

  /**
   * `addInitScript` and not `evaluate`, and the difference is the whole
   * feature: `evaluate` runs against a document that already exists, and by
   * then the page has read the record and decided what to say.
   */
  it("registers the seeding source before the first paint, with the keys in it", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.start({ storage: { "loom.lessons.progress.v1": "{{{" } })

    expect(recorder.initScripts).toEqual([
      seedStorageScript({ "loom.lessons.progress.v1": "{{{" }),
    ])
    /** Registered, not evaluated: `evaluate` would be one document too late. */
    expect(recorder.journal).toEqual([])
  })

  it("registers the blocking source", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.start({ storageBlocked: true })

    expect(recorder.initScripts).toEqual([BLOCK_STORAGE_SCRIPT])
  })

  it("registers nothing at all until a shot asks for a start state", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")

    await browser.open(WIDE)

    expect(recorder.initScripts).toEqual([])
  })

  /**
   * Strict, like `click` and `fill` and unlike `waitFor`: which of two matches
   * is brought into view decides what the picture is of, exactly as which of
   * two buttons is pressed does.
   */
  it("scrolls to the element a step names, without taking the first of several", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ scrollTo: "[data-controls]" }])

    expect(recorder.journal.slice(1)).toEqual(["scrollTo [data-controls]"])
    expect(recorder.selectors).toEqual([])
  })

  /**
   * Through the driver's own `keyboard`, which is why this is asserted here as
   * well as against the fake: `selectors` staying empty is the proof that no
   * locator was built, so there is no element for a frame to resolve it against
   * and no first-of-several to take.
   */
  it("presses a key at the page rather than at any element", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ key: "Escape" }], "iframe#demo")

    expect(recorder.journal.slice(1)).toEqual(["key Escape"])
    expect(recorder.selectors).toEqual([])
  })

  it("resolves a scroll through the frame an approach named", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ scrollTo: "[data-controls]" }], "iframe#demo")

    expect(recorder.journal.slice(1)).toEqual(["scrollTo [data-controls] in iframe#demo"])
  })

  /**
   * A scroll is a step, so the page is held still before it for the same
   * reason every other step is: a `do` list is a sequence against one page by
   * construction.
   */
  it("holds the page still before a scroll, as it does before a press", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ scrollTo: "[data-controls]" }])

    expect(recorder.journal).toEqual(["evaluate pinNavigation", "scrollTo [data-controls]"])
  })

  it("drives the steps in the order they were written", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ click: "[data-cta]" }, { wait: 250 }, { click: "[data-question]" }])

    expect(recorder.journal.slice(1)).toEqual([
      "click [data-cta]",
      "wait 250",
      "click [data-question]",
    ])
  })

  /**
   * A click on a real `a[href]` navigates, and every step after it then runs on
   * a different page — the silent wrong picture the harness exists to prevent.
   */
  it("holds the page still before the first step, not after it", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ click: "[data-cta]" }])

    expect(recorder.journal).toEqual(["evaluate pinNavigation", "click [data-cta]"])
  })

  it("types into the field a step names, with the text it was given", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([
      { fill: "#email", text: "reviewer@example.com" },
      { fill: "#password", text: "" },
      { click: "button[type=submit]" },
    ])

    expect(recorder.journal.slice(1)).toEqual([
      'fill #email "reviewer@example.com"',
      'fill #password ""',
      "click button[type=submit]",
    ])
  })

  /**
   * A form driven by `useActionState` submits by fetch, so the press resolves
   * before the cookie it sets exists. A duration is a guess about somebody
   * else's server; the selector is the thing actually being waited for.
   */
  it("waits for a selector in the middle of a step list, not only after the load", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ click: "button[type=submit]" }, { waitFor: "[data-signed-in]" }])

    expect(recorder.journal.slice(1)).toEqual([
      "click button[type=submit]",
      "waitFor [data-signed-in] (first)",
    ])
    expect(recorder.selectors).toEqual(["[data-signed-in] (first)"])
  })

  /**
   * A locator is strict and `page.waitForSelector` was not, so moving the wait
   * onto a locator quietly made *wait until the results appear* an error the
   * moment two results appeared. This harness found it photographing a search
   * box with two hits in it, which is the picture the step exists to take.
   */
  it("waits for the first match and presses only an unambiguous one", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ waitFor: "#results li" }, { click: "#results li:first-child" }])

    expect(recorder.journal.slice(1)).toEqual([
      "waitFor #results li (first)",
      "click #results li:first-child",
    ])
  })

  /**
   * Playwright's selector engine pierces an open shadow root and does not
   * pierce a browsing context, so the front door — which contains `/demo`
   * rather than pointing at it — could be photographed and not touched.
   */
  it("resolves a step's selector inside the frame an approach names", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ click: "[data-yes]" }, { fill: "#note", text: "smaller" }], "iframe#demo")

    expect(recorder.journal.slice(1)).toEqual([
      "click [data-yes] in iframe#demo",
      'fill #note in iframe#demo "smaller"',
    ])
  })

  /**
   * The half a lane cannot work around: without it a framed page's readiness is
   * guessed at with a duration, which is what makes such a shot list flaky
   * rather than merely verbose.
   */
  it("waits for the load's selector inside the frame too", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.goto("http://127.0.0.1:1/", "[data-stage]", "iframe#demo")

    expect(recorder.selectors).toEqual(["[data-stage] in iframe#demo (first)"])
  })

  it("photographs an element inside the frame when the shot names one", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)
    const file = join(await mkdtemp(join(tmpdir(), "loom-shot-")), "d.png")

    await page.capture(file, { fullPage: false, clip: "[data-rail]", frame: "iframe#demo" })

    expect(recorder.elementShots).toEqual([{ selector: "[data-rail] in iframe#demo", path: file }])
    expect(recorder.screenshots).toEqual([])
  })

  /**
   * `fullPage` and the viewport shot have no frame equivalent, and that is the
   * rule rather than an omission: a frame is not a page, and *all of the page*
   * means the page.
   */
  it("still photographs the page itself when a framed shot is not clipped", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)
    const file = join(await mkdtemp(join(tmpdir(), "loom-shot-")), "e.png")

    await page.capture(file, { fullPage: true, frame: "iframe#demo" })

    expect(recorder.screenshots).toEqual([{ path: file, fullPage: true }])
    expect(recorder.elementShots).toEqual([])
  })

  it("photographs the element a clip names, and never the page as well", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)
    const file = join(await mkdtemp(join(tmpdir(), "loom-shot-")), "c.png")

    await page.capture(file, { fullPage: false, clip: "[data-figure]" })

    expect(recorder.elementShots).toEqual([{ selector: "[data-figure]", path: file }])
    expect(recorder.screenshots).toEqual([])
  })

  /**
   * The reading goes through a locator and not through a `page.evaluate` with
   * a `querySelectorAll` in it, and these three tests are why: the selector is
   * the driver's engine, the match set is the answer rather than its head, and
   * the frame is the one a shot already named.
   */
  it("reads six numbers off every element a selector matched, in the driver's own engine", async () => {
    const recorder = recordingLauncher({
      "text=Put it back": [
        { rect: { x: 40, y: 714, width: 120, height: 44 }, scrollHeight: 44, clientHeight: 44 },
      ],
    })
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    expect(await page.boxes(["text=Put it back"])).toEqual([
      {
        selector: "text=Put it back",
        found: [
          { x: 40, y: 714, width: 120, height: 44, scrollHeight: 44, clientHeight: 44 },
        ],
      },
    ])
  })

  it("hands back every match rather than the first, and an empty list for none", async () => {
    const recorder = recordingLauncher({
      "aside li[id]": [
        { rect: { x: 40, y: 377, width: 320, height: 358 }, scrollHeight: 358, clientHeight: 358 },
        { rect: { x: 40, y: 751, width: 320, height: 17 }, scrollHeight: 17, clientHeight: 17 },
      ],
    })
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    const measured = await page.boxes(["aside li[id]", "aside footer"])

    expect(measured.map((entry) => entry.found.length)).toEqual([2, 0])
    expect(measured[0]?.found.map((found) => found.y)).toEqual([377, 751])
  })

  it("resolves its selectors through the frame it was given, like every other one", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.boxes(["aside"], "iframe#demo")

    expect(recorder.journal).toEqual(["evaluateAll aside in iframe#demo"])
  })

  it("collects the search paths from both variables, since NODE_PATH is what lanes reach for", () => {
    expect(playwrightSearchPaths({ LOOM_PLAYWRIGHT: "/a", NODE_PATH: "/b:/c" })).toEqual([
      "/a",
      "/b",
      "/c",
    ])
    expect(playwrightSearchPaths({ NODE_PATH: "" })).toEqual([])
  })

  it("says how to install playwright-core rather than throwing, when it is not there", async () => {
    const loaded = await loadChromium(["/no/such/node_modules"])

    expect(loaded.ok).toBe(false)
    if (!loaded.ok) {
      expect(describeLauncherError(loaded.error)).toContain("npm install playwright-core")
      expect(describeLauncherError(loaded.error)).toContain("LOOM_PLAYWRIGHT")
    }
  })
})

describe("the command line", () => {
  it("takes a module and an output directory", () => {
    const parsed = parseSpecimenArgs(["tools/specimen/example.specimen.ts", "--out", "reports/x"])

    expect(parsed.ok && parsed.value).toEqual({
      module: "tools/specimen/example.specimen.ts",
      outDir: "reports/x",
    })
  })

  it("writes into reports/ by default, which is where a report's pictures live", () => {
    const parsed = parseSpecimenArgs(["a.ts"])

    expect(parsed.ok && parsed.value.outDir).toBe("reports")
  })

  it("refuses --out with the next flag as its value", () => {
    const parsed = parseSpecimenArgs(["a.ts", "--out", "--other"])

    expect(!parsed.ok && parsed.error.code).toBe("missing-value")
  })

  it("refuses an unknown flag and a missing module, with the usage line", () => {
    expect(!parseSpecimenArgs(["a.ts", "--zoom"]).ok).toBe(true)
    const empty = parseSpecimenArgs([])
    expect(!empty.ok && describeArgsError(empty.error)).toContain("usage: pnpm specimen")
  })
})

describe("rendering a specimen", () => {
  it("mounts the theme it was built with, so three palettes are three documents", async () => {
    const rendered = await renderSpecimen(
      specimenOf({
        themes: [
          { label: "Editorial", selection: selection("editorial") },
          { label: "Bold", selection: selection("bold") },
        ],
      })
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    const [editorial, bold] = rendered.value
    expect(editorial?.html).toContain("--loom-accent")
    expect(editorial?.html).not.toBe(bold?.html)
    expect(rendered.value.every((page) => page.diagnostics.length === 0)).toBe(true)
  })

  it("titles each document with the specimen and the theme it is wearing", async () => {
    const rendered = await renderSpecimen(specimenOf())

    expect(rendered.ok && rendered.value[0]?.html).toContain(
      "<title>A band — Editorial serif</title>"
    )
  })

  it("renders the specimen this repository ships, clean, under all three palettes", async () => {
    const rendered = await renderSpecimen(exampleSpecimen)

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(rendered.value).toHaveLength(3)
    for (const page of rendered.value) {
      expect(page.diagnostics).toEqual([])
      expect(page.html).toContain("One tree, three palettes, two viewports")
    }
  })
})

describe("wiring a submission into a specimen", () => {
  const formSpecimen = (endpoints?: Specimen["endpoints"]): Specimen =>
    specimenOf({
      build: (theme) => {
        const idFactory = sequentialIdFactory()
        const form = buildElement(idFactory, {
          type: "loom.form",
          props: { [SUBMIT_PROP_KEY]: { to: "contact.enquiry" } },
          children: [
            buildElement(idFactory, {
              type: "loom.field",
              props: { name: "email", label: "Email", type: "email", required: true },
              children: [],
            }),
            buildSlot(idFactory, "submit", [
              buildElement(idFactory, {
                type: "loom.button",
                props: { label: "Send", variant: "primary" },
                children: [],
              }),
            ]),
          ],
        })
        const page = buildElement(idFactory, {
          type: "loom.page",
          props: { [THEME_PROP_KEY]: theme },
          children: [form],
        })
        return createTree(page, idFactory)
      },
      ...(endpoints === undefined ? {} : { endpoints }),
    })

  const TARGET = { action: "/contact", method: "post", fields: [] } as const

  /**
   * The state the finding is about: correct, and a photograph in which every
   * control inside the form is six-tenths visible.
   */
  it("greys the whole fieldset when a specimen declares no endpoints", async () => {
    const rendered = await renderSpecimen(formSpecimen())

    expect(rendered.ok).toBe(true)
    const html = (rendered.ok && rendered.value[0]?.html) || ""
    /** The defect, exactly: every control inside is six-tenths visible. */
    expect(html).toContain("<fieldset disabled")
    expect(html).toContain("opacity:0.6")
  })

  it("posts to the target a specimen declared, so the fields are photographable", async () => {
    const rendered = await renderSpecimen(formSpecimen({ "contact.enquiry": TARGET }))

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    const html = rendered.value[0]?.html ?? ""
    expect(html).toContain('action="/contact"')
    expect(html).toContain('method="post"')
    expect(html).not.toContain("<fieldset disabled")
    expect(html).not.toContain("opacity:0.6")
  })

  it("renders the hidden fields a target carries, in the order it names them", async () => {
    const rendered = await renderSpecimen(
      formSpecimen({
        "contact.enquiry": {
          ...TARGET,
          fields: [
            { name: "csrf", value: "a-token" },
            { name: "locale", value: "en" },
          ],
        },
      })
    )

    const html = (rendered.ok && rendered.value[0]?.html) || ""
    expect(html.indexOf('name="csrf"')).toBeGreaterThan(-1)
    expect(html.indexOf('name="csrf"')).toBeLessThan(html.indexOf('name="locale"'))
    expect(html).toContain('value="a-token"')
  })

  /**
   * Through `defineEndpoint`, so a specimen's target meets the same schema a
   * host's answer does — an off-origin action is the costliest composition
   * mistake in the seam and the one least likely to be noticed in review.
   */
  it("refuses a target that leaves the origin, exactly as a host's would be", async () => {
    const rendered = await renderSpecimen(
      formSpecimen({ "contact.enquiry": { ...TARGET, action: "//evil.example" } })
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    /** No action reached the markup, and the fieldset is grey again. */
    expect(rendered.value[0]?.html).not.toContain("evil.example")
    expect(rendered.value[0]?.html).toContain("<fieldset disabled")
  })

  it("says which endpoint id it refused rather than rendering half a page", async () => {
    const rendered = await renderSpecimen(formSpecimen({ "Not An Id": TARGET }))

    expect(rendered.ok).toBe(false)
    if (rendered.ok) return

    expect(rendered.error.code).toBe("endpoints")
    expect(describeRenderError(rendered.error)).toContain("Not An Id")
  })

  it("leaves a specimen with no forms in it exactly as it was", async () => {
    const withRegistry = await renderSpecimen(specimenOf({ endpoints: {} }))
    const without = await renderSpecimen(specimenOf())

    expect(withRegistry.ok && without.ok).toBe(true)
    expect(withRegistry.ok && withRegistry.value[0]?.html).toBe(
      without.ok ? without.value[0]?.html : "mismatch"
    )
  })
})

/**
 * The data seam's half of the block above, and the finding it closes (0185).
 *
 * `loom.feed` has four states — rows, an answer of none, a source that did not
 * answer, and an answer of a shape it cannot draw — and before a specimen could
 * declare an answer exactly one of them was reachable. Every assertion here is
 * a photograph a lane could not take.
 */
describe("wiring an answer into a specimen", () => {
  const feedSpecimen = (answers?: Specimen["answers"]): Specimen =>
    specimenOf({
      build: (theme) => {
        const idFactory = sequentialIdFactory()
        const feed = buildElement(idFactory, {
          type: "loom.feed",
          props: { [DATA_PROP_KEY]: { entries: { source: "posts.latest", params: { limit: 3 } } } },
          children: [
            buildSlot(idFactory, "empty", [
              buildElement(idFactory, {
                type: "loom.heading",
                props: { level: 2 },
                children: [buildText(idFactory, "Nothing posted yet")],
              }),
            ]),
          ],
        })
        const page = buildElement(idFactory, {
          type: "loom.page",
          props: { [THEME_PROP_KEY]: theme },
          children: [feed],
        })

        return createTree(page, idFactory)
      },
      ...(answers === undefined ? {} : { answers }),
    })

  const htmlOf = async (answers?: Specimen["answers"]): Promise<string> => {
    const rendered = await renderSpecimen(feedSpecimen(answers))

    return (rendered.ok && rendered.value[0]?.html) || ""
  }

  it("draws the rows a specimen declared", async () => {
    const html = await htmlOf({
      "posts.latest": {
        answer: [
          { title: "The second release", meta: "March" },
          { title: "The first release", meta: "February" },
        ],
      },
    })

    expect(html).toContain("The second release")
    expect(html).toContain("The first release")
    expect(html).not.toContain("Nothing posted yet")
  })

  it("draws the region the tree supplied when the answer is none", async () => {
    const html = await htmlOf({ "posts.latest": { answer: [] } })

    expect(html).toContain("Nothing posted yet")
    expect(html).not.toContain("could not be loaded")
  })

  it("draws the failure sentence when the source did not answer", async () => {
    const html = await htmlOf({
      "posts.latest": { unavailable: { code: "unavailable", detail: "the database is asleep" } },
    })

    expect(html).toContain("This list could not be loaded.")
    expect(html).not.toContain("Nothing posted yet")
  })

  /**
   * The source's own schema takes any JSON, so what refuses this answer is the
   * primitive — which is exactly the state being photographed. A specimen that
   * had to declare a schema could only ever photograph its own strictness.
   */
  it("draws the other failure sentence when the answer is a shape it cannot read", async () => {
    const html = await htmlOf({ "posts.latest": { answer: { total: 4 } } })

    expect(html).toContain("This list could not be shown.")
  })

  /**
   * The state every specimen of a bound primitive was stuck in until now, and
   * it is still what a specimen that declares nothing gets — with the seam's
   * own reason for it in the diagnostics rather than silence.
   */
  it("reports the binding as unanswered when a specimen declares nothing", async () => {
    const rendered = await renderSpecimen(feedSpecimen())

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(rendered.value[0]?.diagnostics).toEqual([
      expect.objectContaining({ code: "data-unavailable" }),
    ])
    expect(rendered.value[0]?.html).toContain("This list could not be loaded.")
  })

  /** Through `defineSource`, so a specimen's id meets the schema a host's does. */
  it("says which source id it refused rather than rendering half a page", async () => {
    const rendered = await renderSpecimen(feedSpecimen({ "Not An Id": { answer: [] } }))

    expect(rendered.ok).toBe(false)
    if (rendered.ok) return

    expect(rendered.error.code).toBe("sources")
    expect(describeRenderError(rendered.error)).toContain("Not An Id")
  })

  it("leaves a specimen that binds nothing exactly as it was", async () => {
    const withRegistry = await renderSpecimen(specimenOf({ answers: {} }))
    const without = await renderSpecimen(specimenOf())

    expect(withRegistry.ok && without.ok).toBe(true)
    expect(withRegistry.ok && withRegistry.value[0]?.html).toBe(
      without.ok ? without.value[0]?.html : "mismatch"
    )
  })
})

describe("a specimen that asks to be hydrated", () => {
  const PRESS = { click: ".loom-control-present" } as const

  const liveSpecimen = (states?: readonly { label: string; do: readonly (typeof PRESS)[] }[]) =>
    specimenOf({ live: states === undefined ? {} : { states }, viewports: [WIDE] })

  /**
   * The property every existing picture depends on, asserted first: a specimen
   * that says nothing about being live is the specimen it was, down to the file
   * names in four reports' worth of shots.
   */
  it("gives a static specimen one nameless state, so not one file name moves", () => {
    expect(isLive(specimenOf())).toBe(false)
    expect(planStates(specimenOf())).toEqual([{ label: "", do: [] }])
    expect(planShots(specimenOf()).map((shot) => shot.file)).toEqual([
      "a-band-editorial-serif-phone.png",
      "a-band-editorial-serif-wide.png",
    ])
  })

  it("gives a live specimen that declares no states the same one, hydrated", () => {
    const specimen = liveSpecimen()

    expect(isLive(specimen)).toBe(true)
    expect(planShots(specimen).map((shot) => shot.file)).toEqual([
      "a-band-editorial-serif-wide.png",
    ])
  })

  it("plans one shot per state and names each after the state it reaches", () => {
    const shots = planShots(
      liveSpecimen([
        { label: "settled", do: [] },
        { label: "presented", do: [PRESS] },
      ])
    )

    expect(shots.map((shot) => shot.file)).toEqual([
      "a-band-editorial-serif-wide-settled.png",
      "a-band-editorial-serif-wide-presented.png",
    ])
    /** One document for both: a state is reached in the browser, not rendered. */
    expect(new Set(shots.map((shot) => shot.page.file)).size).toBe(1)
  })

  /**
   * `do` was empty by construction, because a static page has no script in it to
   * press. This is the whole of what changed about the shot list.
   */
  it("carries a state's steps through to the shot list", () => {
    const shots = planShots(liveSpecimen([{ label: "presented", do: [PRESS] }]))

    expect(shotsAt("http://127.0.0.1:1", shots)[0]?.do).toEqual([PRESS])
    expect(shotsAt("http://127.0.0.1:1", planShots(specimenOf()))[0]?.do).toEqual([])
  })

  it("adds no bundle and no attribute to a static document", () => {
    const html = specimenDocument({ title: "t", markup: "<p>x</p>" })

    expect(html).not.toContain(SPECIMEN_BUNDLE_FILE)
    expect(html).not.toContain(SPECIMEN_PAGE_ATTRIBUTE)
    expect(html).toContain("<body>\n<p>x</p>\n</body>")
  })

  it("loads one bundle and names the page on a live document", () => {
    const html = specimenDocument({ title: "t", markup: "<p>x</p>", page: "a-band-editorial" })

    expect(html).toContain(`<script src="${SPECIMEN_BUNDLE_FILE}" defer></script>`)
    expect(html).toContain(`${SPECIMEN_PAGE_ATTRIBUTE}="a-band-editorial"`)
  })

  /**
   * A whitespace text node beside the markup is a node React has to reconcile,
   * and it reconciles a disagreement by keeping the server's and saying nothing.
   */
  it("puts no whitespace round the markup of a live body", () => {
    const html = specimenDocument({ title: "t", markup: "<p>x</p>", page: "p" })

    expect(html).toContain(`<body ${SPECIMEN_PAGE_ATTRIBUTE}="p"><p>x</p></body>`)
  })

  it("renders a live specimen's pages with the bundle and their own name", async () => {
    const rendered = await renderSpecimen(liveSpecimen())

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(rendered.value[0]?.html).toContain(SPECIMEN_BUNDLE_FILE)
    expect(rendered.value[0]?.html).toContain(
      `${SPECIMEN_PAGE_ATTRIBUTE}="a-band-editorial-serif"`
    )
  })
})

describe("the primitives a specimen registers for itself", () => {
  /**
   * `renderSpecimen` took a list of these from the day it was written and the
   * CLI could never pass one, so a run photographing a seam had to add a
   * primitive to another lane's directory to have a subject.
   */
  it("registers what the specimen declared, which nothing could pass before", async () => {
    const built = await specimenElement(
      behaviourSpecimen,
      behaviourSpecimen.themes[0]?.selection ?? selection("editorial")
    )

    expect(built.ok).toBe(true)
    if (!built.ok) return

    expect(built.value.diagnostics).toEqual([])
  })

  it("leaves the node undrawn when the specimen declares nothing for its type", async () => {
    const { primitives: _declared, ...withoutPrimitives } = behaviourSpecimen
    const built = await specimenElement(
      withoutPrimitives,
      behaviourSpecimen.themes[0]?.selection ?? selection("editorial")
    )

    expect(built.ok).toBe(true)
    if (!built.ok) return

    expect(built.value.diagnostics.length).toBeGreaterThan(0)
  })
})

describe("bundling a live specimen", () => {
  it("imports the lane's module and the hydration entry, and nothing else", () => {
    const source = entrySource(
      "/repo/tools/specimen/a.specimen.ts",
      "/repo/tools/specimen/hydrate.ts"
    )

    expect(source).toContain('import specimen from "/repo/tools/specimen/a.specimen.ts"')
    expect(source).toContain('import { hydrateSpecimen } from "/repo/tools/specimen/hydrate.ts"')
    expect(source).toContain("void hydrateSpecimen(specimen)")
  })

  /**
   * React's development build patches a hydration mismatch into the client's
   * render, which would photograph a page nobody is ever served.
   */
  it("builds React in production mode, from a TypeScript entry", () => {
    const options = bundleOptions("", "/repo")

    expect(options.define?.["process.env.NODE_ENV"]).toBe('"production"')
    expect(options.stdin?.loader).toBe("ts")
    expect(options.stdin?.sourcefile?.endsWith(".ts")).toBe(true)
    expect(options.format).toBe("iife")
    expect(options.platform).toBe("browser")
  })

  it("bundles the behaviour specimen, whose primitive the specimen declares", async () => {
    const built = await bundleSpecimen("tools/specimen/behaviour.specimen.ts")

    expect(built.ok).toBe(true)
    if (!built.ok) return

    expect(built.value).toContain("spec.behaviours")
    expect(built.value.length).toBeGreaterThan(1000)
  }, 30_000)

  it("reports a module that will not build as a sentence rather than a throw", async () => {
    const built = await bundleSpecimen("tools/specimen/nothing-here.specimen.ts")

    expect(built.ok).toBe(false)
    expect(built.ok === false && describeBundleError(built.error)).toContain(
      "the specimen bundle would not build"
    )
  }, 30_000)
})

/**
 * The submit seam, the data seam and the primitive registry all resolve in
 * `specimenElement`, which is the function a hydrating browser calls. These are
 * the tests for that being safe, and the first is the whole of the argument:
 * hydration is React checking that the client's first render agrees with the
 * server's markup, so what has to hold is that building the page twice gives the
 * same page.
 */
describe("both seams in one element", () => {
  const themeOf = (specimen: Specimen): ThemeSelection =>
    specimen.themes[0]?.selection ?? selection("editorial")

  const markupOf = async (specimen: Specimen): Promise<string> => {
    const built = await specimenElement(specimen, themeOf(specimen))
    expect(built.ok).toBe(true)
    return built.ok ? renderToString(built.value.element) : ""
  }

  it("builds the same markup twice for a specimen that declares answers and live", async () => {
    const [first, second] = await Promise.all([
      markupOf(behaviourSpecimen),
      markupOf(behaviourSpecimen),
    ])

    expect(first).toBe(second)
    expect(first.length).toBeGreaterThan(0)
  })

  /**
   * The rows are what the composition is for. Before it, a specimen could ask to
   * be hydrated or ask to be answered and not both — `specimenElement` knew the
   * submit seam only, so a live page's bound regions drew the state a binding
   * reaches when nothing answered it.
   */
  it("resolves a live specimen's declared answers, so its bound band has rows", async () => {
    const rendered = await renderSpecimen(behaviourSpecimen)

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    const html = rendered.value[0]?.html ?? ""

    for (const title of ["copy", "disclose", "adjust", "present and dismiss"]) {
      expect(html).toContain(title)
    }
    expect(html).not.toContain("Nothing answered")
  })

  /** The worked copy earns its name by declaring all three, so this guards it. */
  it("has one worked copy declaring a primitive, answers and states at once", () => {
    expect(behaviourSpecimen.primitives?.length).toBeGreaterThan(0)
    expect(Object.keys(behaviourSpecimen.answers ?? {})).toEqual(["controls.shipped"])
    expect(isLive(behaviourSpecimen)).toBe(true)
  })

  it("names all three ways a specimen page can be refused", () => {
    expect(describeRenderError({ code: "registry", detail: "x" })).toContain("registry")
    expect(describeRenderError({ code: "endpoints", detail: "x" })).toContain("endpoints")
    expect(describeRenderError({ code: "sources", detail: "x" })).toContain("answers")
  })
})
